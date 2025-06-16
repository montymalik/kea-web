// static-ip-routes.js - Updated with Prisma ORM
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const config = require('./config');
const router = express.Router();

// Initialize Prisma client
const prisma = new PrismaClient();

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

// GET /api/static-ips - Get all static IP assignments
router.get('/static-ips', async (req, res) => {
  try {
    console.log('Fetching all static IP assignments...');
    
    const staticIPs = await prisma.staticIP.findMany({
      orderBy: [
        {
          ipAddress: 'asc'
        }
      ]
    });
    
    console.log(`Found ${staticIPs.length} static IP assignments`);
    
    // Convert Prisma camelCase to snake_case for frontend compatibility
    const formattedStaticIPs = staticIPs.map(ip => ({
      id: ip.id,
      ip_address: ip.ipAddress,
      mac_address: ip.macAddress,
      hostname: ip.hostname,
      description: ip.description,
      created_at: ip.createdAt,
      updated_at: ip.updatedAt
    }));
    
    res.json({
      success: true,
      staticIPs: formattedStaticIPs
    });
    
  } catch (error) {
    console.error('Error fetching static IP assignments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/static-ips - Add new static IP with enhanced error handling
router.post('/static-ips', async (req, res) => {
  try {
    const { ip_address, mac_address, hostname, description } = req.body;
    
    console.log('Adding static IP assignment:', { ip_address, mac_address, hostname });
    
    // Validate required fields
    if (!ip_address) {
      return res.status(400).json({
        success: false,
        error: 'ip_address is required'
      });
    }
    
    // Check if IP already exists as a static IP
    const existingStaticIP = await prisma.staticIP.findUnique({
      where: { ipAddress: ip_address }
    });
    
    if (existingStaticIP) {
      return res.status(409).json({
        success: false,
        error: `This IP address is already assigned as a static IP!\n\nIP ${ip_address} is already assigned to:\n• Device: ${existingStaticIP.hostname || 'Unknown'}\n• MAC: ${existingStaticIP.macAddress || 'Unknown'}\n\nPlease choose a different IP address or edit the existing assignment.`,
        conflictDetails: {
          type: 'static_ip_exists',
          existing_static_ip: {
            id: existingStaticIP.id,
            ip_address: existingStaticIP.ipAddress,
            mac_address: existingStaticIP.macAddress,
            hostname: existingStaticIP.hostname
          },
          conflicting_ip: ip_address
        }
      });
    }
    
    // Check if MAC already exists (only if MAC is provided)
    if (mac_address) {
      const existingMAC = await prisma.staticIP.findFirst({
        where: { macAddress: mac_address }
      });
      
      if (existingMAC) {
        return res.status(409).json({
          success: false,
          error: `This MAC address is already assigned to another static IP!\n\nMAC ${mac_address} is currently assigned to:\n• IP Address: ${existingMAC.ipAddress}\n• Device: ${existingMAC.hostname || 'Unknown'}\n\nEach device (MAC address) can only have one static IP assignment.`,
          conflictDetails: {
            type: 'mac_address_exists',
            existing_static_ip: {
              id: existingMAC.id,
              ip_address: existingMAC.ipAddress,
              mac_address: existingMAC.macAddress,
              hostname: existingMAC.hostname
            },
            conflicting_mac: mac_address
          }
        });
      }
    }
    
    // Check if IP conflicts with DHCP reservations
    const dhcpCheck = await checkDHCPReservations(ip_address);
    
    if (dhcpCheck.conflict) {
      return res.status(409).json({
        success: false,
        error: `This IP address is already reserved in DHCP!\n\nIP ${ip_address} is currently assigned to:\n• MAC Address: ${dhcpCheck.reservation['hw-address']}\n• Device: ${dhcpCheck.reservation.hostname || 'Unknown device'}\n\nTo use this IP for a static assignment:\n1. Remove the DHCP reservation first, OR\n2. Choose a different IP address outside the reservation pool`,
        conflictDetails: {
          type: 'dhcp_reservation',
          existing_mac: dhcpCheck.reservation['hw-address'],
          hostname: dhcpCheck.reservation.hostname || 'Unknown',
          conflicting_ip: ip_address,
          reservation_details: dhcpCheck.reservation
        }
      });
    }
    
    // Create the new static IP assignment
    const newStaticIP = await prisma.staticIP.create({
      data: {
        ipAddress: ip_address,
        macAddress: mac_address || null,
        hostname: hostname || null,
        description: description || null
      }
    });
    
    console.log('Static IP assignment created successfully:', newStaticIP);
    
    // Convert to frontend format
    const formattedStaticIP = {
      id: newStaticIP.id,
      ip_address: newStaticIP.ipAddress,
      mac_address: newStaticIP.macAddress,
      hostname: newStaticIP.hostname,
      description: newStaticIP.description,
      created_at: newStaticIP.createdAt,
      updated_at: newStaticIP.updatedAt
    };
    
    res.json({
      success: true,
      staticIP: formattedStaticIP,
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

// PUT /api/static-ips/:id - Update static IP with enhanced error handling
router.put('/static-ips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ip_address, mac_address, hostname, description } = req.body;
    
    console.log(`Updating static IP assignment ID ${id}:`, { ip_address, mac_address, hostname });
    
    // Get current static IP to compare
    const currentStaticIP = await prisma.staticIP.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!currentStaticIP) {
      return res.status(404).json({
        success: false,
        error: 'Static IP assignment not found'
      });
    }
    
    // If IP address is changing, check for conflicts
    if (ip_address && ip_address !== currentStaticIP.ipAddress) {
      // Check if new IP already exists as a static IP
      const existingStaticIP = await prisma.staticIP.findFirst({
        where: { 
          ipAddress: ip_address,
          id: { not: parseInt(id) }
        }
      });
      
      if (existingStaticIP) {
        return res.status(409).json({
          success: false,
          error: `Cannot change to this IP address!\n\nIP ${ip_address} is already assigned to:\n• Device: ${existingStaticIP.hostname || 'Unknown'}\n• MAC: ${existingStaticIP.macAddress || 'Unknown'}\n\nPlease choose a different IP address.`,
          conflictDetails: {
            type: 'static_ip_exists',
            existing_static_ip: {
              id: existingStaticIP.id,
              ip_address: existingStaticIP.ipAddress,
              mac_address: existingStaticIP.macAddress,
              hostname: existingStaticIP.hostname
            },
            conflicting_ip: ip_address
          }
        });
      }
      
      // Check against DHCP reservations
      const dhcpCheck = await checkDHCPReservations(ip_address);
      
      if (dhcpCheck.conflict) {
        return res.status(409).json({
          success: false,
          error: `Cannot change to this IP address!\n\nIP ${ip_address} is already reserved in DHCP for:\n• MAC Address: ${dhcpCheck.reservation['hw-address']}\n• Device: ${dhcpCheck.reservation.hostname || 'Unknown device'}\n\nPlease choose a different IP address.`,
          conflictDetails: {
            type: 'dhcp_reservation',
            existing_mac: dhcpCheck.reservation['hw-address'],
            hostname: dhcpCheck.reservation.hostname || 'Unknown',
            conflicting_ip: ip_address,
            reservation_details: dhcpCheck.reservation
          }
        });
      }
    }
    
    // If MAC address is changing, check for conflicts (only if MAC is provided)
    if (mac_address && mac_address !== currentStaticIP.macAddress) {
      const existingMAC = await prisma.staticIP.findFirst({
        where: { 
          macAddress: mac_address,
          id: { not: parseInt(id) }
        }
      });
      
      if (existingMAC) {
        return res.status(409).json({
          success: false,
          error: `Cannot change to this MAC address!\n\nMAC ${mac_address} is already assigned to:\n• IP Address: ${existingMAC.ipAddress}\n• Device: ${existingMAC.hostname || 'Unknown'}\n\nPlease choose a different MAC address.`,
          conflictDetails: {
            type: 'mac_address_exists',
            existing_static_ip: {
              id: existingMAC.id,
              ip_address: existingMAC.ipAddress,
              mac_address: existingMAC.macAddress,
              hostname: existingMAC.hostname
            },
            conflicting_mac: mac_address
          }
        });
      }
    }
    
    // Update the static IP assignment
    const updatedStaticIP = await prisma.staticIP.update({
      where: { id: parseInt(id) },
      data: {
        ...(ip_address !== undefined && { ipAddress: ip_address }),
        ...(mac_address !== undefined && { macAddress: mac_address || null }),
        ...(hostname !== undefined && { hostname: hostname || null }),
        ...(description !== undefined && { description: description || null })
      }
    });
    
    // Convert to frontend format
    const formattedStaticIP = {
      id: updatedStaticIP.id,
      ip_address: updatedStaticIP.ipAddress,
      mac_address: updatedStaticIP.macAddress,
      hostname: updatedStaticIP.hostname,
      description: updatedStaticIP.description,
      created_at: updatedStaticIP.createdAt,
      updated_at: updatedStaticIP.updatedAt
    };
    
    res.json({
      success: true,
      staticIP: formattedStaticIP,
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
    
    const staticIP = await prisma.staticIP.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!staticIP) {
      return res.status(404).json({
        success: false,
        error: 'Static IP assignment not found'
      });
    }
    
    // Convert to frontend format
    const formattedStaticIP = {
      id: staticIP.id,
      ip_address: staticIP.ipAddress,
      mac_address: staticIP.macAddress,
      hostname: staticIP.hostname,
      description: staticIP.description,
      created_at: staticIP.createdAt,
      updated_at: staticIP.updatedAt
    };
    
    res.json({
      success: true,
      staticIP: formattedStaticIP
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
    
    const deletedStaticIP = await prisma.staticIP.delete({
      where: { id: parseInt(id) }
    });
    
    console.log('Static IP assignment deleted:', deletedStaticIP);
    
    // Convert to frontend format
    const formattedStaticIP = {
      id: deletedStaticIP.id,
      ip_address: deletedStaticIP.ipAddress,
      mac_address: deletedStaticIP.macAddress,
      hostname: deletedStaticIP.hostname,
      description: deletedStaticIP.description,
      created_at: deletedStaticIP.createdAt,
      updated_at: deletedStaticIP.updatedAt
    };
    
    res.json({
      success: true,
      message: 'Static IP assignment deleted successfully',
      deletedStaticIP: formattedStaticIP
    });
    
  } catch (error) {
    if (error.code === 'P2025') { // Prisma "Record not found" error
      return res.status(404).json({
        success: false,
        error: 'Static IP assignment not found'
      });
    }
    
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
    
    const staticIP = await prisma.staticIP.findUnique({
      where: { ipAddress: ip }
    });
    
    let formattedStaticIP = null;
    if (staticIP) {
      formattedStaticIP = {
        id: staticIP.id,
        ip_address: staticIP.ipAddress,
        mac_address: staticIP.macAddress,
        hostname: staticIP.hostname,
        description: staticIP.description,
        created_at: staticIP.createdAt,
        updated_at: staticIP.updatedAt
      };
    }
    
    res.json({
      success: true,
      exists: !!staticIP,
      staticIP: formattedStaticIP
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
    const countResult = await prisma.staticIP.count();
    
    // Delete all records
    await prisma.staticIP.deleteMany();
    
    console.log(`Deleted ${countResult} static IP assignment(s)`);
    
    res.json({
      success: true,
      message: 'Static IP database reset successfully',
      deletedCount: countResult
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
    const totalStaticIPs = await prisma.staticIP.count();
    const withHostname = await prisma.staticIP.count({
      where: {
        hostname: { not: null }
      }
    });
    const withDescription = await prisma.staticIP.count({
      where: {
        description: { not: null }
      }
    });
    
    res.json({
      success: true,
      stats: {
        total_static_ips: totalStaticIPs,
        with_hostname: withHostname,
        with_description: withDescription
      }
    });
    
  } catch (error) {
    console.error('Error getting static IP stats:', error);
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
