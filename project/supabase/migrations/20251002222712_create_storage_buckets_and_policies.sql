/*
  # Create storage buckets and policies
  
  1. New Buckets
    - `company-logos` - For company logo uploads (public access)
  
  2. Security Policies
    - Admins can upload logos
    - Admins can update logos
    - Admins can delete logos
    - Everyone can view logos (public bucket)
*/

-- Create company-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;

-- Policy: Admins can upload logos
CREATE POLICY "Admins can upload company logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' 
  AND (auth.jwt() ->> 'role' = 'admin')
);

-- Policy: Admins can update logos
CREATE POLICY "Admins can update company logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' 
  AND (auth.jwt() ->> 'role' = 'admin')
)
WITH CHECK (
  bucket_id = 'company-logos' 
  AND (auth.jwt() ->> 'role' = 'admin')
);

-- Policy: Admins can delete logos
CREATE POLICY "Admins can delete company logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' 
  AND (auth.jwt() ->> 'role' = 'admin')
);

-- Policy: Everyone can view logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');
