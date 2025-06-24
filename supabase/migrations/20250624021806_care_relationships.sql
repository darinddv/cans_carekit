/*
  # Create care_relationships table and update tasks RLS for provider-patient task management

  1. New Tables
    - `care_relationships`
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references auth.users) - The ID of the healthcare provider
      - `patient_id` (uuid, references auth.users) - The ID of the patient
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - Unique constraint on (provider_id, patient_id) to prevent duplicate relationships

  2. Security
    - Enable RLS on `care_relationships` table
    - Add policies for `care_relationships`:
      - SELECT: Authenticated users can view relationships where they are the provider_id or the patient_id.
      - INSERT: Authenticated users with the 'provider' role can create new relationships for their patients.
      - DELETE: Authenticated users with the 'provider' role can delete relationships they created.
    - Modify RLS on `tasks` table:
      - Allow authenticated users (patients) to manage their own tasks.
      - Allow authenticated users (providers) to manage tasks for patients they are linked to via `care_relationships`.

  3. Notes
    - The `update_updated_at_column()` function is assumed to be already defined in a previous migration.
    - This migration ensures type safety and consistency with application logic.
*/

-- Create care_relationships table
CREATE TABLE IF NOT EXISTS care_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (provider_id, patient_id)
);

-- Enable Row Level Security for care_relationships
ALTER TABLE care_relationships ENABLE ROW LEVEL SECURITY;

-- Policies for care_relationships table
CREATE POLICY "Authenticated users can view their own care relationships"
  ON care_relationships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id OR auth.uid() = patient_id);

CREATE POLICY "Providers can insert new care relationships"
  ON care_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider');

CREATE POLICY "Providers can delete their care relationships"
  ON care_relationships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = provider_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider');

-- Create trigger to automatically update updated_at for the care_relationships table
CREATE TRIGGER update_care_relationships_updated_at
    BEFORE UPDATE ON care_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Modify RLS policies on the tasks table
-- First, drop existing authenticated policies to recreate them with the new logic
DROP POLICY IF EXISTS "Authenticated users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete own tasks" ON tasks;

-- Recreate policies for authenticated users to manage their own tasks OR tasks of their patients
CREATE POLICY "Authenticated users can view own tasks or their patients' tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = tasks.user_id
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider'
    )
  );

CREATE POLICY "Authenticated users can insert own tasks or their patients' tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = tasks.user_id
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider'
    )
  );

CREATE POLICY "Authenticated users can update own tasks or their patients' tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = tasks.user_id
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = tasks.user_id
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider'
    )
  );

CREATE POLICY "Authenticated users can delete own tasks or their patients' tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = tasks.user_id
        AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'provider'
    )
  );

-- Add indexes for care_relationships for better performance
CREATE INDEX IF NOT EXISTS care_relationships_provider_id_idx ON care_relationships(provider_id);
CREATE INDEX IF NOT EXISTS care_relationships_patient_id_idx ON care_relationships(patient_id);
