// config.js - Backend configuration with environment variables
require('dotenv').config();

// Helper function to parse IP range and calculate total IPs
const parseReservedPool = () => {
  const reservedPool = process.env.RESERVED_POOL;
  const reservedPoolTotal = parseInt(process.env.RESERVED_POOL_TOTAL) || 0;
  
  if (!reservedPool) {
    console.warn('RESERVED_POOL not configured, using defaults');
    return {
      range: '192.168.1.2 - 192.168.1.100',
      startIP: '192.168.1.2',
      endIP: '192.168.1.100',
      total: 99
    };
  }
  
  // Parse the range format "192.168.1.2 - 192.168.1.100"
  const parts = reservedPool.split(' - ').map(ip => ip.trim());
  
  if (parts.length !== 2) {
    console.error('Invalid RESERVED_POOL format. Expected: "start_ip - end_ip"');
    throw new Error('Invalid RESERVED_POOL configuration');
  }
  
  const [startIP, endIP] = parts;
  
  // Calculate total if not provided in env
  let total = reservedPoolTotal;
  if (!total) {
    total = calculateIPRangeSize(startIP, endIP);
  }
  
  console.log(`Reserved pool configured: ${startIP} - ${endIP} (${total} IPs)`);
  
  return {
    range: reservedPool,
    startIP,
    endIP,
    total
  };
};

// Helper function to calculate IP range size
const calculateIPRangeSize = (startIP, endIP) => {
  const ipToNumber = (ip) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  };
  
  const start = ipToNumber(startIP);
  const end = ipToNumber(endIP);
  
  return Math.max(0, end - start + 1);
};

const config = {
  // Server configuration
  keaServer: process.env.KEA_SERVER || 'http://192.168.1.97:8000',
  proxyPort: parseInt(process.env.PROXY_PORT) || 3001,
  proxyHost: process.env.PROXY_HOST || '0.0.0.0',
  
  // Reserved pool configuration
  reservedPool: parseReservedPool(),
  
  // Environment info
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Validation
  validate() {
    const required = ['KEA_SERVER'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`Missing environment variables: ${missing.join(', ')}`);
      console.warn('Using default values. Create a .env file for production.');
    }
    
    console.log('Configuration loaded:');
    console.log(`- Kea Server: ${this.keaServer}`);
    console.log(`- Proxy: ${this.proxyHost}:${this.proxyPort}`);
    console.log(`- Reserved Pool: ${this.reservedPool.range} (${this.reservedPool.total} IPs)`);
    
    return true;
  }
};

module.exports = config;
