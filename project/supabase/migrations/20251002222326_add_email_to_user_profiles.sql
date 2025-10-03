/*
  # Add email to user_profiles
  
  1. Changes
    - Add email column to user_profiles table
    - This allows displaying worker emails without admin API calls
  
  2. Notes
    - Email will be stored during worker creation
    - Makes it easier to search and display worker information
*/

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text;
  END IF;
END $$;
