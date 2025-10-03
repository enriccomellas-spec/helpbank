/*
  # Simplify documents policies to avoid circular dependencies
  
  1. Changes
    - Simplify SELECT policy for admins to read all documents
    - Keep workers able to see their assigned documents
  
  2. Security
    - Admins can see all documents
    - Workers can only see documents assigned to them or their cost center
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Workers can view documents assigned to them" ON documents;

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Workers can view their documents
CREATE POLICY "Workers can view their documents"
ON documents
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR cost_center_id IN (
    SELECT cost_center_id FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'worker'
  )
);
