import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function Home() {
  const navigate = useNavigate();
  const { twitchUser, setRole } = useStore();

  const handleTwitchLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/twitch`;
  };

  const handleRoleSelect = (role: 'host' | 'player' | 'overlay' | 'admin') => {
    setRole(role);
    if (role === 'overlay') {
      navigate('/sessions?mode=overlay');
    } else if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/sessions');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'var(--dark)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-12 px-8"
      >
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-display text-8xl tracking-widest gradient-text">QUIZSHOW</h1>
          <p className="text-gray-500 font-body mt-2 tracking-wider uppercase text-sm">Twitch Edition</p>
        </div>

        {/* Twitch Login or User Info */}
        {!twitchUser ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleTwitchLogin}
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-body font-semibold text-white text-lg transition-all"
            style={{ background: '#9146FF' }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
            </svg>
            Mit Twitch einloggen
          </motion.button>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {/* User card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass rounded-2xl px-6 py-4 flex items-center gap-4"
            >
              <img src={twitchUser.profile_image_url} className="w-12 h-12 rounded-full ring-2 ring-purple-500" />
              <div>
                <div className="font-semibold text-white">{twitchUser.display_name}</div>
                <div className="text-gray-400 text-sm">@{twitchUser.login}</div>
              </div>
              <button
                onClick={() => useStore.getState().setTwitchUser(null)}
                className="text-gray-500 hover:text-white ml-4 transition-colors text-sm"
              >
                Logout
              </button>
            </motion.div>

            {/* Role selection */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {[
                { role: 'player' as const, label: 'Als Spieler*in', icon: '🎮', desc: 'Kamera & Spielen' },
                { role: 'host' as const, label: 'Als Host', icon: '🎙️', desc: 'Show moderieren' },
                { role: 'overlay' as const, label: 'Overlay', icon: '📺', desc: 'Für OBS' },
                { role: 'admin' as const, label: 'Admin', icon: '⚙️', desc: 'Setup & Fragen' },
              ].map(({ role, label, icon, desc }, i) => (
                <motion.button
                  key={role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleRoleSelect(role)}
                  className="glass rounded-xl p-5 text-left flex flex-col gap-2 group cursor-pointer border border-transparent hover:border-purple-500 transition-all"
                >
                  <span className="text-3xl">{icon}</span>
                  <span className="font-semibold text-white">{label}</span>
                  <span className="text-gray-400 text-sm">{desc}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
