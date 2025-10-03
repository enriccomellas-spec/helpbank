/*
  # Use app_metadata for RLS policies
  
  1. Changes
    - Drop all existing RLS policies on user_profiles
    - Create new policies that use auth.jwt() to check the role from app_metadata
    - This avoids circular dependency issues
  
  2. Security
    - Users can read and update their own profile
    - Admins (identified by role in app_metadata) can manage all profiles
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Policy for users to read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy for admins to read all profiles (using app_metadata)
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR auth.uid() = id
  );

-- Policy for admins to insert profiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- Policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- Policy for admins to delete profiles
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );
