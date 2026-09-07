import { DurableObject } from "cloudflare:workers";
import candidates from "../data/instance-candidates.json";
import disabledInstances from "../data/disabled-instances.json";
import { homepage } from "./page.js";

const WIKI_SOURCE = "https://codeberg.org/mv12star/shitter.wiki/raw/branch/main/Instances.md";
const FALLBACK_SOURCE = "https://codeberg.org/mv12star/shitter/wiki/Instances";
const disabledHosts = new Set(disabledInstances.map(({ hostname }) => hostname.toLowerCase()));

function listWorkingOrigins(groups = {}) {
  const entries = Array.isArray(groups.working) ? groups.working : [];
  const seen = new Set();
  const out = [];

  for (const { url } of entries) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.endsWith(".onion")) continue;
      if (parsed.protocol !== "https:") continue;
      if (disabledHosts.has(parsed.hostname.toLowerCase().replace(/\.$/, ""))) continue;
      const origin = parsed.origin;
      if (!seen.has(origin)) {
        seen.add(origin);
        out.push(origin);
      }
    } catch {}
  }

  return out;
}

function classifySection(title = "") {
  const normalized = title.toLowerCase();

  if (normalized.includes("rate") && normalized.includes("limit")) return "rate_limited";
  if (normalized.includes("redirector")) return "redirectors";
  if (normalized.includes("former") || normalized.includes("taken down")) return "formerly_active";
  if (normalized.includes("working")) return "working";

  return null;
}

function cleanCandidateUrl(rawUrl = "") {
  return rawUrl.trim().replace(/[\])>;"'`.,:!?}]+$/u, "");
}

function dedupeByOrigin(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    try {
      const origin = new URL(item.url).origin;
      if (seen.has(origin)) continue;
      seen.add(origin);
      out.push(item);
    } catch {}
  }
  return out;
}

function parseInstancesMarkdown(markdownText) {
  const groups = {
    working: [],
    redirectors: [],
    rate_limited: [],
    formerly_active: [],
  };

  let current = null;
  const sectionPattern = /^#{2,4}\s+(.*)$/;
  const urlPattern = /\bhttps?:\/\/[^\s)\],"'<>`]+/gi;

  for (const line of markdownText.split(/\r?\n/)) {
    const heading = line.match(sectionPattern);
    if (heading) {
      current = classifySection(heading[1]);
      continue;
    }

    if (!current) continue;
    for (const rawUrl of line.match(urlPattern) || []) {
      const url = cleanCandidateUrl(rawUrl);
      if (!groups[current]) continue;
      try {
        const parsed = new URL(url);
        const requiresTor = parsed.hostname.endsWith(".onion");
        groups[current].push({ url, requiresTor });
      } catch {}
    }
  }

  for (const key of Object.keys(groups)) {
    groups[key] = dedupeByOrigin(groups[key]);
  }

  return {
    source: FALLBACK_SOURCE,
    sourceRepository: "https://codeberg.org/mv12star/shitter.wiki.git",
    sourceCommit: "auto-sync",
    retrievedOn: new Date().toISOString(),
    statusBasis: "Upstream wiki classification only; instances have not been independently probed.",
    groups,
  };
}

function catalogFromCode() {
  return {
    source: FALLBACK_SOURCE,
    sourceRepository: candidates.sourceRepository,
    sourceCommit: candidates.sourceCommit,
    retrievedOn: candidates.retrievedOn,
    statusBasis: candidates.statusBasis,
    groups: candidates.groups,
  };
}

async function loadCatalogFromWiki() {
  const response = await fetch(WIKI_SOURCE, {
    headers: {
      "user-agent": "occupy-x-worker/0.1 (+https://occupy-x.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`wiki_fetch_status_${response.status}`);
  }

  return parseInstancesMarkdown(await response.text());
}

export class RoundRobin extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS rotation (id INTEGER PRIMARY KEY CHECK (id = 1), position INTEGER NOT NULL)");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS catalog (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at INTEGER NOT NULL)");
    this._ensureCatalog();
  }

  _ensureCatalog() {
    const row = this.ctx.storage.sql.exec("SELECT payload FROM catalog WHERE id = 1").toArray()[0];
    if (row) return;
    this.ctx.storage.sql.exec(
      "INSERT INTO catalog (id, payload, updated_at) VALUES (1, ?, strftime('%s', 'now'))",
      JSON.stringify(catalogFromCode()),
    );
  }

  _getCatalog() {
    const row = this.ctx.storage.sql.exec("SELECT payload FROM catalog WHERE id = 1").toArray()[0];
    if (!row || !row.payload) return catalogFromCode();
    try {
      return JSON.parse(row.payload);
    } catch {
      return catalogFromCode();
    }
  }

  getCatalog() {
    return this._getCatalog();
  }

  async refreshCatalog() {
    const catalog = await loadCatalogFromWiki();
    if (!listWorkingOrigins(catalog.groups).length) {
      throw new Error("wiki_has_no_working_instances");
    }
    const payload = JSON.stringify(catalog);
    this.ctx.storage.sql.exec(
      "INSERT INTO catalog (id, payload, updated_at) VALUES (1, ?, strftime('%s', 'now')) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
      payload,
    );
    return catalog;
  }

  next() {
    const catalog = this._getCatalog();
    const instances = listWorkingOrigins(catalog.groups);
    if (!instances.length) return null;
    const { position } = this.ctx.storage.sql
      .exec("INSERT INTO rotation (id, position) VALUES (1, 0) ON CONFLICT(id) DO UPDATE SET position = (position + 1) % ? RETURNING position", instances.length)
      .one();

    return instances[position];
  }
}

export default {
  async scheduled(_, env) {
    const catalogHolder = env.ROUND_ROBIN.getByName("public-instances");

    try {
      const catalog = await catalogHolder.refreshCatalog();
      const workingCount = listWorkingOrigins(catalog.groups).length;
      console.log(
        JSON.stringify({
          event: "catalog_refreshed",
          source: catalog.source,
          retrievedOn: catalog.retrievedOn,
          workingCount,
        }),
      );
    } catch (error) {
      console.error(JSON.stringify({ event: "catalog_refresh_failed", message: String(error) }));
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      const catalog = await env.ROUND_ROBIN.getByName("public-instances").getCatalog();
      const instances = listWorkingOrigins(catalog.groups);
      return new Response(request.method === "HEAD" ? null : homepage(instances, catalog), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
        },
      });
    }

    try {
      const origin = await env.ROUND_ROBIN.getByName("public-instances").next();
      if (origin) {
        return new Response(null, {
          status: 302,
          headers: {
            location: origin + url.pathname + url.search,
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
          },
        });
      }
    } catch (error) {
      console.error(JSON.stringify({ event: "rotation_failed", message: String(error) }));
    }

    return new Response("No instance is available. Please try again shortly.\n", {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "retry-after": "30",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  },
};
