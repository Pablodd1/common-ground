/**
 * UNITEC FAMILIA — Jev Route Health & Availability Watchman
 * Powered by TypeSafe AI System-1 (`jev-latest`) with heuristic fallback
 * when TYPESAFE_API_KEY is absent (mirrors the fleet's AGENTS.md monitoring
 * contract: Jev watches and classifies; it is never part of the user-facing
 * assistant pipeline).
 *
 * Alerts: Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) and/or generic
 * webhook (ALERT_WEBHOOK_URL). Run: node scripts/jev-audit.mjs
 */

import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { URL } from 'url';

const BASE_URL = process.env.BASE_URL || 'https://common-ground-rust.vercel.app';
const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';

const AUDIT_ROUTES = [
  { path: '/', name: 'App (SPA + login)' },
  { path: '/api/trpc/ping', name: 'API health (tRPC ping)' },
  { path: '/api/trpc/auth.publicConfig', name: 'Auth config surface' },
  { path: '/robots.txt', name: 'Private-by-design marker' },
  // POST probes: these routes only accept POST, and answering 401 to a bare
  // request is exactly what proves the guards are alive.
  { path: '/api/cron/cleanup', name: 'Cron endpoint (secret-guarded)', method: 'POST' },
  { path: '/api/media', name: 'Media upload (auth-guarded)', method: 'POST' },
];

let typeSafeClient = null;
if (TYPESAFE_API_KEY) {
  try {
    typeSafeClient = new TypeSafeClient({ apiKey: TYPESAFE_API_KEY });
  } catch (e) {
    console.warn('⚠️ Could not initialize TypeSafeClient:', e.message);
  }
}

function fetchUrl(targetUrl, method = 'GET', timeoutMs = 8000) {
  const startTime = Date.now();
  return fetch(targetUrl, {
    method,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'UNITEC-Jev-Watchman/1.0' },
    redirect: 'manual',
  })
    .then(async (res) => ({
      url: targetUrl,
      status: res.status,
      bodySnippet: (await res.text().catch(() => '')).slice(0, 500),
      latencyMs: Date.now() - startTime,
      error: null,
    }))
    .catch((err) => ({
      url: targetUrl,
      status: 0,
      bodySnippet: '',
      latencyMs: Date.now() - startTime,
      error: err?.name === 'TimeoutError' ? 'Request Timeout' : err?.message || 'fetch failed',
    }));
}

async function classifyWithJev(route, routeResult) {
  // Known planned states, not outages — deterministic short-circuits that
  // never reach a classifier. Both guarded routes answer 401 to a bare POST
  // BY DESIGN; anything else (404 = route gone, 5xx = crash) is real.
  if (routeResult.status === 401 && (route.path === '/api/cron/cleanup' || route.path === '/api/media')) {
    return { source: 'planned-guard', is_operational: true, severity: 'info', should_alert: false };
  }
  if (typeSafeClient) {
    try {
      // SDK 0.6+ API: systemOne() with state + helper-built questions
      const res = await typeSafeClient.systemOne({
        state: {
          service: 'UNITEC FAMILIA (private employee community, UNITEC USA Design)',
          route: route.name,
          url: routeResult.url,
          http_status: routeResult.status,
          latency_ms: routeResult.latencyMs,
          detail: routeResult.error || routeResult.bodySnippet.substring(0, 160),
          checked_at: new Date().toISOString(),
        },
        questions: {
          is_operational: choice('Is this web route operational and functioning normally for users?', { yes: 'route serves correctly', no: 'route broken or degraded' }),
          severity: choice('How severe is this result?', { ok: 'fully healthy', warning: 'degraded or slow', critical: 'down or erroring' }),
          should_alert: choice('Should a human be alerted immediately for this result?', { yes: 'alert now', no: 'no alert' }),
        },
      });
      return {
        source: 'jev-latest',
        is_operational: res.answers.is_operational.choice === 'yes',
        severity: res.answers.severity.choice,
        should_alert: res.answers.should_alert.choice === 'yes',
      };
    } catch {
      // graceful fallback on rate limit / network issue
    }
  }
  // Heuristic fallback engine
  const isOk = routeResult.status >= 200 && routeResult.status < 400;
  const isWarn = routeResult.latencyMs > 4000;
  return {
    source: 'heuristic-fallback',
    is_operational: isOk,
    severity: !isOk ? 'critical' : isWarn ? 'warning' : 'ok',
    should_alert: !isOk,
  };
}

async function dispatchAlert(findings) {
  const critical = findings.filter((f) => f.classification.should_alert);
  if (critical.length === 0) return;
  console.log(`\n🚨 Triggering alerts for ${critical.length} issue(s)...`);
  const summary = critical
    .map((a) => `• [${a.route.name}] (${a.route.path}) → status ${a.raw.status}, ${a.raw.latencyMs}ms${a.raw.error ? `, error: ${a.raw.error}` : ''}`)
    .join('\n');

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: `🚨 Unitec Familia Jev Watchman — ${critical.length} route(s) down on ${BASE_URL}\n\n${summary}` }),
      });
      console.log('✓ Telegram alert dispatched.');
    } catch (e) {
      console.warn('⚠️ Telegram alert failed:', e.message);
    }
  } else {
    console.log('ℹ️ Telegram alert secrets not set — failing visibly here instead.');
  }
  if (ALERT_WEBHOOK_URL) {
    try {
      await fetch(ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `🚨 Unitec Familia Jev Watchman: ${BASE_URL}\n${summary}`, alerts: critical }),
      });
      console.log('✓ Webhook alert dispatched.');
    } catch (e) {
      console.warn('⚠️ Webhook alert failed:', e.message);
    }
  }
}

async function runAudit() {
  console.log('===============================================================');
  console.log('🔍 UNITEC FAMILIA Jev Route Health Audit');
  console.log(`🎯 Base URL: ${BASE_URL}`);
  console.log(`🤖 Classification Engine: ${typeSafeClient ? 'Jev System-1 (jev-latest)' : 'Heuristic Fallback (no TYPESAFE_API_KEY)'}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('===============================================================\n');

  const results = [];
  let errorCount = 0;
  for (const route of AUDIT_ROUTES) {
    const fullUrl = new URL(route.path, BASE_URL).toString();
    const raw = await fetchUrl(fullUrl, route.method);
    const classification = await classifyWithJev(route, raw);
    results.push({ route, raw, classification });
    const icon = classification.severity === 'ok' || classification.severity === 'info' ? '🟢' : classification.severity === 'warning' ? '🟡' : '🔴';
    console.log(`${icon} [${classification.severity.toUpperCase()}] ${route.name.padEnd(30)} | ${route.path.padEnd(32)} | ${String(raw.status).padEnd(3)} | ${String(raw.latencyMs).padStart(5)}ms | ${classification.is_operational ? 'UP' : 'DOWN'} | ${classification.source}`);
    if (!classification.is_operational) errorCount++;
  }

  // Re-verify before verdict: pushes deploy automatically, and an audit that
  // races a deploy window sees transient errors. One retry, 15s later, final.
  const downs = results.filter((r) => !r.classification.is_operational);
  if (downs.length) {
    console.log(`\n⏳ ${downs.length} route(s) flagged — re-verifying once in 15s before the verdict...`);
    await new Promise((r) => setTimeout(r, 15000));
    for (const r of downs) {
      const raw2 = await fetchUrl(new URL(r.route.path, BASE_URL).toString(), r.route.method);
      const cls2 = await classifyWithJev(r.route, raw2);
      if (cls2.is_operational) {
        console.log(`✅ [re-verify] ${r.route.path} is UP now (was ${r.raw.status}) — treating as deploy-window transient.`);
        r.raw = raw2;
        r.classification = cls2;
        errorCount--;
      } else {
        console.log(`🔴 [re-verify] ${r.route.path} still DOWN (${raw2.status}) — confirmed.`);
        r.raw = raw2;
      }
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 Summary: ${results.length} routes | ${results.length - errorCount} operational | ${errorCount} down`);
  console.log('===============================================================');

  if (errorCount > 0) {
    await dispatchAlert(results);
    process.exit(1);
  }
  console.log('🎉 All Unitec Familia routes fully operational.\n');
}

runAudit().catch((err) => {
  console.error('Jev watchman crashed:', err);
  process.exit(1);
});
