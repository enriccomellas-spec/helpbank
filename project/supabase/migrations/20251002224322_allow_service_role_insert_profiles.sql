/*
  # Allow service role to insert user profiles
  
  1. Changes
    - Drop restrictive policy and create a simpler one
    - Service role bypasses RLS anyway, but we need to allow authenticated inserts from admins
  
  2. Security
    - Admins can create worker profiles
    - Users can create their own profile
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

-- Create policy for authenticated users
CREATE POLICY "Allow profile creation"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins can create profiles
  (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'admin'
  ))
  -- OR users can create their own profile
  OR (auth.uid() = id)
);

-- Create a separate policy for service role (edge functions with service key)
CREATE POLICY "Service role can insert profiles"
ON user_profiles
FOR INSERT
TO service_role
WITH CHECK (true);
