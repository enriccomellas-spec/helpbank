/*
  # Fix user_profiles SELECT policy
  
  1. Changes
    - Update SELECT policy to check role from user_profiles table
    - This fixes the issue where admins can't see worker profiles
  
  2. Security
    - Admins can read all profiles
    - Users can read their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- Create new policy for reading profiles
CREATE POLICY "Allow reading profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Users can read their own profile
  auth.uid() = id
  -- OR admins can read all profiles
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'admin'
  )
);
