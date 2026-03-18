require('dotenv').config();
const mongoose = require('mongoose');

// Import the Interviewer model
const Interviewer = require('./models/Interviewer');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected for seeding'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Sample interviewers data
const sampleInterviewers = [
  {
    name: 'Shubham Deshmukh',
    email: 'shubhamdeshmukh3251@gmail.com',
    department: 'Software Development',
    available_times: [
      'Monday 10:00-12:00',
      'Tuesday 14:00-16:00',
      'Wednesday 10:00-12:00',
      'Thursday 14:00-16:00',
      'Friday 10:00-12:00'
    ]
  }
];

// Seed function
async function seedInterviewers() {
  try {
    // Clear existing interviewers
    await Interviewer.deleteMany({});
    console.log('🗑️ Cleared existing interviewers');

    // Insert sample interviewers
    const insertedInterviewers = await Interviewer.insertMany(sampleInterviewers);
    console.log(`✅ Successfully seeded ${insertedInterviewers.length} interviewers:`);
    
    insertedInterviewers.forEach(interviewer => {
      console.log(`   - ${interviewer.name} (${interviewer.email}) - ${interviewer.department}`);
    });

    console.log('\n🎉 Interviewer seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding interviewers:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seed function
seedInterviewers(); 