// static-ip-routes.js - Fixed version without integer overflow in sorting
const express = require('express');
const { Pool } = require('pg');
const fetch = require('node-fetch');
const config = require('./config');
const router = express.Router();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kea_dhcp',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Get Kea server URL from config
const KEA_SERVER = config.keaServer;

// Helper function to check DHCP reservations
async function checkDHCPReservations(ipAddress) {
  try {
    console.log(`Checking DHCP reservations for IP: ${ipAddress}`);
    
    const response = await fetch(`${KEA_SERVER}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "command": "reservation-get-all",
        "service": ["dhcp4"],
        "arguments": {
          "subnet-id": 1 // You might need to make this dynamic
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data[0] && data[0].result === 0) {
        const reservations = data[0].arguments.hosts || [];
        
        // Check if the IP is already reserved in DHCP
        const conflictingReservation = reservations.find(r => r['ip-address'] === ipAddress);
        
        if (conflictingReservation) {
          return {
            conflict: true,
            reservation: conflictingReservation
          };
        }
      }
    }
    
    return { conflict: false, reservation: null };
  } catch (error) {
    console.warn('Could not check DHCP reservations:', error.message);
    return { conflict: false, reservation: null, error: error.message };
  }
}

// GET /api/static-ips - Get all static IP assignments with fixed sorting
router.get('/static-ips', async (req, res) => {
  try {
    console.log('Fetching all static IP assignments...');
    
    // Use a simpler sorting approach that doesn't cause integer overflow
    const result = await pool.query(`
      SELECT id, ip_address, mac_address, hostname, description, 
             created_at, updated_at 
      FROM static_ips 
      ORDER BY 
        string_to_array(ip_address, '.')::int[] 
    `);
    
    console.log(`Found ${result.rows.length} static IP assignments`);
    
    res.json({
      success: true,
      staticIPs: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching static IP assignments:', error);
    
    // Fallback to simple string sorting if the array sorting fails
    try {
      console.log('Attempting fallback sorting...');
      const fallbackResult = await pool.query(`
        SELECT id, ip_address, mac_address, hostname, description, 
               created_at, updated_at 
        FROM static_ips 
        ORDER BY ip_address
      `);
      
      console.log(`Found ${fallbackResult.rows.length} static IP assignments (fallback sorting)`);
      
      res.json({
        success: true,
        staticIPs: fallbackResult.rows
      });
    } catch (fallbackError) {
      console.error('Fallback sorting also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: fallbackError.message
      });
    }
  }
});

// POST /api/static-ips - Add new static IP with proper validation
router.post('/static-ips', async (req, res) => {
  try {
    const { ip_address, mac_address, hostname, description } = req.body;
    
    console.log('Adding static IP assignment:', { ip_address, mac_address, hostname });
    
    // Validate required fields
    if (!ip_address || !mac_address) {
      return res.status(400).json({
        success: false,
        error: 'ip_address and mac_address are required'
      });
    }
    
    // Check if IP already exists as a static IP
    const existingStaticIP = await pool.query(
      'SELECT * FROM static_ips WHERE ip_address = $1',
      [ip_address]
    );
    
    if (existingStaticIP.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `IP address ${ip_address} is already assigned as a static IP`
      });
    }
    
    // Check if MAC already exists
    const existingMAC = await pool.query(
      'SELECT * FROM static_ips WHERE mac_address = $1',
      [mac_address]
    );
    
    if (existingMAC.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `MAC address ${mac_address} is already assigned to another static IP`
      });
    }
    
    // Check if IP conflicts with DHCP reservations
    const dhcpCheck = await checkDHCPReservations(ip_address);
    
    if (dhcpCheck.conflict) {
      return res.status(409).json({
        success: false,
        error: `IP address ${ip_address} is already reserved in DHCP for MAC ${dhcpCheck.reservation['hw-address']}. Please choose a different IP address.`,
        conflictDetails: {
          type: 'dhcp_reservation',
          existing_mac: dhcpCheck.reservation['hw-address'],
          hostname: dhcpCheck.reservation.hostname || 'Unknown'
        }
      });
    }
    
    // Insert the new static IP assignment
    const result = await pool.query(
      `INSERT INTO static_ips (ip_address, mac_address, hostname, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [ip_address, mac_address, hostname || '', description || '']
    );
    
    console.log('Static IP assignment created successfully:', result.rows[0]);
    
    res.json({
      success: true,
      staticIP: result.rows[0],
      message: 'Static IP assignment created successfully'
    });
    
  } catch (error) {
    console.error('Error adding static IP assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/static-ips/:id - Update static IP with validation
router.put('/static-ips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ip_address, mac_address, hostname, description } = req.body;
    
    console.log(`Updating static IP assignment ID ${id}:`, { ip_address, mac_address, hostname });
    
    // Get current static IP to compare
    const currentResult = await pool.query('SELECT * FROM static_ips WHERE id = $1', [id]);
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Static IP assignment not found'
      });
    }
    
    const currentStaticIP = currentResult.rows[0];
    
    // If IP address is changing, check for conflicts
    if (ip_address && ip_address !== currentStaticIP.ip_address) {
      // Check if new IP already exists as a static IP
      const existingStaticIP = await pool.query(
        'SELECT * FROM static_ips WHERE ip_address = $1 AND id != $2',
        [ip_address, id]
      );
      
      if (existingStaticIP.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: `IP address ${ip_address} is already assigned as a static IP`
        });
      }
      
      // Check against DHCP reservations
      const dhcpCheck = await checkDHCPReservations(ip_address);
      
      if (dhcpCheck.conflict) {
        return res.status(409).json({
          success: false,
          error: `IP address ${ip_address} is already reserved in DHCP for MAC ${dhcpCheck.reservation['hw-address']}. Please choose a different IP address.`,
          conflictDetails: {
            type: 'dhcp_reservation',
            existing_mac: dhcpCheck.reservation['hw-address'],
            hostname: dhcpCheck.reservation.hostname || 'Unknown'
          }
        });
      }
    }
    
    // If MAC address is changing, check for conflicts
    if (mac_address && mac_address !== currentStaticIP.mac_address) {
      const existingMAC = await pool.query(
        'SELECT * FROM static_ips WHERE mac_address = $1 AND id != $2',
        [mac_address, id]
      );
      
      if (existingMAC.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: `MAC address ${mac_address} is already assigned to another static IP`
        });
      }
    }
    
    // Update the static IP assignment
    const result = await pool.query(
      `UPDATE static_ips 
       SET ip_address = COALESCE($1, ip_address),
           mac_address = COALESCE($2, mac_address),
           hostname = COALESCE($3, hostname),
           description = COALESCE($4, description),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [ip_address, mac_address, hostname, description, id]
    );
    
    res.json({
      success: true,
      staticIP: result.rows[0],
      message: 'Static IP assignment updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating static IP assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/static-ips/:id - Get specific static IP assignment
router.get('/static-ips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM static_ips WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Static IP assignment not found'
      });
    }
    
    res.json({
      success: true,
      staticIP: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching static IP assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/static-ips/:id - Delete static IP assignment
router.delete('/static-ips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Deleting static IP assignment ID: ${id}`);
    
    const result = await pool.query(
      'DELETE FROM static_ips WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Static IP assignment not found'
      });
    }
    
    console.log('Static IP assignment deleted:', result.rows[0]);
    
    res.json({
      success: true,
      message: 'Static IP assignment deleted successfully',
      deletedStaticIP: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting static IP assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/static-ips/check/:ip - Check if IP is assigned
router.get('/static-ips/check/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    console.log(`Checking if IP ${ip} is assigned as static IP`);
    
    const result = await pool.query(
      'SELECT * FROM static_ips WHERE ip_address = $1',
      [ip]
    );
    
    res.json({
      success: true,
      exists: result.rows.length > 0,
      staticIP: result.rows.length > 0 ? result.rows[0] : null
    });
    
  } catch (error) {
    console.error('Error checking static IP:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/static-ips/reset - Reset/clear all static IP assignments
router.delete('/static-ips/reset', async (req, res) => {
  try {
    console.log('Resetting static IP database...');
    
    // Get count before deletion
    const countResult = await pool.query('SELECT COUNT(*) FROM static_ips');
    const deletedCount = parseInt(countResult.rows[0].count);
    
    // Delete all records
    await pool.query('DELETE FROM static_ips');
    
    // Reset sequence if you have auto-increment ID
    await pool.query('ALTER SEQUENCE static_ips_id_seq RESTART WITH 1');
    
    console.log(`Deleted ${deletedCount} static IP assignment(s)`);
    
    res.json({
      success: true,
      message: 'Static IP database reset successfully',
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('Error resetting static IP database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/static-ips/stats - Get static IP statistics
router.get('/static-ips/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_static_ips,
        COUNT(CASE WHEN hostname IS NOT NULL AND hostname != '' THEN 1 END) as with_hostname,
        COUNT(CASE WHEN description IS NOT NULL AND description != '' THEN 1 END) as with_description
      FROM static_ips
    `);
    
    res.json({
      success: true,
      stats: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error getting static IP stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
