-- Fails (RAISE EXCEPTION, non-zero exit with -v ON_ERROR_STOP=1) when the database still holds
-- anything that looks like a real phone number or email. Names every offending column.
-- Fix catalog false positives with explicit rules in anonymise.sql, never by loosening a regex here.
DO $$
DECLARE
  r record;
  n bigint;
  bad bigint := 0;
  cols text[] := ARRAY[]::text[];
  allowed constant text := '^(2[0-9]{9}|10000[0-9]{5}|9999999999|7777777777)$';
  mobile  constant text := '(^|[^0-9])(91|0)?[6-9][0-9]{9}([^0-9]|$)';
  email   constant text := '[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z.]{2,}';
BEGIN
  -- 1. Known phone columns: only anonymised, test or hardcoded staff numbers
  FOR r IN SELECT * FROM (VALUES
      ('users', 'phone'), ('vendors', 'phone'), ('district_representatives', 'phone'),
      ('addresses', 'phone'), ('order_returns', 'customerPhone'), ('order_returns', 'drPhone'),
      ('vendor_fcm_tokens', 'phone'), ('customer_fcm_tokens', 'phone'), ('otp_verifications', 'phone')
    ) AS k(t, c) LOOP
    CONTINUE WHEN to_regclass(format('public.%I', r.t)) IS NULL;
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I IS NOT NULL AND regexp_replace(%I, ''\D'', '''', ''g'') <> '''' '
      'AND right(regexp_replace(%I, ''\D'', '''', ''g''), 10) !~ $1', r.t, r.c, r.c, r.c) INTO n USING allowed;
    IF n > 0 THEN
      RAISE WARNING 'phone column not anonymised: %.% (% rows)', r.t, r.c, n;
      bad := bad + n; cols := cols || (r.t || '.' || r.c);
    END IF;
  END LOOP;

  -- 2. Every text/varchar/json/jsonb column in public: no 6-9 mobile, no real-looking email
  FOR r IN SELECT c.table_name AS t, c.column_name AS c
           FROM information_schema.columns c
           JOIN information_schema.tables x
             ON x.table_schema = c.table_schema AND x.table_name = c.table_name AND x.table_type = 'BASE TABLE'
           WHERE c.table_schema = 'public' AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
           ORDER BY 1, 2 LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE (%I)::text ~ $1 AND (%I)::text !~ ''^(9999999999|7777777777)$''',
      r.t, r.c, r.c) INTO n USING mobile;
    IF n > 0 THEN
      RAISE WARNING 'phone-like value: %.% (% rows)', r.t, r.c, n;
      bad := bad + n; cols := cols || (r.t || '.' || r.c);
    END IF;
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE (%I)::text ~* $1 AND (%I)::text !~* ''@example\.invalid''',
      r.t, r.c, r.c) INTO n USING email;
    IF n > 0 THEN
      RAISE WARNING 'email-like value: %.% (% rows)', r.t, r.c, n;
      bad := bad + n; cols := cols || (r.t || '.' || r.c);
    END IF;
  END LOOP;

  -- 3. Tables that must be empty
  FOR r IN SELECT unnest(ARRAY['otp_verifications', 'vendor_fcm_tokens', 'customer_fcm_tokens',
                               'audit_logs', 'notifications']) AS t LOOP
    CONTINUE WHEN to_regclass(format('public.%I', r.t)) IS NULL;
    EXECUTE format('SELECT count(*) FROM public.%I', r.t) INTO n;
    IF n > 0 THEN
      RAISE WARNING 'table not empty: % (% rows)', r.t, n;
      bad := bad + n; cols := cols || r.t;
    END IF;
  END LOOP;

  IF bad > 0 THEN
    RAISE EXCEPTION 'anonymisation check failed: % values in %', bad, (SELECT string_agg(DISTINCT x, ', ') FROM unnest(cols) x);
  END IF;
END $$;
