"""Loopback SMTP/TLS and HTTP mail-provider fixtures plus consent-aware test requests."""
import json
import socketserver
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler
from testing.app_approval import consent


def http(url, body=None, headers=None, method=None, expected=200):
    if urllib.parse.urlsplit(url).path == '/api/apps' and isinstance(body,dict) and ('manifest' in body or 'builtIn' in body): body=consent(body)
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **(headers or {})},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            status, result = r.status, json.load(r)
    except urllib.error.HTTPError as e:
        status, result = e.code, json.load(e)
        e.close()
    assert status == expected, (req.selector, status, result)
    return result



class SMTP(socketserver.StreamRequestHandler):
    def finish(self):
        try:
            super().finish()
        finally:
            self.request.close()

    def handle(self):
        if self.server.implicit:
            self.connection = self.request = self.server.context.wrap_socket(
                self.request, server_side=True
            )
            self.rfile = self.request.makefile("rb")
            self.wfile = self.request.makefile("wb")

        def reply(text):
            self.wfile.write((text + "\r\n").encode())
            self.wfile.flush()

        reply("220 fixture SMTP")
        recipients = []
        while True:
            command = self.rfile.readline().decode().strip()
            if not command:
                return
            verb = command.split()[0].upper()
            if verb in ("EHLO", "HELO"):
                self.wfile.write(b"250-fixture\r\n250 STARTTLS\r\n")
                self.wfile.flush()
            elif verb == "STARTTLS":
                reply("220 Ready for TLS")
                self.rfile.close()
                self.wfile.close()
                self.connection = self.request = self.server.context.wrap_socket(
                    self.request, server_side=True
                )
                self.rfile = self.request.makefile("rb")
                self.wfile = self.request.makefile("wb")
            elif verb == "RCPT":
                recipients.append(command)
                reply("250 Recipient accepted")
            elif verb == "DATA":
                reply("354 Send message")
                lines = []
                while True:
                    line = self.rfile.readline()
                    if line in (b".\r\n", b""):
                        break
                    lines.append(line)
                self.server.messages.append((recipients, b"".join(lines)))
                if getattr(self.server, "drop_after_data", False): return
                reply("250 Message accepted")
            elif verb == "QUIT":
                reply("221 Bye")
                return
            else:
                reply("250 OK")



class Provider(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        self.server.calls.append(
            (
                self.path,
                json.loads(self.rfile.read(int(self.headers["Content-Length"]))),
                dict(self.headers),
            )
        )
        body = (
            b""
            if self.server.code == 202
            else json.dumps({"id": "fixture-message"}).encode()
        )
        self.send_response(self.server.code)
        self.send_header("X-Message-Id", "sendgrid-fixture")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
