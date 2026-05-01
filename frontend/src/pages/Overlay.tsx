import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { useGameSocket, getGameSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import type { Category, Player, FinaleState } from '../types';

export default function Overlay() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session } = useStore();

  useStore.getState().setSessionId(sessionId!);
  useStore.getState().setRole('overlay');
  useGameSocket();
  const { peerStreams } = useWebRTC(sessionId!);

  const gameState = session?.game_states?.[0];
  const phase = gameState?.phase;
  const players = session?.players || [];
  const categories = session?.categories || [];
  const scores = gameState?.scores || {};
  const currentQuestion = gameState?.current_question;
  const currentCategory = categories.find(c => c.id === gameState?.current_category_id);
  const finaleState = gameState?.finale_state;

  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  const getPlayer = (id: string) => players.find(p => p.id === id);

  // Find streams by player twitch_id or role
  const getStream = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return peerStreams.find(ps => ps.role === player?.twitch_login || ps.peerId === player?.twitch_id);
  };

  const hostStream = peerStreams.find(ps => ps.role === 'host');

  // All 4 player slots (fill with placeholders if not yet connected)
  const playerSlots = Array.from({ length: 4 }, (_, i) => sortedPlayers[i] || null);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        width: '1920px',
        height: '1080px',
        background: 'transparent',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Background gradient pulse on question */}
      <AnimatePresence>
        {currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.08) 0%, transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ===================== */}
      {/* CATEGORY REVEAL PHASE */}
      {/* ===================== */}
      {phase === 'CATEGORY_REVEAL' && (
        <CategoryReveal categories={categories} players={players} />
      )}

      {/* ===================== */}
      {/* MAIN ROUND OVERLAY    */}
      {/* ===================== */}
      {(phase === 'MAIN_ROUND' || phase === 'LOBBY' || phase === 'SETUP') && (
        <>
          {/* Scoreboard top-left */}
          <div className="absolute top-6 left-6 flex flex-col gap-2">
            {sortedPlayers.map((player, i) => (
              <ScoreRow key={player.id} player={player} score={scores[player.id] || 0} rank={i} />
            ))}
          </div>

          {/* Category ammo bars - top right, stacked */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
            {categories.map((cat, i) => (
              <CategoryAmmo key={cat.id} category={cat} index={i} />
            ))}
          </div>

          {/* Active question card - center */}
          <AnimatePresence>
            {currentQuestion && (
              <QuestionCard question={currentQuestion} category={currentCategory} players={players} />
            )}
          </AnimatePresence>
        </>
      )}

      {/* ===================== */}
      {/* FINALE OVERLAY        */}
      {/* ===================== */}
      {phase === 'FINALE' && finaleState && (
        <FinaleOverlay
          finaleState={finaleState}
          getPlayer={getPlayer}
          currentQuestion={currentQuestion}
        />
      )}

      {/* ===================== */}
      {/* CAMERA BAR - BOTTOM   */}
      {/* ===================== */}
      <div
        className="absolute bottom-0 left-0 right-0 flex"
        style={{ height: '260px' }}
      >
        {/* Player 1 */}
        <CameraSlot player={playerSlots[0]} stream={playerSlots[0] ? getStream(playerSlots[0].id) : null} score={playerSlots[0] ? scores[playerSlots[0].id] || 0 : null} isActive={!!currentQuestion && !!playerSlots[0]} />
        {/* Player 2 */}
        <CameraSlot player={playerSlots[1]} stream={playerSlots[1] ? getStream(playerSlots[1].id) : null} score={playerSlots[1] ? scores[playerSlots[1].id] || 0 : null} isActive={!!currentQuestion && !!playerSlots[1]} />
        {/* HOST in center */}
        <HostCameraSlot stream={hostStream} />
        {/* Player 3 */}
        <CameraSlot player={playerSlots[2]} stream={playerSlots[2] ? getStream(playerSlots[2].id) : null} score={playerSlots[2] ? scores[playerSlots[2].id] || 0 : null} isActive={!!currentQuestion && !!playerSlots[2]} />
        {/* Player 4 */}
        <CameraSlot player={playerSlots[3]} stream={playerSlots[3] ? getStream(playerSlots[3].id) : null} score={playerSlots[3] ? scores[playerSlots[3].id] || 0 : null} isActive={!!currentQuestion && !!playerSlots[3]} />
      </div>
    </div>
  );
}

// ==================
// SCORE ROW
// ==================
function ScoreRow({ player, score, rank }: { player: Player; score: number; rank: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.1 }}
      className="flex items-center gap-3"
      style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '8px 14px',
        minWidth: '220px',
      }}
    >
      <span className="text-gray-600 font-display text-lg w-5">{rank + 1}</span>
      <img src={player.profile_image_url} className="w-8 h-8 rounded-full" style={{ border: '2px solid rgba(124,58,237,0.6)' }} />
      <span className="text-white font-medium text-sm flex-1 truncate">{player.display_name}</span>
      <motion.span
        key={score}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.4 }}
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.5rem',
          background: 'linear-gradient(135deg, #F59E0B, #F97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {score}
      </motion.span>
    </motion.div>
  );
}

// ==================
// CATEGORY AMMO BAR
// ==================
function CategoryAmmo({ category, index }: { category: Category; index: number }) {
  const remaining = category.questions?.filter(q => !q.played).length || 0;
  const total = category.questions?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-2"
      style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '6px 12px',
      }}
    >
      <span className="text-white text-xs font-medium max-w-[140px] truncate">{category.name}</span>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-all duration-500"
            style={{
              background: i < remaining
                ? 'linear-gradient(135deg, #7C3AED, #06B6D4)'
                : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>
      <span className="text-gray-500 text-xs font-mono">{remaining}/{total}</span>
    </motion.div>
  );
}

// ==================
// QUESTION CARD
// ==================
function QuestionCard({ question, category, players }: { question: any; category?: Category; players: Player[] }) {
  const expert = players.find(p => p.id === category?.owner_player_id);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: -60, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 60, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="absolute"
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '720px',
        marginTop: '-80px',
      }}
    >
      <div style={{
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(124,58,237,0.4)',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 0 60px rgba(124,58,237,0.25), 0 30px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Category badge */}
        {category && (
          <div className="flex items-center gap-3 mb-5">
            <span style={{
              background: 'rgba(124,58,237,0.2)',
              border: '1px solid rgba(124,58,237,0.5)',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#A78BFA',
            }}>
              {category.name}
            </span>
            {expert && (
              <div className="flex items-center gap-2 ml-auto">
                <span style={{ fontSize: '11px', color: '#6B7280' }}>Experte</span>
                <img src={expert.profile_image_url} className="w-6 h-6 rounded-full" />
                <span style={{ fontSize: '12px', color: '#D1D5DB' }}>{expert.display_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Question text */}
        <div style={{
          fontSize: '22px',
          fontWeight: '600',
          color: 'white',
          lineHeight: '1.4',
          letterSpacing: '-0.01em',
        }}>
          {question.question_text}
        </div>

        {/* Points hint */}
        <div className="flex gap-3 mt-5">
          {[
            { pts: 400, label: 'Überraschung', color: '#059669' },
            { pts: 100, label: 'Experte', color: '#7C3AED' },
            { pts: 250, label: 'Trost', color: '#F59E0B' },
          ].map(({ pts, label, color }) => (
            <div key={pts} style={{
              background: `rgba(${color === '#059669' ? '5,150,105' : color === '#7C3AED' ? '124,58,237' : '245,158,11'},0.15)`,
              border: `1px solid ${color}40`,
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11px',
              color,
            }}>
              {pts} Pts · {label}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ==================
// CATEGORY REVEAL
// ==================
function CategoryReveal({ categories, players }: { categories: Category[]; players: Player[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex items-center justify-center"
      style={{ paddingBottom: '260px' }}
    >
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '5rem',
            letterSpacing: '0.2em',
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '40px',
          }}
        >
          DIE KATEGORIEN
        </motion.h2>

        <div className="grid grid-cols-3 gap-4" style={{ maxWidth: '900px' }}>
          {categories.map((cat, i) => {
            const owner = players.find(p => p.id === cat.owner_player_id);
            const assignee = players.find(p => p.id === cat.assigned_to_player_id);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 200, damping: 20 }}
                style={{
                  background: 'rgba(10,10,15,0.92)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 0 30px rgba(124,58,237,0.1)',
                }}
              >
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: '1.5rem', letterSpacing: '0.1em', color: 'white', marginBottom: '8px' }}>
                  {cat.name}
                </div>
                {cat.description && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>{cat.description}</div>
                )}
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  Von: <span style={{ color: '#A78BFA' }}>{owner?.display_name}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  Für: <span style={{ color: '#34D399' }}>{assignee?.display_name}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px' }}>
                  {cat.questions?.length || 0} Fragen
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ==================
// FINALE OVERLAY
// ==================
function FinaleOverlay({ finaleState, getPlayer, currentQuestion }: {
  finaleState: FinaleState;
  getPlayer: (id: string) => Player | undefined;
  currentQuestion?: any;
}) {
  const p1 = getPlayer(finaleState.player1_id);
  const p2 = getPlayer(finaleState.player2_id);

  const p1Rounds = finaleState.rounds.filter(r => r.answering_player_id === finaleState.player1_id);
  const p2Rounds = finaleState.rounds.filter(r => r.answering_player_id === finaleState.player2_id);

  return (
    <div className="absolute inset-0" style={{ paddingBottom: '260px', paddingTop: '40px' }}>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
        style={{
          fontFamily: "'Bebas Neue'",
          fontSize: '3.5rem',
          letterSpacing: '0.3em',
          background: 'linear-gradient(135deg, #F59E0B, #F97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        SUPERFINALE
      </motion.div>

      {/* Two player panels */}
      <div className="flex justify-center gap-16 items-start px-16">
        {/* Player 1 */}
        <FinalePlayerPanel
          player={p1}
          rounds={p1Rounds}
          totalRounds={finaleState.max_rounds}
          isActive={finaleState.current_answering_player_id === finaleState.player1_id}
        />

        {/* VS */}
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: '4rem', color: 'rgba(255,255,255,0.2)', paddingTop: '60px' }}>VS</div>

        {/* Player 2 */}
        <FinalePlayerPanel
          player={p2}
          rounds={p2Rounds}
          totalRounds={finaleState.max_rounds}
          isActive={finaleState.current_answering_player_id === finaleState.player2_id}
        />
      </div>

      {/* Current question */}
      <AnimatePresence>
        {currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute"
            style={{
              bottom: '280px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '700px',
              background: 'rgba(10,10,15,0.95)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: '16px',
              padding: '24px 28px',
              boxShadow: '0 0 40px rgba(245,158,11,0.15)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>
              Finale Frage
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: 'white', lineHeight: '1.4' }}>
              {currentQuestion.question_text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner */}
      {finaleState.winner && (
        <WinnerSplash player={getPlayer(finaleState.winner)} />
      )}
    </div>
  );
}

function FinalePlayerPanel({ player, rounds, totalRounds, isActive }: {
  player?: Player;
  rounds: { correct: boolean }[];
  totalRounds: number;
  isActive: boolean;
}) {
  return (
    <motion.div
      animate={isActive ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
      style={{
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(20px)',
        border: isActive ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '28px',
        minWidth: '280px',
        textAlign: 'center',
        boxShadow: isActive ? '0 0 40px rgba(245,158,11,0.25)' : 'none',
        transition: 'all 0.3s',
      }}
    >
      {player && (
        <>
          <img src={player.profile_image_url} className="w-20 h-20 rounded-full mx-auto mb-3" style={{ border: '3px solid rgba(124,58,237,0.6)' }} />
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: '1.8rem', letterSpacing: '0.1em', color: 'white' }}>
            {player.display_name}
          </div>
        </>
      )}
      {isActive && (
        <div style={{ color: '#F59E0B', fontSize: '12px', marginTop: '6px', marginBottom: '12px' }}>▶ AM ZUG</div>
      )}

      {/* 5-circle indicator */}
      <div className="flex gap-3 justify-center mt-4">
        {Array.from({ length: totalRounds }).map((_, i) => {
          const round = rounds[i];
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: `2px solid ${!round ? 'rgba(255,255,255,0.15)' : round.correct ? '#10B981' : '#EF4444'}`,
                background: !round ? 'transparent' : round.correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'all 0.4s',
                boxShadow: !round ? 'none' : round.correct ? '0 0 12px rgba(16,185,129,0.5)' : '0 0 12px rgba(239,68,68,0.5)',
              }}
            >
              {round ? (round.correct ? '✓' : '✗') : ''}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function WinnerSplash({ player }: { player?: Player }) {
  if (!player) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
    >
      <div className="text-center">
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: '2rem', letterSpacing: '0.3em', color: '#F59E0B', marginBottom: '16px' }}>
          🏆 GEWINNER 🏆
        </div>
        <img src={player.profile_image_url} className="w-32 h-32 rounded-full mx-auto mb-4" style={{ border: '4px solid #F59E0B', boxShadow: '0 0 60px rgba(245,158,11,0.5)' }} />
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: '5rem', letterSpacing: '0.1em', background: 'linear-gradient(135deg, #F59E0B, #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {player.display_name}
        </div>
      </div>
    </motion.div>
  );
}

// ==================
// CAMERA SLOT
// ==================
function CameraSlot({ player, stream, score, isActive }: {
  player: Player | null;
  stream?: any;
  score: number | null;
  isActive: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream?.stream) ref.current.srcObject = stream.stream;
  }, [stream]);

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        background: '#000',
        borderTop: isActive ? '2px solid rgba(124,58,237,0.8)' : '2px solid rgba(255,255,255,0.05)',
        transition: 'border-color 0.3s',
      }}
    >
      {stream ? (
        <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {player?.profile_image_url ? (
            <img src={player.profile_image_url} style={{ width: '64px', height: '64px', borderRadius: '50%', opacity: 0.5 }} />
          ) : (
            <div style={{ color: '#333', fontSize: '24px' }}>📷</div>
          )}
        </div>
      )}

      {/* Player name + score overlay */}
      {player && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          padding: '20px 10px 8px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {player.display_name}
          </span>
          {score !== null && (
            <span style={{
              fontFamily: "'Bebas Neue'",
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #F59E0B, #F97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {score}
            </span>
          )}
        </div>
      )}

      {/* Active glow */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid rgba(124,58,237,0.6)',
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 20px rgba(124,58,237,0.15)',
        }} />
      )}
    </div>
  );
}

function HostCameraSlot({ stream }: { stream?: any }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream?.stream) ref.current.srcObject = stream.stream;
  }, [stream]);

  return (
    <div style={{
      width: '220px',
      height: '100%',
      position: 'relative',
      background: '#000',
      borderTop: '2px solid rgba(6,182,212,0.5)',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      flexShrink: 0,
    }}>
      {stream ? (
        <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#0a0a12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '28px' }}>🎙️</span>
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '10px',
        color: '#06B6D4',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        background: 'rgba(0,0,0,0.7)',
        padding: '2px 8px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
      }}>
        Host
      </div>
    </div>
  );
}
