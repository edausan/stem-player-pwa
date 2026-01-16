-- Migration: Add is_public column to songs table
-- Run this in Supabase SQL Editor if you get the error about missing 'is_public' column

-- Add is_public column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'songs' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE songs ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL;
    
    -- Create index for faster queries on public songs
    CREATE INDEX IF NOT EXISTS idx_songs_is_public ON songs(is_public) WHERE is_public = TRUE;
    
    RAISE NOTICE 'Column is_public added successfully';
  ELSE
    RAISE NOTICE 'Column is_public already exists';
  END IF;
END $$;

-- Update RLS policy to include is_public check (if not already updated)
DROP POLICY IF EXISTS "Users can view own or public songs" ON songs;

CREATE POLICY "Users can view own or public songs"
  ON songs FOR SELECT
  USING (
    auth.uid() = user_id OR 
    is_public = TRUE
  );
