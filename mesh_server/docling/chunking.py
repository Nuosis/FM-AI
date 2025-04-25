import os
import requests
from docling.chunking import HybridChunker
from docling.document_converter import DocumentConverter
from dotenv import load_dotenv

load_dotenv()

# Configuration for LLM proxy
LLM_PROXY_URL = os.environ.get('LLM_PROXY_URL', 'http://localhost:3500')

# Custom tokenizer that uses the local-llm-proxy
class ProxyTokenizer:
    def __init__(self, max_length=8191):
        self.max_length = max_length
        
    def tokenize(self, text):
        try:
            # Use the local-llm-proxy to tokenize the text
            response = requests.post(
                f"{LLM_PROXY_URL}/llm",
                json={
                    "provider": "openai",
                    "type": "tokenize",
                    "text": text
                }
            )
            
            if response.status_code == 200:
                tokens = response.json().get('tokens', [])
                return [str(t) for t in tokens]
            else:
                # Fallback to a simple approximation if the proxy fails
                return text.split()
        except Exception as e:
            print(f"Error tokenizing text: {str(e)}")
            # Fallback to a simple approximation
            return text.split()

# Initialize the tokenizer
tokenizer = ProxyTokenizer()
MAX_TOKENS = 8191  # text-embedding-3-large's maximum context length

# --------------------------------------------------------------
# Example usage
# --------------------------------------------------------------

def process_document(url_or_path):
    """Process a document from a URL or file path"""
    # Extract the data
    converter = DocumentConverter()
    result = converter.convert(url_or_path)
    
    if not result.document:
        print(f"Failed to extract document from {url_or_path}")
        return []
    
    # Apply hybrid chunking
    chunker = HybridChunker(
        tokenizer=tokenizer,
        max_tokens=MAX_TOKENS,
        merge_peers=True,
    )
    
    chunk_iter = chunker.chunk(dl_doc=result.document)
    chunks = list(chunk_iter)
    
    print(f"Extracted {len(chunks)} chunks from {url_or_path}")
    return chunks

# Example usage (commented out)
# chunks = process_document("https://arxiv.org/pdf/2408.09869")
