/*
  # Simplify all user_profiles policies to avoid circular dependencies
  
  1. Changes
    - Simplify INSERT and UPDATE policies
    - Use simple role check without subquery
  
  2. Security
    - Users can update their own profile
    - Service role can do anything (for edge functions)
  
  Note: We'll control admin operations through edge functions with service role
*/

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Allow updating profiles" ON user_profiles;

-- INSERT: Users can create their own profile, service role can create any
CREATE POLICY "Users can create own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- INSERT: Service role can insert any profile (for create-worker function)
CREATE POLICY "Service role can insert profiles"
ON user_profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Service role can update any profile
CREATE POLICY "Service role can update profiles"
ON user_profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
