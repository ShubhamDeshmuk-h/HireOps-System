#!/usr/bin/env python3
"""
Validate ATS System Setup
Tests if environment is properly configured and services can start
"""

import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

def test_env_files():
    """Test if .env files exist and have required variables"""
    print("🔍 Testing environment files...")
    
    base_dir = Path(__file__).parent.parent
    backend_env = base_dir / "backend" / ".env"
    server_env = base_dir / "server" / ".env"
    
    issues = []
    
    # Check backend .env
    if not backend_env.exists():
        issues.append("❌ Backend .env file missing")
    else:
        print("✅ Backend .env file exists")
        load_dotenv(backend_env)
        
        required_vars = ['HUGGINGFACE_API_TOKEN', 'MONGODB_URI']
        for var in required_vars:
            if os.getenv(var):
                print(f"✅ Backend has {var}")
            else:
                issues.append(f"❌ Backend missing {var}")
    
    # Check server .env
    if not server_env.exists():
        issues.append("❌ Server .env file missing")
    else:
        print("✅ Server .env file exists")
        load_dotenv(server_env)
        
        required_vars = ['MONGO_URI', 'JWT_SECRET']
        for var in required_vars:
            if os.getenv(var):
                print(f"✅ Server has {var}")
            else:
                issues.append(f"❌ Server missing {var}")
    
    return issues

def test_python_imports():
    """Test if Python modules can be imported"""
    print("\n🔍 Testing Python imports...")
    
    issues = []
    
    try:
        import fastapi
        print("✅ FastAPI imported successfully")
    except ImportError as e:
        issues.append(f"❌ FastAPI import failed: {e}")
    
    try:
        import uvicorn
        print("✅ Uvicorn imported successfully")
    except ImportError as e:
        issues.append(f"❌ Uvicorn import failed: {e}")
    
    try:
        import pymongo
        print("✅ PyMongo imported successfully")
    except ImportError as e:
        issues.append(f"❌ PyMongo import failed: {e}")
    
    try:
        import pdfplumber
        print("✅ PDFPlumber imported successfully")
    except ImportError as e:
        issues.append(f"❌ PDFPlumber import failed: {e}")
    
    try:
        from huggingface_hub import InferenceClient
        print("✅ HuggingFace Hub imported successfully")
    except ImportError as e:
        issues.append(f"❌ HuggingFace Hub import failed: {e}")
    
    return issues

def test_backend_modules():
    """Test if backend modules can be imported"""
    print("\n🔍 Testing backend modules...")
    
    base_dir = Path(__file__).parent.parent
    sys.path.insert(0, str(base_dir / "backend"))
    
    issues = []
    
    try:
        from app.services.mistral_parser import MistralParser
        print("✅ MistralParser imported successfully")
        
        # Test initialization
        parser = MistralParser()
        print("✅ MistralParser initialized successfully")
    except Exception as e:
        issues.append(f"❌ MistralParser failed: {e}")
    
    try:
        from app.services.ai_matcher import AIMatcher
        print("✅ AIMatcher imported successfully")
        
        # Test initialization
        matcher = AIMatcher()
        print("✅ AIMatcher initialized successfully")
    except Exception as e:
        issues.append(f"❌ AIMatcher failed: {e}")
    
    try:
        from app.utils.mongo import resume_meta, resume_parsed, jobs, candidates
        print("✅ MongoDB collections imported successfully")
    except Exception as e:
        issues.append(f"❌ MongoDB collections failed: {e}")
    
    return issues

def test_node_dependencies():
    """Test if Node.js dependencies are installed"""
    print("\n🔍 Testing Node.js dependencies...")
    
    base_dir = Path(__file__).parent.parent
    server_dir = base_dir / "server"
    client_dir = base_dir / "client"
    
    issues = []
    
    # Check if node_modules exist
    if (server_dir / "node_modules").exists():
        print("✅ Server node_modules exists")
    else:
        issues.append("❌ Server node_modules missing - run 'npm install' in server/")
    
    if (client_dir / "node_modules").exists():
        print("✅ Client node_modules exists")
    else:
        issues.append("❌ Client node_modules missing - run 'npm install' in client/")
    
    return issues

def test_file_structure():
    """Test if all required files exist"""
    print("\n🔍 Testing file structure...")
    
    base_dir = Path(__file__).parent.parent
    
    required_files = [
        "backend/app/main.py",
        "backend/app/routes/resume.py",
        "backend/app/services/mistral_parser.py",
        "backend/app/services/ai_matcher.py",
        "backend/app/utils/mongo.py",
        "backend/requirements.txt",
        "server/server.js",
        "server/package.json",
        "server/routes/resumeRoutes.js",
        "client/package.json",
        "client/src/App.js",
        "client/src/pages/UploadResume.jsx"
    ]
    
    issues = []
    
    for file_path in required_files:
        full_path = base_dir / file_path
        if full_path.exists():
            print(f"✅ Found {file_path}")
        else:
            issues.append(f"❌ Missing {file_path}")
    
    return issues

def main():
    """Run all validation tests"""
    print("🚀 ATS System Validation")
    print("=" * 50)
    
    all_issues = []
    
    # Run all tests
    all_issues.extend(test_env_files())
    all_issues.extend(test_python_imports())
    all_issues.extend(test_backend_modules())
    all_issues.extend(test_node_dependencies())
    all_issues.extend(test_file_structure())
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 VALIDATION SUMMARY")
    print("=" * 50)
    
    if all_issues:
        print(f"\n❌ ISSUES FOUND ({len(all_issues)}):")
        for issue in all_issues:
            print(f"  {issue}")
        
        print(f"\n🔧 TO FIX ISSUES:")
        print("  1. Run: python setup_environment.py")
        print("  2. Install Python packages: cd backend && pip install -r requirements.txt")
        print("  3. Install Node packages: cd server && npm install")
        print("  4. Install React packages: cd client && npm install")
        
        return False
    else:
        print("\n✅ ALL TESTS PASSED!")
        print("   Your ATS system is properly configured and ready to run.")
        print("\n🚀 Next steps:")
        print("  1. Start the services: ./start_backends.ps1")
        print("  2. Access the application at: http://localhost:3000")
        
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 