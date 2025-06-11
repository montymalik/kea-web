// api.js - Kea DHCP API service for version 2.7.9 (no authentication)

// Use Docker-accessible proxy server to avoid CORS issues
const API_BASE = 'http://172.18.0.3:3001/api';

// Common fetch configuration (no auth required)
const fetchWithAuth = async (url, options = {}) => {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response;
};

export const api = {
  // Test authentication
  async testConnection() {
    try {
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "list-commands",
          "service": ["dhcp4"]
        })
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  },

  // Fetch all data from Kea (subnet 1 by default)
  async fetchAllData(subnetId = 1) {
    try {
      const [leasesRes, reservationsRes, subnetsRes] = await Promise.all([
        this.getLeases(subnetId),
        this.getReservations(subnetId),
        this.getSubnets()
      ]);

      return {
        leases: leasesRes || [],
        reservations: reservationsRes || [],
        subnets: subnetsRes || []
      };
    } catch (error) {
      console.error('Error fetching data from Kea:', error);
      throw error;
    }
  },

  // Get active leases for a specific subnet
  async getLeases(subnetId = 1) {
    try {
      // Use lease4-get-all without arguments to get complete lease data
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "lease4-get-all",
          "service": ["dhcp4"]
        })
      });

      const data = await response.json();
      
      if (data[0] && data[0].result === 0) {
        let leases = data[0].arguments.leases || [];
        
        // Debug: log the first lease to see complete structure
        if (leases.length > 0) {
          console.log('Complete lease data structure:', JSON.stringify(leases[0], null, 2));
        }
        
        // Filter by subnet client-side if subnet specified
        if (subnetId) {
          leases = leases.filter(lease => lease['subnet-id'] === parseInt(subnetId));
        }
        
        console.log(`Found ${leases.length} leases total, ${leases.filter(l => l['subnet-id'] === parseInt(subnetId)).length} in subnet ${subnetId}`);
        
        return leases.map(lease => ({
          // Normalize property names for consistency
          ip_address: lease['ip-address'],
          mac_address: lease['hw-address'],
          hostname: lease.hostname || '',
          subnet_id: lease['subnet-id'],
          cltt: lease.cltt,                    // Client Last Transaction Time
          valid_lft: lease['valid-lft'],       // Lease duration in seconds
          expires_at: lease.expire,            // Unix timestamp when lease expires
          status: lease.state === 0 ? 'Active' : 'Inactive',
          // Keep original format for compatibility
          'ip-address': lease['ip-address'],
          'hw-address': lease['hw-address'],
          'subnet-id': lease['subnet-id'],
          'cltt': lease.cltt,
          'valid-lft': lease['valid-lft'],
          'expire': lease.expire,
          'state': lease.state
        }));
      } else {
        console.error('lease4-get-all failed:', data[0]?.text);
        return [];
      }
    } catch (error) {
      console.error('Error fetching leases:', error);
      return [];
    }
  },

  // Get reservations for a specific subnet
  async getReservations(subnetId = 1) {
    try {
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "reservation-get-all",
          "service": ["dhcp4"],
          "arguments": {
            "subnet-id": parseInt(subnetId)
          }
        })
      });

      const data = await response.json();
      
      if (data[0] && data[0].result === 0) {
        const reservations = data[0].arguments.hosts || [];
        console.log(`Found ${reservations.length} reservations in subnet ${subnetId}`);
        return reservations.map(reservation => ({
          // Normalize property names for consistency
          host_id: reservation['host-id'] || reservation.identifier,
          subnet_id: reservation['subnet-id'],
          ip_address: reservation['ip-address'],
          mac_address: reservation['hw-address'] || reservation.identifier,
          hostname: reservation.hostname || '',
          // Keep original format for compatibility
          'host-id': reservation['host-id'],
          'subnet-id': reservation['subnet-id'],
          'ip-address': reservation['ip-address'],
          'hw-address': reservation['hw-address'] || reservation.identifier
        }));
      } else {
        throw new Error(data[0]?.text || 'Failed to fetch reservations');
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  },

  // Get subnets (fallback to config since subnet4-list not supported)
  async getSubnets() {
    try {
      // Since subnet4-list is not supported, get subnets from config
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "config-get",
          "service": ["dhcp4"]
        })
      });

      const data = await response.json();
      
      if (data[0] && data[0].result === 0) {
        // Extract subnets from configuration
        const config = data[0].arguments;
        const subnets = [];
        
        if (config.Dhcp4 && config.Dhcp4.subnet4) {
          config.Dhcp4.subnet4.forEach(subnet => {
            console.log('Processing subnet from config:', JSON.stringify(subnet, null, 2));
            
            // Extract pool information for accurate IP counting
            let pools = [];
            if (subnet.pools && Array.isArray(subnet.pools)) {
              console.log('Found pools in subnet:', subnet.pools);
              
              pools = subnet.pools.map(poolConfig => {
                console.log('Processing pool config:', poolConfig);
                
                if (poolConfig.pool) {
                  // Parse pool range - handle both formats:
                  // "192.168.1.100 - 192.168.1.214" (with spaces)
                  // "192.168.1.100-192.168.1.214" (without spaces)
                  const poolRange = poolConfig.pool.trim();
                  let startIP, endIP;
                  
                  // Try format with spaces first
                  if (poolRange.includes(' - ')) {
                    const parts = poolRange.split(' - ');
                    if (parts.length === 2) {
                      startIP = parts[0].trim();
                      endIP = parts[1].trim();
                    }
                  } 
                  // Try format without spaces
                  else if (poolRange.includes('-')) {
                    const parts = poolRange.split('-');
                    if (parts.length === 2) {
                      startIP = parts[0].trim();
                      endIP = parts[1].trim();
                    }
                  }
                  
                  if (startIP && endIP) {
                    console.log('Parsed pool range:', { poolRange, startIP, endIP });
                    
                    return {
                      pool: poolRange,
                      startIP: startIP,
                      endIP: endIP
                    };
                  } else {
                    console.warn('Could not parse pool format:', poolRange);
                    return null;
                  }
                } else {
                  console.log('Pool config missing pool property:', poolConfig);
                  return null;
                }
              }).filter(p => p !== null);
            } else {
              console.log('No pools found in subnet or pools is not an array:', subnet.pools);
            }
            
            console.log('Final pools for subnet:', pools);
            
            subnets.push({
              // Normalize property names for consistency
              subnet_id: subnet.id,
              subnet_prefix: subnet.subnet,
              pools: pools, // Add pool information
              // Keep original format for compatibility
              id: subnet.id,
              subnet: subnet.subnet
            });
          });
        }
        
        console.log(`Found ${subnets.length} subnets in configuration with pool details:`, subnets);
        return subnets;
      } else {
        console.warn('config-get failed, using default subnet');
        // Return default subnet if config-get fails
        return [{
          subnet_id: 1,
          subnet_prefix: '192.168.1.0/24',
          pools: [{
            pool: '192.168.1.100 - 192.168.1.214',
            startIP: '192.168.1.100',
            endIP: '192.168.1.214'
          }],
          id: 1,
          subnet: '192.168.1.0/24'
        }];
      }
    } catch (error) {
      console.error('Error fetching subnets:', error);
      // Return default subnet on error
      return [{
        subnet_id: 1,
        subnet_prefix: '192.168.1.0/24',
        pools: [{
          pool: '192.168.1.100 - 192.168.1.214',
          startIP: '192.168.1.100',
          endIP: '192.168.1.214'
        }],
        id: 1,
        subnet: '192.168.1.0/24'
      }];
    }
  },

  // Delete lease
  async deleteLease(ipAddress) {
    try {
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "lease4-del",
          "service": ["dhcp4"],
          "arguments": {
            "ip-address": ipAddress
          }
        })
      });

      const data = await response.json();
      const success = data[0] && data[0].result === 0;
      
      if (success) {
        console.log(`Successfully deleted lease for ${ipAddress}`);
      } else {
        console.error(`Failed to delete lease: ${data[0]?.text}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting lease:', error);
      throw error;
    }
  },

  // Create reservation
  async createReservation(reservationData) {
    try {
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "reservation-add",
          "service": ["dhcp4"],
          "arguments": {
            "reservation": {
              "subnet-id": parseInt(reservationData.subnet_id),
              "hw-address": reservationData.dhcp_identifier,
              "ip-address": reservationData.ipv4_address,
              ...(reservationData.hostname && { "hostname": reservationData.hostname })
            }
          }
        })
      });

      const data = await response.json();
      
      if (data[0] && data[0].result === 0) {
        console.log(`Successfully created reservation for ${reservationData.ipv4_address}`);
        return data[0];
      } else {
        throw new Error(data[0]?.text || 'Failed to create reservation');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  },

  // Update/modify reservation
  async updateReservation(hostId, reservationData) {
    try {
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "reservation-update",
          "service": ["dhcp4"],
          "arguments": {
            "reservation": {
              "subnet-id": parseInt(reservationData.subnet_id),
              "hw-address": reservationData.dhcp_identifier,
              "ip-address": reservationData.ipv4_address,
              ...(reservationData.hostname && { "hostname": reservationData.hostname })
            }
          }
        })
      });

      const data = await response.json();
      
      if (data[0] && data[0].result === 0) {
        console.log(`Successfully updated reservation for ${reservationData.ipv4_address}`);
        return data[0];
      } else {
        throw new Error(data[0]?.text || 'Failed to update reservation');
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }
  },

  // Delete reservation
  async deleteReservation(reservation) {
    try {
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "reservation-del",
          "service": ["dhcp4"],
          "arguments": {
            "subnet-id": parseInt(reservation.subnet_id || reservation['subnet-id']),
            "ip-address": reservation.ip_address || reservation['ip-address']
          }
        })
      });

      const data = await response.json();
      const success = data[0] && data[0].result === 0;
      
      if (success) {
        console.log(`Successfully deleted reservation for ${reservation.ip_address || reservation['ip-address']}`);
      } else {
        console.error(`Failed to delete reservation: ${data[0]?.text}`);
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting reservation:', error);
      throw error;
    }
  },

  // Get next available IP for a subnet
  async getNextAvailableIP(subnetId) {
    try {
      const [leases, reservations, subnets] = await Promise.all([
        this.getLeases(subnetId),
        this.getReservations(subnetId), 
        this.getSubnets()
      ]);

      const subnet = subnets.find(s => s.subnet_id === parseInt(subnetId) || s.id === parseInt(subnetId));
      if (!subnet) {
        throw new Error('Subnet not found');
      }

      // Extract subnet range
      const subnetPrefix = subnet.subnet_prefix || subnet.subnet;
      const [network, cidr] = subnetPrefix.split('/');
      const networkParts = network.split('.').map(Number);
      
      // Get used IPs from leases and reservations
      const usedIPs = new Set([
        ...leases.map(l => l.ip_address || l['ip-address']),
        ...reservations.map(r => r.ip_address || r['ip-address'])
      ]);

      // Find first available IP (skip network and broadcast addresses)
      const cidrNum = parseInt(cidr);
      const hostBits = 32 - cidrNum;
      const maxHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
      
      for (let i = 1; i <= maxHosts; i++) {
        const testIP = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${networkParts[3] + i}`;
        if (!usedIPs.has(testIP)) {
          console.log(`Found available IP: ${testIP}`);
          return { nextAvailableIP: testIP };
        }
      }

      throw new Error('No available IPs in subnet');
    } catch (error) {
      console.error('Error finding next available IP:', error);
      throw error;
    }
  }
};
