import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('homepage, rotation, and scheduled catalog refresh', async () => {
  const bundle = await build({ entryPoints: ['src/index.js'], bundle: true, write: false, format: 'esm', external: ['cloudflare:workers'] });
  let wiki = '## Working\n- https://first.example\n- [Second](https://second.example)\n- https://hidden.onion\n- http://insecure.example\n## Redirectors\n- https://redirect.example';
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: '2026-09-07', compatibilityFlags: ['nodejs_compat'],
    durableObjects: { ROUND_ROBIN: { className: 'RoundRobin', useSQLite: true } },
    outboundService: () => new Response(wiki),
  }));
  try {
    const home = await mf.dispatchFetch('https://occupy-x.com/');
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /occupy-x.com\/elonmusk/);
    assert.doesNotMatch(html, /deanpierce/i);
    const worker = await mf.getWorker();
    await worker.scheduled({ cron: '5 4 * * *' });
    const updated = await (await mf.dispatchFetch('https://occupy-x.com/')).text();
    assert.match(updated, /2 public HTTPS instances/);
    assert.match(updated, /first\.example/);
    assert.doesNotMatch(updated, /hidden\.onion|insecure\.example|redirect\.example/);
    for (const host of ['first.example', 'second.example', 'first.example']) {
      const response = await mf.dispatchFetch('https://occupy-x.com/elonmusk/status/123?foo=bar', { redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), `https://${host}/elonmusk/status/123?foo=bar`);
    }
    wiki = '# Unexpected wiki format';
    await worker.scheduled({ cron: '5 4 * * *' });
    const retained = await (await mf.dispatchFetch('https://occupy-x.com/')).text();
    assert.match(retained, /2 public HTTPS instances/);
  } finally {
    await mf.dispose();
  }
});
