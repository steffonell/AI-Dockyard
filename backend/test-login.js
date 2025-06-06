const https = require('http');

const data = JSON.stringify({
  email: "admin@test.com",
  password: "Password123!"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
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

req.write(data);
req.end(); 