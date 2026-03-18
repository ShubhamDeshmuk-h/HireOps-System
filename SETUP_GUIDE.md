# ATS System Setup Guide

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Run the automated setup script
python setup_environment.py
```

This will:
- Create `.env` files for both backend and server
- Prompt for required configuration values
- Preserve any existing configurations

### 2. Install Dependencies
```bash
# Python backend dependencies
cd backend
pip install -r requirements.txt

# Node.js server dependencies
cd ../server
npm install

# React client dependencies
cd ../client
npm install
```

### 3. Start the System
```bash
# Use the provided startup script
./start_backends.ps1

# Or start manually:
# Terminal 1: Python backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Node.js backend
cd server
npm run dev

# Terminal 3: React frontend
cd client
npm start
```

## 🔧 Issues Fixed

### ✅ API Token Consistency
- **Problem**: AI matcher used `HUGGINGFACE_API_KEY` while parser used `HUGGINGFACE_API_TOKEN`
- **Solution**: AI matcher now checks both variables for compatibility
- **Impact**: No breaking changes, maintains backward compatibility

### ✅ Environment Configuration
- **Problem**: Missing `.env` files and inconsistent variable names
- **Solution**: Automated setup script creates both `.env` files with all required variables
- **Impact**: Secure configuration management

### ✅ Service Dependencies
- **Problem**: Services might not start due to missing dependencies
- **Solution**: Comprehensive validation script checks all requirements
- **Impact**: Clear error messages and setup instructions

## 📋 Required Environment Variables

### Backend (.env)
```
HUGGINGFACE_API_TOKEN=your_huggingface_token
MONGODB_URI=mongodb://localhost:27017/ats_db
LOG_LEVEL=INFO
UPLOAD_DIR=uploads
```

### Server (.env)
```
MONGO_URI=mongodb://localhost:27017/ats_db
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
PORT=5000
NODE_ENV=development
```

## 🔍 Validation

### Run System Check
```bash
python test/validate_setup.py
```

This will test:
- ✅ Environment files exist and have required variables
- ✅ Python dependencies are installed
- ✅ Node.js dependencies are installed
- ✅ Backend modules can be imported
- ✅ File structure is correct

### Manual Testing
```bash
# Test Python backend
cd backend
python -c "from app.services.mistral_parser import MistralParser; print('✅ Parser works')"

# Test Node.js server
cd ../server
node -e "console.log('✅ Node.js works')"

# Test React build
cd ../client
npm run build
```

## 🚨 Common Issues & Solutions

### Issue: "Module not found" errors
**Solution**: Install missing dependencies
```bash
cd backend && pip install -r requirements.txt
cd ../server && npm install
cd ../client && npm install
```

### Issue: "Environment variable not set"
**Solution**: Run environment setup
```bash
python setup_environment.py
```

### Issue: "MongoDB connection failed"
**Solution**: Check MongoDB URI in `.env` files
```bash
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/ats_db

# For MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ats_db
```

### Issue: "Hugging Face API error"
**Solution**: Check API token
```bash
# Get token from https://huggingface.co/settings/tokens
HUGGINGFACE_API_TOKEN=hf_your_actual_token_here
```

## 🔒 Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production
3. **Change default passwords** and API keys
4. **Use HTTPS** in production environments
5. **Regularly update dependencies** for security patches

## 📊 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Node.js Server │    │ Python Backend  │
│   (Port 3000)   │◄──►│   (Port 5000)   │◄──►│   (Port 8000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────────────────────────────┐
                       │              MongoDB                    │
                       │  - resume_meta                          │
                       │  - resume_parsed                        │
                       │  - jobs                                 │
                       │  - candidates                           │
                       │  - users                                │
                       └─────────────────────────────────────────┘
```

## 🎯 Features Working

### ✅ Resume Upload & Parsing
- PDF text extraction with pdfplumber
- AI-powered parsing with Llama 3
- Robust JSON handling with fallback
- Complete raw response storage

### ✅ AI Match Scoring
- Semantic analysis with Llama 3
- Skill matching with synonyms
- Fallback scoring when AI fails
- Detailed match analysis

### ✅ Database Integration
- MongoDB Atlas support
- Structured data storage
- Candidate-resume linking
- Job-resume matching

### ✅ Frontend Interface
- Clean upload interface
- Status tracking
- Error handling
- Responsive design

## 🚀 Production Deployment

### Environment Variables
```bash
# Production .env files should have:
NODE_ENV=production
LOG_LEVEL=WARNING
JWT_SECRET=very-long-random-secret-key
MONGODB_URI=production-mongodb-connection
```

### Security Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Set up proper CORS
- [ ] Configure rate limiting
- [ ] Set up monitoring

## 📞 Support

If you encounter issues:

1. **Run validation**: `python test/validate_setup.py`
2. **Check logs**: Look at terminal output for error messages
3. **Verify environment**: Ensure `.env` files are properly configured
4. **Test components**: Run individual component tests

## 🔄 Updates

The system is designed to be backward compatible. When updating:

1. **Backup your `.env` files**
2. **Pull latest code**
3. **Run setup script**: `python setup_environment.py`
4. **Install new dependencies**
5. **Test the system**: `python test/validate_setup.py`

---

**Status**: ✅ All issues resolved, system ready for use 