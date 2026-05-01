export type Phase =
  | 'LOBBY'
  | 'SETUP'
  | 'CATEGORY_REVEAL'
  | 'MAIN_ROUND'
  | 'FINALE'
  | 'END';

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export interface Player {
  id: string;
  session_id: string;
  twitch_id: string;
  twitch_login: string;
  display_name: string;
  profile_image_url: string;
  created_at: string;
}

export interface Category {
  id: string;
  session_id: string;
  name: string;
  description?: string;
  owner_player_id: string;
  assigned_to_player_id: string;
  questions: Question[];
}

export interface Question {
  id: string;
  category_id: string;
  question_text: string;
  answer_text: string;
  difficulty: 'easy' | 'normal' | 'hard';
  played: boolean;
}

export interface HostQuestion {
  id: string;
  session_id: string;
  question_text: string;
  answer_text: string;
  played: boolean;
}

export interface FinaleRound {
  question_id: string;
  answering_player_id: string;
  correct: boolean;
}

export interface FinaleState {
  player1_id: string;
  player2_id: string;
  rounds: FinaleRound[];
  current_round: number;
  max_rounds: number;
  current_answering_player_id?: string;
  phase: 'PLAYING' | 'DONE';
  winner?: string;
}

export interface GameState {
  id: string;
  session_id: string;
  phase: Phase;
  scores: Record<string, number>;
  current_question_id?: string;
  current_question?: Question;
  current_category_id?: string;
  question_phase?: 'SHOW_QUESTION' | 'FINALE_QUESTION';
  finale_state?: FinaleState;
}

export interface Session {
  id: string;
  name: string;
  phase: Phase;
  created_at: string;
  game_states: GameState[];
  players: Player[];
  categories: Category[];
}

export type UserRole = 'host' | 'player' | 'overlay' | 'admin';
