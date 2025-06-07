const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connections - separate pools for leases and hosts
const leasesPool = new Pool({
  user: process.env.DB_USER || 'your_username',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.LEASES_DB_NAME || 'kea_leases',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

const hostsPool = new Pool({
  user: process.env.DB_USER || 'your_username',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.HOSTS_DB_NAME || 'kea_hosts',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Test database connections
leasesPool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to kea_leases database:', err);
  } else {
    console.log('Connected to kea_leases database');
    release();
  }
});

hostsPool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to kea_hosts database:', err);
  } else {
    console.log('Connected to kea_hosts database');
    release();
  }
});

// Routes

// Get all active leases
app.get('/api/leases', async (req, res) => {
  try {
    const query = `
      SELECT 
        'Dynamic' as type,
        (address >> 24 & 255) || '.' ||
        (address >> 16 & 255) || '.' ||
        (address >> 8 & 255) || '.' ||
        (address & 255) as ip_address,
        rtrim(regexp_replace(encode(hwaddr, 'hex'), '(.{2})', '\\1:', 'g'), ':') as mac_address,
        hostname,
        expire as expires_at,
        valid_lifetime,
        subnet_id,
        fqdn_fwd,
        fqdn_rev,
        state,
        EXTRACT(EPOCH FROM (expire - NOW())) as seconds_remaining,
        CASE 
            WHEN expire > now() THEN 'Active'
            ELSE 'Expired'
        END as status
      FROM lease4
      WHERE expire > now() AND state = 0
      ORDER BY subnet_id, address
    `;
    
    const result = await leasesPool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leases:', err);
    res.status(500).json({ error: 'Failed to fetch leases' });
  }
});

// Get leases by subnet ID (both active and expired)
app.get('/api/leases/subnet/:subnetId', async (req, res) => {
  const { subnetId } = req.params;
  
  try {
    const query = `
      SELECT 
        (address >> 24 & 255) || '.' ||
        (address >> 16 & 255) || '.' ||
        (address >> 8 & 255) || '.' ||
        (address & 255) as ip_address,
        rtrim(regexp_replace(encode(hwaddr, 'hex'), '(.{2})', '\\1:', 'g'), ':') as mac_address,
        hostname,
        expire as expires_at,
        valid_lifetime,
        CASE 
            WHEN expire > now() THEN 'Active'
            ELSE 'Expired'
        END as status,
        state,
        subnet_id
      FROM lease4
      WHERE subnet_id = $1
      ORDER BY address
    `;
    
    const result = await leasesPool.query(query, [subnetId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leases by subnet:', err);
    res.status(500).json({ error: 'Failed to fetch leases by subnet' });
  }
});

// Get only active leases by subnet ID
app.get('/api/leases/subnet/:subnetId/active', async (req, res) => {
  const { subnetId } = req.params;
  
  try {
    const query = `
      SELECT 
        'Dynamic' as type,
        (address >> 24 & 255) || '.' ||
        (address >> 16 & 255) || '.' ||
        (address >> 8 & 255) || '.' ||
        (address & 255) as ip_address,
        rtrim(regexp_replace(encode(hwaddr, 'hex'), '(.{2})', '\\1:', 'g'), ':') as mac_address,
        hostname
      FROM lease4
      WHERE subnet_id = $1
        AND expire > now()
        AND state = 0
      ORDER BY address
    `;
    
    const result = await leasesPool.query(query, [subnetId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching active leases by subnet:', err);
    res.status(500).json({ error: 'Failed to fetch active leases by subnet' });
  }
});

// Get reservations by subnet ID
app.get('/api/reservations/subnet/:subnetId', async (req, res) => {
  const { subnetId } = req.params;
  
  try {
    // Use your exact query pattern
    const query = `
      SELECT 
        host_id,
        mac_address,
        hostname,
        ip_address,
        dhcp4_subnet_id as subnet_id
      FROM host_reservations 
      WHERE dhcp4_subnet_id = $1 
      ORDER BY hostname
    `;
    
    const result = await hostsPool.query(query, [subnetId]);
    console.log(`Found ${result.rows.length} reservations for subnet ${subnetId}`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reservations by subnet:', err);
    res.status(500).json({ error: 'Failed to fetch reservations by subnet', details: err.message });
  }
});

// Get all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    // Use the exact column names from your host_reservations view
    const query = `
      SELECT 
        host_id,
        mac_address,
        hostname,
        ip_address,
        dhcp4_subnet_id as subnet_id
      FROM host_reservations
      ORDER BY dhcp4_subnet_id, ip_address
    `;
    
    const result = await hostsPool.query(query);
    console.log(`Found ${result.rows.length} reservations`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reservations:', err);
    
    // Fallback to direct hosts table query if view doesn't work
    try {
      console.log('Trying fallback query on hosts table...');
      const fallbackQuery = `
        SELECT 
          host_id,
          rtrim(regexp_replace(encode(dhcp_identifier, 'hex'), '(.{2})', '\\1:', 'g'), ':') as mac_address,
          hostname,
          (ipv4_address >> 24 & 255) || '.' ||
          (ipv4_address >> 16 & 255) || '.' ||
          (ipv4_address >> 8 & 255) || '.' ||
          (ipv4_address & 255) as ip_address,
          dhcp4_subnet_id as subnet_id
        FROM hosts
        ORDER BY dhcp4_subnet_id, ipv4_address
      `;
      
      const fallbackResult = await hostsPool.query(fallbackQuery);
      console.log(`Fallback found ${fallbackResult.rows.length} reservations`);
      res.json(fallbackResult.rows);
    } catch (fallbackErr) {
      console.error('Fallback query also failed:', fallbackErr);
      res.status(500).json({ error: 'Failed to fetch reservations', details: err.message });
    }
  }
});

// Delete a lease
app.delete('/api/leases/:ipAddress', async (req, res) => {
  const { ipAddress } = req.params;
  
  try {
    // Convert IP address string to integer format for the query
    const query = `
      UPDATE lease4 
      SET state = 2 
      WHERE (address >> 24 & 255) || '.' ||
            (address >> 16 & 255) || '.' ||
            (address >> 8 & 255) || '.' ||
            (address & 255) = $1
    `;
    
    const result = await leasesPool.query(query, [ipAddress]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }
    
    res.json({ message: 'Lease deleted successfully' });
  } catch (err) {
    console.error('Error deleting lease:', err);
    res.status(500).json({ error: 'Failed to delete lease' });
  }
});

// Add a reservation
app.post('/api/reservations', async (req, res) => {
  const { 
    dhcp_identifier, 
    dhcp_identifier_type = 0, // 0 for MAC address
    subnet_id, 
    ipv4_address, 
    hostname 
  } = req.body;
  
  if (!dhcp_identifier || !subnet_id || !ipv4_address) {
    return res.status(400).json({ 
      error: 'Missing required fields: dhcp_identifier, subnet_id, ipv4_address' 
    });
  }
  
  try {
    // Use the helper functions you created for proper data conversion
    const query = `
      INSERT INTO hosts (
        dhcp_identifier, 
        dhcp_identifier_type, 
        dhcp4_subnet_id, 
        ipv4_address, 
        hostname
      ) VALUES (
        mac_to_bytea($1),
        $2,
        $3,
        ip_to_int($4),
        $5
      )
      RETURNING host_id
    `;
    
    const result = await hostsPool.query(query, [
      dhcp_identifier, // MAC address as string (e.g., 'aa:bb:cc:dd:ee:ff')
      dhcp_identifier_type,
      subnet_id,
      ipv4_address, // IP address as string (e.g., '192.168.1.50')
      hostname
    ]);
    
    res.json({ 
      message: 'Reservation added successfully', 
      host_id: result.rows[0].host_id 
    });
    
  } catch (err) {
    console.error('Error adding reservation:', err);
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Reservation already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add reservation' });
    }
  }
});

// Delete a reservation
app.delete('/api/reservations/:hostId', async (req, res) => {
  const { hostId } = req.params;
  
  try {
    // Delete options first (foreign key constraint)
    await hostsPool.query('DELETE FROM dhcp4_options WHERE host_id = $1', [hostId]);
    
    // Delete the host reservation
    const result = await hostsPool.query('DELETE FROM hosts WHERE host_id = $1', [hostId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    res.json({ message: 'Reservation deleted successfully' });
  } catch (err) {
    console.error('Error deleting reservation:', err);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

// Get subnet information
app.get('/api/subnets', async (req, res) => {
  try {
    // Try to get subnets from both databases and combine results
    let subnets = [];
    
    // First try the leases database
    try {
      const leasesQuery = `
        SELECT 
          subnet_id,
          subnet_prefix,
          client_class,
          interface,
          modification_ts
        FROM dhcp4_subnet
        ORDER BY subnet_id
      `;
      const leasesResult = await leasesPool.query(leasesQuery);
      subnets = [...subnets, ...leasesResult.rows];
    } catch (err) {
      console.log('No subnet table found in kea_leases database');
    }
    
    // Then try the hosts database if we didn't find any subnets
    if (subnets.length === 0) {
      try {
        const hostsQuery = `
          SELECT 
            subnet_id,
            subnet_prefix,
            client_class,
            interface,
            modification_ts
          FROM dhcp4_subnet
          ORDER BY subnet_id
        `;
        const hostsResult = await hostsPool.query(hostsQuery);
        subnets = [...subnets, ...hostsResult.rows];
      } catch (err) {
        console.log('No subnet table found in kea_hosts database');
      }
    }
    
    // If no subnet table found, generate subnet list from existing data
    if (subnets.length === 0) {
      const leasesSubnets = await leasesPool.query('SELECT DISTINCT subnet_id FROM lease4 ORDER BY subnet_id');
      const hostsSubnets = await hostsPool.query('SELECT DISTINCT dhcp4_subnet_id as subnet_id FROM hosts ORDER BY subnet_id');
      
      const allSubnetIds = new Set([
        ...leasesSubnets.rows.map(row => row.subnet_id),
        ...hostsSubnets.rows.map(row => row.subnet_id)
      ]);
      
      subnets = Array.from(allSubnetIds).map(id => ({
        subnet_id: id,
        subnet_prefix: `Subnet ${id}`,
        client_class: null,
        interface: null,
        modification_ts: null
      }));
    }
    
    res.json(subnets);
  } catch (err) {
    console.error('Error fetching subnets:', err);
    res.status(500).json({ error: 'Failed to fetch subnets' });
  }
});

// Debug endpoint to check hosts database
app.get('/api/debug/hosts', async (req, res) => {
  try {
    // Check if we can connect and count hosts
    const countResult = await hostsPool.query('SELECT COUNT(*) as count FROM hosts');
    
    // Get a few sample records
    const sampleResult = await hostsPool.query('SELECT * FROM hosts LIMIT 3');
    
    // Check if view exists
    let viewExists = false;
    try {
      await hostsPool.query('SELECT 1 FROM host_reservations LIMIT 1');
      viewExists = true;
    } catch (e) {
      viewExists = false;
    }
    
    res.json({
      hostsCount: countResult.rows[0].count,
      sampleHosts: sampleResult.rows,
      viewExists: viewExists,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Debug hosts error:', err);
    res.status(500).json({ error: 'Debug failed', details: err.message });
  }
});

// Get next available IP for subnet 1
app.get('/api/available-ips/subnet/:subnetId', async (req, res) => {
  const { subnetId } = req.params;
  
  try {
    const query = `
      SELECT unreserved_ips 
      FROM (
          SELECT '192.168.1.' || generate_series(1,100) as unreserved_ips 
          EXCEPT 
          SELECT (ipv4_address >> 24 & 255) || '.' ||
                 (ipv4_address >> 16 & 255) || '.' ||
                 (ipv4_address >> 8 & 255) || '.' ||
                 (ipv4_address & 255)
          FROM hosts 
          WHERE dhcp4_subnet_id = $1
      ) t
      ORDER BY inet(unreserved_ips)
      LIMIT 1
    `;
    
    const result = await hostsPool.query(query, [subnetId]);
    
    if (result.rows.length > 0) {
      res.json({ nextAvailableIP: result.rows[0].unreserved_ips });
    } else {
      res.status(404).json({ error: 'No available IPs found' });
    }
  } catch (err) {
    console.error('Error fetching next available IP:', err);
    res.status(500).json({ error: 'Failed to fetch next available IP', details: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kea DHCP Management API running on port ${PORT}`);
});
