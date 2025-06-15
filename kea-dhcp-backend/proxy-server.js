// proxy-server.js - Updated with SQLite static IP routes
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const config = require('./config');
const staticIPRoutes = require('./static-ip-routes'); // Import the new routes

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
    },
    features: {
      staticIPManagement: true,
      database: 'PostgreSQL'
    }
  });
});

// Reserved pool configuration endpoint
app.get('/config/reserved-pool', (req, res) => {
  console.log('Reserved pool configuration requested');
  res.json({
    success: true,
    reservedPool: config.reservedPool,
    timestamp: new Date().toISOString()
  });
});

// Mount static IP routes under /api
app.use('/api', staticIPRoutes);

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Docker proxy server is working (no auth)!',
    requestFrom: req.ip,
    headers: req.headers,
    reservedPoolConfig: config.reservedPool,
    staticIPSupport: true
  });
});

// Proxy all /api requests to Kea (except our static IP routes)
app.all('/api/*', async (req, res, next) => {
  // Skip Kea proxy for static IP routes
  if (req.path.startsWith('/api/static-ips')) {
    return next(); // Let static IP routes handle it
  }
  
  try {
    console.log(`Proxying to Kea: ${req.method} ${req.path} from ${req.ip}`);
    
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

// Handle root API requests to Kea
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
    availableRoutes: [
      '/health', 
      '/test', 
      '/api', 
      '/config/reserved-pool',
      '/api/static-ips'
    ]
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Docker CORS Proxy server running on http://${HOST}:${PORT}`);
  console.log(`Accessible from host at: http://172.18.0.3:${PORT}`);
  console.log(`Proxying Kea requests to: ${KEA_SERVER}`);
  console.log(`Static IP management: PostgreSQL database enabled`);
  console.log(`Reserved Pool: ${config.reservedPool.range} (${config.reservedPool.total} IPs)`);
  console.log('Available endpoints:');
  console.log(`  - Health check: http://172.18.0.3:${PORT}/health`);
  console.log(`  - Test endpoint: http://172.18.0.3:${PORT}/test`);
  console.log(`  - Reserved pool config: http://172.18.0.3:${PORT}/config/reserved-pool`);
  console.log(`  - Static IPs API: http://172.18.0.3:${PORT}/api/static-ips`);
});
