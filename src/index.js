import { DurableObject } from "cloudflare:workers";
import candidates from "../data/instance-candidates.json";
import { homepage } from "./page.js";

const instances = candidates.groups.working
  .filter(({ url, requiresTor }) => {
    const parsed = new URL(url);
    return !requiresTor && parsed.protocol === "https:" && !parsed.hostname.endsWith(".onion");
  })
  .map(({ url }) => new URL(url).origin);

export class RoundRobin extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS rotation (id INTEGER PRIMARY KEY CHECK (id = 1), position INTEGER NOT NULL)");
  }

  next() {
    if (!instances.length) return null;
    const { position } = this.ctx.storage.sql.exec(
      "INSERT INTO rotation (id, position) VALUES (1, 0) ON CONFLICT(id) DO UPDATE SET position = (position + 1) % ? RETURNING position",
      instances.length,
    ).one();
    return instances[position];
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(request.method === "HEAD" ? null : homepage(instances, candidates), {
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
        // Concatenation keeps even // paths on the selected, allowlisted origin.
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
      headers: { "cache-control": "no-store", "retry-after": "30", "content-type": "text/plain; charset=utf-8" },
    });
  },
};
