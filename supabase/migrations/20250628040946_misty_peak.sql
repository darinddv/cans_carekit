/*
  # Fix messages table foreign key relationships

  1. Changes Made
    - Drop and recreate the messages table with proper foreign key references to public.users
    - Ensure foreign keys point to the correct users table that the application expects
    - Maintain all existing functionality and security policies

  2. Security
    - Preserve all existing RLS policies
    - Maintain proper access controls for messaging
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.messages CASCADE;

-- Create the messages table with correct foreign key references
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamp with time zone NULL
);

-- Add indexes for faster lookups
CREATE INDEX messages_sender_id_idx ON public.messages USING btree (sender_id);
CREATE INDEX messages_receiver_id_idx ON public.messages USING btree (receiver_id);
CREATE INDEX messages_created_at_idx ON public.messages USING btree (created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy for SELECT: Users can view messages where they are either the sender or the receiver
CREATE POLICY "Users can view their own messages" ON public.messages
FOR SELECT TO public USING (
  (auth.uid() = sender_id) OR (auth.uid() = receiver_id)
);

-- Policy for INSERT: Users can insert messages where they are the sender
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT TO public WITH CHECK (
  auth.uid() = sender_id
);

-- Policy for UPDATE: Users can update messages (e.g., mark as read) where they are the receiver
CREATE POLICY "Users can mark messages as read" ON public.messages
FOR UPDATE TO public USING (
  auth.uid() = receiver_id
) WITH CHECK (
  auth.uid() = receiver_id
);

-- Policy for DELETE: Users can delete their own sent messages
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE TO public USING (
  auth.uid() = sender_id
);