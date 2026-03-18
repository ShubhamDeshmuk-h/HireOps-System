from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI")
if not MONGO_URI:
    raise ValueError("MONGODB_URI environment variable is not set. Please check your .env file.")

client = MongoClient(MONGO_URI)
db = client.test

# Resume Parsed Collection Schema
resume_parsed = db.resume_parsed

# Create indexes for better performance
resume_parsed.create_index("resumeId", unique=True)
resume_parsed.create_index("jobId")
resume_parsed.create_index("candidateId")
resume_parsed.create_index("timestamp")
resume_parsed.create_index("email")
resume_parsed.create_index("matchScore")

"""
Resume Parsed Schema:
{
    "resumeId": String/ObjectId,      # Unique ID for each uploaded resume
    "jobId": String/ObjectId,         # ID of the job this resume is submitted for
    "candidateId": String/ObjectId,   # Unique user or candidate identifier (optional)
    "timestamp": Date,                # When the resume was uploaded and parsed
    "matchScore": Number,             # Score between 0-100 indicating fit
    "email": String,                  # Used to identify or deduplicate candidates
    "full_name": String,              # Human-readable name
    "phone": String,                  # Contact phone number
    "summary": String,                # Resume summary/objective
    "skills": Array,                  # List of technical skills
    "keywords": Array,                # Extracted keywords
    "experience": Array,              # Work experience entries
    "education": Array,               # Educational background
    "projects": Array,                # Project descriptions
    "shortlisted": Boolean,           # Whether candidate is shortlisted
    "parsing_method": String,         # Method used for parsing (mistral_ai, regex_fallback, etc.)
    "extractedData": Object,          # Raw extracted data from parser
    "createdAt": Date,                # Document creation timestamp
    "updatedAt": Date                 # Document last update timestamp
}
""" 