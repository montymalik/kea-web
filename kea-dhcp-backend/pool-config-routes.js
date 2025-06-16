// pool-config-routes.js - Updated with Prisma ORM
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();

// Initialize Prisma client
const prisma = new PrismaClient();

// GET /api/pool-config - Get current pool configuration
router.get('/pool-config', async (req, res) => {
  try {
    const poolConfig = await prisma.poolConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    if (poolConfig) {
      // Convert to frontend format
      const formattedPoolConfig = {
        id: poolConfig.id,
        name: poolConfig.name,
        start_ip: poolConfig.startIp,
        end_ip: poolConfig.endIp,
        total: poolConfig.total,
        description: poolConfig.description,
        is_active: poolConfig.isActive,
        created_at: poolConfig.createdAt,
        updated_at: poolConfig.updatedAt
      };
      
      res.json({
        success: true,
        poolConfig: formattedPoolConfig
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
    const existingConfig = await prisma.poolConfig.findFirst({
      where: { isActive: true }
    });
    
    let poolConfig;
    
    if (existingConfig) {
      // Update existing config
      poolConfig = await prisma.poolConfig.update({
        where: { id: existingConfig.id },
        data: {
          startIp: start_ip,
          endIp: end_ip,
          description: description,
          total: total,
          name: name
        }
      });
      console.log('Updated existing pool configuration:', poolConfig);
    } else {
      // Create new config
      poolConfig = await prisma.poolConfig.create({
        data: {
          name: name,
          startIp: start_ip,
          endIp: end_ip,
          description: description,
          total: total,
          isActive: true
        }
      });
      console.log('Created new pool configuration:', poolConfig);
    }
    
    // Convert to frontend format
    const formattedPoolConfig = {
      id: poolConfig.id,
      name: poolConfig.name,
      start_ip: poolConfig.startIp,
      end_ip: poolConfig.endIp,
      total: poolConfig.total,
      description: poolConfig.description,
      is_active: poolConfig.isActive,
      created_at: poolConfig.createdAt,
      updated_at: poolConfig.updatedAt
    };
    
    res.json({
      success: true,
      poolConfig: formattedPoolConfig
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
    
    const poolConfig = await prisma.poolConfig.update({
      where: { id: parseInt(id) },
      data: {
        startIp: start_ip,
        endIp: end_ip,
        description: description,
        total: total,
        name: name
      }
    });
    
    // Convert to frontend format
    const formattedPoolConfig = {
      id: poolConfig.id,
      name: poolConfig.name,
      start_ip: poolConfig.startIp,
      end_ip: poolConfig.endIp,
      total: poolConfig.total,
      description: poolConfig.description,
      is_active: poolConfig.isActive,
      created_at: poolConfig.createdAt,
      updated_at: poolConfig.updatedAt
    };
    
    res.json({
      success: true,
      poolConfig: formattedPoolConfig
    });
    
  } catch (error) {
    if (error.code === 'P2025') { // Prisma "Record not found" error
      return res.status(404).json({
        success: false,
        error: 'Pool configuration not found'
      });
    }
    
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
    const deletedCount = await prisma.poolConfig.count({
      where: { isActive: true }
    });
    
    // Delete all active configurations
    await prisma.poolConfig.deleteMany({
      where: { isActive: true }
    });
    
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

// GET /api/pool-config/validate - Validate pool configuration
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
    
    // Pool range validation passes - no need to check against reservations
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

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = router;
