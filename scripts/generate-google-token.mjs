/**
 * Script para gerar um novo Google OAuth2 refresh token.
 *
 * Uso:
 *   node scripts/generate-google-token.mjs
 *
 * Pre-requisitos:
 *   - GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env
 *   - Redirect URI "http://localhost:3333/callback" cadastrada no Google Cloud Console
 *     (APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs)
 */

import fs from "node:fs";
import http from "node:http";
import { URL } from "node:url";

// Load .env manually (no dotenv dependency needed)
try {
  const envContent = fs.readFileSync(new URL("../.env", import.meta.url), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env not found */ }

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3333/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET precisam estar no .env");
  process.exit(1);
}

// Step 1 — Build auth URL
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES.join(" "));
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent"); // force new refresh token

// Step 2 — Start local server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:3333`);
  if (!url.pathname.startsWith("/callback")) return;

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Erro: nenhum code recebido.");
    return;
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.refresh_token) {
      console.log("\n=== NOVO REFRESH TOKEN ===");
      console.log(tokens.refresh_token);
      console.log("==========================\n");
      console.log("Atualize o .env com:");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <h1>Token gerado com sucesso!</h1>
        <p>Volte ao terminal para copiar o refresh token.</p>
        <p>Pode fechar esta aba.</p>
      `);
    } else {
      console.error("Resposta sem refresh_token:", tokens);
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>Erro</h1><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
    }
  } catch (err) {
    console.error("Erro ao trocar code por token:", err);
    res.writeHead(500);
    res.end("Erro interno");
  }

  setTimeout(() => {
    server.close();
    process.exit(0);
  }, 1000);
});

server.listen(3333, () => {
  console.log("Servidor local rodando em http://localhost:3333");
  console.log("Abrindo navegador para autorização...\n");
  console.log("Se o navegador não abrir, acesse manualmente:");
  console.log(authUrl.toString() + "\n");

  // Try to open browser (macOS)
  import("node:child_process").then(({ exec }) => {
    exec(`open "${authUrl.toString()}"`);
  }).catch(() => {});
});
