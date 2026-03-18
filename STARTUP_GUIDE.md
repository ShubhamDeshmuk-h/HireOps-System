# ATS Startup Guide

## Issue Fixed ✅
The resume upload was not processing the PDF content - it was only saving metadata. Now it properly processes resumes using AI.

## Backend Architecture
- **Node.js Backend** (Port 5000): Handles file uploads and coordinates with Python backend
- **Python Backend** (Port 8000): Processes PDFs with AI (LLaMA3, PDF extraction, scoring)

## How to Start Both Backends

### 1. Start Node.js Backend (Required)
```bash
cd server
npm install  # If not done already
npm run dev
```
This will start the server on http://localhost:5000

### 2. Start Python Backend (Required for AI Processing)
```bash
cd backend
pip install -r requirements.txt  # If not done already
python -m uvicorn app.main:app --reload --port 8000
```
This will start the AI processing server on http://localhost:8000

### 3. Start Frontend
```bash
cd client
npm install  # If not done already
npm start
```
This will start the React app on http://localhost:3000

## What Changed

### Node.js Backend Updates:
1. ✅ Added resume routes to server.js
2. ✅ Updated resume controller to call Python backend for processing
3. ✅ Added fallback processing when Python backend is unavailable
4. ✅ Added form-data dependency for file transfer

### Processing Flow:
1. User uploads PDF → Node.js backend (Port 5000)
2. Node.js saves file metadata
3. Node.js sends file to Python backend (Port 8000) for AI processing
4. Python backend extracts text, parses with LLaMA3, calculates match score
5. Results returned to Node.js and then to frontend

### Fallback Mode:
If Python backend is not running, the system will:
- Still save the file
- Provide a basic random score (60-100)
- Show "Processing Required" for candidate data
- Display a note about AI backend being unavailable

## Testing the Fix
1. Start both backends
2. Upload a resume PDF
3. You should now see:
   - Real candidate data (name, email, skills, etc.)
   - Actual match score based on job requirements
   - Proper shortlisting based on score

## Troubleshooting
- If you see "Processing Required" everywhere, make sure Python backend is running on port 8000
- If upload fails completely, check that Node.js backend is running on port 5000
- Check console logs for detailed error messages 