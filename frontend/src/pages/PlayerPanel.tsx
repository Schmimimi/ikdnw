import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { useGameSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

export default function PlayerPanel() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { twitchUser, session, connected } = useStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useStore.getState().setSessionId(sessionId!);
  const socket = useGameSocket();
  const { localStream } = useWebRTC(sessionId!);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const gameState = session?.game_states?.[0];
  const myPlayer = session?.players?.find(p => p.twitch_id === twitchUser?.id);
  const myScore = myPlayer ? (gameState?.scores?.[myPlayer.id] || 0) : 0;

  const currentQuestion = gameState?.current_question;
  const currentCategory = session?.categories?.find(c => c.id === gameState?.current_category_id);

  return (
    <div className="min-h-screen flex flex-col p-6 gap-6" style={{ background: 'var(--dark)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {twitchUser?.profile_image_url && (
            <img src={twitchUser.profile_image_url} className="w-10 h-10 rounded-full ring-2 ring-purple-500" />
          )}
          <div>
            <div className="font-semibold">{twitchUser?.display_name}</div>
            <div className="text-xs text-gray-500">Spieler*in</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Verbunden' : 'Getrennt'}</span>
        </div>
      </div>

      {/* Score */}
      <motion.div
        key={myScore}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.4 }}
        className="glass rounded-2xl p-6 text-center"
      >
        <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">Deine Punkte</div>
        <div className="score-badge text-6xl">{myScore}</div>
      </motion.div>

      {/* Camera preview */}
      <div className="glass rounded-2xl overflow-hidden aspect-video cam-container">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {!localStream && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm">Kamera wird geladen...</div>
            </div>
          </div>
        )}
      </div>

      {/* Current question (if any) */}
      {currentQuestion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-purple-500/30"
          style={{ boxShadow: '0 0 30px rgba(124, 58, 237, 0.2)' }}
        >
          {currentCategory && (
            <div className="text-xs uppercase tracking-widest text-purple-400 mb-2">{currentCategory.name}</div>
          )}
          <div className="text-lg font-semibold leading-snug">{currentQuestion.question_text}</div>
        </motion.div>
      )}

      {/* Phase display */}
      <div className="glass rounded-xl p-4 text-center">
        <div className="text-gray-400 text-sm">
          {gameState?.phase === 'LOBBY' && '⏳ Warte auf den Host...'}
          {gameState?.phase === 'CATEGORY_REVEAL' && '🎯 Kategorien werden aufgedeckt!'}
          {gameState?.phase === 'MAIN_ROUND' && '🎮 Hauptrunde läuft!'}
          {gameState?.phase === 'FINALE' && '🏆 Superfinale!'}
          {gameState?.phase === 'END' && '🎉 Show beendet!'}
        </div>
      </div>

      {/* My categories */}
      {session?.categories && myPlayer && (
        <div>
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Meine zugewiesenen Kategorien</div>
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
