import json
import re
import os
from typing import Dict, Any, Optional, List
from huggingface_hub import InferenceClient

class MistralParser:
    """
    Resume parser using Llama 3 via Hugging Face InferenceClient with novita provider
    with fallback to regex extraction.
    """
    
    def __init__(self):
        self.hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
        self.client = None
        self.last_response = None  # Store the last raw Llama 3 response
        
        # Initialize InferenceClient if token is available
        if self.hf_token:
            try:
                print("🔄 Initializing Hugging Face InferenceClient with Llama 3...")
                self.client = InferenceClient(
                    provider="novita",
                    api_key=self.hf_token,
                )
                print("✅ InferenceClient initialized successfully with Llama 3 access!")
            except Exception as e:
                print(f"⚠️  Failed to initialize InferenceClient: {e}")
                print("   Will use regex fallback instead")
                self.client = None
        
    def generate_prompt(self, resume_text: str) -> str:
        """
        Generate structured prompt for Llama 3 with strict JSON formatting requirements.
        
        Args:
            resume_text (str): Raw text extracted from resume
            
        Returns:
            str: Formatted prompt for Llama 3
        """
        prompt = f"""Extract information from this resume and return ONLY a valid JSON object with these exact fields:

{{
  "full_name": "extracted full name",
  "email": "extracted email address", 
  "phone": "extracted phone number",
  "skills": ["skill1", "skill2", "skill3"],
  "education": ["degree from institution"],
  "experience": ["job title at company"],
  "summary": "brief summary",
  "projects": ["project name"]
}}

Resume text:
{resume_text}

IMPORTANT: Return ONLY the JSON object. No explanations, no markdown, no code blocks. Use double quotes for all strings and keys. Ensure all arrays are properly formatted with square brackets."""
        
        return prompt
    
    def call_llama3(self, prompt: str) -> Optional[str]:
        """
        Call Llama 3 via Hugging Face InferenceClient with novita provider.
        
        Args:
            prompt (str): The prompt to send to Llama 3
            
        Returns:
            Optional[str]: Generated text response or None if failed
        """
        if not self.hf_token or not self.client:
            print("No Hugging Face token or InferenceClient not initialized, skipping Llama 3")
            return None
            
        try:
            # Use chat completions with Llama 3 model
            completion = self.client.chat.completions.create(
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=600,
                temperature=0.7
            )
            
            # Extract the response content
            if completion.choices and len(completion.choices) > 0:
                response_content = completion.choices[0].message.content
                self.last_response = response_content  # Store the raw response
                return response_content
            else:
                print("No response content received from Llama 3")
                return None
            
        except Exception as e:
            print(f"Llama 3 API call failed: {e}")
            return None
    
    def extract_json_from_response(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Extract JSON object from Llama 3 response with robust error handling.
        
        Args:
            response (str): Raw response from Llama 3
            
        Returns:
            Optional[Dict[str, Any]]: Parsed JSON data or None if failed
        """
        try:
            print(f"Raw Llama 3 response: {response[:500]}...")
            
            # Find JSON object in response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response[json_start:json_end]
                print(f"Extracted JSON string: {json_str[:300]}...")
                
                # Try to fix common JSON formatting issues
                json_str = self.fix_json_formatting(json_str)
                
                try:
                    parsed_data = json.loads(json_str)
                    print(f"Successfully parsed JSON: {list(parsed_data.keys())}")
                    
                    # Validate and clean the data
                    cleaned_data = self.validate_and_clean_data(parsed_data)
                    
                    # Check if we have at least some useful data
                    if cleaned_data.get('email') != "Not found" or cleaned_data.get('full_name') != "Not found":
                        return cleaned_data
                    else:
                        print("JSON parsed but no useful data found")
                        return None
                        
                except json.JSONDecodeError as e:
                    print(f"JSON parsing failed after fixes: {e}")
                    print(f"Problematic JSON: {json_str}")
                    
                    # Try to extract partial data from the problematic JSON
                    partial_data = self.extract_partial_json(json_str)
                    if partial_data:
                        print("Extracted partial data from problematic JSON")
                        return partial_data
                    
                    return None
                    
            else:
                print("No JSON brackets found in response")
                return None
            
        except Exception as e:
            print(f"Response parsing error: {e}")
            return None
    
    def extract_partial_json(self, json_str: str) -> Optional[Dict[str, Any]]:
        """
        Try to extract partial data from malformed JSON.
        
        Args:
            json_str (str): Malformed JSON string
            
        Returns:
            Optional[Dict[str, Any]]: Partial data or None
        """
        try:
            # Try to fix common issues
            # Remove trailing commas before closing braces/brackets
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
            
            # Fix apostrophes by replacing them with a safe character
            json_str = json_str.replace("'", "'")  # Replace with curly apostrophe
            
            # Try to complete incomplete JSON
            if not json_str.strip().endswith('}'):
                # Find the last complete field
                last_comma = json_str.rfind(',')
                if last_comma != -1:
                    json_str = json_str[:last_comma] + '}'
                else:
                    json_str = json_str.rstrip() + '}'
            
            # Try parsing again
            parsed_data = json.loads(json_str)
            cleaned_data = self.validate_and_clean_data(parsed_data)
            
            # Return if we have at least email or name
            if cleaned_data.get('email') != "Not found" or cleaned_data.get('full_name') != "Not found":
                return cleaned_data
                
        except Exception as e:
            print(f"Partial JSON extraction failed: {e}")
            
            # Last resort: try to extract basic fields manually
            try:
                return self.extract_fields_manually(json_str)
            except Exception as e2:
                print(f"Manual field extraction also failed: {e2}")
        
        return None
    
    def extract_fields_manually(self, json_str: str) -> Optional[Dict[str, Any]]:
        """
        Extract fields manually from malformed JSON using regex.
        
        Args:
            json_str (str): Malformed JSON string
            
        Returns:
            Optional[Dict[str, Any]]: Extracted data or None
        """
        result = {}
        
        # Extract email
        email_match = re.search(r'"email":\s*"([^"]+)"', json_str)
        if email_match:
            result["email"] = email_match.group(1)
        
        # Extract full_name
        name_match = re.search(r'"full_name":\s*"([^"]+)"', json_str)
        if name_match:
            result["full_name"] = name_match.group(1)
        
        # Extract phone
        phone_match = re.search(r'"phone":\s*"([^"]*)"', json_str)
        if phone_match:
            result["phone"] = phone_match.group(1)
        
        # Extract skills (simplified)
        skills_match = re.search(r'"skills":\s*\[([^\]]+)\]', json_str)
        if skills_match:
            skills_str = skills_match.group(1)
            skills = [s.strip().strip('"') for s in skills_str.split(',') if s.strip()]
            result["skills"] = skills
        
        # Extract experience (simplified)
        exp_match = re.search(r'"experience":\s*\[([^\]]+)\]', json_str)
        if exp_match:
            exp_str = exp_match.group(1)
            experience = [e.strip().strip('"') for e in exp_str.split(',') if e.strip()]
            result["experience"] = experience
        
        # Extract education (simplified)
        edu_match = re.search(r'"education":\s*\[([^\]]+)\]', json_str)
        if edu_match:
            edu_str = edu_match.group(1)
            education = [e.strip().strip('"') for e in edu_str.split(',') if e.strip()]
            result["education"] = education
        
        # Extract summary - use a more robust pattern to capture complete text
        summary_match = re.search(r'"summary":\s*"([^"]*(?:\\"[^"]*)*)"', json_str)
        if summary_match:
            result["summary"] = summary_match.group(1)
        else:
            # Try alternative pattern for summary
            summary_match = re.search(r'"summary":\s*"([^"]*)"', json_str)
            if summary_match:
                result["summary"] = summary_match.group(1)
        
        # Extract projects (simplified)
        projects_match = re.search(r'"projects":\s*\[([^\]]*)\]', json_str)
        if projects_match:
            projects_str = projects_match.group(1)
            if projects_str.strip():
                projects = [p.strip().strip('"') for p in projects_str.split(',') if p.strip()]
                result["projects"] = projects
            else:
                result["projects"] = []
        
        # Return if we have at least email or name
        if result.get("email") or result.get("full_name"):
            return result
        
        return None
    
    def fix_json_formatting(self, json_str: str) -> str:
        """
        Fix common JSON formatting issues from Llama 3 responses.
        
        Args:
            json_str (str): Raw JSON string from Llama 3
            
        Returns:
            str: Fixed JSON string
        """
        # Remove any markdown code blocks
        json_str = re.sub(r'```json\s*', '', json_str)
        json_str = re.sub(r'```\s*$', '', json_str)
        
        # Fix trailing commas
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)
        
        # Fix missing quotes around keys
        json_str = re.sub(r'(\w+):', r'"\1":', json_str)
        
        # Note: We'll handle apostrophes in the partial JSON extraction instead
        
        # Fix newlines in string values
        json_str = re.sub(r'\n', '\\n', json_str)
        
        # Fix multiple spaces
        json_str = re.sub(r'\s+', ' ', json_str)
        
        return json_str
    

    

    
    def validate_and_clean_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and clean the parsed data from Llama 3.
        
        Args:
            data (Dict[str, Any]): Raw parsed data
            
        Returns:
            Dict[str, Any]: Cleaned and validated data
        """
        # Ensure all required fields exist with proper types
        cleaned_data = {
            "full_name": str(data.get("full_name", "Not found")).strip(),
            "email": str(data.get("email", "Not found")).strip(),
            "phone": str(data.get("phone", "Not found")).strip(),
            "summary": str(data.get("summary", "")).strip(),
            "skills": self.ensure_list(data.get("skills", [])),
            "education": self.ensure_list(data.get("education", [])),
            "experience": self.ensure_list(data.get("experience", [])),
            "projects": self.ensure_list(data.get("projects", []))
        }
        
        # Clean up empty or invalid values
        for key, value in cleaned_data.items():
            if isinstance(value, str) and value.lower() in ['null', 'none', 'n/a', '']:
                cleaned_data[key] = "Not found" if key in ['full_name', 'email', 'phone'] else ""
            elif isinstance(value, list):
                # Remove empty strings and invalid entries from lists
                cleaned_data[key] = [str(item).strip() for item in value if str(item).strip() and str(item).strip().lower() not in ['null', 'none', 'n/a']]
        
        return cleaned_data
    
    def ensure_list(self, value: Any) -> List[str]:
        """
        Ensure a value is a list of strings.
        
        Args:
            value (Any): Input value
            
        Returns:
            List[str]: List of strings
        """
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        elif isinstance(value, str):
            # Try to split by common delimiters
            if ',' in value:
                return [item.strip() for item in value.split(',') if item.strip()]
            elif ';' in value:
                return [item.strip() for item in value.split(';') if item.strip()]
            else:
                return [value.strip()] if value.strip() else []
        else:
            return []
    
    def regex_fallback(self, text: str) -> Dict[str, Any]:
        """
        Fallback regex extraction for basic information.
        
        Args:
            text (str): Resume text
            
        Returns:
            Dict[str, Any]: Extracted data using regex patterns
        """
        print("Using regex fallback extraction")
        
        # Extract email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_match = re.search(email_pattern, text)
        email = email_match.group(0) if email_match else "Not found"
        
        # Extract phone number
        phone_patterns = [
            r'(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})',
            r'\+?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}',
            r'[0-9]{10,15}'
        ]
        
        phone = "Not found"
        for pattern in phone_patterns:
            phone_match = re.search(pattern, text)
            if phone_match:
                phone = phone_match.group(0)
                break
        
        # Extract name (first few lines that look like names)
        lines = text.split('\n')
        full_name = "Not found"
        for line in lines[:10]:
            line = line.strip()
            if line and not re.search(r'@|\d', line) and 2 <= len(line.split()) <= 4:
                if re.match(r'^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$', line):
                    full_name = line
                    break
        
        # Extract skills (capitalized technical terms)
        skills_section = re.search(r'(?i)skills?[:\s]*([\s\S]*?)(?=\n\s*\n|\n\s*[A-Z]|$)', text)
        skills = []
        if skills_section:
            skills_text = skills_section.group(1)
            # Find capitalized technical terms
            tech_patterns = [
                r'\b[A-Z][a-zA-Z0-9.#+\-()]+\b',
                r'\b[A-Z]{2,}\b',
                r'\b[A-Za-z]+\s*\+\s*[A-Za-z]+\b'
            ]
            for pattern in tech_patterns:
                found_skills = re.findall(pattern, skills_text)
                for skill in found_skills:
                    skill_clean = skill.strip()
                    if len(skill_clean) > 2 and skill_clean.lower() not in ['and', 'the', 'with', 'using', 'for', 'in', 'on', 'at', 'to', 'of', 'a', 'an']:
                        skills.append(skill_clean)
        
        # Extract education
        education = []
        edu_patterns = [
            r'([A-Z][a-zA-Z\s]+(?:Bachelor|Master|PhD|Diploma|Certificate|B\.?E\.?|B\.?Tech\.?|M\.?Tech\.?|M\.?S\.?|MBA))[^.]*?([A-Z][a-zA-Z\s]+(?:University|College|Institute|School))',
            r'([A-Z][a-zA-Z\s]+(?:Bachelor|Master|PhD|Diploma|Certificate|B\.?E\.?|B\.?Tech\.?|M\.?Tech\.?|M\.?S\.?|MBA))'
        ]
        
        for pattern in edu_patterns:
            edu_matches = re.findall(pattern, text, re.IGNORECASE)
            for match in edu_matches:
                if isinstance(match, tuple):
                    degree, institution = match
                    education.append(f"{degree.strip()} from {institution.strip()}")
                else:
                    education.append(match.strip())
        
        # Extract experience
        experience = []
        exp_patterns = [
            r'([A-Z][a-zA-Z\s]+(?:Developer|Engineer|Manager|Analyst|Consultant|Lead|Designer|Officer|Specialist|Coordinator|Assistant|Executive|Director|Administrator))[^.]*?([A-Z][a-zA-Z\s]+(?:Pvt|Ltd|Inc|Corp|Company|Technologies|Solutions|Systems|Labs|Group|Industries|Services))',
            r'([A-Z][a-zA-Z\s]+(?:Developer|Engineer|Manager|Analyst|Consultant|Lead|Designer|Officer|Specialist|Coordinator|Assistant|Executive|Director|Administrator))'
        ]
        
        for pattern in exp_patterns:
            exp_matches = re.findall(pattern, text, re.IGNORECASE)
            for match in exp_matches:
                if isinstance(match, tuple):
                    job_title, company = match
                    experience.append(f"{job_title.strip()} at {company.strip()}")
                else:
                    experience.append(match.strip())
        
        # Extract summary
        summary = ""
        summary_section = re.search(r'(?i)(summary|objective)[:\s]*([\s\S]*?)(?=\n\s*\n|\n\s*[A-Z]|$)', text)
        if summary_section:
            summary = re.sub(r'\s+', ' ', summary_section.group(2).strip())[:200]
        
        # Extract projects
        projects = []
        projects_section = re.search(r'(?i)projects?[:\s]*([\s\S]*?)(?=\n\s*\n|\n\s*[A-Z]|$)', text)
        if projects_section:
            projects_text = projects_section.group(1)
            project_lines = projects_text.split('\n')
            for line in project_lines:
                line = line.strip()
                if line and len(line) > 10 and not line.startswith('-'):
                    projects.append(line)
        
        return {
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "skills": skills[:15],  # Limit to 15 skills
            "education": education[:3],  # Limit to 3 education entries
            "experience": experience[:8],  # Limit to 8 experiences
            "summary": summary,
            "projects": projects[:5]  # Limit to 5 projects
        }
    
    def parse_resume(self, text: str) -> Dict[str, Any]:
        """
        Main parsing function that tries Llama 3 first, then falls back to regex only if Llama 3 is unavailable.
        
        Args:
            text (str): Resume text to parse
            
        Returns:
            Dict[str, Any]: Parsed resume data with parsing method indicator
        """
        # Try Llama 3 first - only if client is properly initialized
        if self.hf_token and self.client:
            try:
                prompt = self.generate_prompt(text)
                response = self.call_llama3(prompt)
                
                if response:
                    parsed_data = self.extract_json_from_response(response)
                    if parsed_data:
                        print("✅ Successfully parsed with Llama 3")
                        return {
                            **parsed_data,
                            "parsing_method": "llama3_ai"
                        }
                    else:
                        print("⚠️  Llama 3 returned response but JSON extraction failed")
                        # Don't fallback to regex here - return empty data with llama3_ai method
                        return {
                            "full_name": "Not found",
                            "email": "Not found", 
                            "phone": "Not found",
                            "skills": [],
                            "education": [],
                            "experience": [],
                            "summary": "",
                            "projects": [],
                            "parsing_method": "llama3_ai_failed"
                        }
                else:
                    print("⚠️  Llama 3 returned no response")
                    # Don't fallback to regex here - return empty data with llama3_ai method
                    return {
                        "full_name": "Not found",
                        "email": "Not found",
                        "phone": "Not found", 
                        "skills": [],
                        "education": [],
                        "experience": [],
                        "summary": "",
                        "projects": [],
                        "parsing_method": "llama3_ai_failed"
                    }
            except Exception as e:
                print(f"Llama 3 parsing failed: {e}")
                # Don't fallback to regex here - return empty data with llama3_ai method
                return {
                    "full_name": "Not found",
                    "email": "Not found",
                    "phone": "Not found",
                    "skills": [],
                    "education": [],
                    "experience": [],
                    "summary": "",
                    "projects": [],
                    "parsing_method": "llama3_ai_failed"
                }
        
        # Only use regex fallback if Llama 3 is completely unavailable
        if not self.hf_token or not self.client:
            print("🔄 Llama 3 not available, using regex fallback")
            regex_data = self.regex_fallback(text)
            return {
                **regex_data,
                "parsing_method": "regex_fallback"
            }
        
        # This should never happen, but just in case
        print("🔄 Unexpected state, using regex fallback")
        regex_data = self.regex_fallback(text)
        return {
            **regex_data,
            "parsing_method": "regex_fallback"
        } 