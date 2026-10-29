# Actual WooCommerce source fixture

This optional disposable source complements the registered protocol fixtures. It
runs WordPress 6.8.3, WooCommerce 10.3.0 and MariaDB 11.4, with actual WooCommerce
REST responses and media. It is not an additional Veyndo runtime or migration engine.
Use a new Compose project and its own volumes; never point it at a merchant database.

Set `WOO_FIXTURE_DB_PASSWORD` and `WOO_FIXTURE_ROOT_PASSWORD` to independent random
disposable values, then run Compose with this `compose.yml`. Start `db` and `shop`,
wait for installation readiness and use the `cli` tools profile:

1. `wp core install --url=http://127.0.0.1:18887 --title='Atelier Migration Source' --admin_user=fixture_admin --admin_email=fixture@example.test --skip-email` with a separately generated `--admin_password`.
2. `wp rewrite structure '/%postname%/' --hard`.
3. `wp plugin install woocommerce --version=10.3.0 --activate`.
4. Set `woocommerce_currency=EUR`, `woocommerce_default_country=DE` and `woocommerce_prices_include_tax=yes` with `wp option update`.
5. Run `wp eval-file /fixture/seed.php` once. Save its JSON output privately with mode 0600: it includes a generated read-only source key, not an administrative key.

The seed creates two categories, 22 top-level products including one variable
parent with two concrete variants, one original image used by four native product
associations, a customer/address, one completed historical order for EUR 44.70,
a workshop page, a five-star review and a percent coupon with three remaining uses.
Default WordPress sample and WooCommerce cart/account/checkout pages are drafts;
they are source application routes, not authored content pages in this fixture.
`RESTOCK-*` products provide enough real writes to observe an interrupted batch.

The loopback source explicitly models TLS termination for WooCommerce key
authentication and returns local HTTP media. It is an HTTP-only disposable fixture;
this does not validate public TLS or change the migration service's HTTPS policy.
Only that separate service receives `MIGRATION_ALLOW_FIXTURE=1` for loopback reads.
Production source settings still require admitted HTTPS, pinned DNS and no redirects.

Use the existing migration app's encrypted settings (`username` = consumer key,
`token` = consumer secret), existing callback credentials and service admission.
Review and save native batches in dependency order. Import categories, products,
assets and pages into one private target; customers, historical orders, moderated
reviews and inactive coupons remain operational data in the synthetic parent shop.
Stop the owned `migration-assistant` process after nonzero progress, restart it,
wait for the ordinary native lease expiry, inspect the outcome and explicitly retry.
Do not alter the stored checkpoint, lease or database clock. Requeue the same
reviewed pages and require `comparison.matching == reviewed` with stable IDs.

Publish only selected catalogue/page/image changes through the normal release.
Activate stock explicitly, complete the actual native browser checkout with Demo
payment, return and reopen the basket. Compare the old source order's exact total,
variant parent/options, original image bytes and the unchanged source inventory.
[Recorded acceptance](../../../../../docs/evidence/woocommerce-source-2026-10-29.md).

Stop this project's source containers after acceptance. Remove only its own
volumes if intentionally discarding this disposable fixture; retained evidence
must contain no API keys, passwords or raw customer data.
