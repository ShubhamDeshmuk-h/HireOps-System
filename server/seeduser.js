const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load .env from project root or server directory
const envPathRoot = path.resolve(__dirname, '../.env');
const envPathServer = path.resolve(__dirname, '.env');
dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env. Please create a .env file in the server directory with MONGO_URI.');
  process.exit(1);
}

async function seedUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    ('✅ Connected to MongoDB');

    const email = 'hruser@example.com';
    const plainPassword = 'password123';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      ('⚠️ User already exists with email:', email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create and save new user
    const user = new User({
      name: 'HR User',
      email: email,
      password: hashedPassword,
      role: 'hr',
      createdAt: new Date(),
    });

    await user.save();
    ('✅ User created successfully:', { email, password: plainPassword });
  } catch (error) {
    console.error('❌ Error seeding user:', error);
  } finally {
    await mongoose.disconnect();
    ('🔌 MongoDB connection closed');
    process.exit();
  }
}

seedUser();
