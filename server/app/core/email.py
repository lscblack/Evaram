import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger("evaramu.email")

_BASE_STYLE = """
  body{margin:0;background:#f5f2ed;font-family:'Helvetica Neue',Arial,sans-serif;color:#062b4f}
  .wrap{max-width:560px;margin:0 auto;padding:32px 20px}
  .card{background:#fff;border-radius:16px;padding:32px;border:1px solid #e4e9f0}
  .brand{font-size:20px;font-weight:700;letter-spacing:-.01em;color:#062b4f}
  .brand span{color:#be7c28}
  .muted{color:#5f7a97;font-size:14px;line-height:1.6}
  .code{font-size:34px;letter-spacing:.34em;font-weight:700;color:#062b4f;
        background:#f5f2ed;border-radius:12px;padding:18px 12px;text-align:center;margin:24px 0}
  .foot{color:#97aabf;font-size:12px;text-align:center;margin-top:24px;line-height:1.6}
"""


def _shell(title: str, body_html: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><style>{_BASE_STYLE}</style></head>
<body><div class="wrap"><div class="card">
<p class="brand">Evaramu <span>Group Ltd</span></p>
{body_html}
</div><p class="foot">Evaramu Group Ltd · Kigali, Rwanda<br>
You received this because someone used this address on evaramu.rw.</p></div></body></html>"""


async def send_email(
    to: str, subject: str, html: str, text: str | None = None
) -> bool:
    """Returns True when handed to the SMTP server."""
    if not settings.EMAIL_ENABLED:
        logger.info("email disabled; would send %r to %s", subject, to)
        return False

    message = EmailMessage()
    message["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_SENDER_EMAIL}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text or "This message requires an HTML capable client.")
    message.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.EMAIL_SMTP_SERVER,
            port=settings.EMAIL_SMTP_PORT,
            username=settings.EMAIL_LOGIN,
            password=settings.EMAIL_SENDER_PASSWORD,
            start_tls=True,
            timeout=20,
        )
        logger.info("sent %r to %s", subject, to)
        return True
    except Exception as exc:  # noqa: BLE001 - never break a request on email
        if settings.EMAIL_FAIL_SILENTLY:
            logger.warning("email send failed (%s): %r to %s", exc, subject, to)
            return False
        raise


async def send_otp_email(to: str, name: str, code: str, minutes: int) -> bool:
    html = _shell(
        "Your verification code",
        f"""<p class="muted">Hello {name},</p>
        <p class="muted">Use this code to finish signing in. It expires in {minutes} minutes.</p>
        <div class="code">{code}</div>
        <p class="muted">If you did not try to sign in, change your password immediately
        and let us know.</p>""",
    )
    return await send_email(to, f"{code} is your Evaramu verification code", html,
                            text=f"Your Evaramu code is {code}. It expires in {minutes} minutes.")


async def send_welcome_email(to: str, name: str, role: str, temp_password: str | None) -> bool:
    credentials = (
        f'<div class="code" style="font-size:18px;letter-spacing:.06em">{temp_password}</div>'
        '<p class="muted">Change this the first time you sign in.</p>'
        if temp_password
        else ""
    )
    html = _shell(
        "Welcome to Evaramu",
        f"""<p class="muted">Hello {name},</p>
        <p class="muted">An account has been created for you on the Evaramu platform
        with the role <strong>{role}</strong>.</p>{credentials}
        <p class="muted">Every sign-in is protected by a one-time code sent to this address.</p>""",
    )
    return await send_email(to, "Your Evaramu account", html)


async def send_booking_confirmation(
    to: str, name: str, consultation: str, when: str, mode: str, reference: str
) -> bool:
    html = _shell(
        "Booking confirmed",
        f"""<p class="muted">Hello {name},</p>
        <p class="muted">Your <strong>{consultation}</strong> is confirmed.</p>
        <p class="muted"><strong>{when}</strong><br>{mode}<br>
        Reference <strong>{reference}</strong></p>
        <p class="muted">Rescheduling is always free — just reply to this email.</p>""",
    )
    return await send_email(to, f"Confirmed: {consultation} · {reference}", html)


async def send_enquiry_notification(
    to: str, property_title: str, reference: str, name: str, contact: str, message: str
) -> bool:
    html = _shell(
        "New property enquiry",
        f"""<p class="muted">A new enquiry has come in.</p>
        <p class="muted"><strong>{property_title}</strong> ({reference})<br>
        From: {name} — {contact}</p>
        <p class="muted">{message or "(no message)"}</p>
        <p class="muted">Respond within two hours.</p>""",
    )
    return await send_email(to, f"Enquiry: {reference} — {property_title}", html)
