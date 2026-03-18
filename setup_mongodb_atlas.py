#!/usr/bin/env python3
"""
Setup MongoDB Atlas connection for both Python and Node.js backends.
"""

import os

def setup_mongodb_atlas():
    """Setup MongoDB Atlas connection string"""
    
    print("🗄️ SETTING UP MONGODB ATLAS CONNECTION")
    print("=" * 50)
    
    # Check if .env files already exist
    backend_env = "backend/.env"
    server_env = "server/.env"
    
    backend_exists = os.path.exists(backend_env)
    server_exists = os.path.exists(server_env)
    
    if backend_exists or server_exists:
        print("📁 Existing .env files found:")
        if backend_exists:
            print(f"   ✅ {backend_env}")
        if server_exists:
            print(f"   ✅ {server_env}")
        
        update = input("\nDo you want to update the MongoDB URI? (y/n): ").lower()
        if update != 'y':
            print("✅ Keeping existing configuration")
            return True
    
    print("\n🔗 MONGODB ATLAS SETUP INSTRUCTIONS:")
    print("=" * 40)
    print("1. Go to https://cloud.mongodb.com/")
    print("2. Sign in to your MongoDB Atlas account")
    print("3. Select your cluster (or create a new one)")
    print("4. Click 'Connect' button")
    print("5. Choose 'Connect your application'")
    print("6. Copy the connection string")
    print("7. Replace <password> with your database password")
    print("8. Replace <dbname> with 'test' (or your preferred database name)")
    print("=" * 40)
    
    print("\n📝 EXAMPLE CONNECTION STRING:")
    print("mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/test?retryWrites=true&w=majority")
    print("=" * 40)
    
    mongo_uri = input("\nEnter your MongoDB Atlas connection string: ").strip()
    
    if not mongo_uri:
        print("❌ No connection string provided")
        return False
    
    if not mongo_uri.startswith('mongodb'):
        print("❌ Invalid MongoDB connection string")
        return False
    
    # Create backend .env file
    print(f"\n📝 Creating {backend_env}...")
    os.makedirs("backend", exist_ok=True)
    
    backend_content = ""
    if backend_exists:
        with open(backend_env, 'r') as f:
            backend_content = f.read()
    
    # Add or update MONGO_URI
    if 'MONGO_URI=' in backend_content:
        # Update existing MONGO_URI
        lines = backend_content.split('\n')
        updated_lines = []
        for line in lines:
            if line.startswith('MONGO_URI='):
                updated_lines.append(f'MONGO_URI={mongo_uri}')
            else:
                updated_lines.append(line)
        backend_content = '\n'.join(updated_lines)
    else:
        # Add new MONGO_URI
        if backend_content and not backend_content.endswith('\n'):
            backend_content += '\n'
        backend_content += f'MONGO_URI={mongo_uri}\n'
    
    with open(backend_env, 'w') as f:
        f.write(backend_content)
    
    print(f"✅ Updated {backend_env}")
    
    # Create server .env file
    print(f"📝 Creating {server_env}...")
    os.makedirs("server", exist_ok=True)
    
    server_content = ""
    if server_exists:
        with open(server_env, 'r') as f:
            server_content = f.read()
    
    # Add or update MONGO_URI
    if 'MONGO_URI=' in server_content:
        # Update existing MONGO_URI
        lines = server_content.split('\n')
        updated_lines = []
        for line in lines:
            if line.startswith('MONGO_URI='):
                updated_lines.append(f'MONGO_URI={mongo_uri}')
            else:
                updated_lines.append(line)
        server_content = '\n'.join(updated_lines)
    else:
        # Add new MONGO_URI
        if server_content and not server_content.endswith('\n'):
            server_content += '\n'
        server_content += f'MONGO_URI={mongo_uri}\n'
    
    with open(server_env, 'w') as f:
        f.write(server_content)
    
    print(f"✅ Updated {server_env}")
    
    print("\n🎉 MONGODB ATLAS SETUP COMPLETED!")
    print("=" * 40)
    print("✅ Python backend: backend/.env")
    print("✅ Node.js backend: server/.env")
    print("✅ Database: test")
    print("✅ Collections: resume_parsed, resume_meta, candidates")
    
    print("\n🚀 NEXT STEPS:")
    print("1. Start the Node.js backend: cd server && npm start")
    print("2. Start the Python backend: cd backend && python -m uvicorn app.main:app --reload")
    print("3. Upload a resume through the interface")
    print("4. Check MongoDB Atlas for stored data")
    
    return True

if __name__ == "__main__":
    success = setup_mongodb_atlas()
    if not success:
        print("\n❌ Setup incomplete. Please try again.") 