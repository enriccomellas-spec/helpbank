/*
  # Simplify cost_centers table
  
  1. Changes
    - Add description column (optional)
    - Remove any company_id references if they exist
    - Keep it simple: just name, code (optional), and description
  
  2. Notes
    - Make code optional since user wants just "Nombre/Descripción"
*/

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cost_centers' AND column_name = 'description'
  ) THEN
    ALTER TABLE cost_centers ADD COLUMN description text;
  END IF;
END $$;

-- Make code nullable (optional) if it isn't already
ALTER TABLE cost_centers ALTER COLUMN code DROP NOT NULL;
