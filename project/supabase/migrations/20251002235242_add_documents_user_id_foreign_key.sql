/*
  # Add foreign key for documents.user_id
  
  1. Changes
    - Add foreign key constraint between documents.user_id and user_profiles.id
    - This allows proper JOIN queries in Supabase queries
  
  2. Security
    - No changes to RLS policies
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_user_id_fkey' 
    AND table_name = 'documents'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT documents_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES user_profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Also add constraint for uploaded_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_uploaded_by_fkey' 
    AND table_name = 'documents'
  ) THEN
    ALTER TABLE documents
    ADD CONSTRAINT documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by)
    REFERENCES user_profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;
