import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useStore } from '../store';
import type { Session } from '../types';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function SessionSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const { role, twitchUser } = useStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchSessions = async () => {
    const { data } = await axios.get(`${API}/api/sessions`);
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const createSession = async () => {
    setCreating(true);
    const { data } = await axios.post(`${API}/api/sessions`, { name: newName || undefined });
    setSessions(prev => [data, ...prev]);
    setNewName('');
    setCreating(false);
  };

  const joinSession = (session: Session) => {
    useStore.getState().setSessionId(session.id);
    const effectiveRole = mode === 'overlay' ? 'overlay' : role;
    if (effectiveRole === 'player') navigate(`/player/${session.id}`);
    else if (effectiveRole === 'host') navigate(`/host/${session.id}`);
    else if (effectiveRole === 'overlay') navigate(`/overlay/${session.id}`);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await axios.delete(`${API}/api/sessions/${id}`);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
        <div>
          <h1 className="font-display text-5xl gradient-text">Sessions</h1>
          <p className="text-gray-500 mt-1">Wähle eine Session oder erstelle eine neue</p>
        </div>

        {/* Create new */}
        {(role === 'host' || role === 'admin') && (
          <div className="glass rounded-xl p-4 flex gap-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Session Name (optional)"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-600 font-body"
              onKeyDown={e => e.key === 'Enter' && createSession()}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={createSession}
              disabled={creating}
              className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all"
              style={{ background: 'var(--purple)' }}
            >
              {creating ? '...' : '+ Neue Session'}
            </motion.button>
          </div>
        )}

        {/* Session list */}
        {loading ? (
          <div className="text-gray-500 text-center py-12">Lade Sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-gray-500 text-center py-12">Noch keine Sessions. Erstelle eine!</div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => joinSession(session)}
                className="glass rounded-xl p-5 flex items-center justify-between cursor-pointer hover:border-purple-500 border border-transparent transition-all group"
              >
                <div>
                  <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">{session.name}</div>
                  <div className="text-gray-500 text-sm mt-1">
                    Phase: <span className="text-purple-400">{session.phase}</span>
                    {' · '}
                    {new Date(session.created_at).toLocaleString('de-DE')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-mono">{session.id.slice(0, 8)}</span>
                  {(role === 'host' || role === 'admin') && (
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-lg"
                    >
                      ×
                    </button>
                  )}
                  <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
