import os

def create_env_file():
    """Create .env file in backend directory with Hugging Face token"""
    
    env_path = "backend/.env"
    
    # Check if .env file already exists
    if os.path.exists(env_path):
        print(f"✅ .env file already exists at {env_path}")
        with open(env_path, 'r') as f:
            content = f.read()
            if 'HUGGINGFACE_API_TOKEN' in content:
                print("✅ HUGGINGFACE_API_TOKEN is already set")
                return True
            else:
                print("⚠️  HUGGINGFACE_API_TOKEN not found in .env file")
    
    # Get token from user
    print("🔑 Setting up Hugging Face API Token")
    print("=" * 50)
    print("1. Go to https://huggingface.co/")
    print("2. Sign up/Login to your account")
    print("3. Go to Settings → Access Tokens")
    print("4. Create a new token with 'Read' permissions")
    print("5. Copy the token (starts with 'hf_')")
    print("=" * 50)
    
    token = input("Enter your Hugging Face API token: ").strip()
    
    if not token:
        print("❌ No token provided")
        return False
    
    if not token.startswith('hf_'):
        print("⚠️  Warning: Hugging Face tokens usually start with 'hf_'")
        proceed = input("Continue anyway? (y/n): ").lower()
        if proceed != 'y':
            return False
    
    # Create backend directory if it doesn't exist
    os.makedirs("backend", exist_ok=True)
    
    # Write .env file
    env_content = f"HUGGINGFACE_API_TOKEN={token}\n"
    
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    print(f"✅ Created {env_path} with your token")
    print("🔒 The token is now stored securely in the .env file")
    
    return True

if __name__ == "__main__":
    success = create_env_file()
    if success:
        print("\n🎉 Now you can test the setup:")
        print("   python test_huggingface.py")
    else:
        print("\n❌ Setup incomplete. Please try again.") 