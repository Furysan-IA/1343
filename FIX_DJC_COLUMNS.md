# Fix DJC Columns - Quick Guide

## Problem
Your application is throwing 400 errors because the `djc` table is missing required columns:
- `djc_source`
- `is_active`
- `djc_version`
- `replaced_by`
- `is_simplified`

## Solution

### Option 1: Execute SQL in Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/gmwwvowphjxmertcedtt

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute the SQL**
   - Open the file `fix_djc_columns.sql` in this project
   - Copy all the SQL content
   - Paste it into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify Success**
   - You should see messages like "Added [column_name] column"
   - The final message should say "✓ Migration complete! Added 5 columns to djc table"

5. **Refresh Your Application**
   - Reload your web application
   - Try generating a DJC again - the errors should be gone!

### Option 2: Quick Copy-Paste SQL

If you prefer, here's the essential SQL to run:

```sql
-- Add all required columns
ALTER TABLE djc ADD COLUMN IF NOT EXISTS djc_source text DEFAULT 'auto_generated';
ALTER TABLE djc ADD COLUMN IF NOT EXISTS djc_version integer DEFAULT 1;
ALTER TABLE djc ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE djc ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES djc(id);
ALTER TABLE djc ADD COLUMN IF NOT EXISTS is_simplified boolean DEFAULT false NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_djc_is_active ON djc(is_active);
CREATE INDEX IF NOT EXISTS idx_djc_source ON djc(djc_source);
```

## What Each Column Does

- **djc_source**: Tracks whether the DJC was auto-generated or manually uploaded
- **djc_version**: Version number (increments when DJC is replaced)
- **is_active**: Marks which version is currently shown to users
- **replaced_by**: Links to the newer version (if this DJC was replaced)
- **is_simplified**: Indicates if the simplified template was used

## After Running the Migration

Once the migration is complete:
1. ✅ The 400 Bad Request errors will be fixed
2. ✅ You'll be able to generate DJCs successfully
3. ✅ Version tracking will work properly
4. ✅ Manual uploads will be distinguished from auto-generated DJCs

## Need Help?

If you encounter any issues:
1. Check the Supabase Dashboard logs
2. Verify you have proper permissions on the database
3. Make sure you're using the correct project (gmwwvowphjxmertcedtt)
