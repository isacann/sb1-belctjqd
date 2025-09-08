/*
  # Fix doktor_giris table RLS policy

  1. Security
    - Add RLS policy for doktor_giris table to allow SELECT operations
    - Allow public access for reading doktor_giris data (matching other tables)
    - Allow public access for INSERT operations for user management
*/

-- Enable RLS on doktor_giris table if not already enabled
ALTER TABLE doktor_giris ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (matching other tables in the schema)
CREATE POLICY "public_read_doktor_giris"
  ON doktor_giris
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow public insert access for user management
CREATE POLICY "public_insert_doktor_giris"
  ON doktor_giris
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow public update access for user management
CREATE POLICY "public_update_doktor_giris"
  ON doktor_giris
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policy to allow public delete access for user management
CREATE POLICY "public_delete_doktor_giris"
  ON doktor_giris
  FOR DELETE
  TO public
  USING (true);