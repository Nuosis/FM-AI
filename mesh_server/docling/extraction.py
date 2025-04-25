import os
from docling.document_converter import DocumentConverter
from utils.sitemap import get_sitemap_urls

# Configuration for LLM proxy
LLM_PROXY_URL = os.environ.get('LLM_PROXY_URL', 'http://localhost:3500')

# --------------------------------------------------------------
# Document extraction functions
# --------------------------------------------------------------

def extract_document(url_or_path):
    """Extract content from a document URL or file path"""
    converter = DocumentConverter()
    result = converter.convert(url_or_path)
    
    if not result.document:
        print(f"Failed to extract document from {url_or_path}")
        return None
    
    return result.document

def extract_from_sitemap(base_url, sitemap_filename="sitemap.xml"):
    """Extract content from multiple pages using a sitemap"""
    try:
        # Get URLs from sitemap
        urls = get_sitemap_urls(base_url, sitemap_filename)
        
        # Extract from URLs
        converter = DocumentConverter()
        conv_results_iter = converter.convert_all(urls)
        
        docs = []
        for result in conv_results_iter:
            if result.document:
                docs.append(result.document)
        
        print(f"Extracted {len(docs)} documents from {base_url} sitemap")
        return docs
    except Exception as e:
        print(f"Error extracting from sitemap: {str(e)}")
        return []

# Example usage (commented out)
# document = extract_document("https://arxiv.org/pdf/2408.09869")
# if document:
#     markdown_output = document.export_to_markdown()
#     json_output = document.export_to_dict()
#     print(markdown_output)
#
# document = extract_document("https://ds4sd.github.io/docling/")
# if document:
#     markdown_output = document.export_to_markdown()
#     print(markdown_output)
#
# docs = extract_from_sitemap("https://ds4sd.github.io/docling/")
