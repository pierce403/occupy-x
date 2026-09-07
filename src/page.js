const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function homepage(instances, source) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>occupy-x — a way to read X</title><meta name="description" content="Open X profiles and posts through a rotating list of public Nitter instances.">
<link rel="icon" href="data:,">
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#111714;color:#edf4ed}*{box-sizing:border-box}body{margin:0}main{max-width:760px;margin:auto;padding:80px 24px}small,.muted{color:#a9b9ad}h1{font-size:clamp(3rem,10vw,5.5rem);letter-spacing:-.06em;margin:16px 0}h2{margin-top:48px;font-size:1.3rem}p,li{line-height:1.7}a{color:#b7f596;text-underline-offset:4px}code{overflow-wrap:anywhere}section{border:1px solid #354139;border-radius:12px;padding:20px 24px;margin:32px 0}ul{padding-left:22px}.example{font-size:1.1rem}footer{margin-top:48px;font-size:.9rem}
</style></head><body><main>
<small>A PUBLIC NITTER REDIRECTOR</small><h1>occupy-x</h1>
<p>Read X profiles and posts through Nitter, an alternative front end. Add a profile or post path to occupy-x.com and we’ll send you to the next public instance in the rotation.</p>
<section><p class="example">Try <a href="/deanpierce"><code>occupy-x.com/deanpierce</code></a></p>
<p>For a post, use <code>occupy-x.com/username/status/123456789</code>. The path and query parameters travel with you.</p></section>
<h2>How it works</h2><p>Each link gets a temporary redirect to the next instance. We rotate through ${instances.length} public HTTPS instances; Tor addresses and other redirectors are excluded. This page stays here so you can learn how to use it.</p>
<p class="muted">Instances are listed as working in the <a href="${escape(source.source)}">Shitter community wiki</a>, using our ${escape(source.retrievedOn)} snapshot. We don’t run these instances or continuously check their availability. If one fails, reopen your occupy-x link to try another.</p>
<h2>In the rotation</h2><ul>${instances.map((origin) => `<li><a href="${escape(origin)}">${escape(new URL(origin).hostname)}</a></li>`).join("")}</ul>
<footer><a href="https://github.com/pierce403/occupy-x">Source on GitHub</a> · Independent of X and the instance operators.</footer>
</main></body></html>`;
}
