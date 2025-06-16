// pool-config-routes.js - Updated with corrected validation logic
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kea_dhcp',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// GET /api/pool-config - Get current pool configuration
router.get('/pool-config', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pool_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      res.json({
        success: true,
        poolConfig: result.rows[0]
      });
    } else {
      // No configuration exists, return default
      res.json({
        success: true,
        poolConfig: {
          id: null,
          name: 'default',
          start_ip: '192.168.1.2',
          end_ip: '192.168.1.100',
          description: 'Default pool configuration',
          is_active: true,
          total: 99
        }
      });
    }
  } catch (error) {
    console.error('Error fetching pool configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/pool-config - Create or update pool configuration
router.post('/pool-config', async (req, res) => {
  try {
    const { start_ip, end_ip, description, name = 'default' } = req.body;
    
    console.log('Setting pool configuration:', { start_ip, end_ip, description });
    
    // Validate IP addresses
    if (!start_ip || !end_ip) {
      return res.status(400).json({
        success: false,
        error: 'start_ip and end_ip are required'
      });
    }
    
    // Calculate total IPs in range
    const startOctets = start_ip.split('.').map(Number);
    const endOctets = end_ip.split('.').map(Number);
    
    if (startOctets.length !== 4 || endOctets.length !== 4) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IP address format'
      });
    }
    
    // Calculate total (assuming same subnet)
    const total = (endOctets[3] - startOctets[3]) + 1;
    
    if (total <= 0) {
      return res.status(400).json({
        success: false,
        error: 'End IP must be greater than start IP'
      });
    }
    
    // First, try to update existing active configuration
    const updateResult = await pool.query(
      `UPDATE pool_config 
       SET start_ip = $1, end_ip = $2, description = $3, total = $4, name = $5, updated_at = NOW()
       WHERE is_active = true
       RETURNING *`,
      [start_ip, end_ip, description, total, name]
    );
    
    let poolConfig;
    
    if (updateResult.rows.length > 0) {
      // Successfully updated existing config
      poolConfig = updateResult.rows[0];
      console.log('Updated existing pool configuration:', poolConfig);
    } else {
      // No active config exists, create new one
      const insertResult = await pool.query(
        `INSERT INTO pool_config (name, start_ip, end_ip, description, total, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         RETURNING *`,
        [name, start_ip, end_ip, description, total]
      );
      poolConfig = insertResult.rows[0];
      console.log('Created new pool configuration:', poolConfig);
    }
    
    res.json({
      success: true,
      poolConfig: poolConfig
    });
    
  } catch (error) {
    console.error('Database query error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/pool-config/:id - Update specific pool configuration
router.put('/pool-config/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_ip, end_ip, description, name } = req.body;
    
    console.log(`Updating pool configuration ID ${id}:`, { start_ip, end_ip, description });
    
    // Calculate total IPs in range
    const startOctets = start_ip.split('.').map(Number);
    const endOctets = end_ip.split('.').map(Number);
    const total = (endOctets[3] - startOctets[3]) + 1;
    
    const result = await pool.query(
      `UPDATE pool_config 
       SET start_ip = $1, end_ip = $2, description = $3, total = $4, name = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [start_ip, end_ip, description, total, name, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pool configuration not found'
      });
    }
    
    res.json({
      success: true,
      poolConfig: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating pool configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/pool-config/reset - Reset/clear all pool configurations
router.delete('/pool-config/reset', async (req, res) => {
  try {
    console.log('Resetting pool configuration...');
    
    // Get count before deletion
    const countResult = await pool.query('SELECT COUNT(*) FROM pool_config WHERE is_active = true');
    const deletedCount = parseInt(countResult.rows[0].count);
    
    // Delete all active configurations
    await pool.query('DELETE FROM pool_config WHERE is_active = true');
    
    console.log(`Deleted ${deletedCount} pool configuration(s)`);
    
    res.json({
      success: true,
      message: 'Pool configuration reset successfully',
      deletedCount: deletedCount
    });
    
  } catch (error) {
    console.error('Error resetting pool configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/pool-config/validate - Validate pool configuration (CORRECTED - NO reservation check)
router.get('/pool-config/validate', async (req, res) => {
  try {
    const { start_ip, end_ip } = req.query;
    
    if (!start_ip || !end_ip) {
      return res.status(400).json({
        success: false,
        error: 'start_ip and end_ip parameters are required'
      });
    }
    
    console.log('Validating pool configuration:', { start_ip, end_ip });
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(start_ip) || !ipRegex.test(end_ip)) {
      return res.json({
        success: true,
        valid: false,
        message: 'Invalid IP address format',
        poolSize: 0,
        conflicts: []
      });
    }
    
    // Calculate pool size
    const startOctets = start_ip.split('.').map(Number);
    const endOctets = end_ip.split('.').map(Number);
    const poolSize = (endOctets[3] - startOctets[3]) + 1;
    
    if (poolSize <= 0) {
      return res.json({
        success: true,
        valid: false,
        message: 'End IP must be greater than start IP',
        poolSize: 0,
        conflicts: []
      });
    }
    
    // ✅ CORRECTED: Pool range validation passes - no need to check against reservations
    // Reservations can coexist within the static IP pool range
    res.json({
      success: true,
      valid: true,
      message: 'Pool configuration is valid',
      poolSize: poolSize,
      conflicts: [], // No conflicts for pool range
      note: 'Pool range can contain existing DHCP reservations'
    });
    
  } catch (error) {
    console.error('Error validating pool configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
