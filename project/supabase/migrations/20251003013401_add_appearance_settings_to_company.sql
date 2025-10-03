/*
  # Add appearance customization options to company settings

  1. Changes
    - Add `primary_color` column for brand color customization
    - Add `background_gradient_start` for login page gradient start color
    - Add `background_gradient_end` for login page gradient end color
    - Add `button_color` for button customization
    - Add default values matching current design (blue theme)
  
  2. Notes
    - Colors stored as hex values (e.g., #3B82F6)
    - Allows companies to fully customize their portal appearance
    - Default values maintain current blue theme
*/

-- Add appearance customization columns
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS background_gradient_start text DEFAULT '#F8FAFC',
ADD COLUMN IF NOT EXISTS background_gradient_end text DEFAULT '#E2E8F0',
ADD COLUMN IF NOT EXISTS button_color text DEFAULT '#3B82F6';

-- Update existing row with default values if they are null
UPDATE company_settings 
SET 
  primary_color = COALESCE(primary_color, '#3B82F6'),
  background_gradient_start = COALESCE(background_gradient_start, '#F8FAFC'),
  background_gradient_end = COALESCE(background_gradient_end, '#E2E8F0'),
  button_color = COALESCE(button_color, '#3B82F6')
WHERE primary_color IS NULL 
   OR background_gradient_start IS NULL 
   OR background_gradient_end IS NULL 
   OR button_color IS NULL;