import pdfplumber
import os

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from PDF using pdfplumber for better layout preservation.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text from the PDF
        
    Raises:
        Exception: If PDF cannot be read or processed
    """
    try:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        return text.strip()
        
    except Exception as e:
        print(f"PDF extraction error: {e}")
        raise Exception(f"Failed to extract text from PDF: {e}") 