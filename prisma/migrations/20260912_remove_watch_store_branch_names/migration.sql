-- Remove legacy watch-store branch naming from admin / payslip surfaces
UPDATE "Branch"
SET
  name = CASE
    WHEN name ~* '^\s*ca\s+watch\s+store\s*$' THEN 'Cosy Aura — Accra'
    WHEN name ~* 'watch\s*store' THEN regexp_replace(trim(name), '(?i)\s*watch\s*store\s*', '', 'g')
    ELSE name
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE name ~* 'watch\s*store';
