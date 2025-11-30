-- Add category_reports column to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS category_reports JSONB;

-- Add comment to explain the column
COMMENT ON COLUMN rooms.category_reports IS 'Array of category reports with category, categoryName, status, and report fields';
