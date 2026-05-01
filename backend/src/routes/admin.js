import express from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// --- TWITCH LOOKUP ---

let appAccessToken = null;
let tokenExpiry = 0;

async function getTwitchAppToken() {
  if (appAccessToken && Date.now() < tokenExpiry) return appAccessToken;
  const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    },
  });
  appAccessToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return appAccessToken;
}

router.get('/twitch-user/:login', async (req, res) => {
  try {
    const token = await getTwitchAppToken();
    const { data } = await axios.get('https://api.twitch.tv/helix/users', {
      params: { login: req.params.login },
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    });
    const user = data.data[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      twitch_id: user.id,
      twitch_login: user.login,
      display_name: user.display_name,
      profile_image_url: user.profile_image_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
