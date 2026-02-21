"""Email service using aiosmtplib."""
import aiosmtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


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


async def send_welcome_email(user_email: str, user_name: str) -> bool:
    subject = "Willkommen bei MietCheck!"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Willkommen bei MietCheck, {user_name}!</h1>
        <p>Schön, dass Sie sich registriert haben.</p>
        <p>Mit MietCheck können Sie Ihre Nebenkostenabrechnung automatisch prüfen lassen:</p>
        <ul>
            <li>Mathematische Prüfung aller Berechnungen</li>
            <li>Fristprüfung nach § 556 BGB</li>
            <li>Plausibilitätsprüfung mit Vergleichswerten</li>
            <li>Rechtsprüfung auf unzulässige Positionen</li>
        </ul>
        <p><a href="{settings.FRONTEND_URL}/dashboard" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Jetzt starten</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">MietCheck - Ihre Nebenkostenabrechnung einfach prüfen</p>
    </div>
    """
    return await send_email(user_email, subject, html)


async def send_feedback_response_email(
    user_email: str,
    user_name: str,
    feedback_title: str,
    admin_response: str,
) -> bool:
    subject = f"Antwort auf Ihr Feedback: {feedback_title}"
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3b82f6;">Antwort auf Ihr Feedback</h1>
        <p>Hallo {user_name},</p>
        <p>wir haben Ihr Feedback "<strong>{feedback_title}</strong>" bearbeitet:</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            {admin_response}
        </div>
        <p>Vielen Dank für Ihr Feedback!</p>
        <p>Mit freundlichen Grüßen,<br>Das MietCheck-Team</p>
    </div>
    """
    return await send_email(user_email, subject, html)
