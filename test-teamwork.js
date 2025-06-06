const axios = require('axios');

// Test Teamwork API connection directly
async function testTeamworkAPI() {
  const apiKey = 'twp_AHqW3amssAxEjsEAWtPQDigPeO8q';
  const site = 'agentcocompany.teamwork.com';
  const baseUrl = `https://${site}`;
  
  const config = {
    auth: {
      username: apiKey,
      password: 'x'
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 10000
  };

  try {
    console.log('🔍 Testing Teamwork API connection...');
    console.log(`📍 Base URL: ${baseUrl}`);
    
    // Test connection
    const testUrl = `${baseUrl}/projects/api/v3/projects.json?pageSize=1`;
    console.log(`🌐 Testing: ${testUrl}`);
    
    const response = await axios.get(testUrl, config);
    console.log('✅ Connection successful!');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Projects found: ${response.data.projects?.length || 0}`);
    
    // Test getting all tasks
    const tasksUrl = `${baseUrl}/projects/api/v3/tasks.json?pageSize=10`;
    console.log(`🎯 Testing tasks: ${tasksUrl}`);
    
    const tasksResponse = await axios.get(tasksUrl, config);
    console.log('✅ Tasks fetch successful!');
    console.log(`📋 Tasks found: ${tasksResponse.data.tasks?.length || 0}`);
    
    if (tasksResponse.data.tasks && tasksResponse.data.tasks.length > 0) {
      console.log('📝 Sample task:');
      const task = tasksResponse.data.tasks[0];
      console.log(`   - ID: ${task.id}`);
      console.log(`   - Name: ${task.name}`);
      console.log(`   - Status: ${task.status}`);
      console.log(`   - Project: ${task.projectName || task.projectId}`);
    } else {
      console.log('⚠️  No tasks found - this might be the issue!');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(`   Message: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
      console.error(`   Data:`, error.response.data);
    }
  }
}

testTeamworkAPI();