/*
  # Fix storage policies to check role from user_profiles
  
  1. Changes
    - Update storage policies to check role from user_profiles table
    - This fixes the issue where JWT doesn't contain role in app_metadata
  
  2. Security
    - Admins can upload/update/delete company logos
    - Everyone can view logos (public bucket)
*/

-- Drop existing policies
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
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Policy: Admins can update logos
CREATE POLICY "Admins can update company logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' 
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'company-logos' 
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Policy: Admins can delete logos
CREATE POLICY "Admins can delete company logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' 
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Policy: Everyone can view logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');
