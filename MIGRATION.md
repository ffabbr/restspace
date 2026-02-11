# Database Migration: Aspiration → Affirmation

## Overview
This migration renames the category "aspiration" to "affirmation" in the thoughts table.

## Required Database Changes

### For PostgreSQL (Production)

Run the following SQL command to update existing records:

```sql
UPDATE thoughts 
SET category = 'affirmation' 
WHERE category = 'aspiration';
```

### For SQLite (Local Development)

Run the following SQL command to update existing records:

```sql
UPDATE thoughts 
SET category = 'affirmation' 
WHERE category = 'aspiration';
```

## Migration Steps

### Option 1: Manual Migration (Recommended for Production)

1. **Backup your database** before making any changes
2. Connect to your database using your preferred SQL client
3. Run the UPDATE statement above
4. Verify the migration:
   ```sql
   SELECT COUNT(*) FROM thoughts WHERE category = 'affirmation';
   SELECT COUNT(*) FROM thoughts WHERE category = 'aspiration';
   ```
   The second query should return 0.
5. Deploy the new code

### Option 2: Using psql (PostgreSQL)

```bash
# Example with environment variable
psql $DATABASE_URL -c "UPDATE thoughts SET category = 'affirmation' WHERE category = 'aspiration';"

# Or with connection string directly
psql "your-connection-string" -c "UPDATE thoughts SET category = 'affirmation' WHERE category = 'aspiration';"
```

### Option 3: Using sqlite3 (Local Development)

```bash
sqlite3 local.db "UPDATE thoughts SET category = 'affirmation' WHERE category = 'aspiration';"
```

## Verification

After migration, you can verify the changes with:

```sql
-- Check for any remaining 'aspiration' records (should be 0)
SELECT COUNT(*) FROM thoughts WHERE category = 'aspiration';

-- View all categories currently in use
SELECT category, COUNT(*) as count 
FROM thoughts 
GROUP BY category;
```

Expected categories after migration:
- thought
- diary
- affirmation

## Rollback

If you need to rollback this change:

```sql
UPDATE thoughts 
SET category = 'aspiration' 
WHERE category = 'affirmation';
```

**Important**: Make sure to rollback the code changes as well if you perform a database rollback.

## No Data Loss

This migration is **safe and will not lose any data**. It only updates the category field value from "aspiration" to "affirmation". All other fields (content, font, color, user_id, created_at, etc.) remain unchanged.

The UPDATE statement:
- Uses a WHERE clause to only affect records with category = 'aspiration'
- Does not delete any records
- Does not modify any other fields
- Can be rolled back if needed
