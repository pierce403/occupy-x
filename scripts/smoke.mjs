import assert from 'node:assert/strict';
import candidates from '../data/instance-candidates.json' with { type: 'json' };
const base = process.argv[2] || 'http://localhost:8787';
const origins = candidates.groups.working.filter(x => !x.requiresTor && x.url.startsWith('https:')).map(x => x.url);
const get = (path, options = {}) => fetch(base + path, { redirect: 'manual', ...options });
const home = await get('/?example=yes');
assert.equal(home.status, 200);
assert.match(home.headers.get('content-type'), /text\/html/);
assert.match(await home.text(), /occupy-x.com\/deanpierce/);
const selected = [];
for (let i = 0; i <= origins.length; i++) {
  if (i === 1) assert.equal((await get('/')).status, 200);
  const path = '/deanpierce/status/123?theme=dark&q=a%2Fb&x=1&x=2';
  const response = await get(path);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const location = response.headers.get('location');
  const origin = new URL(location).origin;
  assert.ok(origins.includes(origin));
  assert.equal(location, origin + path);
  selected.push(origin);
}
assert.equal(new Set(selected.slice(0, origins.length)).size, origins.length);
assert.equal(selected[0], selected.at(-1));
for (let i = 1; i < selected.length; i++) assert.equal(origins.indexOf(selected[i]), (origins.indexOf(selected[i-1]) + 1) % origins.length);
for (const path of ['//example.com/somewhere', '/a%2Fb/%E2%98%83?next=https%3A%2F%2Fexample.com']) {
  const response = await get(path);
  const location = response.headers.get('location');
  assert.equal(response.status, 302);
  assert.ok(origins.includes(new URL(location).origin));
  assert.equal(location, new URL(location).origin + path);
}
const head = await get('/deanpierce', { method: 'HEAD' });
assert.equal(head.status, 302);
assert.equal(await head.text(), '');
if (base.startsWith('http://localhost:')) {
  const concurrent = await Promise.all(Array.from({length: origins.length * 2}, () => get('/deanpierce')));
  const counts = new Map();
  for (const response of concurrent) {
    assert.equal(response.status, 302);
    const origin = new URL(response.headers.get('location')).origin;
    counts.set(origin, (counts.get(origin) || 0) + 1);
  }
  assert.equal(counts.size, origins.length);
  for (const count of counts.values()) assert.equal(count, 2);
}
console.log('PASS: homepage, full rotation, wraparound, path/query preservation, allowed origins, HEAD, and cache headers', base);
