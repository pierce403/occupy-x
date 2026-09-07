# Nitter sources and implementation notes

Reviewed on 2026-09-07 using the [Shitter wiki](https://codeberg.org/mv12star/shitter/wiki).
The wiki was retrieved through its Git repository because the web fetch failed.
Source revision: `a0f2137a531092ffddc0698e054f21ea2de80959`.

## Instance discovery

[Instances](https://codeberg.org/mv12star/shitter/wiki/Instances) is the initial
candidate source. [The structured snapshot](../data/instance-candidates.json)
preserves its four groups: working (9 public HTTPS and 3 Tor), redirectors (3),
active but rate limited (8), and formerly active / taken down (6).
These are upstream labels, not occupy-x health measurements. The snapshot is
dated and will become stale; the Worker consumes its working HTTPS candidates.

Routing policy and remaining work:

- Start with the public HTTPS candidates in the working group.
- Keep Tor addresses outside ordinary browser redirects; they require Tor.
- Exclude other redirectors to avoid redirect chains or loops.
- Keep rate-limited and former instances out of the default pool.
- Track discovery and health separately. A successful homepage response alone
  does not establish that profile or post retrieval works.
- Refresh on a bounded schedule, preserve the last successful source snapshot,
  and define an explicit fallback when no verified instance remains usable.

## Related documentation

| Source | Relevance to occupy-x |
| --- | --- |
| [Extensions](https://codeberg.org/mv12star/shitter/wiki/Extensions) | Documents browser redirect integrations and distinct routes for posts, shortened links, and media. Preserve paths and query strings; treat shortened-link and media support as separate capabilities. |
| [Embeds guide](https://codeberg.org/mv12star/shitter/wiki/Embeds-guide) | Describes widgets.js, post embed routes, video-only routes, and theme parameters. Embed support should be verified per instance before advertising it. |
| [Forks](https://codeberg.org/mv12star/shitter/wiki/Forks-of-the-Nitter-code-repository) | Lists modified forks and mirrors. Do not assume every public instance implements the same capabilities. |
| [Nginx rate limiting](https://codeberg.org/mv12star/shitter/wiki/Rate-Limiting-%E2%80%90-Nginx) | Explains operator limits and bans. Health checks should be infrequent, bounded, and respect backoff. |
| [Caddy rate limiting](https://codeberg.org/mv12star/shitter/wiki/Rate-Limiting-%E2%80%90-Caddy) | Describes another operator rate-limit configuration. A blocked probe is not necessarily a dead service. |

The Worker implements the HTTPS-only working pool with Tor and other source
groups excluded. Scheduled refresh, health verification, and a last-known-good
health pool remain proposals inferred from these sources, not upstream requirements.
The wiki also indexes self-hosting and reverse-proxy documentation; those become
relevant if this project later operates a Nitter instance itself.

## Refreshing this research

Fetch `https://codeberg.org/mv12star/shitter.wiki.git` into an ignored scratch
directory, review `Instances.md` and relevant changed pages, then update the
snapshot's source commit and retrieval date. Review section boundaries when
extracting URLs: flattening every link into one pool would mix working instances
with redirectors and retired services.

The local checkout used for this review is `tmp/shitter-wiki` (ignored by Git).
This document summarizes and links to upstream material rather than vendoring
the wiki wholesale.
