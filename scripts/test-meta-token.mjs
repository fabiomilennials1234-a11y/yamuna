/**
 * Valida o Meta Ads access token atual.
 *
 * Uso:
 *   node scripts/test-meta-token.mjs
 *
 * Lê META_ADS_ACCESS_TOKEN e META_ADS_ACCOUNT_ID do .env e roda:
 *   1) debug_token  -> mostra app_id, type, expira_em, scopes, valid
 *   2) GET /<account_id> -> confirma acesso ao ad account
 *   3) GET /<account_id>/insights?date_preset=yesterday -> spend de ontem
 *
 * Saida:
 *   exit 0 se tudo OK; exit 1 se qualquer chamada falhar.
 */

import fs from "node:fs";

const GRAPH_VERSION = "v19.0";

function loadEnv() {
  try {
    const content = fs.readFileSync(new URL("../.env", import.meta.url), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* .env not found, fall back to process.env */
  }
}

loadEnv();

const TOKEN = process.env.META_ADS_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_ADS_ACCOUNT_ID;

if (!TOKEN || !ACCOUNT_ID) {
  console.error("❌ META_ADS_ACCESS_TOKEN e META_ADS_ACCOUNT_ID precisam estar no .env");
  process.exit(1);
}

if (!ACCOUNT_ID.startsWith("act_")) {
  console.warn(`⚠️  META_ADS_ACCOUNT_ID não começa com "act_": ${ACCOUNT_ID}`);
}

function fmt(ts) {
  if (!ts || ts === 0) return "never (long-lived / system user)";
  const d = new Date(ts * 1000);
  const now = Date.now();
  const days = Math.round((d.getTime() - now) / 86400000);
  return `${d.toISOString()} (${days >= 0 ? `in ${days}d` : `${-days}d ago`})`;
}

async function gget(path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url);
  return res.json();
}

let failed = false;

console.log("─── 1. debug_token ───");
const dbg = await gget("/debug_token", { input_token: TOKEN });
if (dbg.error) {
  console.error("❌", dbg.error.message, `(code ${dbg.error.code}/sub ${dbg.error.error_subcode})`);
  failed = true;
} else {
  const d = dbg.data || {};
  console.log(`  valid:       ${d.is_valid}`);
  console.log(`  app_id:      ${d.app_id}`);
  console.log(`  type:        ${d.type}`);
  console.log(`  user_id:     ${d.user_id || "—"}`);
  console.log(`  expires_at:  ${fmt(d.expires_at)}`);
  console.log(`  data_access: ${fmt(d.data_access_expires_at)}`);
  console.log(`  scopes:      ${(d.scopes || []).join(", ") || "—"}`);
  if (!d.is_valid) failed = true;
}

console.log("\n─── 2. ad account access ───");
const acct = await gget(`/${ACCOUNT_ID}`, {
  fields: "id,name,account_status,currency,timezone_name,disable_reason",
});
if (acct.error) {
  console.error("❌", acct.error.message);
  failed = true;
} else {
  console.log(`  id:        ${acct.id}`);
  console.log(`  name:      ${acct.name}`);
  console.log(`  status:    ${acct.account_status} (1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 7=PENDING_RISK_REVIEW, 9=IN_GRACE_PERIOD, 100=PENDING_CLOSURE, 101=CLOSED)`);
  console.log(`  currency:  ${acct.currency}`);
  console.log(`  timezone:  ${acct.timezone_name}`);
  if (acct.disable_reason) console.log(`  disable:   ${acct.disable_reason}`);
}

console.log("\n─── 3. insights (yesterday spend) ───");
const ins = await gget(`/${ACCOUNT_ID}/insights`, {
  fields: "spend,impressions,clicks",
  date_preset: "yesterday",
});
if (ins.error) {
  console.error("❌", ins.error.message);
  failed = true;
} else {
  const row = (ins.data || [])[0];
  if (!row) {
    console.log("  (sem dados de ontem — conta sem campanha ativa?)");
  } else {
    console.log(`  spend:       ${row.spend}`);
    console.log(`  impressions: ${row.impressions}`);
    console.log(`  clicks:      ${row.clicks}`);
  }
}

console.log(failed ? "\n❌ FALHA — token precisa ser renovado.\n" : "\n✅ Token OK.\n");
process.exit(failed ? 1 : 0);
