/*
  # Create users table for application-specific user data and roles

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users) - links to the authentication user
      - `created_at` (timestamptz, default now()) - creation timestamp
      - `updated_at` (timestamptz, default now()) - last update timestamp
      - `email` (text, unique, not null) - user's email, for convenience
      - `username` (text, unique, optional) - user's display name
      - `full_name` (text, optional) - user's full name
      - `avatar_url` (text, optional) - URL to user's avatar image
      - `role` (text, default 'user') - user's role for RBAC (e.g., 'user', 'admin', 'provider')

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to manage their own profile
    - Add a policy for new users to create their own profile upon first login/signup

  3. Notes
    - `id` column is a foreign key to `auth.users.id` and also the primary key of this table.
    - `email` is stored for convenience and quick lookups, but the primary source is `auth.users`.
    - `role` defaults to 'user' and can be extended for more complex RBAC.
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  role text DEFAULT 'user'
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trigger to automatically update updated_at for the users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
