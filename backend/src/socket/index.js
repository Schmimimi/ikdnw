import { supabase } from '../lib/supabase.js';

// In-memory session state cache for fast access
const sessionStates = new Map();

export function setupSocketHandlers(io) {

  // Namespace separation
  const gameNs = io.of('/game');
  const webrtcNs = io.of('/webrtc');

  // =====================
  // GAME NAMESPACE
  // =====================
  gameNs.on('connection', (socket) => {
    console.log(`[Game] Socket connected: ${socket.id}`);

    // Join a session room
    socket.on('join_session', async ({ sessionId, role, twitchUser }) => {
      socket.join(sessionId);
      socket.data = { sessionId, role, twitchUser };

      // Load and send current state
      const state = await loadSessionState(sessionId);
      socket.emit('state_sync', state);

      // Announce join
      gameNs.to(sessionId).emit('player_joined', {
        socketId: socket.id,
        role,
        twitchUser,
      });

      console.log(`[Game] ${role} joined session ${sessionId}`);
    });

    const getSessionId = (params) => params?.sessionId || socket.data?.sessionId;

    // HOST: Change game phase
    socket.on('set_phase', async (params) => {
      const sessionId = getSessionId(params);
      if (!sessionId) return;
      await updateGameState(sessionId, { phase: params.phase });
      const state = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', state);
    });

    // HOST: Start category reveal animation
    socket.on('start_category_reveal', async (params) => {
      const sessionId = getSessionId(params);
      if (!sessionId) return;
      const state = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('category_reveal_start', { categories: state.categories });
    });

    // HOST: Pick next question (random from category)
    socket.on('pick_question', async ({ categoryId, sessionId: paramSessionId }) => {
      const sessionId = paramSessionId || socket.data?.sessionId;

      // Get unplayed questions for category
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('category_id', categoryId)
        .eq('played', false);

      if (!questions || questions.length === 0) {
        socket.emit('no_questions_left', { categoryId });
        return;
      }

      const question = questions[Math.floor(Math.random() * questions.length)];

      await updateGameState(sessionId, {
        current_question_id: question.id,
        current_question: question,
        current_category_id: categoryId,
        question_phase: 'SHOW_QUESTION',
      });

      const state = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', state);
      gameNs.to(sessionId).emit('question_revealed', { question, categoryId });
    });

    // HOST: Award points
    socket.on('award_points', async ({ playerId, points, reason, sessionId: paramSessionId }) => {
      const sessionId = paramSessionId || socket.data?.sessionId;
      const state = await loadSessionState(sessionId);

      const scores = state.game_state?.scores || {};
      scores[playerId] = (scores[playerId] || 0) + points;

      // Mark question as played
      if (state.game_state?.current_question_id) {
        await supabase
          .from('questions')
          .update({ played: true })
          .eq('id', state.game_state.current_question_id);
      }

      await updateGameState(sessionId, {
        scores,
        current_question_id: null,
        current_question: null,
        question_phase: null,
      });

      const newState = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', newState);
      gameNs.to(sessionId).emit('points_awarded', { playerId, points, reason, scores });
    });

    // HOST: Skip question without points
    socket.on('skip_question', async (params) => {
      const sessionId = getSessionId(params);
      const state = await loadSessionState(sessionId);

      if (state.game_state?.current_question_id) {
        await supabase
          .from('questions')
          .update({ played: true })
          .eq('id', state.game_state.current_question_id);
      }

      await updateGameState(sessionId, {
        current_question_id: null,
        current_question: null,
        question_phase: null,
      });

      const newState = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', newState);
    });

    // HOST: Start finale
    socket.on('start_finale', async ({ player1Id, player2Id, sessionId: paramSessionId }) => {
      const sessionId = paramSessionId || socket.data?.sessionId;
      const finaleState = {
        player1_id: player1Id,
        player2_id: player2Id,
        rounds: [], // { question_id, answering_player_id, correct: bool }
        current_round: 0,
        max_rounds: 5,
        phase: 'PLAYING',
      };

      await updateGameState(sessionId, {
        phase: 'FINALE',
        finale_state: finaleState,
      });

      const state = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', state);
      gameNs.to(sessionId).emit('finale_started', { finaleState });
    });

    // HOST: Finale question pick
    socket.on('pick_finale_question', async (params) => {
      const sessionId = getSessionId(params);
      const state = await loadSessionState(sessionId);
      const finaleState = state.game_state?.finale_state;

      const { data: questions } = await supabase
        .from('host_questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('played', false);

      if (!questions || questions.length === 0) {
        socket.emit('no_host_questions_left');
        return;
      }

      const question = questions[Math.floor(Math.random() * questions.length)];

      // Determine who answers this round (alternating, starting with higher score)
      const round = finaleState.current_round;
      const scores = state.game_state?.scores || {};
      const p1Score = scores[finaleState.player1_id] || 0;
      const p2Score = scores[finaleState.player2_id] || 0;

      let answeringPlayerId;
      if (round === 0) {
        answeringPlayerId = p1Score >= p2Score ? finaleState.player1_id : finaleState.player2_id;
      } else {
        const lastRound = finaleState.rounds[round - 1];
        answeringPlayerId = lastRound.answering_player_id === finaleState.player1_id
          ? finaleState.player2_id
          : finaleState.player1_id;
      }

      await updateGameState(sessionId, {
        current_question_id: question.id,
        current_question: question,
        question_phase: 'FINALE_QUESTION',
        'finale_state.current_answering_player_id': answeringPlayerId,
      });

      const newState = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', newState);
      gameNs.to(sessionId).emit('finale_question_revealed', { question, answeringPlayerId });
    });

    // HOST: Record finale answer
    socket.on('finale_answer', async ({ correct, sessionId: paramSessionId }) => {
      const sessionId = paramSessionId || socket.data?.sessionId;
      const state = await loadSessionState(sessionId);
      const finaleState = { ...state.game_state?.finale_state };

      const answeringPlayerId = finaleState.current_answering_player_id;
      const round = {
        question_id: state.game_state?.current_question_id,
        answering_player_id: answeringPlayerId,
        correct,
      };

      finaleState.rounds = [...(finaleState.rounds || []), round];
      finaleState.current_round = (finaleState.current_round || 0) + 1;

      // Mark question played
      if (state.game_state?.current_question_id) {
        await supabase
          .from('host_questions')
          .update({ played: true })
          .eq('id', state.game_state.current_question_id);
      }

      // Check if finale is over
      const p1Correct = finaleState.rounds.filter(r => r.answering_player_id === finaleState.player1_id && r.correct).length;
      const p2Correct = finaleState.rounds.filter(r => r.answering_player_id === finaleState.player2_id && r.correct).length;
      const roundsPlayed = finaleState.current_round;

      let winner = null;
      if (roundsPlayed >= finaleState.max_rounds) {
        if (p1Correct > p2Correct) winner = finaleState.player1_id;
        else if (p2Correct > p1Correct) winner = finaleState.player2_id;
        else finaleState.max_rounds += 2; // Sudden death extension
      }

      finaleState.winner = winner;

      await updateGameState(sessionId, {
        current_question_id: null,
        current_question: null,
        question_phase: null,
        finale_state: finaleState,
        phase: winner ? 'END' : 'FINALE',
      });

      const newState = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', newState);
      gameNs.to(sessionId).emit('finale_round_result', { correct, answeringPlayerId, finaleState });

      if (winner) {
        gameNs.to(sessionId).emit('game_over', { winner, finaleState });
      }
    });

    // HOST: Manually set scores (admin override)
    socket.on('set_scores', async ({ scores }) => {
      const { sessionId } = socket.data;
      await updateGameState(sessionId, { scores });
      const state = await loadSessionState(sessionId);
      gameNs.to(sessionId).emit('state_sync', state);
    });

    socket.on('disconnect', () => {
      const { sessionId, role, twitchUser } = socket.data || {};
      if (sessionId) {
        gameNs.to(sessionId).emit('player_left', { socketId: socket.id, role, twitchUser });
      }
      console.log(`[Game] Socket disconnected: ${socket.id}`);
    });
  });

  // =====================
  // WEBRTC NAMESPACE
  // =====================
  webrtcNs.on('connection', (socket) => {
    console.log(`[WebRTC] Socket connected: ${socket.id}`);

    socket.on('join_room', ({ sessionId, peerId, role }) => {
      socket.join(sessionId);
      socket.data = { sessionId, peerId, role };

      // Announce new peer to existing peers in room
      socket.to(sessionId).emit('peer_joined', { peerId, socketId: socket.id, role });

      // Send existing peers to new joiner
      const roomSockets = [...(webrtcNs.adapter.rooms.get(sessionId) || [])];
      const existingPeers = roomSockets
        .filter(id => id !== socket.id)
        .map(id => {
          const s = webrtcNs.sockets.get(id);
          return s ? { peerId: s.data.peerId, socketId: id, role: s.data.role } : null;
        })
        .filter(Boolean);

      socket.emit('existing_peers', existingPeers);
    });

    // WebRTC signaling relay
    socket.on('offer', ({ to, offer, peerId }) => {
      webrtcNs.to(to).emit('offer', { from: socket.id, offer, peerId: socket.data.peerId });
    });

    socket.on('answer', ({ to, answer }) => {
      webrtcNs.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      webrtcNs.to(to).emit('ice_candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      const { sessionId, peerId, role } = socket.data || {};
      if (sessionId) {
        webrtcNs.to(sessionId).emit('peer_left', { peerId, socketId: socket.id, role });
      }
    });
  });
}

// =====================
// STATE HELPERS
// =====================
async function loadSessionState(sessionId) {
  const { data } = await supabase
    .from('sessions')
    .select(`
      *,
      game_states(*),
      players(*),
      categories(*, questions(*))
    `)
    .eq('id', sessionId)
    .single();

  return data;
}

async function updateGameState(sessionId, updates) {
  // Flatten nested dot-notation keys into proper jsonb update
  const { data: existing } = await supabase
    .from('game_states')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (!existing) return;

  const merged = { ...existing };
  for (const [key, val] of Object.entries(updates)) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let obj = merged;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = val;
    } else {
      merged[key] = val;
    }
  }

  await supabase
    .from('game_states')
    .update(merged)
    .eq('session_id', sessionId);
}
