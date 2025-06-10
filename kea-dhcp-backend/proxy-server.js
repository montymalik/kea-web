// proxy-server.js - Docker-compatible CORS proxy for Kea DHCP API (no auth)
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // You may need: npm install node-fetch@2

const app = express();
const PORT = 3001;

// Kea server configuration - NO AUTHENTICATION
const KEA_SERVER = 'http://192.168.1.97:8000'; // YOUR KEA SERVER IP AND PORT

// Enable CORS for all origins (since we're in Docker)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Docker Proxy server running (no auth)', 
    target: KEA_SERVER,
    timestamp: new Date().toISOString(),
    dockerInfo: {
      hostname: require('os').hostname(),
      platform: require('os').platform()
    }
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Docker proxy server is working (no auth)!',
    requestFrom: req.ip,
    headers: req.headers
  });
});

// Proxy all /api requests to Kea (no authentication)
app.all('/api/*', async (req, res) => {
  try {
    console.log(`Proxying: ${req.method} ${req.path} from ${req.ip}`);
    
    const keaUrl = KEA_SERVER + '/';
    
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header needed
      }
    };
    
    if (req.method !== 'GET' && req.body) {
      options.body = JSON.stringify(req.body);
    }
    
    console.log('Sending to Kea:', keaUrl);
    console.log('Request body:', req.body);
    
    const response = await fetch(keaUrl, options);
    const data = await response.text();
    
    console.log('Kea response status:', response.status);
    console.log('Kea response:', data.substring(0, 200) + '...');
    
    res.status(response.status);
    
    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (e) {
      res.send(data);
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error.message,
      target: KEA_SERVER
    });
  }
});

// Handle root API requests (no authentication) - FIXED ROUTING
app.all('/api', async (req, res) => {
  try {
    console.log(`Proxying root: ${req.method} /api from ${req.ip}`);
    
    const keaUrl = KEA_SERVER + '/';
    
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header needed
      }
    };
    
    if (req.method !== 'GET' && req.body) {
      options.body = JSON.stringify(req.body);
    }
    
    console.log('Sending to Kea:', keaUrl);
    console.log('Request body:', req.body);
    
    const response = await fetch(keaUrl, options);
    const data = await response.text();
    
    console.log('Kea response status:', response.status);
    console.log('Kea response:', data.substring(0, 200) + '...');
    
    res.status(response.status);
    
    // Try to parse as JSON, fallback to text
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (e) {
      res.send(data);
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error.message,
      target: KEA_SERVER
    });
  }
});

// Add a catch-all route for debugging
app.all('*', (req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableRoutes: ['/health', '/test', '/api']
  });
});

// Bind to all interfaces (0.0.0.0) so it's accessible from outside Docker
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Docker CORS Proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible from host at: http://172.18.0.3:${PORT}`);
  console.log(`Proxying requests to: ${KEA_SERVER}`);
  console.log(`Test the proxy: http://172.18.0.3:${PORT}/test`);
  console.log(`Health check: http://172.18.0.3:${PORT}/health`);
});
