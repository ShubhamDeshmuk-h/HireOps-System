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

# Resume Meta Collection Schema
resume_meta = db.resume_meta

# Create indexes for better performance
resume_meta.create_index("resume_id", unique=True)
resume_meta.create_index("job_id")
resume_meta.create_index("candidate_id")
resume_meta.create_index("upload_date")
resume_meta.create_index("parsing_method")

"""
Resume Meta Schema:
{
    "resume_id": String/ObjectId,     # Unique ID for each uploaded resume
    "job_id": String/ObjectId,        # ID of the job this resume is submitted for
    "candidate_id": String/ObjectId,  # Unique user or candidate identifier (optional)
    "file_name": String,              # Original filename
    "upload_date": Date,              # When the resume was uploaded
    "file_path": String,              # Path to stored file
    "parsed": Boolean,                # Whether resume has been parsed
    "match_score": Number,            # Score between 0-100 indicating fit
    "parsing_method": String,         # Method used for parsing (mistral_ai, regex_fallback, etc.)
    "file_size": Number,              # File size in bytes
    "content_type": String,           # MIME type of the file
    "uploaded_by": String,            # User who uploaded the resume
    "processing_status": String,      # Status: pending, processing, completed, failed
    "error_message": String,          # Error message if processing failed
    "created_at": Date,               # Document creation timestamp
    "updated_at": Date                # Document last update timestamp
}
""" 