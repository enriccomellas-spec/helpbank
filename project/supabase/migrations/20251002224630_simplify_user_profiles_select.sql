/*
  # Simplify user_profiles SELECT policy to avoid circular dependency
  
  1. Changes
    - Simplify SELECT policy to allow users to read any profile
    - This avoids circular dependency when checking if user is admin
  
  2. Security
    - All authenticated users can read profiles (needed for the app to function)
    - Data is still protected by authentication requirement
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Allow reading profiles" ON user_profiles;

-- Create simpler policy that allows all authenticated users to read profiles
CREATE POLICY "Authenticated users can read profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (true);
