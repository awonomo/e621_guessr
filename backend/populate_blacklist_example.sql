-- Example blacklist data for development/testing
-- This file is committed to the repository and contains safe placeholder entries
--
-- For production deployment:
-- 1. Copy this file to populate_blacklist.sql
-- 2. Replace the placeholder tags with your actual blacklist
-- 3. The real file is gitignored and won't be committed
--
-- The dbInit script will automatically use populate_blacklist.sql if it exists,
-- otherwise it falls back to this example file.

INSERT INTO daily_blacklist_tags (tag) VALUES
('example_sensitive_content'),
('placeholder_tag_1'),
('placeholder_tag_2'),
('development_test_tag')
ON CONFLICT (tag) DO NOTHING;