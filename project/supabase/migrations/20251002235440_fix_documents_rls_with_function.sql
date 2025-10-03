/*
  # Fix documents RLS policies using helper function
  
  1. Changes
    - Create a helper function to check if user is admin
    - Simplify SELECT policies to avoid circular dependencies
  
  2. Security
    - Admins can see all documents
    - Workers can see their assigned documents
*/

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Workers can view their documents" ON documents;

-- Admins can view all documents (using helper function)
CREATE POLICY "Admins can view all documents"
ON documents
FOR SELECT
TO authenticated
USING (is_admin());

-- Workers can view documents assigned to them
CREATE POLICY "Workers can view assigned documents"
ON documents
FOR SELECT
TO authenticated
USING (
  NOT is_admin() 
  AND (
    user_id = auth.uid()
    OR cost_center_id IN (
      SELECT cost_center_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
);
