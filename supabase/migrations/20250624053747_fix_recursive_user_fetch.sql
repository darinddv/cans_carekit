-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- Recreate the policy to allow authenticated users to view their own profile
-- and to allow providers to view patient profiles for role lookup without recursion
CREATE POLICY "Users can view their own profile and providers can view patient profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.care_relationships cr
      WHERE cr.provider_id = auth.uid()
        AND cr.patient_id = users.id
    )
  );
