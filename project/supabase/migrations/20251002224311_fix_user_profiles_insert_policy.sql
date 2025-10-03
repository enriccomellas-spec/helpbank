/*
  # Fix user_profiles INSERT policy for service role
  
  1. Changes
    - Allow service role (used by edge functions) to insert profiles
    - Keep existing admin and self-creation permissions
  
  2. Security
    - Service role can create any profile (used by create-worker function)
    - Admins can create profiles
    - Users can create their own profile
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

-- Create new policy that allows service role
CREATE POLICY "Allow profile creation"
ON user_profiles
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  -- Service role (edge functions) can create any profile
  (auth.jwt() ->> 'role' = 'service_role')
  -- OR admin users can create profiles
  OR (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ))
  -- OR users can create their own profile
  OR (auth.uid() = id)
);
