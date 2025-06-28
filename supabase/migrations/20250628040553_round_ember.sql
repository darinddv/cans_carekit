/*
  # Create messages table for secure communication

  1. Changes Made
    - Create 'messages' table to store instant messages between users.
    - Add 'sender_id' and 'receiver_id' as foreign keys to 'auth.users'.
    - Include 'content' for message text and 'read_at' for read status.

  2. Security
    - Enable Row Level Security (RLS) on the 'messages' table.
    - Define RLS policies for SELECT, INSERT, UPDATE, and DELETE to ensure message privacy.
*/

-- Create the messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
FOR SELECT USING (
  (auth.uid() = sender_id) OR (auth.uid() = receiver_id)
);

-- Policy for INSERT: Users can insert messages where they are the sender
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Policy for UPDATE: Users can update messages (e.g., mark as read) where they are the receiver
CREATE POLICY "Users can mark messages as read" ON public.messages
FOR UPDATE USING (
  auth.uid() = receiver_id
) WITH CHECK (
  auth.uid() = receiver_id
);

-- Policy for DELETE: Users can delete their own sent messages
CREATE POLICY "Users can delete their own messages" ON public.messages
FOR DELETE USING (
  auth.uid() = sender_id
);