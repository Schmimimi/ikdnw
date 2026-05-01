import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { useGameSocket, getGameSocket } from '../hooks/useSocket';
import type { Category, Phase } from '../types';

export default function HostPanel() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, connected } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [finaleP1, setFinaleP1] = useState<string>('');
  const [finaleP2, setFinaleP2] = useState<string>('');
  const socket = getGameSocket();

  useEffect(() => {
    useStore.getState().setSessionId(sessionId!);
    useStore.getState().setRole('host');
  }, [sessionId]);

  useGameSocket();

  const gameState = session?.game_states?.[0];
  const phase = gameState?.phase;
  const players = session?.players || [];
  const categories = session?.categories || [];
  const scores = gameState?.scores || {};

  const sid = sessionId!;
  const setPhase = (p: Phase) => socket.emit('set_phase', { phase: p, sessionId: sid });
  const awardPoints = (playerId: string, points: number, reason: string) =>
    socket.emit('award_points', { playerId, points, reason, sessionId: sid });
  const skipQuestion = () => socket.emit('skip_question', { sessionId: sid });
  const pickQuestion = (categoryId: string) => {
    socket.emit('pick_question', { categoryId, sessionId: sid });
    setSelectedCategory(categoryId);
  };
  const startFinale = () => {
    if (!finaleP1 || !finaleP2) return;
    socket.emit('start_finale', { player1Id: finaleP1, player2Id: finaleP2, sessionId: sid });
  };
  const startCategoryReveal = () => socket.emit('start_category_reveal', { sessionId: sid });
  const finaleAnswer = (correct: boolean) => socket.emit('finale_answer', { correct, sessionId: sid });
  const pickFinaleQuestion = () => socket.emit('pick_finale_question', { sessionId: sid });

  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const currentQuestion = gameState?.current_question;
  const currentCategory = categories.find(c => c.id === gameState?.current_category_id);
  const finaleState = gameState?.finale_state;
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getCatOwner = (cat: Category) => players.find(p => p.id === cat.owner_player_id);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--dark)' }}>
      {/* Top bar */}
      <div className="glass border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl gradient-text">HOST PANEL</h1>
          <div className={`flex items-center gap-2 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            {connected ? 'Live' : 'Getrennt'}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Phase:</span>
          <span className="text-purple-400 font-mono">{phase || '—'}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Phase control */}
        <div className="w-64 flex flex-col gap-4 p-4 border-r border-white/5 overflow-y-auto">
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Phasen</div>
            <div className="flex flex-col gap-1">
              {([
                ['LOBBY', '⏳ Lobby'],
                ['SETUP', '⚙️ Setup'],
                ['CATEGORY_REVEAL', '🎯 Reveal'],
                ['MAIN_ROUND', '🎮 Hauptrunde'],
                ['FINALE', '🏆 Finale'],
                ['END', '🎉 Ende'],
              ] as [Phase, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    phase === p ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={phase === p ? { background: 'var(--purple)' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {phase === 'CATEGORY_REVEAL' && (
            <button
              onClick={startCategoryReveal}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, var(--cyan), var(--purple))' }}
            >
              🎬 Reveal starten
            </button>
          )}

          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Spieler*innen ({players.length})</div>
            {players.length === 0 ? (
              <div className="text-gray-600 text-sm">Noch keine</div>
            ) : (
              <div className="flex flex-col gap-2">
                {players.map(p => (
                  <div key={p.id} className="glass rounded-xl px-3 py-2 flex items-center gap-2">
                    <img src={p.profile_image_url} className="w-6 h-6 rounded-full" />
                    <span className="text-sm truncate">{p.display_name}</span>
                    <span className="ml-auto text-xs font-mono text-yellow-400">{scores[p.id] || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">

          {/* Scoreboard */}
          {sortedPlayers.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Rangliste</div>
              <div className="flex gap-4">
                {sortedPlayers.map((player, i) => (
                  <motion.div key={player.id} layout className="flex-1 glass rounded-xl p-3 text-center">
                    <img src={player.profile_image_url} className="w-10 h-10 rounded-full mx-auto mb-1 ring-1 ring-purple-500/50" />
                    <div className="text-xs text-gray-400 truncate">{player.display_name}</div>
                    <motion.div key={scores[player.id]} animate={{ scale: [1, 1.2, 1] }} className="score-badge text-3xl mt-1">
                      {scores[player.id] || 0}
                    </motion.div>
                    {i === 0 && players.length > 1 && <div className="text-yellow-400 text-xs mt-1">👑</div>}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Active Question */}
          <AnimatePresence>
            {currentQuestion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass rounded-2xl p-5 border border-purple-500/40"
                style={{ boxShadow: '0 0 40px rgba(124,58,237,0.15)' }}
              >
                {currentCategory && (
                  <div className="text-xs text-purple-400 uppercase tracking-widest mb-2">{currentCategory.name}</div>
                )}
                <div className="text-xl font-semibold mb-3 leading-snug">{currentQuestion.question_text}</div>
                <div className="text-sm border-t border-white/5 pt-3">
                  <span className="text-gray-500">Antwort: </span>
                  <span className="text-green-400 font-medium">{currentQuestion.answer_text}</span>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-2">Punkte vergeben:</div>
                  <div className="flex flex-wrap gap-2">
                    {players.map(player => (
                      <div key={player.id} className="flex items-center gap-1">
                        <img src={player.profile_image_url} className="w-5 h-5 rounded-full" />
                        <span className="text-xs text-gray-400 mr-1">{player.display_name}:</span>
                        <button onClick={() => awardPoints(player.id, 400, 'surprise')} className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: '#059669' }}>+400</button>
                        <button onClick={() => awardPoints(player.id, 100, 'expert')} className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: 'var(--purple)' }}>+100</button>
                        <button onClick={() => awardPoints(player.id, 250, 'consolation')} className="px-2 py-1 rounded text-xs font-bold text-white" style={{ background: 'var(--gold)' }}>+250</button>
                      </div>
                    ))}
                    <button onClick={skipQuestion} className="px-3 py-1 rounded text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 transition-all">
                      ⏭ Skip
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          {(phase === 'MAIN_ROUND' || phase === 'CATEGORY_REVEAL') && (
            <div>
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Kategorien – Frage ziehen</div>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(cat => {
                  const remaining = cat.questions?.filter(q => !q.played).length || 0;
                  const total = cat.questions?.length || 0;
                  const owner = getCatOwner(cat);
                  return (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => remaining > 0 && pickQuestion(cat.id)}
                      disabled={remaining === 0}
                      className={`glass rounded-xl p-4 text-left transition-all border ${
                        remaining === 0 ? 'opacity-40 cursor-not-allowed border-transparent'
                        : selectedCategory === cat.id ? 'border-purple-500'
                        : 'border-transparent hover:border-purple-500/50'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">{cat.name}</div>
                      {cat.description && <div className="text-gray-500 text-xs mb-2">{cat.description}</div>}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Experte: <span className="text-purple-300">{owner?.display_name || '—'}</span></span>
                        <span className={`font-mono font-bold ${remaining === 0 ? 'text-gray-600' : 'text-cyan-400'}`}>{remaining}/{total}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finale Setup */}
          {phase === 'FINALE' && !finaleState && (
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-4">Finale – Spieler wählen</div>
              <div className="flex gap-4 mb-4">
                {[
                  { label: 'Spieler 1', val: finaleP1, set: setFinaleP1, exclude: finaleP2 },
                  { label: 'Spieler 2', val: finaleP2, set: setFinaleP2, exclude: finaleP1 },
                ].map(({ label, val, set, exclude }) => (
                  <div key={label} className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                    <select value={val} onChange={e => set(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                      <option value="">Wählen...</option>
                      {sortedPlayers.filter(p => p.id !== exclude).map(p => (
                        <option key={p.id} value={p.id}>{p.display_name} ({scores[p.id] || 0} Pts)</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={startFinale} disabled={!finaleP1 || !finaleP2} className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, var(--gold), #F97316)' }}>
                🏆 Finale starten!
              </button>
            </div>
          )}

          {/* Finale Control */}
          {phase === 'FINALE' && finaleState && (
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-4">Finale läuft</div>
              <div className="flex gap-4 mb-4">
                {[finaleState.player1_id, finaleState.player2_id].map(pid => {
                  const p = getPlayer(pid);
                  const correct = finaleState.rounds.filter(r => r.answering_player_id === pid && r.correct).length;
                  return (
                    <div key={pid} className={`flex-1 glass rounded-xl p-3 text-center border ${finaleState.current_answering_player_id === pid ? 'border-yellow-400' : 'border-transparent'}`}>
                      <img src={p?.profile_image_url} className="w-8 h-8 rounded-full mx-auto mb-1" />
                      <div className="text-xs text-gray-400">{p?.display_name}</div>
                      <div className="text-2xl font-display mt-1 text-green-400">{correct}</div>
                      {finaleState.current_answering_player_id === pid && <div className="text-xs text-yellow-400 mt-1">▶ Am Zug</div>}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-center mb-4">
                {Array.from({ length: finaleState.max_rounds }).map((_, i) => {
                  const round = finaleState.rounds[i];
                  return (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs ${
                      !round ? 'border-gray-600 text-gray-600'
                      : round.correct ? 'border-green-400 bg-green-400/20 text-green-400'
                      : 'border-red-400 bg-red-400/20 text-red-400'
                    }`}>
                      {!round ? i + 1 : round.correct ? '✓' : '✗'}
                    </div>
                  );
                })}
              </div>

              {currentQuestion ? (
                <div>
                  <div className="text-sm font-semibold mb-2">{currentQuestion.question_text}</div>
                  <div className="text-xs text-green-400 mb-4">Antwort: {currentQuestion.answer_text}</div>
                  <div className="flex gap-3">
                    <button onClick={() => finaleAnswer(true)} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: '#059669' }}>✓ Richtig</button>
                    <button onClick={() => finaleAnswer(false)} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: '#DC2626' }}>✗ Falsch</button>
                  </div>
                </div>
              ) : (
                <button onClick={pickFinaleQuestion} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: 'var(--purple)' }}>
                  Nächste Finale-Frage →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
