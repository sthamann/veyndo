"""Shared disposable mail servers, synthetic CA and isolated archived connector settings."""
import copy
import json
import os
import pathlib
import socketserver
import ssl
import subprocess
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from cryptography.fernet import Fernet
from testing.reference_connector import Connector, email_config
from testing.mail_contracts.wire import SMTP, Provider


class MailFixtures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        cert = pathlib.Path(cls.folder.name) / "cert.pem"
        key = cert.with_name("key.pem")
        ca = cert.with_name("ca.pem")
        ca_key = cert.with_name("ca.key")
        csr = cert.with_name("leaf.csr")
        extensions = cert.with_name("leaf.ext")
        extensions.write_text("subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n")
        for command in [
            ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", str(ca_key), "-out", str(ca), "-days", "1", "-subj", "/CN=Veyndo synthetic CA", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign"],
            ["openssl", "req", "-newkey", "rsa:2048", "-nodes", "-keyout", str(key), "-out", str(csr), "-subj", "/CN=localhost"],
            ["openssl", "x509", "-req", "-in", str(csr), "-CA", str(ca), "-CAkey", str(ca_key), "-CAcreateserial", "-out", str(cert), "-days", "1", "-extfile", str(extensions)],
        ]:
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        cls.context.load_cert_chain(cert, key)
        cls.client_context = ssl.create_default_context(cafile=str(ca))
        cls.smtp = socketserver.ThreadingTCPServer(("127.0.0.1", 0), SMTP)
        cls.smtp.daemon_threads = True
        cls.smtp.context = cls.context
        cls.smtp.implicit = False
        cls.smtp.messages = []
        cls.provider = ThreadingHTTPServer(("127.0.0.1", 0), Provider)
        cls.provider.calls = []
        cls.provider.code = 200
        for server in (cls.smtp, cls.provider):
            threading.Thread(target=server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        for server in (cls.smtp, cls.provider):
            server.shutdown()
            server.server_close()
        cls.folder.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.env = patch.dict(
            os.environ,
            {
                "CONNECTOR_DATABASE": self.temp.name + "/state.sqlite",
                "CONNECTOR_SECRET_KEY": Fernet.generate_key().decode(),
                "CONNECTOR_GATEWAY_TOKEN": "fixture-gateway-" + "x" * 40,
                "EMAIL_TEST_SMTP": "1",
                "CONNECTOR_TEST_ENDPOINTS": json.dumps(
                    {
                        k: "http://127.0.0.1:" + str(self.provider.server_port)
                        for k in ("resend", "sendgrid", "sendgrid_eu")
                    }
                ),
            },
        )
        self.env.start()
        self.addCleanup(self.env.stop)
        self.connector = Connector()
        self.smtp.messages.clear()
        self.provider.calls.clear()
        self.provider.code = 200
        self.smtp.implicit = False
        self.settings = {
            **copy.deepcopy(email_config.DEFAULTS),
            "enabled": True,
            "fromEmail": "shop@example.test",
            "fromName": "Test shop",
            "smtpHost": "127.0.0.1",
            "smtpPort": self.smtp.server_address[1],
            "smtpSecurity": "test_plain",
        }

    def configure(self, **changes):
        self.settings.update(changes)
        return self.connector.action(
            "one",
            "email",
            "configure",
            {
                "revision": self.connector.store.get("one", "email")["revision"],
                "settings": self.settings,
                "credentials": {"apiKey": "fixture-api-key"},
            },
        )

    def send(self, key="request-one", **changes):
        return self.connector.action(
            "one",
            "email",
            "send",
            {
                "requestKey": key,
                "message": {
                    "to": ["buyer@example.test"],
                    "bcc": ["archive@example.test"],
                    "subject": "Order ✓",
                    "text": "Thank you",
                    "html": "<p>Thank you</p>",
                },
                **changes,
            },
        )
