/*
  # Create care tasks table

  1. New Tables
    - `care_tasks`
      - `id` (uuid, primary key)
      - `title` (text, task title)
      - `time` (text, scheduled time)
      - `completed` (boolean, completion status)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `care_tasks` table
    - Add policies for authenticated users to manage their own tasks
*/

-- Create care_tasks table
CREATE TABLE IF NOT EXISTS care_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  time text NOT NULL,
  completed boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own care tasks"
  ON care_tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own care tasks"
  ON care_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own care tasks"
  ON care_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own care tasks"
  ON care_tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous users to manage their own tasks
CREATE POLICY "Anonymous users can view own care tasks"
  ON care_tasks
  FOR SELECT
  TO anon
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can insert own care tasks"
  ON care_tasks
  FOR INSERT
  TO anon
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can update own care tasks"
  ON care_tasks
  FOR UPDATE
  TO anon
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can delete own care tasks"
  ON care_tasks
  FOR DELETE
  TO anon
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS care_tasks_user_id_idx ON care_tasks(user_id);
CREATE INDEX IF NOT EXISTS care_tasks_created_at_idx ON care_tasks(created_at);