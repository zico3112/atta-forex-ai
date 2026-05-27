-- Hatta AI Forex Trading Assistant
-- Supabase Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- KNOWLEDGE BASE (RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast vector search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Function untuk semantic search
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  topic TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    topic,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks
  WHERE 1 - (embedding <=> query_embedding) > similarity_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRADE JOURNAL
-- ============================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pair TEXT NOT NULL CHECK (pair IN ('XAUUSD', 'GBPJPY', 'EURUSD', 'OTHER')),
  direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price DECIMAL(10,5),
  exit_price DECIMAL(10,5),
  sl_price DECIMAL(10,5),
  tp_price DECIMAL(10,5),
  lot_size DECIMAL(10,4),
  result TEXT CHECK (result IN ('WIN', 'LOSS', 'BREAKEVEN', 'OPEN')),
  pnl_usd DECIMAL(10,2),
  r_multiple DECIMAL(5,2),
  timeframe TEXT,
  setup_type TEXT, -- e.g. 'Sepit Pagar', 'Pin Bar', etc.
  setup_notes TEXT,
  mindset_score INT CHECK (mindset_score BETWEEN 1 AND 10),
  mindset_notes TEXT,
  screenshot_url TEXT,
  ai_review TEXT, -- AI's review of the trade
  session_number INT, -- 1, 3, 5, 7, 9 (ganjil)
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHAT HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  knowledge_refs JSONB DEFAULT '[]', -- which knowledge chunks were used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS VIEWS
-- ============================================
CREATE OR REPLACE VIEW trade_stats AS
SELECT
  user_id,
  COUNT(*) as total_trades,
  COUNT(CASE WHEN result = 'WIN' THEN 1 END) as wins,
  COUNT(CASE WHEN result = 'LOSS' THEN 1 END) as losses,
  ROUND(COUNT(CASE WHEN result = 'WIN' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
  SUM(pnl_usd) as total_pnl,
  AVG(r_multiple) as avg_r_multiple,
  AVG(mindset_score) as avg_mindset_score
FROM trades
WHERE result != 'OPEN'
GROUP BY user_id;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: user can only see/edit their own
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trades: user can only see/edit their own
CREATE POLICY "Users can manage own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

-- Admin can see all trades
CREATE POLICY "Admin can view all trades" ON trades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Chat: user can only see their own
CREATE POLICY "Users can manage own chats" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- Knowledge base: readable by all authenticated users
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read knowledge" ON knowledge_chunks
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage knowledge" ON knowledge_chunks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
