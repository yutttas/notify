-- Supabase schema for futare (夫婦のすれ違い診断アプリ)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'completed')),
  summary_report TEXT,
  gap_grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Answers table
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('host', 'guest')),
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(room_id, user_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_answers_room_id ON answers(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies - すべての操作を許可（認証不要のMVP）
CREATE POLICY "Allow all operations on rooms" ON rooms
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on answers" ON answers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_answers_updated_at BEFORE UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
