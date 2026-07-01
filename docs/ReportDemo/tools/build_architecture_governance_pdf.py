from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = ROOT / "docs" / "ReportDemo"
SOURCE_MD = REPORT_DIR / "內部人員交易報表轉媒體儲存系統_系統架構與治理計畫書.md"
OUT_PDF = REPORT_DIR / "內部人員交易報表轉媒體儲存系統_系統架構與治理計畫書.pdf"
SYSTEM_IMAGE = REPORT_DIR / "assets" / "system-architecture-communication-v1.png"
PERMISSION_IMAGE = REPORT_DIR / "assets" / "permission-management-communication-v1.png"
WATERMARK_IMAGE = REPORT_DIR / "assets" / "watermark-processing-communication-v1.png"


class TOCHeading(Paragraph):
    _counter = 0

    def __init__(self, text: str, style: ParagraphStyle, level: int):
        super().__init__(text, style)
        self.toc_text = text
        self.toc_level = level
        self.bookmark_key = f"toc_heading_{TOCHeading._counter}"
        TOCHeading._counter += 1


class FigureCaption(Paragraph):
    pass


class ArchitectureDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, title: str, **kwargs):
        self.title_text = title
        self.allowSplitting = 1
        super().__init__(filename, **kwargs)

    def afterFlowable(self, flowable: Flowable) -> None:
        if isinstance(flowable, TOCHeading):
            text = flowable.getPlainText()
            key = flowable.bookmark_key
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text, key, level=flowable.toc_level, closed=False)
            self.notify("TOCEntry", (flowable.toc_level, text, self.page, key))


def find_cjk_font() -> Path:
    candidates = [
        Path(r"C:\Windows\Fonts\msjh.ttc"),
        Path(r"C:\Windows\Fonts\mingliu.ttc"),
        Path(r"C:\Windows\Fonts\kaiu.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError("找不到可用中文字型，例如 C:\\Windows\\Fonts\\msjh.ttc")


def register_fonts() -> tuple[str, str]:
    cjk = find_cjk_font()
    pdfmetrics.registerFont(TTFont("CJK", str(cjk)))
    pdfmetrics.registerFont(TTFont("CJK-Bold", str(cjk)))
    return "CJK", "CJK-Bold"


def make_styles(font_name: str, bold_font_name: str):
    base = getSampleStyleSheet()
    styles = {}
    styles["body"] = ParagraphStyle(
        "body",
        parent=base["BodyText"],
        fontName=font_name,
        fontSize=9.2,
        leading=14,
        textColor=colors.HexColor("#1f2933"),
        spaceAfter=5,
        wordWrap="CJK",
    )
    styles["title"] = ParagraphStyle(
        "title",
        parent=styles["body"],
        fontName=bold_font_name,
        fontSize=22,
        leading=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0b3158"),
        spaceAfter=14,
    )
    styles["subtitle"] = ParagraphStyle(
        "subtitle",
        parent=styles["body"],
        fontSize=12,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#31566f"),
        spaceAfter=20,
    )
    styles["toc_title"] = ParagraphStyle(
        "toc_title",
        parent=styles["body"],
        fontName=bold_font_name,
        fontSize=18,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0b3158"),
        spaceAfter=14,
    )
    styles["h1"] = ParagraphStyle(
        "h1",
        parent=styles["body"],
        fontName=bold_font_name,
        fontSize=17,
        leading=23,
        textColor=colors.HexColor("#0b3158"),
        spaceBefore=12,
        spaceAfter=8,
        keepWithNext=True,
    )
    styles["h2"] = ParagraphStyle(
        "h2",
        parent=styles["body"],
        fontName=bold_font_name,
        fontSize=14,
        leading=20,
        textColor=colors.HexColor("#0f5f73"),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True,
    )
    styles["h3"] = ParagraphStyle(
        "h3",
        parent=styles["body"],
        fontName=bold_font_name,
        fontSize=11.5,
        leading=16,
        textColor=colors.HexColor("#164e63"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )
    styles["bullet"] = ParagraphStyle(
        "bullet",
        parent=styles["body"],
        leftIndent=14,
        firstLineIndent=-8,
        bulletIndent=0,
        spaceAfter=3,
    )
    styles["code"] = ParagraphStyle(
        "code",
        parent=styles["body"],
        fontName=font_name,
        fontSize=8,
        leading=11,
        leftIndent=8,
        rightIndent=8,
        backColor=colors.HexColor("#f5f7fa"),
        borderColor=colors.HexColor("#d8dee9"),
        borderWidth=0.5,
        borderPadding=5,
        wordWrap="CJK",
    )
    styles["caption"] = ParagraphStyle(
        "caption",
        parent=styles["body"],
        alignment=TA_CENTER,
        fontSize=8.5,
        textColor=colors.HexColor("#52606d"),
        spaceBefore=4,
        spaceAfter=10,
    )
    styles["footer"] = ParagraphStyle(
        "footer",
        parent=styles["body"],
        alignment=TA_RIGHT,
        fontSize=8,
        textColor=colors.HexColor("#6b7280"),
    )
    return styles


def escape_inline(text: str) -> str:
    text = html.escape(text.strip())
    text = re.sub(r"`([^`]+)`", r"<font color='#0f5f73'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def paragraph(text: str, styles, style_name: str = "body") -> Paragraph:
    return Paragraph(escape_inline(text), styles[style_name])


def make_table(lines: list[str], styles, page_width: float) -> Table | None:
    rows = []
    for raw in lines:
        cells = [c.strip() for c in raw.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", c or "") for c in cells):
            continue
        if cells:
            rows.append([Paragraph(escape_inline(c), styles["body"]) for c in cells])
    if not rows:
        return None
    col_count = max(len(r) for r in rows)
    for row in rows:
        while len(row) < col_count:
            row.append(Paragraph("", styles["body"]))
    col_width = page_width / col_count
    table = Table(rows, colWidths=[col_width] * col_count, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "CJK"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eaf4f8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0b3158")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5df")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def scaled_image(path: Path, max_width: float, max_height: float) -> Image:
    img = Image(str(path))
    scale = min(max_width / img.imageWidth, max_height / img.imageHeight)
    img.drawWidth = img.imageWidth * scale
    img.drawHeight = img.imageHeight * scale
    img.hAlign = "CENTER"
    return img


def figure(path: Path, caption: str, styles, page_width: float):
    return KeepTogether(
        [
            Spacer(1, 6),
            scaled_image(path, page_width, 9.2 * cm),
            FigureCaption(escape_inline(caption), styles["caption"]),
        ]
    )


def parse_markdown(md_text: str, styles, page_width: float):
    story = []
    lines = md_text.splitlines()
    table_buf: list[str] = []
    code_buf: list[str] = []
    in_code = False
    inserted_system = False
    inserted_permission = False

    def flush_table():
        nonlocal table_buf
        if table_buf:
            tbl = make_table(table_buf, styles, page_width)
            if tbl:
                story.append(tbl)
                story.append(Spacer(1, 6))
            table_buf = []

    def flush_code():
        nonlocal code_buf
        if code_buf:
            story.append(Preformatted("\n".join(code_buf), styles["code"], maxLineLength=90))
            story.append(Spacer(1, 6))
            code_buf = []

    for raw in lines:
        line = raw.rstrip()
        if line.strip().startswith("```"):
            if in_code:
                flush_code()
                in_code = False
            else:
                flush_table()
                in_code = True
            continue
        if in_code:
            code_buf.append(line)
            continue
        if line.strip().startswith("<!--"):
            continue
        if re.match(r"^\s*\|.*\|\s*$", line):
            table_buf.append(line)
            continue
        flush_table()
        if not line.strip():
            continue
        if re.match(r"^\s*---+\s*$", line):
            story.append(Spacer(1, 6))
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1:
                story.append(TOCHeading(escape_inline(text), styles["h1"], 0))
            elif level == 2:
                if text.startswith("2. ") and not inserted_system:
                    story.append(TOCHeading(escape_inline(text), styles["h1"], 0))
                    story.append(figure(SYSTEM_IMAGE, "圖 1：系統架構溝通示意圖", styles, page_width))
                    inserted_system = True
                    continue
                if text.startswith("5. ") and not inserted_permission:
                    story.append(PageBreak())
                    story.append(TOCHeading(escape_inline(text), styles["h1"], 0))
                    story.append(figure(PERMISSION_IMAGE, "圖 2：權限管理與資料範圍控管示意圖", styles, page_width))
                    inserted_permission = True
                    continue
                story.append(TOCHeading(escape_inline(text), styles["h1"], 0))
            elif level == 3:
                story.append(TOCHeading(escape_inline(text), styles["h2"], 1))
            else:
                story.append(TOCHeading(escape_inline(text), styles["h3"], 2))
            continue

        bullet = re.match(r"^\s*[*-]\s+(.+)$", line)
        if bullet:
            story.append(Paragraph("• " + escape_inline(bullet.group(1)), styles["bullet"]))
            continue

        numbered = re.match(r"^\s*(\d+)\.\s+(.+)$", line)
        if numbered:
            story.append(Paragraph(f"{numbered.group(1)}. {escape_inline(numbered.group(2))}", styles["bullet"]))
            continue

        story.append(paragraph(line, styles))

    flush_table()
    flush_code()
    return story


def add_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor("#d8dee9"))
    canvas.line(1.6 * cm, height - 1.35 * cm, width - 1.6 * cm, height - 1.35 * cm)
    canvas.line(1.6 * cm, 1.35 * cm, width - 1.6 * cm, 1.35 * cm)
    canvas.setFont("CJK", 8)
    canvas.setFillColor(colors.HexColor("#52606d"))
    canvas.drawString(1.6 * cm, height - 1.05 * cm, "內部人員交易報表轉媒體儲存系統")
    canvas.drawRightString(width - 1.6 * cm, 0.92 * cm, f"第 {doc.page} 頁")
    canvas.restoreState()


def build_pdf():
    font_name, bold_font_name = register_fonts()
    styles = make_styles(font_name, bold_font_name)
    page_width, page_height = A4
    margin_x = 1.6 * cm
    margin_top = 1.65 * cm
    margin_bottom = 1.65 * cm
    frame = Frame(
        margin_x,
        margin_bottom,
        page_width - 2 * margin_x,
        page_height - margin_top - margin_bottom,
        id="normal",
    )
    doc = ArchitectureDocTemplate(
        str(OUT_PDF),
        "系統架構與治理計畫書",
        pagesize=A4,
        rightMargin=margin_x,
        leftMargin=margin_x,
        topMargin=margin_top,
        bottomMargin=margin_bottom,
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=add_page)])

    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            "TOCLevel0",
            fontName=bold_font_name,
            fontSize=10.5,
            leading=15,
            leftIndent=0,
            firstLineIndent=0,
            spaceBefore=4,
            textColor=colors.HexColor("#0b3158"),
        ),
        ParagraphStyle(
            "TOCLevel1",
            fontName=font_name,
            fontSize=9,
            leading=13,
            leftIndent=14,
            firstLineIndent=0,
            textColor=colors.HexColor("#334e68"),
        ),
        ParagraphStyle(
            "TOCLevel2",
            fontName=font_name,
            fontSize=8.5,
            leading=12,
            leftIndent=28,
            firstLineIndent=0,
            textColor=colors.HexColor("#52606d"),
        ),
    ]

    title_story = [
        Spacer(1, 4.0 * cm),
        Paragraph("內部人員交易報表轉媒體儲存系統", styles["title"]),
        Paragraph("系統架構與治理計畫書", styles["subtitle"]),
        Paragraph("PDF 閱讀版：含目錄、頁碼與架構示意圖", styles["subtitle"]),
        Spacer(1, 1.2 * cm),
        Table(
            [
                ["文件來源", SOURCE_MD.name],
                ["產出位置", OUT_PDF.name],
                ["圖表", "系統架構示意圖、權限管理示意圖"],
            ],
            colWidths=[3.0 * cm, page_width - 2 * margin_x - 3.0 * cm],
            style=TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), font_name),
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eaf4f8")),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5df")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            ),
        ),
        PageBreak(),
        Paragraph("目錄", styles["toc_title"]),
        toc,
        PageBreak(),
    ]

    md_text = SOURCE_MD.read_text(encoding="utf-8")
    content_story = parse_markdown(md_text, styles, page_width - 2 * margin_x)
    doc.multiBuild(title_story + content_story)
    print(OUT_PDF)


def parse_markdown_generic(md_text: str, styles, page_width: float, figure_specs: list[dict] | None = None):
    story = []
    lines = md_text.splitlines()
    table_buf: list[str] = []
    code_buf: list[str] = []
    in_code = False
    used_figures: set[str] = set()
    figure_specs = figure_specs or []

    def flush_table():
        nonlocal table_buf
        if table_buf:
            tbl = make_table(table_buf, styles, page_width)
            if tbl:
                story.append(tbl)
                story.append(Spacer(1, 6))
            table_buf = []

    def flush_code():
        nonlocal code_buf
        if code_buf:
            story.append(Preformatted("\n".join(code_buf), styles["code"], maxLineLength=90))
            story.append(Spacer(1, 6))
            code_buf = []

    def matching_figure(level: int, text: str):
        for spec in figure_specs:
            key = spec["key"]
            if key in used_figures:
                continue
            if level == spec.get("level", 2) and text.startswith(spec["heading_prefix"]):
                return spec
        return None

    for raw in lines:
        line = raw.rstrip()
        if line.strip().startswith("```"):
            if in_code:
                flush_code()
                in_code = False
            else:
                flush_table()
                in_code = True
            continue
        if in_code:
            code_buf.append(line)
            continue
        if line.strip().startswith("<!--"):
            continue
        if re.match(r"^\s*\|.*\|\s*$", line):
            table_buf.append(line)
            continue
        flush_table()
        if not line.strip():
            continue
        if re.match(r"^\s*---+\s*$", line):
            story.append(Spacer(1, 6))
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            spec = matching_figure(level, text)
            if spec and spec.get("pagebreak_before"):
                story.append(PageBreak())

            if level <= 2:
                toc_level = 0
                style = styles["h1"]
            elif level == 3:
                toc_level = 1
                style = styles["h2"]
            else:
                toc_level = 2
                style = styles["h3"]
            story.append(TOCHeading(escape_inline(text), style, toc_level))

            if spec:
                story.append(figure(Path(spec["path"]), spec["caption"], styles, page_width))
                used_figures.add(spec["key"])
            continue

        bullet = re.match(r"^\s*[*-]\s+(.+)$", line)
        if bullet:
            story.append(Paragraph("• " + escape_inline(bullet.group(1)), styles["bullet"]))
            continue

        numbered = re.match(r"^\s*(\d+)\.\s+(.+)$", line)
        if numbered:
            story.append(Paragraph(f"{numbered.group(1)}. {escape_inline(numbered.group(2))}", styles["bullet"]))
            continue

        story.append(paragraph(line, styles))

    flush_table()
    flush_code()
    return story


def build_document_pdf(
    source_md: Path,
    out_pdf: Path,
    title: str,
    subtitle: str,
    figure_specs: list[dict] | None = None,
):
    font_name, bold_font_name = register_fonts()
    styles = make_styles(font_name, bold_font_name)
    page_width, page_height = A4
    margin_x = 1.6 * cm
    margin_top = 1.65 * cm
    margin_bottom = 1.65 * cm
    frame = Frame(
        margin_x,
        margin_bottom,
        page_width - 2 * margin_x,
        page_height - margin_top - margin_bottom,
        id="normal",
    )
    doc = ArchitectureDocTemplate(
        str(out_pdf),
        title,
        pagesize=A4,
        rightMargin=margin_x,
        leftMargin=margin_x,
        topMargin=margin_top,
        bottomMargin=margin_bottom,
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=add_page)])

    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            "TOCLevel0",
            fontName=bold_font_name,
            fontSize=10.5,
            leading=15,
            leftIndent=0,
            firstLineIndent=0,
            spaceBefore=4,
            textColor=colors.HexColor("#0b3158"),
        ),
        ParagraphStyle(
            "TOCLevel1",
            fontName=font_name,
            fontSize=9,
            leading=13,
            leftIndent=14,
            firstLineIndent=0,
            textColor=colors.HexColor("#334e68"),
        ),
        ParagraphStyle(
            "TOCLevel2",
            fontName=font_name,
            fontSize=8.5,
            leading=12,
            leftIndent=28,
            firstLineIndent=0,
            textColor=colors.HexColor("#52606d"),
        ),
    ]

    title_story = [
        Spacer(1, 4.0 * cm),
        Paragraph("內部人員交易報表轉媒體儲存系統", styles["title"]),
        Paragraph(subtitle, styles["subtitle"]),
        Paragraph("PDF 閱讀版：含目錄與頁碼", styles["subtitle"]),
        Spacer(1, 1.2 * cm),
        Table(
            [
                ["文件來源", source_md.name],
                ["產出位置", out_pdf.name],
            ],
            colWidths=[3.0 * cm, page_width - 2 * margin_x - 3.0 * cm],
            style=TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), font_name),
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eaf4f8")),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5df")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            ),
        ),
        PageBreak(),
        Paragraph("目錄", styles["toc_title"]),
        toc,
        PageBreak(),
    ]

    md_text = source_md.read_text(encoding="utf-8")
    content_story = parse_markdown_generic(md_text, styles, page_width - 2 * margin_x, figure_specs)
    doc.multiBuild(title_story + content_story)
    print(out_pdf)


def build_all_pdfs():
    architecture_md = REPORT_DIR / "內部人員交易報表轉媒體儲存系統_系統架構與治理計畫書.md"
    milestone_md = REPORT_DIR / "內部人員交易報表轉媒體儲存系統_功能里程碑計畫.md"
    adr_md = REPORT_DIR / "決策紀錄樣板ADR.md"

    build_document_pdf(
        architecture_md,
        REPORT_DIR / "內部人員交易報表轉媒體儲存系統_系統架構與治理計畫書.pdf",
        "系統架構與治理計畫書",
        "系統架構與治理計畫書",
        [
            {
                "key": "system",
                "level": 2,
                "heading_prefix": "2. ",
                "path": SYSTEM_IMAGE,
                "caption": "圖 1：系統架構溝通示意圖",
                "pagebreak_before": False,
            },
            {
                "key": "permission",
                "level": 2,
                "heading_prefix": "5. ",
                "path": PERMISSION_IMAGE,
                "caption": "圖 2：權限管理與資料範圍控管示意圖",
                "pagebreak_before": True,
            },
            {
                "key": "watermark",
                "level": 2,
                "heading_prefix": "6. ",
                "path": WATERMARK_IMAGE,
                "caption": "圖 3：PDF 浮水印處理與外流追蹤示意圖",
                "pagebreak_before": True,
            },
        ],
    )
    build_document_pdf(
        milestone_md,
        REPORT_DIR / "內部人員交易報表轉媒體儲存系統_功能里程碑計畫.pdf",
        "功能里程碑計畫",
        "功能里程碑計畫",
        [],
    )
    build_document_pdf(
        adr_md,
        REPORT_DIR / "決策紀錄樣板ADR.pdf",
        "決策紀錄樣板 ADR",
        "決策紀錄樣板 ADR",
        [],
    )


if __name__ == "__main__":
    build_all_pdfs()
