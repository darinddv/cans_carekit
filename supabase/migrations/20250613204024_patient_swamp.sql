/*
  # Create tasks table for care management

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key) - matches the string id in TypeScript
      - `title` (text, required) - task title
      - `time` (text, required) - scheduled time as string
      - `completed` (boolean, default false) - completion status
      - `user_id` (uuid, references auth.users) - owner of the task
      - `created_at` (timestamptz, default now()) - creation timestamp
      - `updated_at` (timestamptz, default now()) - last update timestamp

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for authenticated and anonymous users to manage their own tasks
    - Create indexes for better performance

  3. Notes
    - Table name matches the code expectation (`tasks`)
    - All fields align with TypeScript interface
    - Supports both authenticated and anonymous users
    - Optimized for the care management use case
*/

-- Drop existing table if it exists (cleanup)
DROP TABLE IF EXISTS care_tasks;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  time text NOT NULL,
  completed boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for anonymous users
CREATE POLICY "Anonymous users can view own tasks"
  ON tasks
  FOR SELECT
  TO anon
  USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can insert own tasks"
  ON tasks
  FOR INSERT
  TO anon
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can update own tasks"
  ON tasks
  FOR UPDATE
  TO anon
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can delete own tasks"
  ON tasks
  FOR DELETE
  TO anon
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at);
CREATE INDEX IF NOT EXISTS tasks_completed_idx ON tasks(completed);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();