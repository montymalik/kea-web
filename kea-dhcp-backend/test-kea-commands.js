// test-kea-commands.js - Test what Kea commands are available
const fetch = require('node-fetch');

const KEA_SERVER = 'http://192.168.1.97:8000';
const KEA_USERNAME = 'kea_api';
const KEA_PASSWORD = 'Hardup33';
const PROXY_URL = 'http://172.18.0.3:3001/api';

const createAuthHeader = () => {
  const credentials = Buffer.from(`${KEA_USERNAME}:${KEA_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
};

const testCommand = async (command, args = {}) => {
  try {
    console.log(`\n--- Testing command: ${command} ---`);
    
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: command,
        service: ["dhcp4"],
        ...args
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Result: ${data[0]?.result}`);
    console.log(`Text: ${data[0]?.text || 'No text'}`);
    
    if (data[0]?.result === 0) {
      console.log(`✅ ${command} - SUPPORTED`);
      if (data[0]?.arguments) {
        console.log(`Arguments keys: ${Object.keys(data[0].arguments)}`);
      }
    } else {
      console.log(`❌ ${command} - NOT SUPPORTED OR ERROR`);
    }
    
    return data;
  } catch (error) {
    console.log(`❌ ${command} - ERROR: ${error.message}`);
    return null;
  }
};

const runTests = async () => {
  console.log('Testing Kea DHCP Commands...');
  console.log(`Using proxy: ${PROXY_URL}`);
  
  // Test basic commands
  await testCommand('list-commands');
  await testCommand('config-get');
  await testCommand('lease4-get-all');
  await testCommand('subnet4-list');
  
  // Test reservation commands
  await testCommand('reservation-get-all');
  await testCommand('reservation-get-by-subnet-id', { arguments: { "subnet-id": 1 } });
  await testCommand('reservation-get-page', { arguments: { "subnet-id": 1, "limit": 10 } });
  
  // Test lease commands
  await testCommand('lease4-get-by-subnet-id', { arguments: { "subnet-id": 1 } });
  
  console.log('\nTest complete!');
};

runTests().catch(console.error);
