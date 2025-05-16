
-- Remove the existing unique constraint on block_number
ALTER TABLE leave_blocks DROP CONSTRAINT IF EXISTS leave_blocks_block_number_key;

-- Add a new compound unique constraint on block_number + split_designation (allowing nulls in split_designation)
ALTER TABLE leave_blocks ADD CONSTRAINT leave_blocks_block_number_split_designation_key 
  UNIQUE (block_number, COALESCE(split_designation, 'NONE'));

-- Add an index to improve query performance on these columns
CREATE INDEX IF NOT EXISTS idx_leave_blocks_block_number_split ON leave_blocks (block_number, split_designation);
