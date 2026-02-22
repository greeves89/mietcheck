"""Email service using aiosmtplib."""
import aiosmtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Design tokens (inline CSS for email clients)
# ─────────────────────────────────────────────
PRIMARY        = "#3b82f6"
PRIMARY_DARK   = "#2563eb"
BG             = "#f1f5f9"
CARD           = "#ffffff"
TEXT           = "#0f172a"
TEXT_MUTED     = "#64748b"
BORDER         = "#e2e8f0"
WARNING_BG     = "#fffbeb"
WARNING_BORDER = "#fde68a"
WARNING_TEXT   = "#92400e"
FONT           = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def _email_wrapper(content: str, app_name: str = "MietCheck", tagline: str = "Nebenkostenabrechnung prüfen & verstehen") -> str:
    year = datetime.now().year
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{app_name}</title>
</head>
<body style="margin:0;padding:0;background-color:{BG};font-family:{FONT};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{BG};min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,{PRIMARY} 0%,{PRIMARY_DARK} 100%);border-radius:16px 16px 0 0;padding:28px 36px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:rgba(255,255,255,0.18);border-radius:10px;width:42px;height:42px;text-align:center;vertical-align:middle;font-size:20px;">🏠</td>
              <td style="padding-left:12px;vertical-align:middle;">
                <p style="margin:0;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">{app_name}</p>
                <p style="margin:0;color:rgba(255,255,255,0.72);font-size:12px;">{tagline}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:{CARD};padding:36px;border-left:1px solid {BORDER};border-right:1px solid {BORDER};">
          {content}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f8fafc;border:1px solid {BORDER};border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;">
          <p style="margin:0 0 6px;color:{TEXT_MUTED};font-size:12px;">Diese E-Mail wurde von <strong>{app_name}</strong> automatisch versandt.</p>
          <p style="margin:0;color:{TEXT_MUTED};font-size:12px;">
            &copy; {year} {app_name}&nbsp;&middot;&nbsp;
            <a href="{settings.FRONTEND_URL}/impressum" style="color:{PRIMARY};text-decoration:none;">Impressum</a>&nbsp;&middot;&nbsp;
            <a href="{settings.FRONTEND_URL}/datenschutz" style="color:{PRIMARY};text-decoration:none;">Datenschutz</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


def _btn(url: str, label: str) -> str:
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
  <tr>
    <td style="border-radius:10px;background:linear-gradient(135deg,{PRIMARY} 0%,{PRIMARY_DARK} 100%);">
      <a href="{url}" style="display:inline-block;padding:13px 30px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">{label}</a>
    </td>
  </tr>
</table>"""


def _divider() -> str:
    return f'<div style="height:1px;background:{BORDER};margin:28px 0;"></div>'


# ─────────────────────────────────────────────
async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """Send an email via SMTP. Returns True on success."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured, skipping email to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        smtp_kwargs = {
            "hostname": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "username": settings.SMTP_USER,
            "password": settings.SMTP_PASSWORD,
        }
        if settings.SMTP_TLS:
            smtp_kwargs["start_tls"] = True

        await aiosmtplib.send(msg, **smtp_kwargs)
        logger.info("Email sent to %s: %s", to_email, subject)
        return True

    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return False


# ─────────────────────────────────────────────
# Template: Willkommen
# ─────────────────────────────────────────────
def build_welcome_email(name: str) -> tuple[str, str]:
    features = [
        ("Mathematische Prüfung", "Alle Berechnungen werden automatisch überprüft"),
        ("Fristprüfung", "Fristenprüfung nach § 556 BGB – nie eine Frist verpassen"),
        ("Plausibilitätsprüfung", "Vergleich mit aktuellen Verbrauchswerten"),
        ("Rechtsprüfung", "Erkennung unzulässiger Kostenpositionen"),
    ]

    rows = ""
    for title, desc in features:
        rows += f"""
        <tr>
          <td style="padding:8px 0;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;padding-top:2px;">
                  <span style="display:inline-block;width:18px;height:18px;background:#dbeafe;border-radius:50%;text-align:center;font-size:10px;line-height:18px;color:{PRIMARY};font-weight:700;">✓</span>
                </td>
                <td style="padding-left:10px;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:{TEXT};">{title}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:{TEXT_MUTED};">{desc}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    content = f"""
<h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:{TEXT};letter-spacing:-0.5px;">Herzlich willkommen, {name}! 👋</h1>
<p style="margin:0 0 28px;color:{TEXT_MUTED};font-size:15px;">Ihr MietCheck-Konto ist bereit.</p>

<p style="margin:0 0 20px;color:{TEXT};font-size:15px;line-height:1.7;">
  Schön, dass Sie sich für <strong>MietCheck</strong> entschieden haben!
  Laden Sie jetzt Ihre Nebenkostenabrechnung hoch und lassen Sie sie prüfen.
</p>

<div style="background:#f8fafc;border:1px solid {BORDER};border-radius:12px;padding:18px 22px;margin:0 0 8px;">
  <p style="margin:0 0 14px;color:{TEXT_MUTED};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;">Was MietCheck für Sie prüft</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    {rows}
  </table>
</div>

{_btn(f"{settings.FRONTEND_URL}/dashboard", "Abrechnung jetzt prüfen →")}

{_divider()}

<p style="margin:0;color:{TEXT_MUTED};font-size:13px;line-height:1.6;">
  Fragen oder Feedback? Nutzen Sie die <strong>Feedback-Funktion</strong> direkt in der App –
  wir helfen Ihnen gerne weiter.
</p>"""

    html = _email_wrapper(content)
    text = f"Willkommen bei MietCheck, {name}! Ihr Konto ist bereit. Dashboard: {settings.FRONTEND_URL}/dashboard"
    return html, text


# ─────────────────────────────────────────────
# Template: E-Mail verifizieren
# ─────────────────────────────────────────────
def build_verification_email(name: str, verify_url: str) -> tuple[str, str]:
    content = f"""
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#eff6ff;border-radius:50%;width:60px;height:60px;line-height:60px;font-size:26px;">✉️</div>
</div>

<h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:{TEXT};text-align:center;letter-spacing:-0.3px;">E-Mail bestätigen</h1>
<p style="margin:0 0 28px;color:{TEXT_MUTED};font-size:13px;text-align:center;">MietCheck &middot; Kontoaktivierung</p>

<p style="margin:0 0 16px;color:{TEXT};font-size:15px;line-height:1.7;">Hallo <strong>{name}</strong>,</p>
<p style="margin:0 0 24px;color:{TEXT_MUTED};font-size:15px;line-height:1.7;">
  vielen Dank fuer Ihre Registrierung bei MietCheck! Bitte bestaetigen Sie Ihre E-Mail-Adresse,
  um Ihr Konto zu aktivieren:
</p>

{_btn(verify_url, "E-Mail bestaetigen →")}

<div style="background:{WARNING_BG};border:1px solid {WARNING_BORDER};border-radius:10px;padding:14px 18px;margin:0 0 24px;">
  <p style="margin:0;color:{WARNING_TEXT};font-size:13px;line-height:1.6;">
    ⏱&nbsp; <strong>Dieser Link ist 48 Stunden gueltig.</strong><br>
    Falls Sie sich nicht registriert haben, koennen Sie diese E-Mail ignorieren.
  </p>
</div>

{_divider()}

<p style="margin:0;color:{TEXT_MUTED};font-size:12px;line-height:1.6;">
  Wenn der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
  <a href="{verify_url}" style="color:{PRIMARY};word-break:break-all;">{verify_url}</a>
</p>"""

    html = _email_wrapper(content)
    text = f"Hallo {name}, bitte bestaetigen Sie Ihre E-Mail: {verify_url} (gueltig fuer 48 Stunden)."
    return html, text


# ─────────────────────────────────────────────
# Template: Passwort zurücksetzen
# ─────────────────────────────────────────────
def build_password_reset_email(name: str, reset_url: str) -> tuple[str, str]:
    content = f"""
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#eff6ff;border-radius:50%;width:60px;height:60px;line-height:60px;font-size:26px;">🔐</div>
</div>

<h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:{TEXT};text-align:center;letter-spacing:-0.3px;">Passwort zurücksetzen</h1>
<p style="margin:0 0 28px;color:{TEXT_MUTED};font-size:13px;text-align:center;">MietCheck &middot; Sicherheitsanfrage</p>

<p style="margin:0 0 16px;color:{TEXT};font-size:15px;line-height:1.7;">Hallo <strong>{name}</strong>,</p>
<p style="margin:0 0 24px;color:{TEXT_MUTED};font-size:15px;line-height:1.7;">
  wir haben eine Anfrage erhalten, das Passwort für Ihr MietCheck-Konto zurückzusetzen.
  Klicken Sie auf den Button, um ein neues Passwort zu vergeben:
</p>

{_btn(reset_url, "Passwort zurücksetzen →")}

<div style="background:{WARNING_BG};border:1px solid {WARNING_BORDER};border-radius:10px;padding:14px 18px;margin:0 0 24px;">
  <p style="margin:0;color:{WARNING_TEXT};font-size:13px;line-height:1.6;">
    ⏱&nbsp; <strong>Dieser Link ist nur 1 Stunde gültig.</strong><br>
    Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail einfach ignorieren – Ihr Passwort bleibt unverändert.
  </p>
</div>

{_divider()}

<p style="margin:0;color:{TEXT_MUTED};font-size:12px;line-height:1.6;">
  Wenn der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
  <a href="{reset_url}" style="color:{PRIMARY};word-break:break-all;">{reset_url}</a>
</p>"""

    html = _email_wrapper(content)
    text = f"Hallo {name}, setzen Sie Ihr Passwort zurueck: {reset_url} (gueltig fuer 1 Stunde). Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail."
    return html, text


# ─────────────────────────────────────────────
# Template: Feedback-Antwort
# ─────────────────────────────────────────────
async def send_feedback_response_email(
    user_email: str,
    user_name: str,
    feedback_title: str,
    admin_response: str,
    status: str = "in_review",
) -> bool:
    status_cfg = {
        "approved":  {"label": "Angenommen",     "color": "#16a34a", "bg": "#f0fdf4", "border": "#bbf7d0", "icon": "✅"},
        "rejected":  {"label": "Abgelehnt",      "color": "#dc2626", "bg": "#fef2f2", "border": "#fecaca", "icon": "❌"},
        "in_review": {"label": "In Bearbeitung", "color": "#d97706", "bg": "#fffbeb", "border": "#fde68a", "icon": "🔍"},
    }
    cfg = status_cfg.get(status, {"label": status, "color": TEXT_MUTED, "bg": "#f8fafc", "border": BORDER, "icon": "📋"})

    content = f"""
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#eff6ff;border-radius:50%;width:60px;height:60px;line-height:60px;font-size:26px;">💬</div>
</div>

<h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:{TEXT};text-align:center;letter-spacing:-0.3px;">Antwort auf Ihr Feedback</h1>
<p style="margin:0 0 28px;color:{TEXT_MUTED};font-size:13px;text-align:center;">Das MietCheck-Team hat Ihre Nachricht bearbeitet</p>

<p style="margin:0 0 20px;color:{TEXT};font-size:15px;line-height:1.7;">Hallo <strong>{user_name}</strong>,</p>
<p style="margin:0 0 22px;color:{TEXT_MUTED};font-size:15px;line-height:1.7;">
  vielen Dank für Ihr Feedback! Hier ist die Rückmeldung unseres Teams:
</p>

<div style="background:#f8fafc;border:1px solid {BORDER};border-radius:12px;padding:18px 22px;margin:0 0 18px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:4px 0;color:{TEXT_MUTED};font-size:13px;width:90px;">Betreff</td>
      <td style="padding:4px 0;color:{TEXT};font-size:13px;font-weight:600;">{feedback_title}</td>
    </tr>
    <tr>
      <td style="padding:10px 0 0;color:{TEXT_MUTED};font-size:13px;vertical-align:top;">Status</td>
      <td style="padding:10px 0 0;">
        <span style="display:inline-block;background:{cfg['bg']};color:{cfg['color']};border:1px solid {cfg['border']};border-radius:20px;padding:2px 12px;font-size:12px;font-weight:600;">
          {cfg['icon']}&nbsp;{cfg['label']}
        </span>
      </td>
    </tr>
  </table>
</div>

<div style="border-left:3px solid {PRIMARY};padding:14px 18px;background:#f8fafc;border-radius:0 10px 10px 0;margin:0 0 28px;">
  <p style="margin:0 0 6px;color:{TEXT_MUTED};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Antwort des Teams</p>
  <p style="margin:0;color:{TEXT};font-size:14px;line-height:1.7;">{admin_response}</p>
</div>

{_divider()}

<p style="margin:0;color:{TEXT_MUTED};font-size:13px;line-height:1.6;">
  Haben Sie weiteres Feedback? Schreiben Sie uns über die <strong>Feedback-Funktion</strong> in der App.<br>
  Vielen Dank &ndash; Ihr MietCheck-Team 🙏
</p>"""

    html = _email_wrapper(content)
    subject = f"Antwort auf Ihr Feedback: {feedback_title}"
    return await send_email(user_email, subject, html)


# ─────────────────────────────────────────────
# Legacy wrapper: send_welcome_email
# (kept for backwards compatibility with auth.py)
# ─────────────────────────────────────────────
async def send_welcome_email(user_email: str, user_name: str) -> bool:
    html, text = build_welcome_email(user_name)
    return await send_email(user_email, "Willkommen bei MietCheck!", html, text)
