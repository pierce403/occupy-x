import disabledInstances from "../data/disabled-instances.json";

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function homepage(instances, source) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>occupy-x: nitter redirector</title><meta name="description" content="Open X profiles and posts through a rotating list of public Nitter instances.">
<link rel="canonical" href="https://occupy-x.com/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="occupy-x">
<meta property="og:title" content="occupy-x: Read X through Nitter">
<meta property="og:description" content="One link. A rotating list of public Nitter instances. Open X profiles and posts through Nitter, with your path preserved.">
<meta property="og:url" content="https://occupy-x.com/">
<meta property="og:image" content="https://occupy-x.com/og-v1.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1730">
<meta property="og:image:height" content="909">
<meta property="og:image:alt" content="occupy-x: Read X through Nitter. One link. A rotating list of public Nitter instances.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="occupy-x: Read X through Nitter">
<meta name="twitter:description" content="One link. A rotating list of public Nitter instances. Open X profiles and posts through Nitter, with your path preserved.">
<meta name="twitter:image" content="https://occupy-x.com/og-v1.png">
<meta name="twitter:image:alt" content="occupy-x: Read X through Nitter. One link. A rotating list of public Nitter instances.">
<link rel="icon" href="data:,">
<style>
:root{color-scheme:dark;font-family:'Trebuchet MS','Avenir Next','Segoe UI',sans-serif;background:#050d0b;color:#edf9f0}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:
radial-gradient(circle at 10% -10%,#18483f 0,#050d0b 40%),radial-gradient(circle at 90% 0,#0b2f52 0,#050d0b 35%),linear-gradient(165deg,rgba(17,44,37,.85),rgba(5,13,11,.9));}
main{max-width:780px;margin:0 auto;padding:72px 24px 48px}small{display:inline-block;letter-spacing:.16em;text-transform:uppercase;font-size:.75rem;color:#9be6bf}
h1{font-size:clamp(3rem,10vw,5.8rem);line-height:1.02;letter-spacing:-.06em;margin:14px 0 10px}
h2{margin-top:44px;font-size:1.4rem}
p,li{line-height:1.7}a{color:#8ef8c7;text-underline-offset:4px}a:hover{text-decoration-thickness:2px}
code{overflow-wrap:anywhere;padding:.18rem .34rem;border-radius:7px;background:rgba(255,255,255,.04)}
.panel{border:1px solid #38564d;border-radius:16px;padding:22px 24px;background:rgba(10,20,16,.55);box-shadow:0 25px 60px rgba(0,0,0,.35);backdrop-filter: blur(7px)}
.example{font-size:1.12rem;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.example a{display:inline-block;padding:.44rem .72rem;border-radius:10px;background:linear-gradient(120deg,#8ef8c7,#62c0ff);color:#04110e;text-decoration:none;font-weight:700}
ul{padding-left:22px}.muted{color:#9ca59f}footer{margin-top:42px;color:#9ca59f;font-size:.9rem}section+p{margin-bottom:0}
.instance-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.instance-columns section{min-width:0}.instance-columns li{overflow-wrap:anywhere}.instance-columns h2{margin-top:28px}.instance-columns ul{padding-left:40px}.disabled-reason{display:block;font-size:.9rem;color:#9ca59f}@media(max-width:560px){.instance-columns{grid-template-columns:1fr;gap:0}}
</style></head><body><main>
<small>A PUBLIC NITTER REDIRECTOR</small><h1>occupy-x</h1>
<p>Read X profiles and posts through Nitter, an alternative front end. Add a profile or post path to occupy-x.com and we’ll send you to the next public instance in the rotation.</p>
<section class="panel">
<p class="example">Try <a href="/elonmusk"><code>occupy-x.com/elonmusk</code></a> and you’ll be routed immediately.</p>
<p>For a post, use <code>occupy-x.com/username/status/123456789</code>. The path and query parameters travel with you.</p></section>
<h2>How it works</h2><p>Each link gets a temporary redirect to the next instance. We rotate through ${instances.length} public HTTPS instances; Tor addresses, other redirectors, and manually disabled instances are excluded. This page stays here so you can learn how to use it.</p>
<p class="muted">Instances are listed as working in the <a href="${escape(source.source)}">Shitter community wiki</a>, using our ${escape(source.retrievedOn)} snapshot. We don’t run these instances or continuously check their availability. If one fails, reopen your occupy-x link to try another.</p>
<div class="instance-columns"><section aria-labelledby="rotation-heading"><h2 id="rotation-heading">In the rotation</h2><ul class="panel">${instances.map((origin) => `<li><a href="${escape(origin)}">${escape(new URL(origin).hostname)}</a></li>`).join("")}</ul></section>
<section aria-labelledby="disabled-heading"><h2 id="disabled-heading">Manually disabled</h2><p class="muted">Reported broken and excluded from rotation, even when the wiki lists them as working.</p><ul class="panel">${disabledInstances.map(({ hostname, reason }) => `<li>${escape(hostname)}<span class="disabled-reason">${escape(reason)}</span></li>`).join("") || "<li>No manually disabled instances.</li>"}</ul></section></div>
<footer><a href="https://github.com/pierce403/occupy-x">Source on GitHub</a> · Independent of X and the instance operators.</footer>
</main></body></html>`;
}
