import os
import shutil
import requests
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from datetime import datetime
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.mistral_parser import MistralParser
from app.services.jd_matcher import match_score
from app.services.ai_matcher import ai_match_score
from app.utils.mongo import resume_meta, resume_parsed, jobs, candidates
from bson import ObjectId
import re
from typing import List, Dict, Any
import time

def parse_education(education_list: List[str]) -> List[Dict[str, str]]:
    """Parse education list into structured format"""
    structured_education = []
    for edu in education_list:
        # Handle different education formats
        if " from " in edu:
            # Format: "Bachelor of Engineering (B.E), Information Technology 2022 - 2026 from METs Institute of Engineering, Bhujbal Knowledge City"
            parts = edu.split(" from ")
            if len(parts) >= 2:
                degree_year = parts[0].strip()
                institute = parts[1].strip()
                
                # Extract year from the degree part
                year_match = re.search(r'(\d{4}\s*[-–]\s*\d{4}|\d{4})', degree_year)
                year = year_match.group(1) if year_match else ""
                
                # Degree is the remaining part
                degree = degree_year.replace(year, "").strip().rstrip(",")
                
                structured_education.append({
                    "degree": degree,
                    "institute": institute,
                    "year": year
                })
            else:
                structured_education.append({
                    "degree": edu,
                    "institute": "",
                    "year": ""
                })
        elif "—" in edu:
            # Original format: "B.E. Information Technology — MET BKC IOE Nashik 2023–2026"
            parts = edu.split("—")
            if len(parts) >= 2:
                degree_institute = parts[0].strip()
                year_location = parts[1].strip()
                
                # Extract year from the end
                year_match = re.search(r'(\d{4}[-–]\d{4}|\d{4})', year_location)
                year = year_match.group(1) if year_match else ""
                
                # Institute is the remaining part
                institute = year_location.replace(year, "").strip()
                
                structured_education.append({
                    "degree": degree_institute,
                    "institute": institute,
                    "year": year
                })
            else:
                structured_education.append({
                    "degree": edu,
                    "institute": "",
                    "year": ""
                })
        else:
            structured_education.append({
                "degree": edu,
                "institute": "",
                "year": ""
            })
    return structured_education

def parse_experience(experience_list: List[str]) -> List[Dict[str, str]]:
    """Parse experience list into structured format"""
    structured_experience = []
    for exp in experience_list:
        # Try to extract role, company, period, and description
        if " at " in exp:
            parts = exp.split(" at ")
            if len(parts) >= 2:
                role = parts[0].strip()
                company_period = parts[1].strip()
                
                # Extract period from parentheses
                period_match = re.search(r'\(([^)]+)\)', company_period)
                period = period_match.group(1) if period_match else ""
                
                # Company is the remaining part
                company = company_period.replace(f"({period})", "").strip()
                
                structured_experience.append({
                    "role": role,
                    "company": company,
                    "period": period,
                    "description": exp
                })
            else:
                structured_experience.append({
                    "role": exp,
                    "company": "",
                    "period": "",
                    "description": exp
                })
        else:
            structured_experience.append({
                "role": exp,
                "company": "",
                "period": "",
                "description": exp
            })
    return structured_experience

def parse_projects(projects_list: List[str]) -> List[Dict[str, str]]:
    """Parse projects list into structured format"""
    structured_projects = []
    for project in projects_list:
        # Try to extract title and description
        if "(" in project and ")" in project:
            title_part = project.split("(")[0].strip()
            description_part = "(" + "(".join(project.split("(")[1:])
            
            structured_projects.append({
                "title": title_part,
                "description": description_part
            })
        else:
            structured_projects.append({
                "title": project,
                "description": ""
            })
    return structured_projects

def merge_education(existing: List[Dict], new: List[Dict]) -> List[Dict]:
    """Merge education lists, avoiding duplicates"""
    merged = existing.copy()
    for new_edu in new:
        if not any(existing_edu.get("degree") == new_edu.get("degree") and 
                  existing_edu.get("institute") == new_edu.get("institute") 
                  for existing_edu in existing):
            merged.append(new_edu)
    return merged

def merge_experience(existing: List[Dict], new: List[Dict]) -> List[Dict]:
    """Merge experience lists, avoiding duplicates"""
    merged = existing.copy()
    for new_exp in new:
        if not any(existing_exp.get("role") == new_exp.get("role") and 
                  existing_exp.get("company") == new_exp.get("company") 
                  for existing_exp in existing):
            merged.append(new_exp)
    return merged

def merge_projects(existing: List[Dict], new: List[Dict]) -> List[Dict]:
    """Merge project lists, avoiding duplicates"""
    merged = existing.copy()
    for new_proj in new:
        if not any(existing_proj.get("title") == new_proj.get("title") 
                  for existing_proj in existing):
            merged.append(new_proj)
    return merged

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize Mistral parser
mistral_parser = MistralParser()

def get_job_from_nodejs_backend(jobId: str):
    """Get job details from Node.js backend API"""
    try:
        # Try to get job from Node.js backend using public endpoint
        response = requests.get(f"http://localhost:5000/api/public/jobs/{jobId}", timeout=5)
        if response.status_code == 200:
            return response.json().get("job")
        else:
            print(f"Node.js backend returned {response.status_code} for job {jobId}")
            return None
    except Exception as e:
        print(f"Error getting job from Node.js backend: {e}")
        return None

def simple_extract_email_phone(text):
    # Extract email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, text)
    email = email_match.group(0) if email_match else "Not found"

    # Extract phone number (simple pattern)
    phone_pattern = r'(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
    phone_match = re.search(phone_pattern, text)
    phone = phone_match.group(0) if phone_match else "Not found"

    return {"email": email, "phone": phone}

def convert_objectids(doc):
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
    return doc

@router.post("/api/upload-resume")
async def upload_resume(
    jobId: str = Form(...),
    uploadedBy: str = Form(...),
    files: UploadFile = File(...)
):
    """
    Upload and process a single resume file using Mistral AI parser.
    Always fetches the latest job description from the database for comparison.
    """
    try:
        print(f"Received upload request - jobId: {jobId}, uploadedBy: {uploadedBy}")
        
        # 1. Always get the latest job description from the database
        job = get_job_from_nodejs_backend(jobId)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job not found for ID: {jobId}")
        
        jd = job.get("description", "")
        cutoff_score = job.get("cutoff_score", 70)
        
        print(f"Found job: {job.get('title', 'Unknown')}, cutoff_score: {cutoff_score}")
        print(f"Using latest JD from database: {jd[:100]}...")
        
        if not jd:
            raise HTTPException(status_code=400, detail="Job description is empty")
        
        # 2. Process the uploaded file
        filename = files.filename
        print(f"Processing single file: {filename}")
        
        # Validate file type
        if not filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Create uploads directory if it doesn't exist
        uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = time.time()
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(uploads_dir, unique_filename)
        
        print(f"Processing file: {filename}")
        print(f"File content type: {files.content_type}")
        print(f"File size: {files.size}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Uploads directory: {uploads_dir}")
        print(f"Will save to: {file_path}")
        
        # Save file
        try:
            # Read the file content first
            file_content = await files.read()
            print(f"Read file content. Size: {len(file_content)} bytes")
            
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            print(f"File saved successfully. Size: {os.path.getsize(file_path)}")
            
            # Verify the file was written correctly
            if os.path.getsize(file_path) != len(file_content):
                raise Exception(f"File size mismatch. Expected: {len(file_content)}, Got: {os.path.getsize(file_path)}")
            
            # Check if file is actually a PDF
            with open(file_path, "rb") as f:
                header = f.read(4)
                if header != b'%PDF':
                    raise Exception("File is not a valid PDF (missing PDF header)")
                print("PDF header verified successfully")
                
        except Exception as e:
            print(f"File save error: {e}")
            raise HTTPException(status_code=400, detail=f"File save failed: {e}")
        
        # 3. Extract text from PDF using pdfplumber
        try:
            print(f"Attempting to extract text from: {file_path}")
            print(f"File exists: {os.path.exists(file_path)}")
            print(f"File size: {os.path.getsize(file_path) if os.path.exists(file_path) else 'N/A'}")
            print(f"File is readable: {os.access(file_path, os.R_OK)}")
            
            text = extract_text_from_pdf(file_path)
            print(f"Extracted text length: {len(text)}")
        except Exception as e:
            print(f"PDF extraction error: {e}")
            # Clean up the file if extraction fails
            try:
                os.remove(file_path)
            except:
                pass
            raise HTTPException(status_code=400, detail=f"PDF extraction failed: {e}")
        
        # 4. Parse with Mistral AI parser (with regex fallback)
        try:
            parsed = mistral_parser.parse_resume(text)
            print(f"Parsed resume data: {parsed}")
            print(f"Parsing method used: {parsed.get('parsing_method', 'unknown')}")
            print(f"Extracted skills: {parsed.get('skills', [])}")
            print(f"Extracted experience: {parsed.get('experience', [])}")
            print(f"Extracted education: {parsed.get('education', [])}")
            print(f"Extracted projects: {parsed.get('projects', [])}")
            print(f"Extracted summary: {parsed.get('summary', '')}")
            
            # If parser returns nothing useful, fallback
            if not parsed or (not parsed.get("email") and not parsed.get("phone")):
                raise Exception("Parser returned no data")
        except Exception as e:
            print(f"Parsing error: {e}")
            # Fallback: simple extractor
            parsed = simple_extract_email_phone(text)
            parsed["parsing_method"] = "simple_fallback"
            print(f"Fallback parsed data: {parsed}")
        
        # 5. Score against the latest job description using AI
        try:
            print(f"About to calculate AI score with latest JD: {jd[:100]}...")
            print(f"Resume text length: {len(text)}")
            print(f"Resume skills for scoring: {parsed.get('skills', [])}")
            
            # Use AI-powered matching with full resume text and job description
            ai_match_result = ai_match_score(
                job_description=jd,  # Use the latest JD from database
                resume_text=text,  # Use the full extracted text
                skills=parsed.get("skills", []),
                experience=parsed.get("experience", []),
                education=parsed.get("education", []),
                projects=parsed.get("projects", [])
            )
            
            # Extract the overall score from AI result
            score = ai_match_result.get("overall_score", 0.0)
            
            print(f"AI match result: {ai_match_result}")
            print(f"AI overall score: {score}")
            
        except Exception as e:
            print(f"AI scoring error: {e}")
            # Fallback to traditional scoring
            try:
                score = match_score(
                    jd,  # Use the latest JD from database
                    parsed.get("skills", []),
                    parsed.get("keywords", []),
                    parsed.get("experience", []),
                    parsed.get("education", [])
                ) if any(parsed.get(k) for k in ["skills", "keywords", "experience", "education"]) else 0.0
                print(f"Fallback score: {score}")
            except Exception as fallback_error:
                print(f"Fallback scoring error: {fallback_error}")
                score = 0.0
        
        # 6. Save to database
        try:
            # Generate unique resume ID
            resume_id = str(ObjectId())
            
            # Get raw Llama 3 response if available
            raw_llama3_response = None
            if parsed.get("parsing_method") == "llama3_ai" and hasattr(mistral_parser, 'last_response'):
                raw_llama3_response = mistral_parser.last_response
            
            # Save parsed data with new schema (let Node.js backend handle candidate creation)
            parsed_data = {
                "resumeId": resume_id,
                "jobId": jobId,
                "candidateId": None,  # Will be set by Node.js backend
                "timestamp": datetime.utcnow(),
                "matchScore": score,
                "email": parsed.get("email", "Not found"),
                "full_name": parsed.get("full_name", "Not found"),
                "phone": parsed.get("phone", "Not found"),
                "summary": parsed.get("summary", ""),
                "skills": parsed.get("skills", []),
                "keywords": parsed.get("keywords", []),
                "experience": parsed.get("experience", []),
                "education": parsed.get("education", []),
                "projects": parsed.get("projects", []),
                "shortlisted": score >= cutoff_score,
                "parsing_method": parsed.get("parsing_method", "unknown"),
                "extractedData": parsed,  # Cleaned parsed data
                "rawLlama3Response": raw_llama3_response,  # Raw Llama 3 response
                "aiMatchResult": ai_match_result,  # Detailed AI matching results
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            resume_parsed.insert_one(parsed_data)
            print("Parsed data saved to MongoDB")
            
            # Save metadata with new schema
            metadata = {
                "resume_id": resume_id,
                "job_id": jobId,
                "candidate_id": None,  # Will be set by Node.js backend
                "file_name": filename,
                "upload_date": datetime.utcnow(),
                "file_path": str(file_path),  # Convert to string to avoid path object issues
                "parsed": True,
                "match_score": score,
                "parsing_method": parsed.get("parsing_method", "unknown"),
                "file_size": len(file_content),
                "content_type": files.content_type,
                "uploaded_by": uploadedBy,
                "processing_status": "completed",
                "error_message": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            resume_meta.insert_one(metadata)
            print("Metadata saved to MongoDB")
            
        except Exception as e:
            print(f"Database save error: {e}")
            raise HTTPException(status_code=500, detail=f"Database save failed: {e}")
        
        # 7. Clean up
        try:
            os.remove(file_path)
            print(f"Deleted uploaded file: {file_path}")
        except Exception as e:
            print(f"File cleanup error: {e}")
        
        # 8. Return structured response
        return {
            "status": "Success",
            "resume_id": resume_id,
            "filename": filename,
            "uploaded_by": uploadedBy,
            "timestamp": datetime.utcnow().strftime("%d/%m/%Y, %I:%M:%S %p"),
            "match_score": f"{score:.1f}%",
            "result": "Shortlisted" if score >= cutoff_score else "Not Shortlisted",
            "ai_matching": {
                "overall_score": ai_match_result.get("overall_score", 0),
                "skills_match": ai_match_result.get("skills_match", 0),
                "experience_match": ai_match_result.get("experience_match", 0),
                "education_match": ai_match_result.get("education_match", 0),
                "project_match": ai_match_result.get("project_match", 0),
                "detailed_analysis": ai_match_result.get("detailed_analysis", ""),
                "matched_skills": ai_match_result.get("matched_skills", []),
                "missing_skills": ai_match_result.get("missing_skills", []),
                "strengths": ai_match_result.get("strengths", []),
                "weaknesses": ai_match_result.get("weaknesses", []),
                "ai_model_used": ai_match_result.get("ai_model_used", False)
            },
            "job_info": {
                "job_title": job.get("title", "Unknown"),
                "cutoff_score": cutoff_score,
                "jd_used": jd[:200] + "..." if len(jd) > 200 else jd
            },
            "parsed_data": {
                "full_name": parsed.get("full_name", "Not found"),
                "email": parsed.get("email", "Not found"),
                "phone": parsed.get("phone", "Not found"),
                "summary": parsed.get("summary", ""),
                "skills": parsed.get("skills", []),
                "keywords": parsed.get("keywords", []),
                "experience": parsed.get("experience", []),
                "education": parsed.get("education", []),
                "projects": parsed.get("projects", []),
                "parsing_method": parsed.get("parsing_method", "unknown")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

@router.post("/api/ai-match-test")
async def ai_match_test(request: dict):
    """Test AI-powered matching with provided job description and resume text"""
    try:
        job_description = request.get("job_description", "")
        resume_text = request.get("resume_text", "")
        skills = request.get("skills", [])
        experience = request.get("experience", [])
        education = request.get("education", [])
        projects = request.get("projects", [])
        
        if not job_description or not resume_text:
            raise HTTPException(status_code=400, detail="Job description and resume text are required")
        
        # Use AI-powered matching
        ai_result = ai_match_score(
            job_description=job_description,
            resume_text=resume_text,
            skills=skills,
            experience=experience,
            education=education,
            projects=projects
        )
        
        return {
            "status": "success",
            "ai_matching_result": ai_result,
            "inputs": {
                "job_description_length": len(job_description),
                "resume_text_length": len(resume_text),
                "skills_count": len(skills),
                "experience_count": len(experience),
                "education_count": len(education),
                "projects_count": len(projects)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI match test failed: {e}")

@router.post("/api/mistral-test")
async def mistral_test(text: str = Form(...)):
    """Test Mistral AI parsing with provided text"""
    try:
        parsed = mistral_parser.parse_resume(text)
        return {
            "status": "success",
            "parsed_data": parsed,
            "parsing_method": parsed.get("parsing_method", "unknown")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test failed: {e}")

@router.post("/api/mistral-test-json")
async def mistral_test_json(request: dict):
    """Test Mistral AI parsing with JSON request"""
    try:
        text = request.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        parsed = mistral_parser.parse_resume(text)
        return {
            "status": "success",
            "parsed_data": parsed,
            "parsing_method": parsed.get("parsing_method", "unknown")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test failed: {e}")

@router.get("/api/job/{jobId}/resumes")
def get_resumes_for_job(jobId: str):
    """Get all resumes for a specific job"""
    resumes = list(resume_parsed.find({"jobId": jobId}))
    return {"resumes": [convert_objectids(resume) for resume in resumes]}

@router.get("/api/resume/{resumeId}/details")
def get_resume_details(resumeId: str, candidateId: str = None):
    # Allow lookup by candidateId as well
    query = {"resumeId": resumeId}
    if candidateId:
        query["candidateId"] = candidateId
    
    resume = resume_parsed.find_one(query)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    return convert_objectids(resume)

@router.get("/api/job/{jobId}/match-scores")
def get_match_scores(jobId: str):
    """Get match scores for all resumes in a job"""
    resumes = list(resume_parsed.find(
        {"jobId": jobId}, 
        {"resumeId": 1, "matchScore": 1, "full_name": 1, "email": 1, "shortlisted": 1, "parsing_method": 1}
    ))
    return {"scores": [convert_objectids(resume) for resume in resumes]}

@router.post("/api/debug/match-score")
async def debug_match_score(request: dict):
    """Debug endpoint to test match scoring"""
    try:
        jd = request.get("jd", "")
        skills = request.get("skills", [])
        keywords = request.get("keywords", [])
        experience = request.get("experience", [])
        education = request.get("education", [])
        
        score = match_score(jd, skills, keywords, experience, education)
        
        return {
            "score": score,
            "inputs": {
                "jd_length": len(jd),
                "skills_count": len(skills),
                "keywords_count": len(keywords),
                "experience_count": len(experience),
                "education_count": len(education)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {e}")

@router.get("/api/debug/jobs")
def debug_jobs():
    """Debug endpoint to list all jobs"""
    try:
        all_jobs = list(jobs.find({}))
        return {"jobs": [convert_objectids(job) for job in all_jobs]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs: {e}")

@router.get("/api/debug/job/{jobId}")
def debug_job(jobId: str):
    """Debug endpoint to get specific job details"""
    try:
        job = jobs.find_one({"jobId": jobId})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return convert_objectids(job)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch job: {e}")

@router.post("/api/job/{jobId}/recalculate-shortlisting")
def recalculate_shortlisting(jobId: str):
    """Recalculate shortlisting for all resumes in a job"""
    try:
        # Get job details
        job = jobs.find_one({"jobId": jobId})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        jd = job.get("description", "")
        cutoff_score = job.get("cutoff_score", 70)
        
        # Get all resumes for this job
        resumes = list(resume_parsed.find({"jobId": jobId}))
        
        updated_count = 0
        for resume in resumes:
            # Recalculate score
            score = match_score(
                jd,
                resume.get("skills", []),
                resume.get("keywords", []),
                resume.get("experience", []),
                resume.get("education", [])
            )
            
            # Update resume with new field names
            resume_parsed.update_one(
                {"_id": resume["_id"]},
                {
                    "$set": {
                        "matchScore": score,
                        "shortlisted": score >= cutoff_score,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            updated_count += 1
        
        return {
            "message": f"Recalculated scores for {updated_count} resumes",
            "job_title": job.get("title", "Unknown"),
            "cutoff_score": cutoff_score
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recalculation failed: {e}") 