-- Running sessions
CREATE TABLE IF NOT EXISTS running_sessions (
  id SERIAL PRIMARY KEY,
  week INT NOT NULL,
  date DATE UNIQUE NOT NULL,
  day VARCHAR(10) NOT NULL,
  time VARCHAR(10) DEFAULT 'Morning',
  phase VARCHAR(50),
  workout_type VARCHAR(30),
  target_distance DECIMAL(5,1),
  target_pace VARCHAR(20),
  actual_distance DECIMAL(5,1),
  actual_pace VARCHAR(20),
  duration DECIMAL(5,1),
  moving_time VARCHAR(20),
  elevation_gain INT,
  max_elevation INT,
  warmup_done VARCHAR(5),
  how_legs_feel VARCHAR(20),
  notes TEXT
);

-- Cycling sessions
CREATE TABLE IF NOT EXISTS cycling_sessions (
  id SERIAL PRIMARY KEY,
  week INT NOT NULL,
  date DATE UNIQUE NOT NULL,
  day VARCHAR(10) NOT NULL,
  time VARCHAR(10) DEFAULT 'Evening',
  target_duration INT,
  actual_duration INT,
  how_legs_feel VARCHAR(20),
  moving_time VARCHAR(20),
  resistance_level VARCHAR(20),
  avg_heart_rate INT,
  avg_speed DECIMAL(5,1),
  elevation_gain INT,
  max_elevation INT,
  calories INT,
  rpe INT,
  notes TEXT
);

-- Weights sections (the 6 workout types)
CREATE TABLE IF NOT EXISTS weights_sections (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(10) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  day_of_week VARCHAR(15),
  location VARCHAR(20),
  exercises JSONB NOT NULL  -- [{name, bw, defaultWeight}]
);

-- Weights sessions (one row per workout session)
CREATE TABLE IF NOT EXISTS weights_sessions (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(10) NOT NULL REFERENCES weights_sections(section_key),
  week INT NOT NULL,
  date DATE NOT NULL,
  exercises JSONB NOT NULL,  -- {"Dips": {"weight":"BW","sets":[10,8,7,null],"total":25}}
  UNIQUE(section_key, date)
);
