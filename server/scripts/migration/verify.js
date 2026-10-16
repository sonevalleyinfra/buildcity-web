#!/usr/bin/env node
/* Compare source and target DBs: per-model row counts, non-Prisma public tables (count + md5), latest created/updated
 * timestamps, and sequences. Model list comes from the Prisma DMMF.
 * Usage: SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node verify.js
 * Exit 0 = match, 1 = mismatch, 2 = usage/connection error. Never prints URLs. */
"use strict";
const path = require("path");
const { PrismaClient, Prisma } = require(path.join(__dirname, "../../node_modules/@prisma/client"));

const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';

function clientFor(url) {
  let u = url.replace(/[?&](connection_limit|pool_timeout)=[^&]*/g, "");
  if (!u.includes("?") && u.includes("&")) u = u.replace("&", "?");
  return new PrismaClient({ datasources: { db: { url: u } }, log: [] });
}

function models() {
  return Prisma.dmmf.datamodel.models.map((m) => {
    const col = (f) => f.dbName || f.name;
    const ts = m.fields.filter((f) => f.type === "DateTime" && ["createdAt", "updatedAt"].includes(f.name));
    const ids = m.fields.filter((f) => f.isId && f.default && f.default.name === "autoincrement");
    return {
      name: m.name,
      table: m.dbName || m.name,
      ts: ts.map((f) => ({ label: f.name, col: col(f) })),
      serialIds: ids.map((f) => col(f)),
    };
  });
}

async function snapshot(prisma, ms) {
  const out = { counts: {}, latest: {}, seq: {}, seqVsMax: {}, extra: {} };
  for (const m of ms) {
    const t = q(m.table);
    const [{ n }] = await prisma.$queryRawUnsafe(`select count(*)::text as n from public.${t}`);
    out.counts[m.name] = n;
    for (const c of m.ts) {
      const [{ v }] = await prisma.$queryRawUnsafe(
        `select to_char(max(${q(c.col)}) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as v from public.${t}`
      );
      out.latest[`${m.name}.${c.label}`] = v === null ? "-" : v;
    }
  }
  // Tables created outside Prisma (e.g. raw SQL in pushService.js): every other public base table.
  const known = new Set(ms.map((m) => m.table));
  const tbls = await prisma.$queryRawUnsafe(
    `select table_name as name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`
  );
  for (const { name } of tbls) {
    if (known.has(name)) continue;
    // Pin TimeZone and byte-order collation so the md5 doesn't depend on server locale or timezone.
    const [, [r]] = await prisma.$transaction([
      prisma.$executeRaw`select set_config('TimeZone', 'UTC', true)`,
      prisma.$queryRawUnsafe(
        `select count(*)::text as n, md5(coalesce(string_agg(t::text, E'\\n' order by t::text collate "C"), '')) as h from public.${q(name)} t`
      ),
    ]);
    out.extra[name] = `${r.n} rows md5=${r.h}`;
  }
  const seqs = await prisma.$queryRawUnsafe(
    `select s.sequencename as name, s.last_value::text as v from pg_sequences s where s.schemaname='public' order by 1`
  );
  for (const s of seqs) out.seq[s.name] = s.v === null ? "-" : s.v;
  for (const m of ms) {
    for (const c of m.serialIds) {
      const [r] = await prisma.$queryRawUnsafe(
        `select coalesce(max(${q(c)}),0)::text as mx, pg_get_serial_sequence('public.${m.table.replace(/'/g, "''").replace(/"/g, '""')}', '${c.replace(/'/g, "''")}') as seq from public.${q(m.table)}`
      );
      let last = "-";
      if (r.seq) {
        const [x] = await prisma.$queryRawUnsafe(`select last_value::text as v, is_called from ${r.seq}`);
        last = x.is_called ? x.v : "0";
      }
      out.seqVsMax[`${m.name}.${c}`] = `max=${r.mx} seq=${last}`;
      if (last !== "-" && BigInt(last) < BigInt(r.mx)) out.seqVsMax[`${m.name}.${c}`] += " (seq<max)";
    }
  }
  return out;
}

async function main() {
  const src = process.env.SOURCE_DATABASE_URL, tgt = process.env.TARGET_DATABASE_URL;
  if (!src || !tgt) {
    console.error("usage: SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node verify.js");
    process.exit(2);
  }
  const ms = models();
  const a = clientFor(src), b = clientFor(tgt);
  let sa, sb;
  try {
    [sa, sb] = [await snapshot(a, ms), await snapshot(b, ms)];
  } catch (e) {
    // Prisma errors can embed connection details; print only the code/first line.
    console.error("error: query failed:", (e.code || e.name) + " " + String(e.message).split("\n").filter(Boolean).pop().slice(0, 200));
    process.exit(2);
  } finally {
    await a.$disconnect().catch(() => {});
    await b.$disconnect().catch(() => {});
  }

  const rows = [];
  const add = (kind, key, x, y) => rows.push({ kind, key, x: x ?? "(missing)", y: y ?? "(missing)", ok: x === y });
  for (const m of ms) add("count", m.name, sa.counts[m.name], sb.counts[m.name]);
  for (const k of new Set([...Object.keys(sa.extra), ...Object.keys(sb.extra)])) add("raw-table", k, sa.extra[k], sb.extra[k]);
  for (const k of Object.keys(sa.latest)) add("latest", k, sa.latest[k], sb.latest[k]);
  for (const k of new Set([...Object.keys(sa.seq), ...Object.keys(sb.seq)])) add("sequence", k, sa.seq[k], sb.seq[k]);
  for (const k of Object.keys(sb.seqVsMax)) add("seq-vs-max", k, sa.seqVsMax[k], sb.seqVsMax[k]);
  for (const k of Object.keys(sb.seqVsMax)) if (/seq<max/.test(sb.seqVsMax[k])) rows.push({ kind: "seq-vs-max", key: k + " (target)", x: "seq>=max", y: sb.seqVsMax[k], ok: false });

  const w = (f) => Math.max(...rows.map((r) => String(f(r)).length), 6);
  const wk = w((r) => r.kind), wy = w((r) => r.key), wx = w((r) => r.x), wz = w((r) => r.y);
  const line = (c) => `${c[0].padEnd(wk)}  ${c[1].padEnd(wy)}  ${c[2].padEnd(wx)}  ${c[3].padEnd(wz)}  ${c[4]}`;
  console.log(line(["CHECK", "NAME", "SOURCE", "TARGET", "RESULT"]));
  for (const r of rows) console.log(line([r.kind, r.key, r.x, r.y, r.ok ? "ok" : "MISMATCH"]));
  const bad = rows.filter((r) => !r.ok).length;
  console.log(bad ? `\nFAIL: ${bad} mismatch(es) across ${rows.length} checks` : `\nPASS: ${rows.length} checks, ${ms.length} models`);
  process.exit(bad ? 1 : 0);
}
main();
