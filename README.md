# occupy-x

A round robin redirector for active Nitter instances, hosted on Cloudflare Workers.

Live at https://occupy-x.com. The root path shows an explanation page. Every
non-root path returns a `302` to the next public HTTPS instance, preserving the
path and query string. For example, `/elonmusk` redirects to the selected
instance's `/elonmusk` page. Redirects use `Cache-Control: no-store`.

A SQLite-backed Durable Object persists one shared rotation counter. This gives
consistent round robin across Worker isolates and restarts, with one coordination
point for redirect traffic. Homepage requests do not advance the counter.
Tor, other redirectors, rate-limited, and former instances are excluded.
The worker now keeps the rotation catalog in Durable Object storage and refreshes it on a
daily cron (`04:05 UTC`) from the Shitter wiki source. Homepage and redirects use that
latest catalog, so the rotation list updates without redeploy.
Manual overrides live in [data/disabled-instances.json](data/disabled-instances.json).
Add a hostname and reason to exclude a broken instance from rotation and display it
in the homepage’s separate “Manually disabled” column. Overrides apply to the stored
catalog and future wiki refreshes; remove the entry and redeploy to re-enable it
if the wiki still lists it as working. Hostname matching also excludes alternate ports.
Automatic health checks are still not implemented, and a rotation failure returns
`503` with `Retry-After: 30`.

## Instance sources

The initial discovery source is the [Shitter instance wiki](https://codeberg.org/mv12star/shitter/wiki/Instances).
See [research and design notes](docs/nitter-sources.md). Listing metadata in
[data/instance-candidates.json](data/instance-candidates.json) is the fallback seed if a sync has not run yet.

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
