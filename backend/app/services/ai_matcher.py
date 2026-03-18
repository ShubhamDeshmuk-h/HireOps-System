import os
import json
import re
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv()

class AIMatcher:
    """
    AI-powered resume-job matching using Llama for semantic similarity
    """
    
    def __init__(self):
        # Use the same model as the parsing model for consistency
        # Try both token variable names for compatibility
        self.hf_token = os.getenv("HUGGINGFACE_API_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
        if self.hf_token:
            try:
                self.client = InferenceClient(
                    provider="novita",
                    api_key=self.hf_token,
                )
                print("✅ AI Matcher initialized with Llama 3 8B Instruct model")
            except Exception as e:
                print(f"❌ Error initializing AI Matcher: {e}")
                self.client = None
        else:
            print("❌ No HUGGINGFACE_API_TOKEN or HUGGINGFACE_API_KEY found")
            self.client = None
        
    def generate_matching_prompt(self, job_description: str, resume_text: str) -> str:
        """
        Generate a prompt for Llama to analyze job-resume match
        """
        prompt = f"""You are an expert HR recruiter and technical interviewer. Analyze the match between a job description and a candidate's resume.

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{resume_text}

Please provide a detailed analysis and score the match from 0-100 based on:
1. Skills match (technical skills, tools, technologies) - 40% weight
2. Experience relevance (work experience alignment) - 25% weight  
3. Education fit (degree and institution relevance) - 20% weight
4. Project alignment (projects matching job requirements) - 15% weight

Respond ONLY with a valid JSON object in this exact format:
{{
    "overall_score": <0-100>,
    "skills_match": <0-100>,
    "experience_match": <0-100>,
    "education_match": <0-100>,
    "project_match": <0-100>,
    "detailed_analysis": "<detailed explanation of the match>",
    "matched_skills": ["skill1", "skill2"],
    "missing_skills": ["skill1", "skill2"],
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"]
}}

Be specific and accurate in your analysis. Focus on technical skills, relevant experience, and project alignment."""
        return prompt
    
    def call_llama_model(self, prompt: str) -> Optional[str]:
        """
        Call Llama model using the same API as the parsing model
        """
        if not self.hf_token or not self.client:
            print("No Hugging Face token or client not initialized")
            return None
            
        try:
            # Use chat completions with Llama 3 model (same as parsing)
            completion = self.client.chat.completions.create(
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=800,
                temperature=0.1
            )
            
            # Extract the response content
            if completion.choices and len(completion.choices) > 0:
                response_content = completion.choices[0].message.content
                print(f"✅ Llama model response received: {response_content[:200]}...")
                return response_content
            else:
                print("No response content received from Llama model")
                return None
            
        except Exception as e:
            print(f"❌ Error calling Llama model: {e}")
            return None
    
    def extract_json_from_response(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Extract JSON from Llama response
        """
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
        except Exception as e:
            print(f"Error parsing JSON from Llama response: {e}")
            print(f"Raw response: {response}")
        
        return None
    
    def improved_fallback_scoring(self, job_description: str, resume_text: str, 
                                skills: List[str], experience: List[str], 
                                education: List[str], projects: List[str]) -> Dict[str, Any]:
        """
        Improved fallback scoring method when Llama model fails
        """
        print(f"Using improved fallback scoring")
        print(f"Job description length: {len(job_description)}")
        print(f"Resume text length: {len(resume_text)}")
        print(f"Skills to match: {skills}")
        
        # Normalize inputs - clean and normalize
        jd_lower = job_description.lower()
        jd_words = set(re.findall(r'\b\w+\b', jd_lower))  # Extract all words
        resume_lower = resume_text.lower()
        
        # Improved skill matching with variations and synonyms
        skill_matches = 0
        matched_skills = []
        missing_skills = []
        
        # Enhanced skill synonyms and variations
        skill_variations = {
            'react.js': ['react', 'reactjs', 'react js', 'reactjs'],
            'node.js': ['node', 'nodejs', 'node js', 'nodejs'],
            'express.js': ['express', 'expressjs', 'express js', 'expressjs'],
            'javascript': ['js', 'ecmascript', 'javascript'],
            'typescript': ['ts', 'typescript'],
            'html': ['html5', 'hypertext markup language', 'html'],
            'css': ['cascading style sheets', 'css3', 'css'],
            'sql': ['mysql', 'postgresql', 'database', 'db', 'sql'],
            'python': ['py', 'python'],
            'java': ['j2ee', 'j2se', 'java'],
            'git': ['github', 'gitlab', 'version control', 'git'],
            'docker': ['containerization', 'containers', 'docker'],
            'kubernetes': ['k8s', 'container orchestration', 'kubernetes'],
            'restful apis': ['rest', 'api', 'apis', 'restful', 'restful apis'],
            'jwt auth': ['jwt', 'authentication', 'auth', 'json web token'],
            'redis': ['cache', 'caching', 'redis'],
            'postgresql': ['postgres', 'postgresql'],
            'tailwind css': ['tailwind', 'tailwindcss', 'tailwind css'],
            'npm': ['node package manager', 'package manager', 'npm'],
            'mongodb': ['mongo', 'mongodb', 'nosql'],
            'mysql': ['mysql', 'sql'],
            'aws': ['amazon web services', 'aws'],
            'azure': ['microsoft azure', 'azure'],
            'gcp': ['google cloud platform', 'gcp'],
            'linux': ['unix', 'linux'],
            'docker': ['containerization', 'containers', 'docker'],
            'kubernetes': ['k8s', 'container orchestration', 'kubernetes'],
            'jenkins': ['ci/cd', 'continuous integration', 'jenkins'],
            'gitlab': ['gitlab', 'git'],
            'github': ['github', 'git'],
            'bitbucket': ['bitbucket', 'git'],
            'agile': ['scrum', 'kanban', 'agile'],
            'scrum': ['agile', 'scrum'],
            'kanban': ['agile', 'kanban'],
            'microservices': ['microservice', 'microservices'],
            'api': ['rest', 'api', 'apis', 'restful'],
            'rest': ['restful', 'api', 'apis', 'rest'],
            'graphql': ['graphql'],
            'websocket': ['websockets', 'websocket'],
            'oauth': ['oauth', 'authentication'],
            'oauth2': ['oauth', 'oauth2', 'authentication'],
            'jwt': ['json web token', 'jwt', 'authentication'],
            'bcrypt': ['bcrypt', 'hashing', 'password'],
            'bcryptjs': ['bcrypt', 'bcryptjs', 'hashing'],
            'passport': ['passport', 'authentication'],
            'multer': ['multer', 'file upload'],
            'nodemailer': ['nodemailer', 'email'],
            'socket.io': ['socket', 'websocket', 'socket.io'],
            'mongoose': ['mongoose', 'mongodb', 'odm'],
            'sequelize': ['sequelize', 'orm', 'sql'],
            'prisma': ['prisma', 'orm'],
            'typeorm': ['typeorm', 'orm'],
            'jest': ['jest', 'testing'],
            'mocha': ['mocha', 'testing'],
            'chai': ['chai', 'testing'],
            'cypress': ['cypress', 'testing'],
            'selenium': ['selenium', 'testing'],
            'webpack': ['webpack', 'bundler'],
            'babel': ['babel', 'transpiler'],
            'eslint': ['eslint', 'linting'],
            'prettier': ['prettier', 'formatting'],
            'husky': ['husky', 'git hooks'],
            'lint-staged': ['lint-staged', 'linting'],
            'nodemon': ['nodemon', 'development'],
            'pm2': ['pm2', 'process manager'],
            'nginx': ['nginx', 'web server'],
            'apache': ['apache', 'web server'],
            'redis': ['redis', 'cache', 'caching'],
            'memcached': ['memcached', 'cache', 'caching'],
            'elasticsearch': ['elasticsearch', 'search'],
            'kibana': ['kibana', 'monitoring'],
            'logstash': ['logstash', 'logging'],
            'prometheus': ['prometheus', 'monitoring'],
            'grafana': ['grafana', 'monitoring'],
            'datadog': ['datadog', 'monitoring'],
            'newrelic': ['newrelic', 'monitoring'],
            'sentry': ['sentry', 'error tracking'],
            'rollbar': ['rollbar', 'error tracking'],
            'bugsnag': ['bugsnag', 'error tracking'],
            'stripe': ['stripe', 'payment'],
            'paypal': ['paypal', 'payment'],
            'square': ['square', 'payment'],
            'twilio': ['twilio', 'sms', 'communication'],
            'sendgrid': ['sendgrid', 'email'],
            'mailgun': ['mailgun', 'email'],
            'aws ses': ['aws ses', 'email'],
            'firebase': ['firebase', 'backend as a service'],
            'supabase': ['supabase', 'backend as a service'],
            'heroku': ['heroku', 'platform as a service'],
            'vercel': ['vercel', 'platform as a service'],
            'netlify': ['netlify', 'platform as a service'],
            'digitalocean': ['digitalocean', 'cloud provider'],
            'linode': ['linode', 'cloud provider'],
            'vultr': ['vultr', 'cloud provider'],
            'terraform': ['terraform', 'infrastructure as code'],
            'ansible': ['ansible', 'configuration management'],
            'chef': ['chef', 'configuration management'],
            'puppet': ['puppet', 'configuration management'],
            'vagrant': ['vagrant', 'virtualization'],
            'virtualbox': ['virtualbox', 'virtualization'],
            'vmware': ['vmware', 'virtualization'],
            'hyper-v': ['hyper-v', 'virtualization'],
            'kvm': ['kvm', 'virtualization'],
            'xen': ['xen', 'virtualization'],
            'lxc': ['lxc', 'containerization'],
            'lxd': ['lxd', 'containerization'],
            'rkt': ['rkt', 'containerization'],
            'containerd': ['containerd', 'containerization'],
            'cri-o': ['cri-o', 'containerization'],
            'istio': ['istio', 'service mesh'],
            'linkerd': ['linkerd', 'service mesh'],
            'consul': ['consul', 'service discovery'],
            'etcd': ['etcd', 'key-value store'],
            'zookeeper': ['zookeeper', 'coordination'],
            'kafka': ['kafka', 'message broker'],
            'rabbitmq': ['rabbitmq', 'message broker'],
            'activemq': ['activemq', 'message broker'],
            'apache kafka': ['kafka', 'message broker'],
            'apache activemq': ['activemq', 'message broker'],
            'apache camel': ['camel', 'integration'],
            'apache storm': ['storm', 'stream processing'],
            'apache spark': ['spark', 'big data'],
            'apache hadoop': ['hadoop', 'big data'],
            'apache flink': ['flink', 'stream processing'],
            'apache beam': ['beam', 'data processing'],
            'apache airflow': ['airflow', 'workflow'],
            'apache nifi': ['nifi', 'data flow'],
            'apache druid': ['druid', 'analytics'],
            'apache superset': ['superset', 'analytics'],
            'apache zeppelin': ['zeppelin', 'notebook'],
            'apache jupyter': ['jupyter', 'notebook'],
            'apache notebook': ['notebook', 'jupyter'],
            'apache spark': ['spark', 'big data'],
            'apache hadoop': ['hadoop', 'big data'],
            'apache kafka': ['kafka', 'message broker'],
            'apache activemq': ['activemq', 'message broker'],
            'apache camel': ['camel', 'integration'],
            'apache storm': ['storm', 'stream processing'],
            'apache flink': ['flink', 'stream processing'],
            'apache beam': ['beam', 'data processing'],
            'apache airflow': ['airflow', 'workflow'],
            'apache nifi': ['nifi', 'data flow'],
            'apache druid': ['druid', 'analytics'],
            'apache superset': ['superset', 'analytics'],
            'apache zeppelin': ['zeppelin', 'notebook'],
            'apache jupyter': ['jupyter', 'notebook'],
            'apache notebook': ['notebook', 'jupyter']
        }
        
        for skill in skills:
            skill_lower = skill.lower().strip()
            matched = False
            
            # Method 1: Check for exact match in job description
            if skill_lower in jd_lower:
                skill_matches += 1
                matched_skills.append(skill)
                print(f"✅ Skill matched (exact): {skill}")
                matched = True
            else:
                # Method 2: Check for variations and synonyms
                variations = skill_variations.get(skill_lower, [skill_lower])
                for variation in variations:
                    if variation in jd_lower:
                        skill_matches += 1
                        matched_skills.append(skill)
                        print(f"✅ Skill matched via variation: {skill} (found: {variation})")
                        matched = True
                        break
                
                # Method 3: Check for word boundary matches
                if not matched:
                    skill_words = skill_lower.split()
                    for word in skill_words:
                        if len(word) > 2 and word in jd_words:
                            skill_matches += 1
                            matched_skills.append(skill)
                            print(f"✅ Skill matched via word: {skill} (word: {word})")
                            matched = True
                            break
                
                # Method 4: Check for partial matches with word boundaries
                if not matched:
                    for word in skill_words:
                        if len(word) > 2:
                            # Look for the word with word boundaries
                            pattern = r'\b' + re.escape(word) + r'\b'
                            if re.search(pattern, jd_lower):
                                skill_matches += 1
                                matched_skills.append(skill)
                                print(f"✅ Skill matched via word boundary: {skill} (word: {word})")
                                matched = True
                                break
            
            if not matched:
                missing_skills.append(skill)
                print(f"❌ Skill not found: {skill}")
        
        # Calculate component scores with better weighting
        skills_score = min((skill_matches / max(len(skills), 1)) * 100, 100) if skills else 0
        experience_score = min(len(experience) * 20, 100) if experience else 0  # Increased weight
        education_score = min(len(education) * 25, 100) if education else 0    # Increased weight
        project_score = min(len(projects) * 15, 100) if projects else 0        # Increased weight
        
        # Weighted overall score - adjusted weights
        overall_score = (
            skills_score * 0.45 +     # Skills are most important
            experience_score * 0.30 +  # Experience is very important
            education_score * 0.15 +   # Education is moderately important
            project_score * 0.10       # Projects are least important
        )
        
        # Generate strengths and weaknesses
        strengths = []
        weaknesses = []
        
        if skills_score > 60:
            strengths.append("Excellent technical skills match")
        elif skills_score > 40:
            strengths.append("Strong technical skills match")
        elif skills_score > 20:
            strengths.append("Some relevant technical skills")
        else:
            weaknesses.append("Limited technical skills match")
        
        if experience_score > 0:
            strengths.append("Has relevant work experience")
        else:
            weaknesses.append("No relevant work experience")
        
        if education_score > 0:
            strengths.append("Has relevant education")
        else:
            weaknesses.append("Education may not match requirements")
        
        if project_score > 0:
            strengths.append("Has relevant projects")
        else:
            weaknesses.append("No relevant projects")
        
        print(f"Scoring results:")
        print(f"  Skills: {skills_score:.1f}% ({skill_matches}/{len(skills)} matched)")
        print(f"  Experience: {experience_score:.1f}%")
        print(f"  Education: {education_score:.1f}%")
        print(f"  Projects: {project_score:.1f}%")
        print(f"  Overall: {overall_score:.1f}%")
        
        return {
            "overall_score": round(overall_score, 1),
            "skills_match": round(skills_score, 1),
            "experience_match": round(experience_score, 1),
            "education_match": round(education_score, 1),
            "project_match": round(project_score, 1),
            "detailed_analysis": f"Enhanced fallback scoring: {skill_matches}/{len(skills)} skills matched. Skills are {skills_score:.1f}% relevant, experience is {experience_score:.1f}% relevant, education is {education_score:.1f}% relevant, and projects are {project_score:.1f}% relevant.",
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "strengths": strengths,
            "weaknesses": weaknesses
        }
    
    def match_resume_to_job(self, job_description: str, resume_text: str,
                           skills: List[str] = None, experience: List[str] = None,
                           education: List[str] = None, projects: List[str] = None) -> Dict[str, Any]:
        """
        Main method to match resume with job using Llama
        """
        try:
            # Generate Llama prompt
            prompt = self.generate_matching_prompt(job_description, resume_text)
            
            # Call Llama model
            llama_response = self.call_llama_model(prompt)
            
            if llama_response:
                # Try to extract JSON from Llama response
                llama_result = self.extract_json_from_response(llama_response)
                
                if llama_result and isinstance(llama_result, dict):
                    # Validate and clean Llama result
                    result = self.validate_llama_result(llama_result)
                    result["ai_model_used"] = True
                    result["raw_ai_response"] = llama_response
                    print("✅ Llama model analysis completed successfully")
                    return result
                else:
                    print("❌ Failed to extract valid JSON from Llama response")
            
            # Fallback to improved scoring
            print("🔄 Llama model failed, using improved fallback scoring")
            result = self.improved_fallback_scoring(
                job_description, resume_text, 
                skills or [], experience or [], 
                education or [], projects or []
            )
            result["ai_model_used"] = False
            result["raw_ai_response"] = None
            return result
            
        except Exception as e:
            print(f"❌ Error in Llama matching: {e}")
            # Fallback to improved scoring
            result = self.improved_fallback_scoring(
                job_description, resume_text, 
                skills or [], experience or [], 
                education or [], projects or []
            )
            result["ai_model_used"] = False
            result["raw_ai_response"] = None
            result["error"] = str(e)
            return result
    
    def validate_llama_result(self, llama_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and clean Llama model result
        """
        # Ensure all required fields exist
        required_fields = {
            "overall_score": 0,
            "skills_match": 0,
            "experience_match": 0,
            "education_match": 0,
            "project_match": 0,
            "detailed_analysis": "",
            "matched_skills": [],
            "missing_skills": [],
            "strengths": [],
            "weaknesses": []
        }
        
        validated_result = {}
        for field, default_value in required_fields.items():
            value = llama_result.get(field, default_value)
            
            # Validate score fields
            if "score" in field and isinstance(value, (int, float)):
                validated_result[field] = max(0, min(100, float(value)))
            elif "score" in field:
                validated_result[field] = 0.0
            # Validate list fields
            elif isinstance(default_value, list):
                validated_result[field] = value if isinstance(value, list) else []
            # Validate string fields
            elif isinstance(default_value, str):
                validated_result[field] = str(value) if value else ""
            else:
                validated_result[field] = value
        
        return validated_result

# Global instance
ai_matcher = AIMatcher()

def ai_match_score(job_description: str, resume_text: str, 
                  skills: List[str] = None, experience: List[str] = None,
                  education: List[str] = None, projects: List[str] = None) -> Dict[str, Any]:
    """
    Convenience function to use Llama matcher
    """
    return ai_matcher.match_resume_to_job(
        job_description, resume_text, skills, experience, education, projects
    ) 