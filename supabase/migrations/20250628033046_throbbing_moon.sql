/*
  # Create symptom tracking tables for mental and behavioral health

  1. New Tables
    - `symptom_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - category name (mood, anxiety, energy, sleep, pain, etc.)
      - `description` (text) - category description
      - `color` (text) - hex color for UI
      - `icon` (text) - icon name for UI
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz, default now())

    - `symptom_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - patient logging the symptom
      - `category_id` (uuid, references symptom_categories) - symptom category
      - `severity` (integer, 1-10) - severity rating
      - `notes` (text, optional) - additional notes
      - `triggers` (text[], optional) - array of trigger factors
      - `coping_strategies` (text[], optional) - array of coping methods used
      - `mood_tags` (text[], optional) - mood descriptors
      - `logged_at` (timestamptz, default now()) - when symptom occurred
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `assessment_templates`
      - `id` (uuid, primary key)
      - `name` (text) - assessment name
      - `description` (text) - assessment description
      - `questions` (jsonb) - array of questions with options
      - `frequency` (text) - daily, weekly, etc.
      - `target_audience` (text) - adolescent, adult, etc.
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz, default now())

    - `assessment_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `template_id` (uuid, references assessment_templates)
      - `responses` (jsonb) - question responses
      - `score` (integer) - calculated score
      - `completed_at` (timestamptz, default now())
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for patients to manage their own data
    - Add policies for providers to view their patients' data

  3. Indexes
    - Performance indexes for common queries
*/

-- Create symptom_categories table
CREATE TABLE IF NOT EXISTS symptom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#007AFF',
  icon text DEFAULT 'activity',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create symptom_logs table
CREATE TABLE IF NOT EXISTS symptom_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES symptom_categories(id) ON DELETE CASCADE,
  severity integer NOT NULL CHECK (severity >= 1 AND severity <= 10),
  notes text,
  triggers text[],
  coping_strategies text[],
  mood_tags text[],
  logged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_templates table
CREATE TABLE IF NOT EXISTS assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  questions jsonb NOT NULL,
  frequency text DEFAULT 'daily',
  target_audience text DEFAULT 'adult',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create assessment_responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
  responses jsonb NOT NULL,
  score integer,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE symptom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

-- Policies for symptom_categories (public read)
CREATE POLICY "Anyone can view active symptom categories"
  ON symptom_categories
  FOR SELECT
  USING (is_active = true);

-- Policies for symptom_logs
CREATE POLICY "Users can view their own symptom logs"
  ON symptom_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = symptom_logs.user_id
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider'
    )
  );

CREATE POLICY "Users can insert their own symptom logs"
  ON symptom_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symptom logs"
  ON symptom_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptom logs"
  ON symptom_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for assessment_templates (public read for active templates)
CREATE POLICY "Anyone can view active assessment templates"
  ON assessment_templates
  FOR SELECT
  USING (is_active = true);

-- Policies for assessment_responses
CREATE POLICY "Users can view their own assessment responses"
  ON assessment_responses
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = assessment_responses.user_id
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider'
    )
  );

CREATE POLICY "Users can insert their own assessment responses"
  ON assessment_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessment responses"
  ON assessment_responses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_symptom_logs_updated_at
    BEFORE UPDATE ON symptom_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS symptom_logs_user_id_idx ON symptom_logs(user_id);
CREATE INDEX IF NOT EXISTS symptom_logs_category_id_idx ON symptom_logs(category_id);
CREATE INDEX IF NOT EXISTS symptom_logs_logged_at_idx ON symptom_logs(logged_at);
CREATE INDEX IF NOT EXISTS symptom_logs_severity_idx ON symptom_logs(severity);

CREATE INDEX IF NOT EXISTS assessment_responses_user_id_idx ON assessment_responses(user_id);
CREATE INDEX IF NOT EXISTS assessment_responses_template_id_idx ON assessment_responses(template_id);
CREATE INDEX IF NOT EXISTS assessment_responses_completed_at_idx ON assessment_responses(completed_at);

-- Insert default symptom categories
INSERT INTO symptom_categories (name, description, color, icon) VALUES
  ('Mood', 'Overall emotional state and feelings', '#FF6B6B', 'heart'),
  ('Anxiety', 'Feelings of worry, nervousness, or unease', '#4ECDC4', 'zap'),
  ('Energy', 'Physical and mental energy levels', '#45B7D1', 'battery'),
  ('Sleep', 'Sleep quality and patterns', '#96CEB4', 'moon'),
  ('Pain', 'Physical discomfort or pain levels', '#FFEAA7', 'alert-circle'),
  ('Focus', 'Concentration and attention levels', '#DDA0DD', 'target'),
  ('Social', 'Social interactions and relationships', '#98D8C8', 'users'),
  ('Appetite', 'Hunger and eating patterns', '#F7DC6F', 'utensils')
ON CONFLICT (name) DO NOTHING;

-- Insert sample assessment templates
INSERT INTO assessment_templates (name, description, questions, frequency, target_audience) VALUES
  (
    'Daily Mood Check',
    'Quick daily assessment of mood and energy',
    '[
      {
        "id": "mood",
        "question": "How would you describe your overall mood today?",
        "type": "scale",
        "scale": {"min": 1, "max": 10, "labels": {"1": "Very Low", "10": "Very High"}}
      },
      {
        "id": "energy",
        "question": "What was your energy level today?",
        "type": "scale",
        "scale": {"min": 1, "max": 10, "labels": {"1": "Exhausted", "10": "Energetic"}}
      },
      {
        "id": "stress",
        "question": "How stressed did you feel today?",
        "type": "scale",
        "scale": {"min": 1, "max": 10, "labels": {"1": "Not at all", "10": "Extremely"}}
      }
    ]',
    'daily',
    'adult'
  ),
  (
    'Weekly Anxiety Assessment',
    'Comprehensive weekly anxiety evaluation',
    '[
      {
        "id": "worry_frequency",
        "question": "How often did you experience excessive worry this week?",
        "type": "multiple_choice",
        "options": ["Never", "Rarely", "Sometimes", "Often", "Always"]
      },
      {
        "id": "physical_symptoms",
        "question": "Which physical symptoms did you experience?",
        "type": "checkbox",
        "options": ["Racing heart", "Sweating", "Trembling", "Shortness of breath", "Nausea", "Dizziness"]
      },
      {
        "id": "impact_daily",
        "question": "How much did anxiety impact your daily activities?",
        "type": "scale",
        "scale": {"min": 1, "max": 10, "labels": {"1": "Not at all", "10": "Completely"}}
      }
    ]',
    'weekly',
    'adult'
  )
ON CONFLICT DO NOTHING;