import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
# Use the MongoDB Atlas connection string from environment variable
mongo_uri = os.getenv("MONGODB_URI")
if not mongo_uri:
    raise ValueError("MONGODB_URI environment variable is not set. Please check your .env file.")

print(f"Python backend connecting to MongoDB: {mongo_uri[:50]}...")

client = MongoClient(mongo_uri)
# Use the same database as Node.js backend (test)
db = client.test
print(f"Python backend using database: {db.name}")

resume_meta = db.resume_meta
resume_parsed = db.resume_parsed
jobs = db.jobs  # This should be the same collection as Node.js backend
candidates = db.candidates  # New collection for candidate information

# Test the connection
try:
    job_count = jobs.count_documents({})
    print(f"Python backend found {job_count} jobs in the jobs collection")
except Exception as e:
    print(f"Error counting jobs: {e}") 