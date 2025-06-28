/*
  # Fix message visibility policies
  
  1. Changes Made
    - Drop and recreate RLS policies with proper role specifications
    - Ensure both authenticated and anonymous users can access messages
    - Fix policy targeting to work for all user types
  
  2. Security
    - Maintain security while ensuring proper access
    - Users can only see messages they sent or received
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Create new policies with proper role specifications

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