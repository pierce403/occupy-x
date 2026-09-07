import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('homepage, rotation, and scheduled catalog refresh', async () => {
  const bundle = await build({ entryPoints: ['src/index.js'], bundle: true, write: false, format: 'esm', external: ['cloudflare:workers'] });
  let wiki = '## Working\n- https://NITTER.CLICK/\n- https://nitter.click:8443\n- https://nitter.click./\n- https://first.example\n- [Second](https://second.example)\n- https://hidden.onion\n- http://insecure.example\n## Redirectors\n- https://redirect.example';
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'occupy-x',
    modules: true, script: bundle.outputFiles[0].text,
    assets: { directory: './public', routerConfig: { has_user_worker: true } },
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
    assert.match(html, /8 public HTTPS instances/);
    assert.doesNotMatch(html.split('id="rotation-heading"')[1].split('</section>')[0], /nitter\.click/);
    assert.match(html.split('id="disabled-heading"')[1], /nitter\.click/);
    for (let i = 0; i < 16; i++) {
      const response = await mf.dispatchFetch('https://occupy-x.com/test', { redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.notEqual(new URL(response.headers.get('location')).hostname, 'nitter.click');
    }
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    const imageUrl = html.match(/property="og:image" content="([^"]+)"/)[1];
    const preview = await mf.dispatchFetch(imageUrl, { redirect: 'manual' });
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get('content-type'), /image\/png/);
    const imageBytes = Buffer.from(await preview.arrayBuffer());
    assert.deepEqual(imageBytes, await readFile('public/og-v1.png'));
    assert.equal(imageBytes.readUInt32BE(16), Number(html.match(/property="og:image:width" content="(\d+)"/)[1]));
    assert.equal(imageBytes.readUInt32BE(20), Number(html.match(/property="og:image:height" content="(\d+)"/)[1]));
    const worker = await mf.getWorker();
    await worker.scheduled({ cron: '5 4 * * *' });
    const updated = await (await mf.dispatchFetch('https://occupy-x.com/')).text();
    assert.match(updated, /2 public HTTPS instances/);
    assert.match(updated, /first\.example/);
    assert.doesNotMatch(updated.split('id="rotation-heading"')[1].split('</section>')[0], /nitter\.click/i);
    assert.match(updated.split('id="disabled-heading"')[1], /nitter\.click/);
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
