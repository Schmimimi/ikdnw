import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Get all sessions
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// Get single session with full state
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      game_states(*),
      players(*),
      categories(*, questions(*))
    `)
    .eq('id', id)
    .single();
  if (error) return res.status(404).json({ error });
  res.json(session);
});

// Create new session
router.post('/', async (req, res) => {
  const { name } = req.body;
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({ name: name || `Session ${Date.now()}`, phase: 'LOBBY' })
    .select()
    .single();
  if (error) return res.status(500).json({ error });

  // Init game state
  await supabase.from('game_states').insert({
    session_id: session.id,
    phase: 'LOBBY',
    scores: {},
    current_question_id: null,
    finale_state: null,
  });

  res.json(session);
});

// Delete session
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await supabase.from('sessions').delete().eq('id', id);
  res.json({ ok: true });
});

export default router;
