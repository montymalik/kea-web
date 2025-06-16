// proxy-server.js - Updated with pool configuration routes and database-aware health checks
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const config = require('./config');
const staticIPRoutes = require('./static-ip-routes'); // Import the static IP routes
const poolConfigRoutes = require('./pool-config-routes'); // Import the new pool config routes

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

// Health check endpoint with pool configuration info
app.get('/health', async (req, res) => {
  try {
    // Try to get pool configuration from database
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'kea_dhcp',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT HOST(start_ip) as start_ip, HOST(end_ip) as end_ip, description FROM pool_config WHERE is_active = true LIMIT 1'
    );
    client.release();
    pool.end();
    
    const poolInfo = result.rows.length > 0 
      ? `${result.rows[0].start_ip} - ${result.rows[0].end_ip}` 
      : 'Database default';
    
    const poolDescription = result.rows.length > 0 
      ? result.rows[0].description || 'No description'
      : 'No pool configuration found';
    
    res.json({ 
      status: 'Docker Proxy server running (no auth)', 
      target: KEA_SERVER,
      timestamp: new Date().toISOString(),
      configuration: {
        poolConfigSource: 'Database',
        poolRange: poolInfo,
        poolDescription: poolDescription,
        keaServer: KEA_SERVER
      },
      dockerInfo: {
        hostname: require('os').hostname(),
        platform: require('os').platform()
      },
      features: {
        staticIPManagement: true,
        poolConfiguration: true,
        database: 'PostgreSQL'
      }
    });
  } catch (error) {
    console.error('Database error in health check:', error.message);
    
    // Fallback to old behavior if database fails
    res.json({ 
      status: 'Docker Proxy server running (no auth)', 
      target: KEA_SERVER,
      timestamp: new Date().toISOString(),
      configuration: {
        poolConfigSource: 'Environment (fallback)',
        poolRange: config.reservedPool?.range || 'Unknown',
        poolDescription: 'Fallback to environment configuration',
        keaServer: KEA_SERVER
      },
      dockerInfo: {
        hostname: require('os').hostname(),
        platform: require('os').platform()
      },
      features: {
        staticIPManagement: true,
        poolConfiguration: false,
        database: 'PostgreSQL (connection failed)'
      },
      error: 'Pool configuration database not available',
      fallback: true
    });
  }
});

// Updated reserved pool configuration endpoint to use database
app.get('/config/reserved-pool', async (req, res) => {
  console.log('Reserved pool configuration requested - checking database first');
  
  try {
    // Try to get from database first
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'kea_dhcp',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT HOST(start_ip) as start_ip, HOST(end_ip) as end_ip, description, created_at, updated_at FROM pool_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
    );
    client.release();
    pool.end();
    
    if (result.rows.length > 0) {
      const poolData = result.rows[0];
      const startNum = poolData.start_ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
      const endNum = poolData.end_ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
      const total = Math.max(0, endNum - startNum + 1);
      
      console.log('Pool configuration retrieved from database:', poolData);
      
      res.json({
        success: true,
        reservedPool: {
          range: `${poolData.start_ip} - ${poolData.end_ip}`,
          startIP: poolData.start_ip,
          endIP: poolData.end_ip,
          total: total,
          description: poolData.description,
          source: 'database',
          lastUpdated: poolData.updated_at,
          created: poolData.created_at
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // No database configuration, fall back to environment
      console.log('No pool configuration in database, using environment fallback');
      res.json({
        success: true,
        reservedPool: {
          ...config.reservedPool,
          source: 'environment-fallback',
          lastUpdated: null,
          created: null
        },
        timestamp: new Date().toISOString(),
        message: 'No database configuration found, using environment defaults'
      });
    }
  } catch (error) {
    console.error('Database error, falling back to environment config:', error.message);
    
    // Database error, fall back to environment
    res.json({
      success: true,
      reservedPool: {
        ...config.reservedPool,
        source: 'environment-fallback',
        error: 'Database unavailable',
        lastUpdated: null,
        created: null
      },
      timestamp: new Date().toISOString(),
      message: 'Database connection failed, using environment configuration'
    });
  }
});

// Mount static IP routes under /api
app.use('/api', staticIPRoutes);

// Mount pool configuration routes under /api
app.use('/api', poolConfigRoutes);

// Test endpoint with enhanced information
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Docker proxy server is working (no auth)!',
    requestFrom: req.ip,
    headers: req.headers,
    timestamp: new Date().toISOString(),
    configuration: {
      reservedPoolConfig: config.reservedPool,
      staticIPSupport: true,
      poolConfigSupport: true,
      databaseEnabled: true
    },
    availableEndpoints: {
      health: '/health',
      test: '/test',
      keaAPI: '/api/*',
      staticIPs: '/api/static-ips',
      poolConfig: '/api/pool-config',
      reservedPoolLegacy: '/config/reserved-pool'
    }
  });
});

// Proxy all /api requests to Kea (except our static IP and pool config routes)
app.all('/api/*', async (req, res, next) => {
  // Skip Kea proxy for our custom routes
  if (req.path.startsWith('/api/static-ips') || req.path.startsWith('/api/pool-config')) {
    return next(); // Let our custom routes handle it
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
      target: KEA_SERVER,
      timestamp: new Date().toISOString()
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
      target: KEA_SERVER,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced catch-all route with comprehensive endpoint listing
app.all('*', (req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
    availableRoutes: {
      system: [
        'GET /health - System health check with database status',
        'GET /test - Test endpoint with configuration info'
      ],
      kea: [
        'POST /api - Kea DHCP API proxy (all commands)',
        'GET,POST,PUT,DELETE /api/* - Kea DHCP API proxy'
      ],
      staticIPs: [
        'GET /api/static-ips - List all static IP assignments',
        'POST /api/static-ips - Create new static IP assignment',
        'GET /api/static-ips/:id - Get specific static IP',
        'PUT /api/static-ips/:id - Update static IP assignment',
        'DELETE /api/static-ips/:id - Delete static IP assignment',
        'GET /api/static-ips/check/:ip - Check if IP is assigned',
        'GET /api/static-ips/stats - Get static IP statistics'
      ],
      poolConfiguration: [
        'GET /api/pool-config - Get current pool configuration',
        'POST /api/pool-config - Update pool configuration',
        'PUT /api/pool-config/:id - Update specific pool configuration',
        'GET /api/pool-config/validate - Validate pool range'
      ],
      legacy: [
        'GET /config/reserved-pool - Legacy reserved pool endpoint (database-aware)'
      ]
    },
    features: {
      staticIPManagement: true,
      poolConfiguration: true,
      haStatus: true,
      database: 'PostgreSQL',
      cors: true
    }
  });
});

// Start server with enhanced logging
app.listen(PORT, HOST, () => {
  console.log('='.repeat(80));
  console.log(`🚀 Docker CORS Proxy server running on http://${HOST}:${PORT}`);
  console.log(`📡 Accessible from host at: http://172.18.0.3:${PORT}`);
  console.log(`🔄 Proxying Kea requests to: ${KEA_SERVER}`);
  console.log(`💾 Static IP management: PostgreSQL database enabled`);
  console.log(`⚙️  Pool configuration: Database-managed (with environment fallback)`);
  console.log(`🏊 Reserved Pool: ${config.reservedPool.range} (${config.reservedPool.total} IPs) [fallback]`);
  console.log('');
  console.log('📍 Available endpoints:');
  console.log(`   🏥 Health check: http://172.18.0.3:${PORT}/health`);
  console.log(`   🧪 Test endpoint: http://172.18.0.3:${PORT}/test`);
  console.log(`   🏊 Reserved pool config: http://172.18.0.3:${PORT}/config/reserved-pool`);
  console.log(`   📊 Static IPs API: http://172.18.0.3:${PORT}/api/static-ips`);
  console.log(`   ⚙️  Pool configuration API: http://172.18.0.3:${PORT}/api/pool-config`);
  console.log(`   🌐 Kea DHCP API: http://172.18.0.3:${PORT}/api`);
  console.log('');
  console.log('🔧 Features enabled:');
  console.log('   ✅ Static IP Management');
  console.log('   ✅ Pool Configuration');
  console.log('   ✅ High Availability Status');
  console.log('   ✅ PostgreSQL Database');
  console.log('   ✅ CORS Support');
  console.log('   ✅ Docker Integration');
  console.log('='.repeat(80));
});
