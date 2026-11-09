"""Outgoing email (sign-in codes).

MAIL_BACKEND=smtp sends through SMTP_*; =file writes .eml files to
MAIL_OUTBOX_DIR (development and tests only); =disabled sends nothing.
Recipients and message bodies are never logged.
"""

from __future__ import annotations

import logging
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

from evaramu.core.config import get_settings

log = logging.getLogger(__name__)


def send_mail(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send one message. Returns False (and logs the error type only) on failure."""
    s = get_settings()
    if s.MAIL_BACKEND == "disabled":
        return False
    msg = EmailMessage()
    msg["From"] = s.MAIL_FROM or "Evaramu <no-reply@localhost>"
    msg["To"] = to
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    domain = s.MAIL_FROM.rsplit("@", 1)[-1].strip(" >") if "@" in s.MAIL_FROM else "localhost"
    msg["Message-ID"] = make_msgid(domain=domain or "localhost")
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    try:
        if s.MAIL_BACKEND == "file":
            s.MAIL_OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
            path = s.MAIL_OUTBOX_DIR / f"{time.time_ns()}.eml"
            path.write_bytes(bytes(msg))
            return True
        password = s.SMTP_PASSWORD.get_secret_value()
        if s.SMTP_SECURITY == "ssl":
            server: smtplib.SMTP = smtplib.SMTP_SSL(s.SMTP_HOST, s.SMTP_PORT, timeout=15,
                                                    context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=15)
        with server:
            if s.SMTP_SECURITY == "starttls":
                server.starttls(context=ssl.create_default_context())
            if s.SMTP_USER:
                server.login(s.SMTP_USER, password)
            server.send_message(msg)
        return True
    except Exception as exc:  # network / auth / filesystem
        log.warning("Email delivery failed: %s", type(exc).__name__)
        return False
