-- Additional Ghana retail revenue accounts

INSERT INTO "GlAccount" ("id", "country", "code", "name", "type", "updatedAt") VALUES
  ('glacc_gh_4040', 'GH', '4040', 'Retail Sales - Watches', 'REVENUE', CURRENT_TIMESTAMP),
  ('glacc_gh_4050', 'GH', '4050', 'Retail Sales - Shirts', 'REVENUE', CURRENT_TIMESTAMP),
  ('glacc_gh_4060', 'GH', '4060', 'Retail Sales - Shoes', 'REVENUE', CURRENT_TIMESTAMP),
  ('glacc_gh_4070', 'GH', '4070', 'Retail Sales - Sunglasses', 'REVENUE', CURRENT_TIMESTAMP),
  ('glacc_gh_4080', 'GH', '4080', 'Retail Sales - Jewelry', 'REVENUE', CURRENT_TIMESTAMP)
ON CONFLICT ("country", "code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
