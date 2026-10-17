-- Staging anonymiser (ADR 0002 section 4). Run ONLY against the temporary staging database,
-- never against production:  psql -v ON_ERROR_STOP=1 -f anonymise.sql
-- One transaction: any error rolls everything back. Re-running on anonymised data is a no-op.
-- Catalog tables (regions, categories, product_masters, product_images, vendor_products, banners,
-- coupons, app_settings) and orders / items / wallet amounts are left untouched.
BEGIN;

-- Normalised 10-digit form of a phone, used to join across tables.
CREATE FUNCTION pg_temp.norm(p text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT right(regexp_replace(p, '\D', '', 'g'), 10) $$;

-- One mapping over every distinct number in every phone column, so cross-table links survive.
--   protected: hardcoded staff numbers, kept          anonymised: already test numbers, kept
--   others:    '2' || lpad(n, 9, '0'), numbered after the highest existing anonymised number
CREATE TEMP TABLE phone_map (
  norm  text PRIMARY KEY,
  newph text NOT NULL,
  label text NOT NULL
) ON COMMIT DROP;

INSERT INTO phone_map (norm, newph, label)
WITH src AS (
  SELECT pg_temp.norm(phone) AS norm FROM users
  UNION SELECT pg_temp.norm(phone) FROM vendors
  UNION SELECT pg_temp.norm(phone) FROM district_representatives
  UNION SELECT pg_temp.norm(phone) FROM addresses
  UNION SELECT pg_temp.norm("customerPhone") FROM order_returns
  UNION SELECT pg_temp.norm("drPhone") FROM order_returns
), kept AS (
  SELECT norm FROM src WHERE norm ~ '^(2[0-9]{9}|10000[0-9]{5}|9999999999|7777777777)$'
), base AS (
  SELECT coalesce(max(substr(norm, 2)::bigint) FILTER (WHERE norm ~ '^2[0-9]{9}$'), 0) AS b FROM kept
), todo AS (
  SELECT norm, row_number() OVER (ORDER BY norm) AS rn
  FROM src
  WHERE norm <> '' AND norm NOT IN (SELECT norm FROM kept)
)
SELECT norm, norm,
       CASE WHEN norm IN ('9999999999', '7777777777') THEN 'S' || right(norm, 4)
            WHEN norm ~ '^2[0-9]{9}$' THEN coalesce(nullif(ltrim(substr(norm, 2), '0'), ''), '0')
            ELSE norm END
FROM kept
UNION ALL
SELECT t.norm, '2' || lpad((t.rn + base.b)::text, 9, '0'), (t.rn + base.b)::text
FROM todo t, base;

-- Lookups (NULL when the value has no digits).
CREATE FUNCTION pg_temp.newph(p text) RETURNS text LANGUAGE sql STABLE AS
$$ SELECT newph FROM phone_map WHERE norm = pg_temp.norm(p) $$;
CREATE FUNCTION pg_temp.lbl(p text, id text) RETURNS text LANGUAGE sql STABLE AS
$$ SELECT coalesce((SELECT label FROM phone_map WHERE norm = pg_temp.norm(p)), left(id, 8)) $$;

-- Free text that may carry a phone or an email typed by a person. Format-agnostic: any run of 10 or
-- more digits, with up to 5 spaces, dots, dashes or brackets between digits, is a phone
-- ((981) 234-5003, 98 12 34 50 03, +91 (98123) 45003). Keep this pattern identical to verify-anon.sql.
CREATE FUNCTION pg_temp.scrub(t text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT regexp_replace(
     regexp_replace(t, '(?<![0-9])(?:[0-9][ .()\s-]{0,5}){9,}[0-9]', '[phone]', 'g'),
     '[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z.]{2,}', 'redacted@example.invalid', 'gi') $$;

-- Customers / staff users
UPDATE users SET
  name     = CASE WHEN name IS NULL THEN NULL ELSE 'Test User ' || pg_temp.lbl(phone, id) END,
  email    = CASE WHEN email IS NULL THEN NULL ELSE 'u' || pg_temp.lbl(phone, id) || '@example.invalid' END,
  password = NULL,
  phone    = coalesce(pg_temp.newph(phone), phone);

UPDATE vendors SET
  "ownerName" = 'Owner ' || pg_temp.lbl(phone, id),
  -- addedByDr can hold a DR's real name; keep only the Admin / DR distinction
  "addedByDr" = CASE WHEN "addedByDr" IS NULL OR "addedByDr" = 'Admin' THEN "addedByDr" ELSE 'DR' END,
  password   = NULL,
  phone      = coalesce(pg_temp.newph(phone), phone);

UPDATE district_representatives SET
  name     = 'DR ' || pg_temp.lbl(phone, id),
  password = NULL,
  phone    = coalesce(pg_temp.newph(phone), phone);

UPDATE addresses SET
  "fullName" = 'Customer ' || pg_temp.lbl(phone, id),
  street     = 'Street ' || pg_temp.lbl(phone, id),
  phone      = coalesce(pg_temp.newph(phone), phone);

UPDATE order_returns SET
  "customerName"  = CASE WHEN "customerName" IS NULL THEN NULL
                         ELSE 'Customer ' || pg_temp.lbl("customerPhone", id) END,
  "customerPhone" = coalesce(pg_temp.newph("customerPhone"), "customerPhone"),
  "drPhone"       = coalesce(pg_temp.newph("drPhone"), "drPhone"),
  "returnReason"  = pg_temp.scrub("returnReason");

UPDATE reviews r SET
  name    = 'Reviewer ' || n.rn,
  comment = pg_temp.scrub(r.comment)
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM reviews) n
WHERE n.id = r.id;

UPDATE wallet_transactions SET description = pg_temp.scrub(description);

-- Tokens, OTPs, logs and notifications are dropped (the raw FCM tables are created at runtime,
-- so they may not exist).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['otp_verifications', 'vendor_fcm_tokens', 'customer_fcm_tokens',
                           'audit_logs', 'notifications'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
