-- ============================================================
-- PORRA MUNDIAL 2026 — Schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- PROFILES (extiende auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  total_points INTEGER DEFAULT 0,
  predictions_count INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATCHES (partidos del Mundial)
-- ============================================================
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT,
  away_flag TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  round TEXT NOT NULL,
  venue TEXT,
  status TEXT DEFAULT 'NS',
  home_score INTEGER,
  away_score INTEGER,
  winner TEXT CHECK (winner IN ('home', 'away', 'draw')),
  is_knockout BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PREDICTIONS (predicciones de usuarios)
-- ============================================================
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  prediction TEXT NOT NULL CHECK (prediction IN ('home', 'draw', 'away')),
  points INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Profiles: todos leen, cada usuario modifica el suyo
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Matches: todos leen, solo admins escriben
CREATE POLICY "matches_select" ON matches FOR SELECT USING (TRUE);
CREATE POLICY "matches_admin_write" ON matches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Predictions: todos leen, usuarios insertan/actualizan las suyas antes del partido
CREATE POLICY "predictions_select" ON predictions FOR SELECT USING (TRUE);
CREATE POLICY "predictions_insert" ON predictions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_id AND status = 'NS' AND match_date > NOW()
  )
);
CREATE POLICY "predictions_update" ON predictions FOR UPDATE USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_id AND status = 'NS' AND match_date > NOW()
  )
);

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================================
-- TRIGGER: actualizar puntos totales al puntuar predicción
-- ============================================================
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    total_points = (
      SELECT COALESCE(SUM(points), 0)
      FROM predictions
      WHERE user_id = NEW.user_id AND points IS NOT NULL
    ),
    predictions_count = (
      SELECT COUNT(*) FROM predictions WHERE user_id = NEW.user_id
    ),
    correct_predictions = (
      SELECT COUNT(*) FROM predictions WHERE user_id = NEW.user_id AND points > 0
    )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_prediction_upserted
  AFTER INSERT OR UPDATE ON predictions
  FOR EACH ROW EXECUTE PROCEDURE update_user_points();

-- ============================================================
-- HACER ADMIN AL PRIMER USUARIO (ejecutar manualmente)
-- Sustituye 'tu@email.com' por tu email
-- ============================================================
-- UPDATE profiles SET is_admin = TRUE
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'tu@email.com');
