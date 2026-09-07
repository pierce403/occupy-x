# occupy-x

A round robin redirector for active Nitter instances, hosted on Cloudflare Workers.

Live at https://occupy-x.com. The root path shows an explanation page. Every
non-root path returns a `302` to the next public HTTPS instance, preserving the
path and query string. For example, `/deanpierce` redirects to the selected
instance's `/deanpierce` page. Redirects use `Cache-Control: no-store`.

A SQLite-backed Durable Object persists one shared rotation counter. This gives
consistent round robin across Worker isolates and restarts, with one coordination
point for redirect traffic. Homepage requests do not advance the counter.
Tor, other redirectors, rate-limited, and former instances are excluded.
The pool uses the checked-in wiki snapshot; automatic refresh and health checks
are not implemented. A rotation failure returns `503` with `Retry-After: 30`.

## Instance sources

The initial discovery source is the [Shitter instance wiki](https://codeberg.org/mv12star/shitter/wiki/Instances).
See [research and design notes](docs/nitter-sources.md) and the
[dated candidate snapshot](data/instance-candidates.json). Listed status comes
from the wiki; independent health checks have not been run.

## Development

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

## Validation and deployment

```sh
npm run check
node scripts/smoke.mjs # with npm run dev running
npm run deploy
```

Deployment uses Wrangler's authenticated Cloudflare account. Run `npx wrangler login`
if authentication is needed. Keep credentials out of version control.
