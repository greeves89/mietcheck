"""PDF generation for Widerspruchsbriefe (objection letters)."""
import os
import uuid
from datetime import date
from typing import List, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.colors import HexColor
from app.config import settings


def generate_objection_letter_pdf(
    tenant_name: str,
    tenant_address: str,
    landlord_name: str,
    landlord_address: str,
    property_address: str,
    billing_year: int,
    objection_reasons: List[str],
    letter_date: Optional[date] = None,
) -> str:
    """Generate a PDF objection letter and return the file path."""
    if letter_date is None:
        letter_date = date.today()

    filename = f"widerspruch_{billing_year}_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(settings.PDF_STORAGE_PATH, filename)
    os.makedirs(settings.PDF_STORAGE_PATH, exist_ok=True)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    blue = HexColor("#3b82f6")

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Normal"],
        fontSize=14,
        fontName="Helvetica-Bold",
        textColor=blue,
        spaceAfter=6,
    )
    normal_style = ParagraphStyle(
        "Normal",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        spaceAfter=4,
    )
    bold_style = ParagraphStyle(
        "Bold",
        parent=styles["Normal"],
        fontSize=11,
        fontName="Helvetica-Bold",
        leading=16,
        spaceAfter=4,
    )
    justify_style = ParagraphStyle(
        "Justify",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    )

    story = []

    # Sender (Tenant)
    story.append(Paragraph(tenant_name, normal_style))
    for line in tenant_address.split("\n"):
        story.append(Paragraph(line, normal_style))
    story.append(Spacer(1, 0.5 * cm))

    # Recipient (Landlord)
    story.append(Paragraph(landlord_name, normal_style))
    for line in landlord_address.split("\n"):
        story.append(Paragraph(line, normal_style))
    story.append(Spacer(1, 0.5 * cm))

    # Date
    story.append(Paragraph(letter_date.strftime("%d. %B %Y"), normal_style))
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=blue))
    story.append(Spacer(1, 0.3 * cm))

    # Subject
    story.append(Paragraph(
        f"<b>Widerspruch gegen die Nebenkostenabrechnung {billing_year}</b><br/>"
        f"Betreff: Mietobjekt {property_address}",
        title_style,
    ))
    story.append(Spacer(1, 0.3 * cm))

    # Salutation
    story.append(Paragraph("Sehr geehrte Damen und Herren,", normal_style))
    story.append(Spacer(1, 0.2 * cm))

    # Body
    story.append(Paragraph(
        f"hiermit lege ich fristgerecht Widerspruch gegen die Nebenkostenabrechnung "
        f"für das Jahr {billing_year} für das oben genannte Mietobjekt ein.",
        justify_style,
    ))

    story.append(Paragraph(
        "Meine Widerspruchsgründe sind im Einzelnen:",
        bold_style,
    ))

    for i, reason in enumerate(objection_reasons, 1):
        story.append(Paragraph(f"{i}. {reason}", justify_style))

    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "Ich bitte Sie daher, die Abrechnung zu korrigieren und mir eine überarbeitete "
        "Abrechnung zuzusenden. Eine eventuelle Nachzahlung werde ich erst nach Vorlage "
        "einer korrekten Abrechnung leisten.",
        justify_style,
    ))
    story.append(Paragraph(
        "Ich bitte Sie außerdem, mir sämtliche Belege für die abgerechneten Positionen "
        "zur Einsicht bereit zu stellen (§ 259 BGB).",
        justify_style,
    ))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph(
        "Bitte bestätigen Sie den Eingang dieses Schreibens und nehmen Sie innerhalb "
        "von 14 Tagen Stellung.",
        justify_style,
    ))
    story.append(Spacer(1, 0.5 * cm))

    # Closing
    story.append(Paragraph("Mit freundlichen Grüßen,", normal_style))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph(f"<u>{tenant_name}</u>", normal_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#cccccc")))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "<i>Erstellt mit MietCheck – Nebenkostenabrechnungen einfach prüfen</i>",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=HexColor("#999999")),
    ))

    doc.build(story)
    return filepath
