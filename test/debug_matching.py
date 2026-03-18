#!/usr/bin/env python3
"""
Debug script to identify matching issues
"""

import os
import sys
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def debug_matching():
    """Debug the matching process step by step"""
    
    # Load environment variables
    load_dotenv()
    
    try:
        from app.services.ai_matcher import ai_match_score
        
        # Test with a simple case first
        job_description = """
        Full Stack Developer Position
        
        We are looking for a skilled Full Stack Developer with experience in:
        - React.js and Node.js
        - MongoDB and SQL databases
        - RESTful APIs and microservices
        - Git and version control
        - Docker and cloud deployment
        
        Requirements:
        - 2+ years of experience in web development
        - Strong knowledge of JavaScript/TypeScript
        - Experience with modern frontend frameworks
        - Understanding of database design
        - Good problem-solving skills
        """
        
        resume_text = """
        John Doe
        Full Stack Developer
        
        SKILLS:
        React.js, Node.js, JavaScript, TypeScript, MongoDB, SQL, Git, Docker, RESTful APIs, HTML, CSS
        
        EXPERIENCE:
        - Senior Full Stack Developer at Tech Company (2 years)
        - Junior Developer at Startup (1 year)
        
        EDUCATION:
        - Bachelor in Computer Science
        
        PROJECTS:
        - E-commerce platform with React and Node.js
        - RESTful API with MongoDB
        """
        
        skills = ["React.js", "Node.js", "JavaScript", "TypeScript", "MongoDB", "SQL", "Git", "Docker", "RESTful APIs", "HTML", "CSS"]
        experience = ["Senior Full Stack Developer at Tech Company (2 years)", "Junior Developer at Startup (1 year)"]
        education = ["Bachelor in Computer Science"]
        projects = ["E-commerce platform with React and Node.js", "RESTful API with MongoDB"]
        
        print("="*60)
        print("DEBUGGING MATCHING PROCESS")
        print("="*60)
        
        print(f"\nJob Description ({len(job_description)} chars):")
        print(job_description)
        
        print(f"\nResume Skills ({len(skills)} skills):")
        print(skills)
        
        print(f"\nResume Experience ({len(experience)} items):")
        print(experience)
        
        print(f"\nResume Education ({len(education)} items):")
        print(education)
        
        print(f"\nResume Projects ({len(projects)} items):")
        print(projects)
        
        # Test the matching
        result = ai_match_score(
            job_description=job_description,
            resume_text=resume_text,
            skills=skills,
            experience=experience,
            education=education,
            projects=projects
        )
        
        print("\n" + "="*60)
        print("MATCHING RESULTS")
        print("="*60)
        print(f"Overall Score: {result.get('overall_score', 0)}")
        print(f"Skills Match: {result.get('skills_match', 0)}")
        print(f"Experience Match: {result.get('experience_match', 0)}")
        print(f"Education Match: {result.get('education_match', 0)}")
        print(f"Project Match: {result.get('project_match', 0)}")
        print(f"AI Model Used: {result.get('ai_model_used', False)}")
        print(f"Matched Skills: {result.get('matched_skills', [])}")
        print(f"Missing Skills: {result.get('missing_skills', [])}")
        print(f"Strengths: {result.get('strengths', [])}")
        print(f"Weaknesses: {result.get('weaknesses', [])}")
        print(f"Detailed Analysis: {result.get('detailed_analysis', '')}")
        
        # Manual verification
        print("\n" + "="*60)
        print("MANUAL VERIFICATION")
        print("="*60)
        
        jd_lower = job_description.lower()
        print("Job description contains:")
        for skill in skills:
            skill_lower = skill.lower()
            if skill_lower in jd_lower:
                print(f"✅ {skill} - FOUND")
            else:
                print(f"❌ {skill} - NOT FOUND")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in debug: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_matching() 