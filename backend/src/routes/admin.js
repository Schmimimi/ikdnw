import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// --- PLAYERS ---

// Add/update player in session (with manual twitch assignment)
router.post('/sessions/:sessionId/players', async (req, res) => {
  const { sessionId } = req.params;
  const { twitch_id, twitch_login, display_name, profile_image_url } = req.body;

  const { data, error } = await supabase
    .from('players')
    .upsert({
      session_id: sessionId,
      twitch_id,
      twitch_login,
      display_name,
      profile_image_url,
    }, { onConflict: 'session_id,twitch_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.delete('/sessions/:sessionId/players/:playerId', async (req, res) => {
  const { playerId } = req.params;
  await supabase.from('players').delete().eq('id', playerId);
  res.json({ ok: true });
});

// --- CATEGORIES ---

// Create category (owner = player who submitted it, assigned_to = who gets the questions)
router.post('/sessions/:sessionId/categories', async (req, res) => {
  const { sessionId } = req.params;
  const { name, description, owner_player_id, assigned_to_player_id } = req.body;

  const { data, error } = await supabase
    .from('categories')
    .insert({ session_id: sessionId, name, description, owner_player_id, assigned_to_player_id })
    .select()
    .single();

  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  await supabase.from('categories').delete().eq('id', id);
  res.json({ ok: true });
});

// --- QUESTIONS ---

router.post('/categories/:categoryId/questions', async (req, res) => {
  const { categoryId } = req.params;
  const { question_text, answer_text, difficulty } = req.body;

  const { data, error } = await supabase
    .from('questions')
    .insert({ category_id: categoryId, question_text, answer_text, difficulty: difficulty || 'normal', played: false })
    .select()
    .single();

  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.put('/questions/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.delete('/questions/:id', async (req, res) => {
  const { id } = req.params;
  await supabase.from('questions').delete().eq('id', id);
  res.json({ ok: true });
});

// --- HOST QUESTIONS (Finale) ---

router.post('/sessions/:sessionId/host-questions', async (req, res) => {
  const { sessionId } = req.params;
  const { question_text, answer_text } = req.body;

  const { data, error } = await supabase
    .from('host_questions')
    .insert({ session_id: sessionId, question_text, answer_text, played: false })
    .select()
    .single();

  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.delete('/host-questions/:id', async (req, res) => {
  const { id } = req.params;
  await supabase.from('host_questions').delete().eq('id', id);
  res.json({ ok: true });
});

export default router;
