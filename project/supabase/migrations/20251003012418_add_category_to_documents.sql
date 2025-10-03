/*
  # Add category column to documents table

  1. Changes
    - Add `category` column to `documents` table
      - Type: text
      - Nullable: true (optional field)
      - Allows categorizing documents for easier filtering
  
  2. Notes
    - Existing documents will have null category
    - Valid categories: reuniones, presentaciones, informes, analisis, produccion, otros
*/

-- Add category column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS category text;

-- Add a check constraint to ensure valid categories (optional but recommended)
ALTER TABLE documents 
ADD CONSTRAINT valid_category CHECK (
  category IS NULL OR 
  category IN ('reuniones', 'presentaciones', 'informes', 'analisis', 'produccion', 'otros')
);