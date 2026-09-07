# occupy-x

A round robin redirector for active Nitter instances, hosted on Cloudflare Workers.

The initial deployment returns `Hello world from occupy-x!`. Instance discovery,
health checks, and round robin redirects are planned; they are not implemented yet.

## Development

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

## Validation and deployment

```sh
npm run check
npm run deploy
```

Deployment uses Wrangler's authenticated Cloudflare account. Run `npx wrangler login`
if authentication is needed. Keep credentials out of version control.
