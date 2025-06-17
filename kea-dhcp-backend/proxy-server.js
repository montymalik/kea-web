// proxy-server.js - Updated with Prisma integration
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const config = require('./config');
const staticIPRoutes = require('./static-ip-routes');
const poolConfigRoutes = require('./pool-config-routes');

const app = express();
const prisma = new PrismaClient();

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
    const poolConfig = await prisma.poolConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const poolInfo = poolConfig 
      ? `${poolConfig.startIp} - ${poolConfig.endIp}` 
      : 'Database default';
    
    const poolDescription = poolConfig 
      ? poolConfig.description || 'No description'
      : 'No pool configuration found';
    
    res.json({ 
      status: 'Prisma-powered DHCP Manager running', 
      target: KEA_SERVER,
      timestamp: new Date().toISOString(),
      configuration: {
        poolConfigSource: 'Prisma Database',
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
        database: 'PostgreSQL with Prisma',
        orm: 'Prisma'
      }
    });
  } catch (error) {
    console.error('Database error in health check:', error.message);
    
    // Fallback response if database fails
    res.json({ 
      status: 'Proxy server running (database error)', 
      target: KEA_SERVER,
      timestamp: new Date().toISOString(),
      configuration: {
        poolConfigSource: 'Unavailable (database error)',
        poolRange: 'Unknown',
        poolDescription: 'Database connection failed',
        keaServer: KEA_SERVER
      },
      dockerInfo: {
        hostname: require('os').hostname(),
        platform: require('os').platform()
      },
      features: {
        staticIPManagement: false,
        poolConfiguration: false,
        database: 'PostgreSQL (connection failed)',
        orm: 'Prisma'
      },
      error: 'Database connection failed',
      fallback: true
    });
  }
});

// Updated reserved pool configuration endpoint to use Prisma
app.get('/config/reserved-pool', async (req, res) => {
  console.log('Reserved pool configuration requested - checking Prisma database');
  
  try {
    const poolConfig = await prisma.poolConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (poolConfig) {
      // Calculate total IPs
      const startOctets = poolConfig.startIp.split('.').map(Number);
      const endOctets = poolConfig.endIp.split('.').map(Number);
      const total = (endOctets[3] - startOctets[3]) + 1;
      
      console.log('Pool configuration retrieved from Prisma database:', poolConfig);
      
      res.json({
        success: true,
        reservedPool: {
          range: `${poolConfig.startIp} - ${poolConfig.endIp}`,
          startIP: poolConfig.startIp,
          endIP: poolConfig.endIp,
          total: total,
          description: poolConfig.description,
          source: 'prisma-database',
          lastUpdated: poolConfig.updatedAt,
          created: poolConfig.createdAt
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // No database configuration, use fallback
      console.log('No pool configuration in Prisma database, using fallback');
      res.json({
        success: true,
        reservedPool: {
          range: '192.168.1.2 - 192.168.1.100',
          startIP: '192.168.1.2',
          endIP: '192.168.1.100',
          total: 99,
          description: 'Default fallback configuration',
          source: 'fallback',
          lastUpdated: null,
          created: null
        },
        timestamp: new Date().toISOString(),
        message: 'No database configuration found, using fallback defaults'
      });
    }
  } catch (error) {
    console.error('Prisma database error, using fallback config:', error.message);
    
    // Database error, fall back to defaults
    res.json({
      success: true,
      reservedPool: {
        range: '192.168.1.2 - 192.168.1.100',
        startIP: '192.168.1.2',
        endIP: '192.168.1.100',
        total: 99,
        description: 'Emergency fallback configuration',
        source: 'error-fallback',
        error: 'Database unavailable',
        lastUpdated: null,
        created: null
      },
      timestamp: new Date().toISOString(),
      message: 'Database connection failed, using emergency configuration'
    });
  }
});

// Mount static IP routes under /api
app.use('/api', staticIPRoutes);

// Mount pool configuration routes under /api
app.use('/api', poolConfigRoutes);

// Test endpoint with enhanced information
app.get('/test', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'Connected';
    
    // Get some stats
    const staticIPCount = await prisma.staticIP.count();
    const poolConfigCount = await prisma.poolConfig.count();
    
    res.json({ 
      message: 'Prisma-powered proxy server is working!',
      requestFrom: req.ip,
      headers: req.headers,
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        orm: 'Prisma',
        staticIPs: staticIPCount,
        poolConfigs: poolConfigCount
      },
      configuration: {
        staticIPSupport: true,
        poolConfigSupport: true,
        databaseEnabled: true,
        orm: 'Prisma'
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
  } catch (error) {
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy all /api requests to Kea (except our custom routes)
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
        'GET /test - Test endpoint with database connection info'
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
        'GET /config/reserved-pool - Legacy reserved pool endpoint (Prisma-aware)'
      ]
    },
    features: {
      staticIPManagement: true,
      poolConfiguration: true,
      haStatus: true,
      database: 'PostgreSQL',
      orm: 'Prisma',
      cors: true
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server with enhanced logging
app.listen(PORT, HOST, () => {
  console.log('='.repeat(80));
  console.log(`🚀 Prisma-powered DHCP Manager running on http://${HOST}:${PORT}`);
  console.log(`📡 Accessible from host at: http://172.18.0.3:${PORT}`);
  console.log(`🔄 Proxying Kea requests to: ${KEA_SERVER}`);
  console.log(`💾 Database: PostgreSQL with Prisma ORM`);
  console.log(`📊 Static IP management: Enabled`);
  console.log(`⚙️  Pool configuration: Database-managed`);
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
  console.log('   ✅ Static IP Management (Prisma)');
  console.log('   ✅ Pool Configuration (Prisma)');
  console.log('   ✅ High Availability Status');
  console.log('   ✅ PostgreSQL Database with Prisma ORM');
  console.log('   ✅ CORS Support');
  console.log('   ✅ Docker Integration');
  console.log('');
  console.log('🗄️  Database commands:');
  console.log('   📋 View data: npm run db:studio');
  console.log('   🔄 Reset database: npm run db:reset');
  console.log('   🌱 Seed data: npm run db:seed');
  console.log('='.repeat(80));
});

