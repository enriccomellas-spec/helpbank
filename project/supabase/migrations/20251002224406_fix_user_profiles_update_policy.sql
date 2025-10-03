/*
  # Fix user_profiles UPDATE policy
  
  1. Changes
    - Update UPDATE policy to check role from user_profiles table
    - This fixes the issue where admins can't update worker profiles
  
  2. Security
    - Admins can update all profiles
    - Users can update their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- Create new policy for updating profiles
CREATE POLICY "Allow updating profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  auth.uid() = id
  -- OR admins can update all profiles
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'admin'
  )
)
WITH CHECK (
  -- Users can update their own profile
  auth.uid() = id
  -- OR admins can update all profiles
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'admin'
  )
);
