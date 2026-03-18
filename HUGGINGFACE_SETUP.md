# Llama 3 Resume Parser Setup Guide

## 🚀 Improved Resume Parsing Pipelinee

### **New Features**
- **Llama 3 (Meta-Llama-3-8B-Instruct)**: Advanced AI model for structured resume parsing
- **InferenceClient with novita provider**: Modern Hugging Face integration using huggingface_hub
- **pdfplumber**: Better PDF text extraction with layout preservation
- **True Fallback**: Regex extraction only when Llama 3 is completely unavailable
- **Enhanced Schema**: Improved database schema with parsing method tracking

## Requirements for Llama 3 Integration

### 1. Environment Variables Setup

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env
HUGGINGFACE_API_TOKEN=your_huggingface_token_here
```

### 2. Get Hugging Face API Token

1. **Create Hugging Face Account**
   - Go to https://huggingface.co/
   - Sign up for a free account

2. **Get API Token**
   - Go to Settings → Access Tokens
   - Click "New token"
   - Give it a name (e.g., "ATS Llama 3 Parser")
   - Select "Read" permissions
   - Copy the generated token

3. **Set Environment Variable**
   ```bash
   # Windows PowerShell
   $env:HUGGINGFACE_API_TOKEN="hf_your_token_here"
   
   # Windows Command Prompt
   set HUGGINGFACE_API_TOKEN=hf_your_token_here
   
   # Linux/Mac
   export HUGGINGFACE_API_TOKEN="hf_your_token_here"
   ```

### 3. Model Access Requirements

**Current Model**: `meta-llama/Meta-Llama-3-8B-Instruct`

**Requirements**:
- ✅ Hugging Face account
- ✅ API token with read permissions
- ✅ **Llama 3 access granted by Hugging Face team**
- ✅ `huggingface_hub` package installed

**Why Llama 3**:
- Latest instruction-tuned model from Meta
- Excellent JSON generation capabilities
- Fast inference via novita provider
- Better performance for structured tasks

### 4. Installation

Install the required dependencies:

```bash
cd backend
pip install -r requirements.txt
```

The requirements include:
- `huggingface_hub` - For InferenceClient with novita provider
- `pdfplumber` - For PDF text extraction
- `requests` - For HTTP requests
- `python-dotenv` - For environment variables

### 5. Test the Integration

Run this test script to verify the setup:

```bash
python test/test_mistral_parser.py
```

Or run the comprehensive test:

```bash
python test/test_improved_pipeline.py
```

Or test the priority behavior:

```bash
python test/test_llama3_priority.py
```

### 6. Pipeline Flow

```
1. PDF Upload → pdfplumber text extraction
2. Text → Llama 3 structured parsing (via novita provider)
3. If Llama 3 unavailable → Regex fallback extraction
4. Parsed data → JD matching & scoring
5. Results → Database storage with schema compliance
```

### 7. Priority Behavior

**New Priority System**:
- **Primary**: Llama 3 AI parsing (when available)
- **Fallback**: Regex extraction (only when Llama 3 is completely unavailable)
- **No Secondary**: Regex is never used as a secondary option

**Parsing Methods**:
- `llama3_ai`: Successful Llama 3 parsing
- `llama3_ai_failed`: Llama 3 attempted but failed (still uses Llama 3 method)
- `regex_fallback`: Only when Llama 3 is unavailable

### 8. Troubleshooting

**Common Issues**:

1. **"Model not found" error**
   - Solution: Verify you have Llama 3 access from Hugging Face team

2. **"Unauthorized" error**
   - Solution: Check your API token is correct

3. **"Rate limit exceeded"**
   - Solution: Hugging Face has rate limits for free accounts

4. **"Timeout" error**
   - Solution: The system will return `llama3_ai_failed` method

5. **"JSON parsing failed"**
   - Solution: The system will return `llama3_ai_failed` method

6. **"InferenceClient not initialized"**
   - Solution: Check that HUGGINGFACE_API_TOKEN is set correctly

7. **"No Llama 3 access"**
   - Solution: Contact Hugging Face team for Llama 3 access

### 9. Fallback Mechanism

Regex fallback is **ONLY** used when Llama 3 is completely unavailable:

**When Llama 3 is available**:
- Always attempts Llama 3 first
- Returns `llama3_ai` or `llama3_ai_failed`
- Never falls back to regex

**When Llama 3 is unavailable**:
- Uses regex extraction
- Returns `regex_fallback` method

### 10. Expected Results

With proper setup, you should see:
- `"parsing_method": "llama3_ai"` in successful AI parsing
- `"parsing_method": "llama3_ai_failed"` when Llama 3 fails but is available
- `"parsing_method": "regex_fallback"` only when Llama 3 is unavailable
- Structured JSON output with all required fields
- Better accuracy in skills and experience extraction

### 11. Schema Compliance

The new system ensures all parsed data follows the required schema:

**Required Fields**:
- `resumeId`: Unique identifier
- `jobId`: Job reference
- `email`: Candidate email
- `full_name`: Candidate name
- `matchScore`: 0-100 score
- `parsing_method`: Method used (llama3_ai/llama3_ai_failed/regex_fallback)

### 12. API Endpoints

**New Endpoints**:
- `POST /api/mistral-test`: Test Llama 3 parsing
- `POST /api/mistral-test-json`: Test with JSON input
- `GET /api/job/{jobId}/match-scores`: Get scores with parsing method
- `POST /api/job/{jobId}/recalculate-shortlisting`: Recalculate scores

### 13. Performance Benefits

**Llama 3 Advantages**:
- ✅ Better understanding of resume structure
- ✅ More accurate skills extraction
- ✅ Improved experience parsing
- ✅ Structured JSON output
- ✅ Context-aware parsing
- ✅ Fast inference via novita provider

**InferenceClient Advantages**:
- ✅ Modern, reliable Hugging Face integration
- ✅ Better error handling
- ✅ Automatic retry mechanisms
- ✅ Cleaner API interface
- ✅ novita provider for faster responses

**True Fallback Advantages**:
- ✅ Only used when absolutely necessary
- ✅ No unnecessary regex processing
- ✅ Clear separation of parsing methods
- ✅ Reliable when AI is unavailable

### 14. Code Example

```python
from app.services.mistral_parser import MistralParser

# Initialize parser
parser = MistralParser()

# Parse resume text
resume_text = "JOHN DOE\nEmail: john@example.com\n..."
parsed_data = parser.parse_resume(resume_text)

print(f"Parsing method: {parsed_data['parsing_method']}")
print(f"Name: {parsed_data['full_name']}")
print(f"Skills: {parsed_data['skills']}")
```

### 15. System Requirements

**Minimum Requirements**:
- Python 3.8+
- 4GB RAM
- Internet connection for API calls

**Recommended Requirements**:
- Python 3.9+
- 8GB+ RAM
- Stable internet connection
- Fast network for API responses

**Note**: The InferenceClient approach with novita provider doesn't require local model loading, making it more lightweight and accessible.

### 16. Llama 3 Access

**Getting Llama 3 Access**:
1. Contact Hugging Face team for Llama 3 access
2. Request access to `meta-llama/Meta-Llama-3-8B-Instruct`
3. Ensure your account has the necessary permissions
4. Test access with the provided code examples

**Provider**: novita
**Model**: meta-llama/Meta-Llama-3-8B-Instruct
**Method**: chat completions

### 17. Priority Testing

**Test Priority Behavior**:
```bash
python test/test_llama3_priority.py
```

This test verifies:
- Llama 3 is prioritized when available
- Regex fallback only used when Llama 3 unavailable
- No unnecessary regex processing 