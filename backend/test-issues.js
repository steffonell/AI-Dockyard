const https = require('http');

// Use the access token from the login response
const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWJrazhmN3UwMDAwOXVhdDhlNWNrZnkwIiwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc0OTE5OTUzNywiZXhwIjoxNzQ5MjAwNDM3fQ.8o5CsHhUeyX2GukyIQTGRWb6sAhYpRAJCmRml42Yvtc";

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/issues?page=1&limit=20',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    console.log(chunk.toString());
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end(); 