import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import type { Session, Player, Category, Question } from '../types';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function AdminPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // Forms
  const [newPlayer, setNewPlayer] = useState({ twitch_id: '', twitch_login: '', display_name: '', profile_image_url: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', owner_player_id: '', assigned_to_player_id: '' });
  const [newQuestion, setNewQuestion] = useState({ question_text: '', answer_text: '', difficulty: 'normal' });
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [newHostQ, setNewHostQ] = useState({ question_text: '', answer_text: '' });

  const fetchSessions = async () => {
    const { data } = await axios.get(`${API}/api/sessions`);
    setSessions(data);
  };

  const loadSession = async (id: string) => {
    setLoading(true);
    const { data } = await axios.get(`${API}/api/sessions/${id}`);
    setActiveSession(data);
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { if (activeSession) loadSession(activeSession.id); }, []);

  const refresh = () => activeSession && loadSession(activeSession.id);

  const addPlayer = async () => {
    if (!activeSession || !newPlayer.twitch_id) return;
    await axios.post(`${API}/api/admin/sessions/${activeSession.id}/players`, newPlayer);
    setNewPlayer({ twitch_id: '', twitch_login: '', display_name: '', profile_image_url: '' });
    refresh();
  };

  const removePlayer = async (playerId: string) => {
    if (!activeSession) return;
    await axios.delete(`${API}/api/admin/sessions/${activeSession.id}/players/${playerId}`);
    refresh();
  };

  const addCategory = async () => {
    if (!activeSession || !newCategory.name || !newCategory.owner_player_id || !newCategory.assigned_to_player_id) return;
    await axios.post(`${API}/api/admin/sessions/${activeSession.id}/categories`, newCategory);
    setNewCategory({ name: '', description: '', owner_player_id: '', assigned_to_player_id: '' });
    refresh();
  };

  const removeCategory = async (catId: string) => {
    await axios.delete(`${API}/api/admin/categories/${catId}`);
    refresh();
  };

  const addQuestion = async () => {
    if (!activeCategoryId || !newQuestion.question_text || !newQuestion.answer_text) return;
    await axios.post(`${API}/api/admin/categories/${activeCategoryId}/questions`, newQuestion);
    setNewQuestion({ question_text: '', answer_text: '', difficulty: 'normal' });
    refresh();
  };

  const removeQuestion = async (qId: string) => {
    await axios.delete(`${API}/api/admin/questions/${qId}`);
    refresh();
  };

  const addHostQuestion = async () => {
    if (!activeSession || !newHostQ.question_text || !newHostQ.answer_text) return;
    await axios.post(`${API}/api/admin/sessions/${activeSession.id}/host-questions`, newHostQ);
    setNewHostQ({ question_text: '', answer_text: '' });
    refresh();
  };

  const players = activeSession?.players || [];
  const categories = activeSession?.categories || [];
  const activeCategory = categories.find(c => c.id === activeCategoryId);

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--dark)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-5xl gradient-text">ADMIN PANEL</h1>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {sessions.map(s => (
            <motion.button
              key={s.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => loadSession(s.id)}
              className={`glass rounded-xl p-4 text-left transition-all border ${
                activeSession?.id === s.id ? 'border-purple-500' : 'border-transparent hover:border-purple-500/50'
              }`}
            >
              <div className="font-semibold text-sm truncate">{s.name}</div>
              <div className="text-gray-500 text-xs mt-1">{s.phase}</div>
            </motion.button>
          ))}
        </div>

        {loading && <div className="text-gray-500 text-center py-8">Lade...</div>}

        {activeSession && !loading && (
          <div className="grid grid-cols-3 gap-6">
            {/* PLAYERS */}
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-4">Spieler*innen</div>

              <div className="flex flex-col gap-2 mb-4">
                {players.map(player => (
                  <div key={player.id} className="flex items-center gap-3 glass rounded-xl px-3 py-2">
                    <img src={player.profile_image_url || ''} className="w-8 h-8 rounded-full bg-gray-800" onError={e => (e.currentTarget.style.display = 'none')} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{player.display_name}</div>
                      <div className="text-xs text-gray-500">@{player.twitch_login}</div>
                    </div>
                    <button onClick={() => removePlayer(player.id)} className="text-red-400 hover:text-red-300 text-lg">×</button>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
                <div className="text-xs text-gray-500 mb-1">Spieler hinzufügen</div>
                {(['twitch_id', 'twitch_login', 'display_name', 'profile_image_url'] as const).map(field => (
                  <input
                    key={field}
                    value={newPlayer[field]}
                    onChange={e => setNewPlayer(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={field.replace(/_/g, ' ')}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-600"
                  />
                ))}
                <button
                  onClick={addPlayer}
                  className="w-full py-2 rounded-lg text-sm font-semibold text-white mt-1"
                  style={{ background: 'var(--purple)' }}
                >
                  + Spieler hinzufügen
                </button>
              </div>
            </div>

            {/* CATEGORIES */}
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-4">Kategorien</div>

              <div className="flex flex-col gap-2 mb-4">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`glass rounded-xl px-3 py-2 cursor-pointer transition-all border ${
                      activeCategoryId === cat.id ? 'border-purple-500' : 'border-transparent hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{cat.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-cyan-400">{cat.questions?.length || 0}Q</span>
                        <button onClick={e => { e.stopPropagation(); removeCategory(cat.id); }} className="text-red-400 hover:text-red-300">×</button>
                      </div>
                    </div>
                    {cat.description && <div className="text-gray-500 text-xs mt-0.5">{cat.description}</div>}
                    <div className="flex gap-4 mt-1 text-xs text-gray-600">
                      <span>Owner: <span className="text-purple-300">{players.find(p => p.id === cat.owner_player_id)?.display_name || '—'}</span></span>
                      <span>→ <span className="text-green-300">{players.find(p => p.id === cat.assigned_to_player_id)?.display_name || '—'}</span></span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
                <div className="text-xs text-gray-500 mb-1">Kategorie hinzufügen</div>
                <input value={newCategory.name} onChange={e => setNewCategory(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-600" />
                <input value={newCategory.description} onChange={e => setNewCategory(p => ({ ...p, description: e.target.value }))} placeholder="Beschreibung (optional)" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-600" />
                <select value={newCategory.owner_player_id} onChange={e => setNewCategory(p => ({ ...p, owner_player_id: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  <option value="">Experte (Owner)...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
                <select value={newCategory.assigned_to_player_id} onChange={e => setNewCategory(p => ({ ...p, assigned_to_player_id: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  <option value="">Zugewiesen an...</option>
                  {players.filter(p => p.id !== newCategory.owner_player_id).map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
                <button onClick={addCategory} className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--cyan)' }}>
                  + Kategorie hinzufügen
                </button>
              </div>
            </div>

            {/* QUESTIONS */}
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Fragen</div>
              {activeCategoryId ? (
                <>
                  <div className="text-purple-300 text-sm mb-4">{activeCategory?.name}</div>
                  <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
                    {activeCategory?.questions?.map(q => (
                      <div key={q.id} className="glass rounded-xl px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm text-white leading-snug">{q.question_text}</div>
                            <div className="text-xs text-green-400 mt-1">→ {q.answer_text}</div>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs text-gray-600">{q.difficulty}</span>
                              {q.played && <span className="text-xs text-red-400">gespielt</span>}
                            </div>
                          </div>
                          <button onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-300 flex-shrink-0">×</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
                    <textarea
                      value={newQuestion.question_text}
                      onChange={e => setNewQuestion(p => ({ ...p, question_text: e.target.value }))}
                      placeholder="Frage..."
                      rows={2}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-600 resize-none"
                    />
                    <input value={newQuestion.answer_text} onChange={e => setNewQuestion(p => ({ ...p, answer_text: e.target.value }))} placeholder="Antwort" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-600" />
                    <select value={newQuestion.difficulty} onChange={e => setNewQuestion(p => ({ ...p, difficulty: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                      <option value="easy">Einfach</option>
                      <option value="normal">Normal</option>
                      <option value="hard">Schwer</option>
                    </select>
                    <button onClick={addQuestion} className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--gold)' }}>
                      + Frage hinzufügen
                    </button>
                  </div>

                  {/* Host questions */}
                  <div className="border-t border-white/5 pt-4 mt-4">
                    <div className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Host-Fragen (Finale)</div>
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={newHostQ.question_text}
                        onChange={e => setNewHostQ(p => ({ ...p, question_text: e.target.value }))}
                        placeholder="Finale-Frage..."
                        rows={2}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-600 resize-none"
                      />
                      <input value={newHostQ.answer_text} onChange={e => setNewHostQ(p => ({ ...p, answer_text: e.target.value }))} placeholder="Antwort" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-600" />
                      <button onClick={addHostQuestion} className="w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'rgba(124,58,237,0.6)' }}>
                        + Host-Frage hinzufügen
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-600 text-sm mt-4">← Kategorie auswählen</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
