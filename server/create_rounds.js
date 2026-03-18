const axios = require('axios');

async function createRounds() {
  console.log('🚀 Starting round creation process...');
  
  // Sample job ID (you can replace this with a real job ID from your database)
  const jobId = "test-job-" + Date.now();
  
  // Round configurations
  const roundsConfig = [
    {
      name: "Aptitude Test",
      type: "aptitude",
      description: "Basic aptitude and reasoning test",
      cutoff: 70,
      step: 1
    },
    {
      name: "Technical Interview",
      type: "technical",
      description: "Technical skills assessment",
      cutoff: 75,
      step: 2
    },
    {
      name: "HR Interview",
      type: "interview",
      description: "Final HR round",
      cutoff: 80,
      step: 3
    }
  ];
  
  const createdRounds = [];
  
  for (let i = 0; i < roundsConfig.length; i++) {
    const round = roundsConfig[i];
    
    try {
      console.log(`\n🔄 Creating round ${i + 1}/${roundsConfig.length}: ${round.name}`);
      
      const roundData = {
        job_id: jobId,
        name: round.name,
        type: round.type,
        description: round.description,
        cutoff: round.cutoff,
        step: round.step
      };
      
      console.log('📤 Sending data:', roundData);
      
      const response = await axios.post('http://localhost:5000/api/rounds', roundData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data._id) {
        createdRounds.push(response.data);
        console.log(`✅ Round ${i + 1} created successfully!`);
        console.log(`   ID: ${response.data._id}`);
        console.log(`   Name: ${response.data.name}`);
        console.log(`   Type: ${response.data.type}`);
        console.log(`   Step: ${response.data.step}`);
      } else {
        console.log(`❌ Invalid response for round ${i + 1}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create round ${i + 1}:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`   Connection refused - server not running on port 5000`);
      } else {
        console.error(`   Full error:`, error);
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total rounds to create: ${roundsConfig.length}`);
  console.log(`   Successfully created: ${createdRounds.length}`);
  console.log(`   Failed: ${roundsConfig.length - createdRounds.length}`);
  
  if (createdRounds.length > 0) {
    console.log('\n✅ Successfully created rounds:');
    createdRounds.forEach((round, index) => {
      console.log(`   ${index + 1}. ${round.name} (${round.type}) - Step ${round.step}`);
    });
  }
  
  // Test retrieving the rounds
  if (createdRounds.length > 0) {
    console.log('\n🔍 Testing round retrieval...');
    try {
      const getResponse = await axios.get(`http://localhost:5000/api/rounds/job/${jobId}`);
      console.log(`📋 Retrieved ${getResponse.data.length} rounds from database`);
      getResponse.data.forEach((round, index) => {
        console.log(`   ${index + 1}. ${round.name} - ${round.type} - Step ${round.step}`);
      });
    } catch (error) {
      console.error('❌ Failed to retrieve rounds:', error.message);
    }
  }
}

// Run the round creation
createRounds().catch(console.error); 