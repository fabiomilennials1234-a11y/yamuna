import fs from 'node:fs';

const txt = fs.readFileSync(new URL('../.env', import.meta.url), 'utf-8');
for (const l of txt.split('\n')) {
  const t = l.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  if (!process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const T = process.env.META_ADS_ACCESS_TOKEN;
const A = process.env.META_ADS_ACCOUNT_ID;
const V = 'v19.0';

const g = async (p, params = {}) => {
  const u = new URL('https://graph.facebook.com/' + V + p);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', T);
  const r = await fetch(u);
  return r.json();
};

console.log('ENV ACCOUNT_ID:', A);

console.log('\n--- /me ---');
console.log(JSON.stringify(await g('/me', { fields: 'id,name' }), null, 2));

console.log('\n--- /122097521661289680 (system user) ---');
console.log(JSON.stringify(await g('/122097521661289680', { fields: 'id,name' }), null, 2));

console.log('\n--- /me/businesses ---');
console.log(JSON.stringify(await g('/me/businesses', { fields: 'id,name,verification_status' }), null, 2));

console.log('\n--- /me/adaccounts (assigned to this token) ---');
console.log(JSON.stringify(await g('/me/adaccounts', { fields: 'id,account_id,name,account_status,business{id,name}' }), null, 2));

console.log('\n--- target ad account (with business) ---');
console.log(JSON.stringify(await g('/' + A, { fields: 'id,name,account_status,business{id,name},owner' }), null, 2));
