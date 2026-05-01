-- ============================================
-- QUIZSHOW DATABASE SCHEMA
-- Run this in Supabase SQL editor
-- ============================================

-- Sessions (game lobbies)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'LOBBY',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players in a session (linked via Twitch)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  twitch_id TEXT NOT NULL,
  twitch_login TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, twitch_id)
);

-- Categories (3 per player, distributed to others)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  assigned_to_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions per category
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  difficulty TEXT DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard')),
  played BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Host questions (for the finale)
CREATE TABLE host_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  played BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game state (one per session, updated in real-time)
CREATE TABLE game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  phase TEXT NOT NULL DEFAULT 'LOBBY',
  scores JSONB DEFAULT '{}',
  current_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  current_question JSONB,
  current_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  question_phase TEXT,
  finale_state JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_session ON players(session_id);
CREATE INDEX idx_categories_session ON categories(session_id);
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_host_questions_session ON host_questions(session_id);
CREATE INDEX idx_game_states_session ON game_states(session_id);

-- RLS: Disable for service key usage (backend handles auth)
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE host_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_states DISABLE ROW LEVEL SECURITY;
