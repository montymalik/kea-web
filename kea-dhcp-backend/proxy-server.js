// proxy-server.js - Updated with environment configuration
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const config = require('./config'); // Import configuration

const app = express();

// Validate configuration on startup
config.validate();

// Use configuration values
const PORT = config.proxyPort;
const HOST = config.proxyHost;
const KEA_SERVER = config.keaServer;

// Enable CORS for all origins (since we're in Docker)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint with configuration info
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Docker Proxy server running (no auth)', 
    target: KEA_SERVER,
    timestamp: new Date().toISOString(),
    configuration: {
      reservedPool: config.reservedPool,
      keaServer: KEA_SERVER
    },
    dockerInfo: {
      hostname: require('os').hostname(),
      platform: require('os').platform()
    }
  });
});

// New endpoint to get reserved pool configuration
app.get('/config/reserved-pool', (req, res) => {
  console.log('Reserved pool configuration requested');
  res.json({
    success: true,
    reservedPool: config.reservedPool,
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Docker proxy server is working (no auth)!',
    requestFrom: req.ip,
    headers: req.headers,
    reservedPoolConfig: config.reservedPool
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
      }
    };
    
    if (req.method !== 'GET' && req.body) {
      options.body = JSON.stringify(req.body);
    }
    
    console.log('Sending to Kea:', keaUrl);
    
    const response = await fetch(keaUrl, options);
    const data = await response.text();
    
    console.log('Kea response status:', response.status);
    
    res.status(response.status);
    
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

// Handle root API requests
app.all('/api', async (req, res) => {
  try {
    console.log(`Proxying root: ${req.method} /api from ${req.ip}`);
    
    const keaUrl = KEA_SERVER + '/';
    
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (req.method !== 'GET' && req.body) {
      options.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(keaUrl, options);
    const data = await response.text();
    
    res.status(response.status);
    
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

// Catch-all route
app.all('*', (req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableRoutes: ['/health', '/test', '/api', '/config/reserved-pool']
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Docker CORS Proxy server running on http://${HOST}:${PORT}`);
  console.log(`Accessible from host at: http://172.18.0.3:${PORT}`);
  console.log(`Proxying requests to: ${KEA_SERVER}`);
  console.log(`Reserved Pool: ${config.reservedPool.range} (${config.reservedPool.total} IPs)`);
  console.log(`Test the proxy: http://172.18.0.3:${PORT}/test`);
  console.log(`Health check: http://172.18.0.3:${PORT}/health`);
  console.log(`Reserved pool config: http://172.18.0.3:${PORT}/config/reserved-pool`);
});
