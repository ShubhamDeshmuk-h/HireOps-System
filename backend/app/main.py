from fastapi import FastAPI
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app.routes import resume

app = FastAPI()
app.include_router(resume.router) 