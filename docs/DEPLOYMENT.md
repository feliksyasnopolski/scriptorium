# Production deployment

The production request path is:

```text
Internet :80/:443
    -> host Caddy
    -> kamal-proxy over 127.0.0.1:8080
    -> Rails application container on the kamal network
    -> host PostgreSQL
```

Caddy is host infrastructure and owns public ports 80 and 443. It serves the
Certbot HTTP-01 challenge from `/var/lib/caddy/acme` and proxies all other
HTTPS requests to Kamal. Kamal and kamal-proxy retain responsibility for
application deployment, health checks, and version switching, but
kamal-proxy does not terminate public TLS.

For the temporary bare-IP deployment, Certbot remains the certificate owner.
The `snap.certbot.renew.timer` deploy hook grants the packaged `caddy` service
account read access to the current live PEM files and reloads Caddy after a
successful renewal. Caddy should become the certificate owner once a normal
production hostname is available.

The host configuration source is [`ops/Caddyfile`](../ops/Caddyfile). Install
it as `/etc/caddy/Caddyfile`, validate it with `caddy validate`, and reload
the `caddy` systemd service. Configure the existing Certbot lineages to use
the Caddy-served webroot `/var/lib/caddy/acme` for HTTP-01 renewal. Install
[`ops/scriptorium-caddy-renew`](../ops/scriptorium-caddy-renew) as
`/etc/letsencrypt/renewal-hooks/deploy/scriptorium-caddy-renew`.
