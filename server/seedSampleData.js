require('dotenv').config();
const mongoose = require('mongoose');
const Resume = require('./models/Resume');
const Candidate = require('./models/Candidate');

// === FILL THIS IN WITH A VALID USER _id FROM YOUR DB ===
const userId = '68734e03c82a34256d731a11';
// === DO NOT CHANGE THIS: Full Stack Developer Job ID ===
const jobId = '687537ea18c088c65b5eddd5';

async function seedData() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  ('🔗 Connected to MongoDB Atlas');

  // 1. Insert 15 resumes
  const resumes = await Resume.insertMany(
    Array.from({ length: 15 }).map((_, i) => ({
      resume_id: `resume_${i + 1}`,
      job_id: jobId,
      uploaded_by: userId,
      file_path: `/uploads/resume_${i + 1}.pdf`,
      extracted_data: { summary: `Extracted data for resume ${i + 1}` }
    }))
  );

  // 2. Insert 15 candidates, each linked to a resume
  await Candidate.insertMany(
    resumes.map((resume, i) => ({
      candidate_id: `candidate_${i + 1}`,
      job_id: jobId,
      resume_id: resume._id,
      match_score: Math.floor(Math.random() * 100),
      full_name: `Candidate ${i + 1}`,
      email: `candidate${i + 1}@example.com`,
      phone: `123-456-789${i}`,
      linkedin: [`https://linkedin.com/in/candidate${i + 1}`],
      github: [`https://github.com/candidate${i + 1}`],
      summary: `Experienced Full Stack Developer ${i + 1}`,
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      education: [
        { degree: 'B.Tech', institute: 'Tech University', year: '2020' }
      ],
      experience: [
        { role: 'Full Stack Developer', company: 'Tech Corp', period: '2021-2023', description: 'Worked on web apps.' }
      ],
      projects: [
        { title: 'Project X', description: 'A cool project.' }
      ]
    }))
  );

  ('✅ Sample resumes and candidates inserted!');
  mongoose.disconnect();
}

seedData().catch(err => {
  console.error('❌ Error seeding data:', err);
  mongoose.disconnect();
}); 