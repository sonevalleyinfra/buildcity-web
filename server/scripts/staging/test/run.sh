#!/usr/bin/env bash
# Tests anonymise.sql / verify-anon.sql on a throwaway postgres:17 container (no network port,
# DUMMYPASS, no real data). Needs docker and server/node_modules (prisma, for the schema DDL).
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
stg="$(dirname "$here")"
server="$(cd "$stg/../.." && pwd)"
C="buildcity-anon-test-$$"
work="$(mktemp -d)"
pass=0; fail=0
ok() { pass=$((pass + 1)); echo "ok   - $1"; }
ko() { fail=$((fail + 1)); echo "FAIL - $1"; }
check() { if eval "$2"; then ok "$1"; else ko "$1"; fi; }
cleanup() { docker stop "$C" >/dev/null 2>&1; }
trap cleanup EXIT

q() { docker exec -i "$C" psql -U postgres -X -q -At -v ON_ERROR_STOP=1 -d "$@"; }   # q <db> [psql args]

docker run --rm -d --name "$C" -e POSTGRES_PASSWORD=DUMMYPASS postgres:17 >/dev/null || { echo "docker run failed"; exit 1; }
for i in $(seq 1 60); do docker exec "$C" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
# the entrypoint restarts postgres once after init; wait for a real query to succeed
for i in $(seq 1 60); do q postgres -c 'select 1' >/dev/null 2>&1 && break; sleep 1; done

(cd "$server" && npx --no-install prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script) >"$work/ddl.sql" 2>"$work/ddl.err" \
  || { cat "$work/ddl.err"; echo "prisma DDL failed (run npm ci in server/)"; exit 1; }
q postgres -c 'CREATE DATABASE fx' && q fx <"$work/ddl.sql" && q fx <"$here/fixture.sql" || { echo "fixture load failed"; exit 1; }
# TEMPLATE does not copy database settings, so every database gets its own marker
q postgres -c 'CREATE DATABASE fx_unmarked TEMPLATE fx'
q postgres -c 'CREATE DATABASE fx_prod TEMPLATE fx'
q postgres -c 'CREATE DATABASE fx_collide TEMPLATE fx'
q postgres -c "ALTER DATABASE fx SET buildcity.env='staging'"
q postgres -c "ALTER DATABASE fx_collide SET buildcity.env='staging'"
q postgres -c "ALTER DATABASE fx_prod SET buildcity.env='production'"

snap() { q "$1" -c "SELECT table_name || ' ' || (xpath('/row/c/text()', query_to_xml(format('select md5(coalesce(string_agg(t::text, ''|'' order by t::text), '''')) as c from %I t', table_name), false, true, '')))[1]::text FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1"; }
inv() { q "$1" -c "SELECT (SELECT count(*) FROM regions), (SELECT count(*) FROM categories), (SELECT count(*) FROM product_masters), (SELECT count(*) FROM product_images), (SELECT count(*) FROM vendor_products), (SELECT count(*) FROM banners), (SELECT count(*) FROM coupons), (SELECT count(*) FROM app_settings), (SELECT sum(\"totalAmount\") FROM orders), (SELECT sum(\"totalPrice\") FROM order_items), (SELECT sum(amount) FROM wallet_transactions), (SELECT sum(\"walletBalance\") FROM users), (SELECT sum(\"netRefundCash\") FROM order_returns), (SELECT count(*) FROM users), (SELECT count(*) FROM vendors), (SELECT count(*) FROM addresses)"; }

# 1. Before: verify fails and names every offending column
q fx <"$stg/verify-anon.sql" >"$work/v0.out" 2>"$work/v0.err"; rc=$?
check "verify fails on un-anonymised data" '[ $rc -ne 0 ]'
for col in users.phone vendors.phone district_representatives.phone addresses.phone \
           order_returns.customerPhone order_returns.drPhone vendor_fcm_tokens.phone customer_fcm_tokens.phone \
           otp_verifications.phone users.email notifications.message audit_logs.details \
           reviews.comment wallet_transactions.description order_returns.returnReason \
           'table not empty: otp_verifications' 'table not empty: vendor_fcm_tokens' \
           'table not empty: customer_fcm_tokens' 'table not empty: audit_logs' 'table not empty: notifications'; do
  check "verify names $col" 'grep -qF -- "$col" "$work/v0.err"'
done
check "verify ignores the catalog 10-digit non-mobile value" '! grep -q "vendor_products.description" "$work/v0.err"'

inv fx >"$work/inv0"; snap fx >"$work/snap0"
q fx -c "SELECT id, phone FROM users ORDER BY id" >"$work/users0"

# 1b. Prod guard: unmarked and production-marked databases are refused and left untouched
for d in fx_unmarked fx_prod; do
  snap $d >"$work/g0.$d"
  q $d <"$stg/anonymise.sql" >/dev/null 2>"$work/g.$d.err"; rc=$?
  check "anonymise refuses $d (non-zero exit)" '[ $rc -ne 0 ] && grep -q "anonymise refused" "$work/g.$d.err"'
  snap $d >"$work/g1.$d"
  check "$d snapshot unchanged after refusal" 'cmp -s "$work/g0.$d" "$work/g1.$d"'
done
check "refusal names the marker found / unset" 'grep -q "marker is unset" "$work/g.fx_unmarked.err" && grep -q "marker is production" "$work/g.fx_prod.err"'
check "guard DO block is the first statement after BEGIN" '[ "$(awk "/^BEGIN;/{f=1;next} f&&/^(DO|CREATE|UPDATE|INSERT)/{print \$1; exit}" "$stg/anonymise.sql")" = DO ]'

# 2. Anonymise: one transaction, then verify passes
check "anonymise.sql has exactly one BEGIN and one COMMIT" '[ "$(grep -c "^BEGIN;" "$stg/anonymise.sql")" = 1 ] && [ "$(grep -c "^COMMIT;" "$stg/anonymise.sql")" = 1 ]'
q fx <"$stg/anonymise.sql" >"$work/a1.out" 2>"$work/a1.err"; rc=$?
check "anonymise.sql succeeds" '[ $rc -eq 0 ]'
[ $rc -eq 0 ] || cat "$work/a1.err"
q fx <"$stg/verify-anon.sql" >"$work/v1.out" 2>"$work/v1.err"; rc=$?
check "verify passes after anonymise" '[ $rc -eq 0 ]'
[ $rc -eq 0 ] || cat "$work/v1.err"

# 3. Links, uniqueness, staff numbers, PII gone
inv fx >"$work/inv1"
check "catalog row counts and order/wallet sums unchanged" 'cmp -s "$work/inv0" "$work/inv1"'
check "vendor phone == its user's phone" '[ "$(q fx -c "SELECT count(*) FROM vendors v JOIN users u ON u.id = v.\"userId\" WHERE v.id = '"'v1'"' AND v.phone = u.phone")" = 1 ]'
check "DR phone (+91 form) == its user's phone" '[ "$(q fx -c "SELECT count(*) FROM district_representatives d JOIN users u ON u.id = d.\"userId\" WHERE d.phone = u.phone")" = 1 ]'
check "address phone == customer phone (leading 0 / spaces / +91 forms)" '[ "$(q fx -c "SELECT count(*) FROM addresses a JOIN users u ON u.id = a.\"userId\" WHERE a.id = '"'a1'"' AND a.phone = u.phone")" = 1 ]'
check "return customerPhone == customer phone, drPhone == DR phone" '[ "$(q fx -c "SELECT count(*) FROM order_returns r JOIN orders o ON o.id = r.\"orderId\" JOIN users u ON u.id = o.\"customerId\" JOIN district_representatives d ON d.id = r.\"drId\" WHERE r.\"customerPhone\" = u.phone AND r.\"drPhone\" = d.phone")" = 1 ]'
check "users.phone still unique, none lost" '[ "$(q fx -c "SELECT count(DISTINCT phone) = count(*) FROM users")" = t ]'
check "9999999999 and 7777777777 kept" '[ "$(q fx -c "SELECT count(*) FROM users WHERE phone IN ('"'9999999999','7777777777'"')")" = 2 ]'
check "mapped phones follow 2<9 digits>" '[ "$(q fx -c "SELECT count(*) FROM users WHERE phone !~ '"'^(2[0-9]{9}|9999999999|7777777777)$'"'")" = 0 ]'
check "all passwords null" '[ "$(q fx -c "SELECT (SELECT count(*) FROM users WHERE password IS NOT NULL) + (SELECT count(*) FROM vendors WHERE password IS NOT NULL) + (SELECT count(*) FROM district_representatives WHERE password IS NOT NULL)")" = 0 ]'
check "names, emails and streets replaced" '[ "$(q fx -c "SELECT count(*) FROM users WHERE name !~ '"'^Test User '"' OR email !~ '"'^u.+@example.invalid$'"'")" = 0 ] && [ "$(q fx -c "SELECT count(*) FROM vendors WHERE \"ownerName\" !~ '"'^Owner '"' OR \"addedByDr\" = '"'Suresh Kumar'"'")" = 0 ] && [ "$(q fx -c "SELECT count(*) FROM addresses WHERE \"fullName\" !~ '"'^Customer '"' OR street !~ '"'^Street '"'")" = 0 ]'
check "shop names kept, pincodes kept" '[ "$(q fx -c "SELECT \"shopName\" FROM vendors WHERE id = '"'v1'"'")" = "Sharma Cement Store" ] && [ "$(q fx -c "SELECT count(*) FROM addresses WHERE pincode IN ('"'221010','221002','226001'"')")" = 4 ]'
check "free text scrubbed, other text kept" '[ "$(q fx -c "SELECT comment FROM reviews WHERE id = '"'rv1'"'")" = "Good. Call [phone] or mail redacted@example.invalid" ] && [ "$(q fx -c "SELECT comment FROM reviews WHERE id = '"'rv2'"'")" = "Fast delivery" ]'
check "tokens / otp / logs / notifications emptied" '[ "$(q fx -c "SELECT (SELECT count(*) FROM otp_verifications)+(SELECT count(*) FROM vendor_fcm_tokens)+(SELECT count(*) FROM customer_fcm_tokens)+(SELECT count(*) FROM audit_logs)+(SELECT count(*) FROM notifications)")" = 0 ]'

check "real 2xxxxxxxxx landline (022-2345-6789) remapped, not kept" '[ "$(q fx -c "SELECT phone FROM addresses WHERE id = '"'a4'"'")" != 2223456789 ] && [ "$(q fx -c "SELECT count(*) FROM addresses WHERE phone ~ '"'^2[0-9]{9}$'"'")" = 4 ]'
check "referral wallet name removed, rest kept" '[ "$(q fx -c "SELECT description FROM wallet_transactions WHERE id = '"'w4'"'")" = "Referral bonus of 50 for order by Customer" ]'
check "Super Admin / Admin kept in addedByDr, names reduced to DR" '[ "$(q fx -c "SELECT \"addedByDr\" FROM vendors ORDER BY id" | paste -sd,)" = "DR,Super Admin" ]'

# 4. Re-run is a no-op and still verifies
snap fx >"$work/snap1"
q fx <"$stg/anonymise.sql" >"$work/a2.out" 2>"$work/a2.err"; rc=$?
check "second anonymise run succeeds" '[ $rc -eq 0 ]'
snap fx >"$work/snap2"
check "second run changes nothing" 'cmp -s "$work/snap1" "$work/snap2"'
q fx <"$stg/verify-anon.sql" >/dev/null 2>"$work/v2.err"; rc=$?
check "verify passes after second run" '[ $rc -eq 0 ]'
check "before/after snapshots differ (the anonymiser did something)" '! cmp -s "$work/snap0" "$work/snap1"'

# 5. New rows added to an anonymised DB get numbers that do not collide with existing ones
q fx -c "INSERT INTO users (id, phone, name, \"updatedAt\") VALUES ('u9', '8123456780', 'Late Joiner', now())" >/dev/null
q fx <"$stg/anonymise.sql" >/dev/null 2>"$work/a3.err"; rc=$?
check "late-added user anonymised without clashing" '[ $rc -eq 0 ] && [ "$(q fx -c "SELECT count(DISTINCT phone) = count(*) FROM users")" = t ]'
q fx <"$stg/verify-anon.sql" >/dev/null 2>&1; rc=$?
check "verify passes after late-added user" '[ $rc -eq 0 ]'

# 6. Failure rolls everything back (two users whose numbers normalise to the same digits)
q fx_collide -c "INSERT INTO users (id, phone, \"updatedAt\") VALUES ('uc1', '9000000001', now()), ('uc2', '+919000000001', now())" >/dev/null
snap fx_collide >"$work/c0"
q fx_collide <"$stg/anonymise.sql" >/dev/null 2>"$work/c.err"; rc=$?
check "colliding phones make anonymise fail on the unique key" '[ $rc -ne 0 ] && grep -q "duplicate key" "$work/c.err"'
snap fx_collide >"$work/c1"
check "failed run leaves the database untouched" 'cmp -s "$work/c0" "$work/c1"'

# 7. Separators inside free text: scrubbed, and verify catches them in a catalog column
check "separated phones scrubbed in reviews" '[ "$(q fx -c "SELECT comment FROM reviews WHERE id = '"'rv3'"'")" = "Call [phone] or [phone] or [phone] or +[phone] ok" ]'
check "separated phones scrubbed in returnReason" '[ "$(q fx -c "SELECT \"returnReason\" FROM order_returns")" = "Customer Anil called [phone] or [phone] for pickup" ]'
check "separated phones scrubbed in wallet description" '[ "$(q fx -c "SELECT description FROM wallet_transactions WHERE id = '"'w3'"'")" = "Spoke to [phone] and [phone]" ]'
check "bracketed, grouped and sentence phones scrubbed" '[ "$(q fx -c "SELECT comment FROM reviews WHERE id = '"'rv4'"'")" = "Phone ([phone] anytime" ] && [ "$(q fx -c "SELECT comment FROM reviews WHERE id = '"'rv5'"'")" = "Try +[phone] or [phone] today" ]'
check "pincode and amounts left alone" '[ "$(q fx -c "SELECT comment FROM reviews WHERE id = '"'rv6'"'")" = "Deliver to 226001 for 12,500.00 total, ref 4500.00" ]'
q fx -c "UPDATE vendor_products SET description = 'call 98123 45007 now'">/dev/null
q fx <"$stg/verify-anon.sql" >/dev/null 2>"$work/v3.err"; rc=$?
check "verify fails on a separated phone in a catalog column" '[ $rc -ne 0 ] && grep -qF -- "vendor_products.description" "$work/v3.err"'
for v in '98123-45007' '98123.45007' '+91 98123 45007' '091-98123-45007' '(981) 234-5003' '+91 (98123) 45003' '98 12 34 50 03' '1234567890' '61234 56789'; do
  q fx -c "UPDATE vendor_products SET description = 'x $v y'" >/dev/null
  q fx <"$stg/verify-anon.sql" >/dev/null 2>&1; rc=$?
  check "verify fails on catalog phone form: $v" '[ $rc -ne 0 ]'
done
q fx -c "UPDATE vendor_products SET description = 'Batch 123456789 certified, 12 34 56 78, 400-500, 226001, 12,500.00'" >/dev/null
q fx <"$stg/verify-anon.sql" >/dev/null 2>&1; rc=$?
check "verify ignores short digit groups, pincode and amounts" '[ $rc -eq 0 ]'

# 7b. Email check: one example.invalid address must not excuse a real one in the same value
q fx -c "UPDATE vendor_products SET description = 'mail u1@example.invalid or real@gmail.com'" >/dev/null
q fx <"$stg/verify-anon.sql" >/dev/null 2>"$work/v4.err"; rc=$?
check "verify fails on a real email next to an example.invalid one" '[ $rc -ne 0 ] && grep -qF -- "vendor_products.description" "$work/v4.err"'
q fx -c "UPDATE vendor_products SET description = 'mail u1@example.invalid'" >/dev/null
q fx <"$stg/verify-anon.sql" >/dev/null 2>&1; rc=$?
check "verify accepts example.invalid emails alone" '[ $rc -eq 0 ]'

# 8. 256 KB adversarial input. Near-miss inputs (nine digits then a break, so nothing matches and the
# engine backtracks at every start) must stay under 100 ms; match-dense inputs (one replacement per
# ~10 bytes, ~9 us each in postgres regexp_replace, same as the old pattern) get a 1000 ms linear-time guard.
awk '/CREATE FUNCTION pg_temp.scrub/{f=1} f{print} f&&/\$\$;/{exit}' "$stg/anonymise.sql" >"$work/scrub.sql"
mobile_re="$(sed -n "s/^ *mobile  constant text := \(.*\);$/\1/p" "$stg/verify-anon.sql")"
check "extracted scrub function and mobile pattern" '[ -s "$work/scrub.sql" ] && [ -n "$mobile_re" ]'
for gen in "repeat('98765 4321,', 23831)" "repeat('9-9-9-9-9-9-9-9-9,', 14563)" "repeat('9 ', 4) || repeat('x', 262000)" "repeat('91 0 91 0 ', 21845)" "repeat('9.', 131072)" "repeat('9', 262144)" "repeat('98123-', 43690)"; do
  ms="$(q fx <<SQL | tail -1
$(cat "$work/scrub.sql")
CREATE TEMP TABLE adv AS SELECT $gen AS t;
CREATE TEMP TABLE tm AS SELECT clock_timestamp() AS t0;
SELECT count(*) FROM adv WHERE length(pg_temp.scrub(t)) > 0 \gset
CREATE TEMP TABLE tm2 AS SELECT clock_timestamp() AS t1;
SELECT count(*) FROM adv WHERE t ~ $mobile_re \gset
SELECT round(extract(epoch FROM ((SELECT t1 FROM tm2) - (SELECT t0 FROM tm))) * 1000) + round(extract(epoch FROM (clock_timestamp() - (SELECT t1 FROM tm2))) * 1000);
SQL
)"
  lim=100; case "$gen" in "repeat('9.', 131072)"|"repeat('9', 262144)"|"repeat('98123-', 43690)") lim=1000;; esac
  check "256 KB adversarial $gen: scrub+verify ${ms} ms < $lim" '[ -n "$ms" ] && [ "$ms" -lt "$lim" ]'
done

rm -rf "$work"
echo "passed=$pass failed=$fail"
[ "$fail" = 0 ]
