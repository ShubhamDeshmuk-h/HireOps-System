from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class EducationEntry(BaseModel):
    degree: str
    institute: str
    year: str

class ExperienceEntry(BaseModel):
    role: str
    company: str
    period: str
    description: str

class ProjectEntry(BaseModel):
    title: str
    description: str

class Candidate(BaseModel):
    candidate_id: str  # Primary key (UUID/String)
    job_id: str        # Associated job ID
    full_name: str
    email: str
    phone: str
    linkedin: List[str] = []
    github: List[str] = []
    portfolio: List[str] = []
    summary: Optional[str] = None
    skills: List[str] = []
    education: List[EducationEntry] = []
    experience: List[ExperienceEntry] = []
    projects: List[ProjectEntry] = []
    links: List[str] = []
    match_score: Optional[float] = None
    resume_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None 