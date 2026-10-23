"""Archived email oracle contracts: protocols, revisions, secrecy, retries and multilingual envelopes."""
import json
import os
import pathlib
from unittest.mock import patch
from testing.reference_connector import Connector, email_config, email_delivery, email_templates


class EmailContracts:
    def test_default_disabled_secrets_revision_and_tenant(self):
        self.assertFalse(
            self.connector.action("one", "email", "status", {})["settings"]["enabled"]
        )
        with self.assertRaises(ValueError):
            self.send()
        value = self.configure()
        self.assertNotIn("fixture-api-key", json.dumps(value))
        self.assertTrue(value["credentialsConfigured"]["apiKey"])
        self.assertFalse(
            self.connector.action("two", "email", "status", {})[
                "credentialsConfigured"
            ]["apiKey"]
        )
        with self.assertRaises(ValueError):
            self.connector.action(
                "one", "email", "configure", {"revision": 0, "settings": self.settings}
            )
        self.assertNotIn(
            b"fixture-api-key",
            pathlib.Path(self.temp.name + "/state.sqlite").read_bytes(),
        )

    def test_dry_run_duplicate_and_conflicting_payload(self):
        self.configure()
        self.send()
        self.send()
        self.connector.once("email")
        self.send()
        self.connector.once("email")
        jobs = self.connector.store.jobs("one", "email")
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0]["result"]["outcome"], "dry_run")
        self.assertEqual(self.smtp.messages, [])
        with self.assertRaises(ValueError):
            self.send(
                message={"to": "other@example.test", "subject": "Changed", "text": "x"}
            )

    def test_real_smtp_plain_starttls_and_implicit_tls(self):
        sentinel = object()
        with patch(
            "email_delivery.socket.create_connection",
            side_effect=[OSError("No IPv6 route"), sentinel],
        ) as connect:
            self.assertIs(
                email_delivery.pinned_socket(
                    (["2001:4860:4860::8888", "8.8.8.8"], 587), 8
                ),
                sentinel,
            )
            self.assertEqual(connect.call_args.args[0], ("8.8.8.8", 587))
        for mode in ("test_plain", "starttls", "tls"):
            self.smtp.implicit = mode == "tls"
            self.configure(dryRun=False, smtpSecurity=mode)
            self.send(mode)
            with patch(
                "email_delivery.ssl.create_default_context",
                return_value=self.client_context,
            ):
                self.connector.once("email")
            self.assertEqual(
                self.connector.store.jobs("one", "email")[0]["result"]["outcome"],
                "accepted",
            )
        self.assertEqual(len(self.smtp.messages), 3)
        for recipients, raw in self.smtp.messages:
            self.assertEqual(len(recipients), 2)
            self.assertNotIn(b"Bcc:", raw)
            self.assertIn(b"multipart/alternative", raw)

    def test_real_resend_sendgrid_global_and_eu(self):
        for provider, region in (
            ("resend", "global"),
            ("sendgrid", "global"),
            ("sendgrid", "eu"),
        ):
            self.provider.code = 200 if provider == "resend" else 202
            self.configure(provider=provider, region=region, dryRun=False)
            self.send(provider + region)
            self.connector.once("email")
            job = self.connector.store.jobs("one", "email")[0]
            self.assertEqual(job["result"]["outcome"], "accepted")
        self.assertEqual(len(self.provider.calls), 3)
        path, body, headers = self.provider.calls[0]
        self.assertEqual(path, "/emails")
        self.assertEqual(body["bcc"], ["archive@example.test"])
        self.assertEqual(len(headers["Idempotency-Key"]), 64)
        self.assertEqual(self.provider.calls[1][0], "/mail/send")
        self.assertEqual(
            self.provider.calls[1][1]["personalizations"][0]["to"],
            [{"email": "buyer@example.test"}],
        )

    def test_rate_limit_retry_and_uncertain_no_automatic_resend(self):
        self.configure(provider="resend", dryRun=False)
        self.provider.code = 429
        self.send()
        self.connector.once("email")
        self.assertEqual(
            self.connector.store.jobs("one", "email")[0]["state"], "queued"
        )
        with self.connector.store.db() as db:
            db.execute("UPDATE jobs SET available=0")
        self.provider.code = 503
        self.connector.once("email")
        self.connector.once("email")
        self.assertEqual(
            self.connector.store.jobs("one", "email")[0]["state"], "uncertain"
        )
        self.assertEqual(len(self.provider.calls), 2)
        self.send()
        self.connector.once("email")
        self.assertEqual(len(self.provider.calls), 2)

    def test_revision_change_and_restart_fence(self):
        self.configure()
        self.send()
        self.configure(fromName="Changed sender")
        self.connector.once("email")
        self.assertEqual(
            self.connector.store.jobs("one", "email")[0]["state"], "failed"
        )
        self.send("restart")
        self.connector.store.claim("email")
        self.connector = Connector()
        self.assertEqual(
            self.connector.store.jobs("one", "email")[0]["state"], "uncertain"
        )

    def test_validation_ssrf_tls_secret_switch_and_header_injection(self):
        with self.assertRaises(ValueError):
            email_config.address("buyer@example.test\r\nBcc: stolen@example.test")
        with self.assertRaises(ValueError):
            email_templates.envelope(
                {"to": "buyer@example.test", "subject": "Bad\nHeader", "text": "x"},
                self.settings,
            )
        with patch.dict(
            os.environ, {"EMAIL_TEST_SMTP": "0", "EMAIL_SMTP_HOSTS": "localhost"}
        ):
            with self.assertRaises(ValueError):
                email_config.smtp_target(
                    {**self.settings, "smtpPort": 587, "smtpSecurity": "starttls"}
                )
        self.configure(provider="resend")
        v = self.connector.action(
            "one",
            "email",
            "configure",
            {"revision": 1, "settings": {**self.settings, "provider": "sendgrid"}},
        )
        self.assertFalse(v["credentialsConfigured"]["apiKey"])

    def test_all_languages_html_escape_and_order_event_queue(self):
        self.configure(notifyOrders=True)
        event = {
            "order": {
                "orderNumber": "O-42",
                "orderCustomer": {"email": "buyer@example.test", "firstName": "<Ada>"},
                "cart": {"price": {"totalPrice": 42}},
                "currencyId": "EUR",
            }
        }
        subjects = []
        for locale in email_config.LOCALES:
            preview = self.connector.action(
                "one", "email", "preview_order", {"event": event, "locale": locale}
            )
            subjects.append(preview["mail"]["subject"])
        self.assertEqual(len(set(subjects)), 4)
        self.configure(templates={"en": {"html": "<p>{firstName}</p>"}})
        preview = self.connector.action(
            "one", "email", "preview_order", {"event": event}
        )
        self.assertEqual(preview["mail"]["html"], "<p>&lt;Ada&gt;</p>")
        self.connector.handle(
            "one",
            "email",
            "events",
            {"kind": "order.placed", "idempotencyKey": "evt-42", "data": event},
        )
        self.connector.once("email")
        self.assertEqual(
            self.connector.store.jobs("one", "email")[0]["result"]["outcome"], "dry_run"
        )
