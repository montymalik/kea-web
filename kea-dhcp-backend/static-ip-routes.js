// static-ip-routes.js - Express routes for static IP management with PostgreSQL
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kea_dhcp',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  // Connection pool settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize PostgreSQL database
const initDatabase = async () => {
  try {
    console.log('Connecting to PostgreSQL database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully');
    
    // Create the static_ips table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS static_ips (
        id SERIAL PRIMARY KEY,
        ip_address INET NOT NULL UNIQUE,
        mac_address MACADDR,
        hostname VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index on ip_address for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_static_ips_ip_address ON static_ips(ip_address)
    `);
    
    // Create index on mac_address for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_static_ips_mac_address ON static_ips(mac_address)
    `);
    
    console.log('Static IPs table and indexes ready');
    client.release();
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  }
};

// Database query helper with error handling
const queryDatabase = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Validation functions
const validateIPAddress = (ip) => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet);
    return num >= 0 && num <= 255;
  });
};

const validateMacAddress = (mac) => {
  if (!mac) return true; // MAC is optional
  const macRegex = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/;
  return macRegex.test(mac);
};

const validateHostname = (hostname) => {
  if (!hostname) return true; // Hostname is optional
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return hostnameRegex.test(hostname);
};

// Routes

// GET /api/static-ips - Get all static IP assignments
router.get('/static-ips', async (req, res) => {
  console.log('GET /api/static-ips - Fetching all static IPs');
  
  try {
    const result = await queryDatabase(
      'SELECT id, HOST(ip_address) as ip_address, mac_address::text, hostname, description, created_at, updated_at FROM static_ips ORDER BY ip_address'
    );
    
    console.log(`Found ${result.rows.length} static IP assignments`);
    res.json({ success: true, staticIPs: result.rows });
  } catch (error) {
    console.error('Error fetching static IPs:', error.message);
    res.status(500).json({ error: 'Failed to fetch static IPs', details: error.message });
  }
});

// POST /api/static-ips - Add new static IP assignment
router.post('/static-ips', async (req, res) => {
  const { ip_address, mac_address, hostname, description } = req.body;
  
  console.log('POST /api/static-ips - Adding static IP:', req.body);
  
  // Validation
  const errors = [];
  
  if (!ip_address) {
    errors.push('IP address is required');
  } else if (!validateIPAddress(ip_address)) {
    errors.push('Invalid IP address format');
  }
  
  if (mac_address && !validateMacAddress(mac_address)) {
    errors.push('Invalid MAC address format');
  }
  
  if (hostname && !validateHostname(hostname)) {
    errors.push('Invalid hostname format');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  
  try {
    // Insert into database
    const result = await queryDatabase(`
      INSERT INTO static_ips (ip_address, mac_address, hostname, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, HOST(ip_address) as ip_address, mac_address::text, hostname, description, created_at, updated_at
    `, [ip_address, mac_address || null, hostname || null, description || null]);
    
    const newStaticIP = result.rows[0];
    console.log('Static IP added successfully with ID:', newStaticIP.id);
    
    res.status(201).json({ 
      success: true, 
      staticIP: newStaticIP, 
      message: 'Static IP added successfully' 
    });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      console.error('Duplicate IP address:', ip_address);
      res.status(409).json({ 
        error: 'IP address already exists', 
        details: `${ip_address} is already assigned` 
      });
    } else {
      console.error('Error adding static IP:', error.message);
      res.status(500).json({ error: 'Failed to add static IP', details: error.message });
    }
  }
});

// PUT /api/static-ips/:id - Update static IP assignment
router.put('/static-ips/:id', async (req, res) => {
  const { id } = req.params;
  const { ip_address, mac_address, hostname, description } = req.body;
  
  console.log(`PUT /api/static-ips/${id} - Updating static IP:`, req.body);
  
  // Validation
  const errors = [];
  
  if (!ip_address) {
    errors.push('IP address is required');
  } else if (!validateIPAddress(ip_address)) {
    errors.push('Invalid IP address format');
  }
  
  if (mac_address && !validateMacAddress(mac_address)) {
    errors.push('Invalid MAC address format');
  }
  
  if (hostname && !validateHostname(hostname)) {
    errors.push('Invalid hostname format');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  
  try {
    // Update database
    const result = await queryDatabase(`
      UPDATE static_ips 
      SET ip_address = $1, mac_address = $2, hostname = $3, description = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, HOST(ip_address) as ip_address, mac_address::text, hostname, description, created_at, updated_at
    `, [ip_address, mac_address || null, hostname || null, description || null, id]);
    
    if (result.rows.length === 0) {
      console.error('Static IP not found:', id);
      res.status(404).json({ error: 'Static IP not found', details: `No static IP with ID ${id}` });
    } else {
      const updatedStaticIP = result.rows[0];
      console.log('Static IP updated successfully:', id);
      res.json({ 
        success: true, 
        staticIP: updatedStaticIP, 
        message: 'Static IP updated successfully' 
      });
    }
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      console.error('Duplicate IP address:', ip_address);
      res.status(409).json({ 
        error: 'IP address already exists', 
        details: `${ip_address} is already assigned to another record` 
      });
    } else {
      console.error('Error updating static IP:', error.message);
      res.status(500).json({ error: 'Failed to update static IP', details: error.message });
    }
  }
});

// DELETE /api/static-ips/:id - Delete static IP assignment
router.delete('/static-ips/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log(`DELETE /api/static-ips/${id} - Deleting static IP`);
  
  try {
    // Delete and return the deleted record
    const result = await queryDatabase(`
      DELETE FROM static_ips 
      WHERE id = $1 
      RETURNING HOST(ip_address) as ip_address
    `, [id]);
    
    if (result.rows.length === 0) {
      console.error('Static IP not found:', id);
      res.status(404).json({ error: 'Static IP not found', details: `No static IP with ID ${id}` });
    } else {
      const deletedIP = result.rows[0].ip_address;
      console.log('Static IP deleted successfully:', deletedIP);
      res.json({ success: true, message: `Static IP ${deletedIP} deleted successfully` });
    }
  } catch (error) {
    console.error('Error deleting static IP:', error.message);
    res.status(500).json({ error: 'Failed to delete static IP', details: error.message });
  }
});

// GET /api/static-ips/:id - Get specific static IP assignment
router.get('/static-ips/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log(`GET /api/static-ips/${id} - Fetching static IP`);
  
  try {
    const result = await queryDatabase(
      'SELECT id, HOST(ip_address) as ip_address, mac_address::text, hostname, description, created_at, updated_at FROM static_ips WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.error('Static IP not found:', id);
      res.status(404).json({ error: 'Static IP not found', details: `No static IP with ID ${id}` });
    } else {
      const staticIP = result.rows[0];
      console.log('Static IP found:', staticIP.ip_address);
      res.json({ success: true, staticIP: staticIP });
    }
  } catch (error) {
    console.error('Error fetching static IP:', error.message);
    res.status(500).json({ error: 'Failed to fetch static IP', details: error.message });
  }
});

// GET /api/static-ips/check/:ip - Check if IP is already assigned
router.get('/static-ips/check/:ip', async (req, res) => {
  const { ip } = req.params;
  
  console.log(`GET /api/static-ips/check/${ip} - Checking IP availability`);
  
  try {
    const result = await queryDatabase(
      'SELECT id, HOST(ip_address) as ip_address FROM static_ips WHERE ip_address = $1',
      [ip]
    );
    
    const exists = result.rows.length > 0;
    const staticIP = exists ? result.rows[0] : null;
    
    res.json({ 
      success: true, 
      exists: exists,
      staticIP: staticIP
    });
  } catch (error) {
    console.error('Error checking IP:', error.message);
    res.status(500).json({ error: 'Failed to check IP', details: error.message });
  }
});

// GET /api/static-ips/stats - Get statistics about static IP assignments
router.get('/static-ips/stats', async (req, res) => {
  console.log('GET /api/static-ips/stats - Fetching static IP statistics');
  
  try {
    const result = await queryDatabase(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(mac_address) as with_mac_count,
        COUNT(hostname) as with_hostname_count,
        COUNT(description) as with_description_count
      FROM static_ips
    `);
    
    const stats = result.rows[0];
    console.log('Static IP statistics:', stats);
    
    res.json({ 
      success: true, 
      stats: {
        total: parseInt(stats.total_count),
        withMac: parseInt(stats.with_mac_count),
        withHostname: parseInt(stats.with_hostname_count),
        withDescription: parseInt(stats.with_description_count)
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error.message);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
});

// Initialize database when module is loaded
initDatabase().catch(err => {
  console.error('Failed to initialize PostgreSQL database:', err);
  console.error('Please ensure PostgreSQL is running and credentials are correct');
  console.error('Check environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

module.exports = router;
