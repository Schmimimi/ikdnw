import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { useGameSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

export default function PlayerPanel() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { twitchUser, session, connected } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    useStore.getState().setSessionId(sessionId!);
    useStore.getState().setRole('player');
  }, [sessionId]);

  useGameSocket();
  const { localStream } = useWebRTC(sessionId ?? null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const gameState = session?.game_states?.[0];
  const myPlayer = session?.players?.find(p => p.twitch_id === twitchUser?.id);
  const myScore = myPlayer ? (gameState?.scores?.[myPlayer.id] || 0) : 0;
  const currentQuestion = gameState?.current_question;
  const currentCategory = session?.categories?.find(c => c.id === gameState?.current_category_id);
  const players = session?.players || [];
  const scores = gameState?.scores || {};
  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  return (
    <div className="min-h-screen flex flex-col p-5 gap-5" style={{ background: 'var(--dark)' }}>

      {/* Camera preview */}
      <div className="glass rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {localStream ? (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
            📷 Kamera wird gestartet...
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {twitchUser?.profile_image_url && (
            <img src={twitchUser.profile_image_url} className="w-10 h-10 rounded-full ring-2 ring-purple-500" />
          )}
          <div>
            <div className="font-semibold">{twitchUser?.display_name || 'Spieler*in'}</div>
            <div className="text-xs text-gray-500">Spieler*in</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Verbunden' : 'Getrennt'}</span>
        </div>
      </div>

      {/* Score */}
      <motion.div
        key={myScore}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.4 }}
        className="glass rounded-2xl p-6 text-center"
      >
        <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">Deine Punkte</div>
        <div className="score-badge text-6xl">{myScore}</div>
      </motion.div>

      {/* Current question or phase info */}
      {currentQuestion ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 border border-purple-500/30"
          style={{ boxShadow: '0 0 30px rgba(124,58,237,0.2)' }}
        >
          {currentCategory && (
            <div className="text-xs uppercase tracking-widest text-purple-400 mb-3">{currentCategory.name}</div>
          )}
          <div className="text-lg font-semibold leading-snug">{currentQuestion.question_text}</div>
        </motion.div>
      ) : (
        <div className="glass rounded-xl p-4 text-center text-gray-400 text-sm">
          {!gameState?.phase && '⏳ Verbinde...'}
          {gameState?.phase === 'LOBBY' && '⏳ Warte auf den Host...'}
          {gameState?.phase === 'SETUP' && '⚙️ Setup läuft...'}
          {gameState?.phase === 'CATEGORY_REVEAL' && '🎯 Kategorien werden aufgedeckt!'}
          {gameState?.phase === 'MAIN_ROUND' && '🎮 Warte auf die nächste Frage...'}
          {gameState?.phase === 'FINALE' && '🏆 Superfinale!'}
          {gameState?.phase === 'END' && '🎉 Show beendet!'}
        </div>
      )}

      {/* Scoreboard */}
      {sortedPlayers.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Rangliste</div>
          <div className="flex flex-col gap-2">
            {sortedPlayers.map((player, i) => (
              <motion.div
                key={player.id}
                layout
                className={`glass rounded-xl px-4 py-3 flex items-center gap-3 ${myPlayer?.id === player.id ? 'border border-purple-500/40' : ''}`}
              >
                <span className="text-gray-600 w-4 text-sm">{i + 1}</span>
                <img src={player.profile_image_url} className="w-7 h-7 rounded-full" />
                <span className="flex-1 text-sm font-medium truncate">{player.display_name}</span>
                <motion.span key={scores[player.id]} animate={{ scale: [1, 1.2, 1] }} className="score-badge text-xl">
                  {scores[player.id] || 0}
                </motion.span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* My categories */}
      {myPlayer && session?.categories?.filter(c => c.assigned_to_player_id === myPlayer.id).length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Meine Kategorien</div>
          <div className="flex flex-col gap-2">
            {session.categories
              .filter(c => c.assigned_to_player_id === myPlayer.id)
              .map(cat => {
                const remaining = cat.questions?.filter(q => !q.played).length || 0;
                const total = cat.questions?.length || 0;
                return (
                  <div key={cat.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{cat.name}</div>
                      {cat.description && <div className="text-gray-500 text-xs">{cat.description}</div>}
                    </div>
                    <div className="text-xs font-mono text-purple-400">{remaining}/{total}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
