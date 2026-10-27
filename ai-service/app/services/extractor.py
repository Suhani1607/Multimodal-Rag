import os
import logging
from typing import List, Any, Dict
from pathlib import Path

logger = logging.getLogger(__name__)

# Configure Tesseract path if available on Windows
TESSERACT_WINDOWS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESSERACT_WINDOWS_PATH):
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_WINDOWS_PATH
        tess_dir = os.path.dirname(TESSERACT_WINDOWS_PATH)
        if tess_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] += os.pathsep + tess_dir
        logger.info(f"Tesseract configured at {TESSERACT_WINDOWS_PATH}")
    except Exception as e:
        logger.warning(f"Failed to configure pytesseract: {e}")


os.environ["UNSTRUCTURED_DISABLE_NOTICE"] = "1"
# Suppress noisy fontbbox warnings from pdfminer that slow down parsing
logging.getLogger("pdfminer").setLevel(logging.ERROR)


def resolve_file_path(file_path: str) -> str:
    """Normalize file_path whether from Docker container (/storage/...) or local host"""
    from app.config import settings
    if os.path.exists(file_path):
        return file_path
    
    filename = os.path.basename(file_path)
    candidate = os.path.join(settings.LOCAL_STORAGE_PATH, filename)
    if os.path.exists(candidate):
        logger.info(f"Resolved file path '{file_path}' to '{candidate}'")
        return candidate

    logger.warning(f"File path '{file_path}' does not exist on disk, nor at candidate '{candidate}'")
    return file_path


def partition_pdf_file(file_path: str) -> List[Any]:
    """
    Extract structured elements from PDF using Unstructured fast strategy.
    Fast strategy takes 1-3 seconds for typical documents vs 5+ minutes for CPU hi_res OCR.
    Falls back gracefully to pypdf if unstructured fails.
    """
    file_path = resolve_file_path(file_path)
    from app.config import settings
    strategy = getattr(settings, "PDF_PARTITION_STRATEGY", "fast").lower()
    logger.info(f"Partitioning PDF document: {file_path} using strategy='{strategy}'")
    elements = []
    
    # Try unstructured fast/auto strategy
    try:
        from unstructured.partition.pdf import partition_pdf
        try:
            if strategy == "hi_res":
                logger.info("Running hi_res partitioning (may take several minutes on CPU)...")
                elements = partition_pdf(
                    filename=file_path,
                    strategy="hi_res",
                    infer_table_structure=True,
                    extract_image_block_types=["Image"],
                    extract_image_block_to_payload=True
                )
            else:
                elements = partition_pdf(
                    filename=file_path,
                    strategy="fast"
                )
            if not elements:
                logger.warning("Unstructured returned 0 elements, falling back to pypdf...")
                raise ValueError("No elements returned by unstructured")
            logger.info(f"Extracted {len(elements)} elements using '{strategy}' strategy")
            return elements
        except Exception as e_strat:
            logger.warning(f"Unstructured {strategy} strategy failed ({e_strat}), attempting pypdf fallback...")
    except Exception as e_unst:
        logger.warning(f"Unstructured PDF partition failed: {e_unst}. Using pypdf fallback...")

    # Fallback using pypdf
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        class SimpleElement:
            def __init__(self, text, page):
                self.text = text
                self.metadata = type("Metadata", (), {
                    "page_number": page,
                    "orig_elements": []
                })()
        
        for idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                elements.append(SimpleElement(text, idx + 1))
        logger.info(f"Extracted {len(elements)} pages with pypdf fallback")
        return elements
    except Exception as e_pypdf:
        logger.error(f"Fatal PDF extraction failure: {e_pypdf}")
        raise RuntimeError(f"Could not extract PDF content: {e_pypdf}")


def partition_docx_file(file_path: str) -> List[Any]:
    """Extract structured elements from DOCX"""
    logger.info(f"Partitioning DOCX document: {file_path}")
    try:
        from unstructured.partition.docx import partition_docx
        return partition_docx(filename=file_path)
    except Exception as e:
        logger.warning(f"Unstructured docx failed: {e}. Using python-docx fallback...")
        import docx
        doc = docx.Document(file_path)
        class SimpleElement:
            def __init__(self, text):
                self.text = text
                self.metadata = type("Metadata", (), {"page_number": 1, "orig_elements": []})()
        elements = [SimpleElement(p.text) for p in doc.paragraphs if p.text.strip()]
        return elements


def partition_csv_file(file_path: str) -> List[Any]:
    """Extract structured elements from CSV"""
    logger.info(f"Partitioning CSV document: {file_path}")
    import pandas as pd
    df = pd.read_csv(file_path)
    table_html = df.to_html(index=False)
    summary_text = f"CSV dataset with {len(df)} rows and columns: {', '.join(df.columns)}.\n\n" + df.head(50).to_string()
    
    class TableElement:
        def __init__(self, text, html):
            self.text = text
            self.metadata = type("Metadata", (), {
                "page_number": 1,
                "text_as_html": html,
                "orig_elements": []
            })()
    
    return [TableElement(summary_text, table_html)]


def partition_url(url: str) -> List[Any]:
    """Fetch website or remote PDF and extract real atomic elements, titles, tables, and images using Unstructured"""
    logger.info(f"Extracting content from URL using Unstructured: {url}")
    import tempfile
    import requests
    from unstructured.partition.html import partition_html
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AI-Knowledge-Platform/1.0"
    }
    res = requests.get(url, headers=headers, timeout=25)
    res.raise_for_status()
    
    content_type = res.headers.get("Content-Type", "").lower()
    if url.lower().split("?")[0].endswith(".pdf") or "application/pdf" in content_type:
        logger.info(f"URL is a PDF document, saving to temporary file for PDF extraction: {url}")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(res.content)
            tmp_path = tmp.name
        try:
            elements = partition_pdf_file(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
        return elements

    elements = partition_html(text=res.text)
    logger.info(f"Extracted {len(elements)} atomic elements from HTML URL using Unstructured")
    return elements


def partition_file(file_path: str, mime_type: str = "") -> List[Any]:
    file_path = resolve_file_path(file_path)
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf" or "pdf" in mime_type:
        return partition_pdf_file(file_path)
    elif ext in [".docx", ".doc"] or "word" in mime_type:
        return partition_docx_file(file_path)
    elif ext == ".csv" or "csv" in mime_type:
        return partition_csv_file(file_path)
    else:
        # Default text read
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        class TextElement:
            def __init__(self, text):
                self.text = text
                self.metadata = type("Metadata", (), {"page_number": 1, "orig_elements": []})()
        return [TextElement(content)]
