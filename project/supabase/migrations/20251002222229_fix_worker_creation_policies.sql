/*
  # Fix worker creation policies
  
  1. Changes
    - Allow authenticated users to insert their own profile during signup
    - This fixes the issue where new worker profiles cannot be created
  
  2. Security
    - Users can only insert their own profile (id must match auth.uid())
    - Admins can still insert any profile
*/

-- Drop the old insert policy for admins
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;

-- Create new insert policy that allows both scenarios:
-- 1. Admins can insert any profile
-- 2. New users can insert their own profile during registration
CREATE POLICY "Allow profile creation"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Either the user is an admin
    (auth.jwt() ->> 'role' = 'admin')
    OR
    -- Or the user is creating their own profile
    (auth.uid() = id)
  );
