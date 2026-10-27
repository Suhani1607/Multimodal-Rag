import logging
from typing import List, Any, Dict
from unstructured.chunking.title import chunk_by_title

logger = logging.getLogger(__name__)


def separate_content_types(chunk: Any) -> Dict[str, Any]:
    """
    Analyze what types of content are in a chunk:
    Extracts raw text, table HTML representations, and base64 images.
    Preserves element hierarchy from original Unstructured elements.
    """
    content_data = {
        'text': getattr(chunk, 'text', '') or '',
        'tables': [],
        'images': [],
        'types': ['text'],
        'page_number': 1,
        'section_title': None,
    }
    
    # Try to extract page number from chunk metadata
    if hasattr(chunk, 'metadata'):
        meta = chunk.metadata
        if hasattr(meta, 'page_number') and meta.page_number is not None:
            content_data['page_number'] = meta.page_number
        if hasattr(meta, 'section_title') and meta.section_title:
            content_data['section_title'] = meta.section_title
        elif hasattr(meta, 'title') and meta.title:
            content_data['section_title'] = meta.title

    # Direct check if chunk itself is a Table or Image
    chunk_type = type(chunk).__name__
    chunk_cat = getattr(chunk, 'category', chunk_type)
    if chunk_type == 'Table' or chunk_cat == 'Table':
        if 'table' not in content_data['types']:
            content_data['types'].append('table')
        tbl_html = getattr(getattr(chunk, 'metadata', None), 'text_as_html', None) or getattr(chunk, 'text', '')
        if tbl_html and tbl_html not in content_data['tables']:
            content_data['tables'].append(tbl_html)
    elif chunk_type in ['Image', 'Figure'] or chunk_cat in ['Image', 'Figure']:
        if 'image' not in content_data['types']:
            content_data['types'].append('image')
        img_b64 = getattr(getattr(chunk, 'metadata', None), 'image_base64', None)
        if img_b64 and img_b64 not in content_data['images']:
            content_data['images'].append(img_b64)

    # Extract tables and images from orig_elements
    if hasattr(chunk, 'metadata') and hasattr(chunk.metadata, 'orig_elements'):
        for element in chunk.metadata.orig_elements:
            element_type = type(element).__name__
            
            # Check page number if not already found
            if hasattr(element, 'metadata') and hasattr(element.metadata, 'page_number'):
                if element.metadata.page_number and not content_data.get('page_number'):
                    content_data['page_number'] = element.metadata.page_number
            
            # Handle tables
            if element_type == 'Table':
                if 'table' not in content_data['types']:
                    content_data['types'].append('table')
                table_html = getattr(element.metadata, 'text_as_html', None) or getattr(element, 'text', '')
                if table_html:
                    content_data['tables'].append(table_html)
            
            # Handle images
            elif element_type in ['Image', 'Figure']:
                if hasattr(element, 'metadata') and hasattr(element.metadata, 'image_base64'):
                    if element.metadata.image_base64:
                        if 'image' not in content_data['types']:
                            content_data['types'].append('image')
                        content_data['images'].append(element.metadata.image_base64)
                        
    return content_data


def create_chunks_by_title(
    elements: List[Any],
    max_characters: int = 3000,
    new_after_n_chars: int = 2400,
    combine_text_under_n_chars: int = 500
) -> List[Dict[str, Any]]:
    """
    Create semantic chunks using Unstructured chunk_by_title.
    Returns structured chunks with metadata, tables, images, and page numbers.
    """
    logger.info(f"Chunking {len(elements)} elements (max_chars={max_characters})...")
    
    try:
        raw_chunks = chunk_by_title(
            elements,
            max_characters=max_characters,
            new_after_n_chars=new_after_n_chars,
            combine_text_under_n_chars=combine_text_under_n_chars
        )
    except Exception as e:
        logger.warning(f"chunk_by_title failed ({e}), using simple sliding window fallback...")
        # Fallback simple text splitting
        combined_text = "\n\n".join([getattr(e, 'text', str(e)) for e in elements])
        class SimpleChunk:
            def __init__(self, text, page=1):
                self.text = text
                self.metadata = type("M", (), {"page_number": page, "orig_elements": []})()
        
        words = combined_text.split()
        chunk_words = 400
        raw_chunks = []
        for i in range(0, len(words), chunk_words):
            raw_chunks.append(SimpleChunk(" ".join(words[i:i + chunk_words])))

    structured_chunks = []
    for idx, chunk in enumerate(raw_chunks):
        content_data = separate_content_types(chunk)
        
        # Primary element type
        primary_type = "text"
        if "table" in content_data['types']:
            primary_type = "table"
        elif "image" in content_data['types']:
            primary_type = "image"
            
        structured_chunks.append({
            "sequence": idx + 1,
            "text": content_data['text'],
            "tables_html": content_data['tables'],
            "images_base64": content_data['images'],
            "types": content_data['types'],
            "primary_type": primary_type,
            "page_number": content_data['page_number'],
            "section_title": content_data['section_title'],
            "char_count": len(content_data['text']),
        })

    logger.info(f"Created {len(structured_chunks)} structured chunks")
    return structured_chunks
