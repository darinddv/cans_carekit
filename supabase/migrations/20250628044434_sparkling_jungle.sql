/*
  # Fix Users RLS Policy for Messaging

  1. Changes Made
    - Update the SELECT policy on the users table to allow patients to view their providers' profiles
    - This enables the messaging system to properly join user data for both sender and receiver
    - Maintains existing security while enabling bidirectional profile viewing in care relationships

  2. Security
    - Users can still only view their own profile
    - Providers can still view their patients' profiles  
    - NEW: Patients can now view their providers' profiles
    - This is necessary for messaging functionality where both parties need to see each other's basic profile info
*/

-- Drop the existing SELECT policy on users table
DROP POLICY IF EXISTS "Users can view their own profile and providers can view patient" ON public.users;

-- Create updated SELECT policy that allows bidirectional viewing in care relationships
CREATE POLICY "Users can view profiles in care relationships" ON public.users
FOR SELECT USING (
  -- Users can view their own profile
  (auth.uid() = id) 
  OR 
  -- Providers can view their patients' profiles
  (EXISTS (
    SELECT 1 FROM care_relationships cr 
    WHERE cr.provider_id = auth.uid() AND cr.patient_id = users.id
  ))
  OR
  -- Patients can view their providers' profiles
  (EXISTS (
    SELECT 1 FROM care_relationships cr 
    WHERE cr.patient_id = auth.uid() AND cr.provider_id = users.id
  ))
);