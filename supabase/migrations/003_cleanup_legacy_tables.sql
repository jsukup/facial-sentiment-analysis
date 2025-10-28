-- Cleanup Legacy Tables Migration
-- This migration removes tables that are not part of the official schema

-- Drop legacy kv_store table if it exists
DROP TABLE IF EXISTS kv_store_8f45bf92 CASCADE;

-- Drop any other potential legacy tables that might exist
-- Add additional DROP statements here if other legacy tables are discovered

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Legacy table cleanup completed - removed kv_store_8f45bf92 and related objects';
END
$$;