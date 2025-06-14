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
    // Log non-2xx HTTP responses more verbosely
    const errorBody = await response.text(); // Try to get the error body
    console.error(`[API Request Error] HTTP error! Status: ${response.status} ${response.statusText} for URL: ${url}. Response body: ${errorBody}`);
    throw new Error(`API request failed: ${response.status} ${response.statusText}. Details: ${errorBody.substring(0, 200)}...`); // Limit error body length
  }
    
  return response;
};

export const api = {
  // Test authentication
  async testConnection() {
    try {
      console.log('Testing API connection...'); // Added log
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "list-commands",
          "service": ["dhcp4"]
        })
      });
      const data = await response.json(); // Parse response for success
      console.log('Connection test successful. Response:', JSON.stringify(data, null, 2)); // Log successful response
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  },

  // Get reserved pool configuration from backend
  async getReservedPoolConfig() {
    try {
      console.log('Fetching reserved pool configuration...');
      const response = await fetchWithAuth(`${API_BASE.replace('/api', '')}/config/reserved-pool`);
      const data = await response.json();
      
      if (data.success && data.reservedPool) {
        console.log('Reserved pool config received:', data.reservedPool);
        return data.reservedPool;
      } else {
        console.warn('No reserved pool config in response, using defaults');
        return {
          range: '192.168.1.2 - 192.168.1.100',
          startIP: '192.168.1.2',
          endIP: '192.168.1.100',
          total: 99
        };
      }
    } catch (error) {
      console.error('Error fetching reserved pool config:', error);
      // Return default configuration
      return {
        range: '192.168.1.2 - 192.168.1.100',
        startIP: '192.168.1.2',
        endIP: '192.168.1.100',
        total: 99
      };
    }
  },

  // Check if HA hook is loaded and configured
  async checkHAConfiguration() {
    try {
      console.log('[HA Detection] Checking if HA hook is loaded...');
      
      // First, get the configuration to check for HA hook
      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify({
          "command": "config-get",
          "service": ["dhcp4"]
        })
      });

      const data = await response.json();
      
      if (data[0] && data[0].result === 0) {
        const config = data[0].arguments;
        
        // Check if HA hook is configured in the hooks-libraries
        const hooksLibraries = config.Dhcp4?.['hooks-libraries'] || [];
        const haHookFound = hooksLibraries.some(hook => 
          hook.library && (
            hook.library.includes('libdhcp_ha.so') || 
            hook.library.includes('ha') ||
            hook.library.includes('high_availability')
          )
        );
        
        console.log('[HA Detection] Hooks libraries found:', hooksLibraries.map(h => h.library));
        console.log('[HA Detection] HA hook found in config:', haHookFound);
        
        if (haHookFound) {
          // Double-check by trying to get HA status
          try {
            const haTestResponse = await fetchWithAuth(`${API_BASE}`, {
              method: 'POST',
              body: JSON.stringify({
                "command": "ha-heartbeat",
                "service": ["dhcp4"],
                "arguments": {
                  "server-name": "server1"
                }
              })
            });
            
            const haTestData = await haTestResponse.json();
            
            // If we get a proper response (even if it's an error about server name), HA is configured
            if (haTestData[0]) {
              console.log('[HA Detection] HA heartbeat test response:', haTestData[0].result);
              
              // Result 3 typically means "unsupported command" - HA not loaded
              // Result 1 typically means "error" but command exists - HA is loaded
              // Result 0 means success - HA is loaded and working
              const haConfigured = haTestData[0].result !== 3;
              
              console.log('[HA Detection] HA is configured:', haConfigured);
              return {
                configured: haConfigured,
                hookFound: haHookFound,
                testResult: haTestData[0].result,
                testMessage: haTestData[0].text
              };
            }
          } catch (haTestError) {
            console.log('[HA Detection] HA test failed:', haTestError.message);
            // If the test fails, but we found the hook in config, assume HA is configured but not working
            return {
              configured: true,
              hookFound: haHookFound,
              testResult: null,
              testMessage: 'HA hook found in config but test failed'
            };
          }
        }
        
        console.log('[HA Detection] HA not configured - no hook found');
        return {
          configured: false,
          hookFound: false,
          testResult: null,
          testMessage: 'HA hook not found in configuration'
        };
      } else {
        console.error('[HA Detection] Failed to get configuration:', data[0]?.text);
        return {
          configured: false,
          hookFound: false,
          testResult: null,
          testMessage: 'Failed to get server configuration'
        };
      }
    } catch (error) {
      console.error('[HA Detection] Error checking HA configuration:', error);
      return {
        configured: false,
        hookFound: false,
        testResult: null,
        testMessage: error.message
      };
    }
  },

  // Fetch all data from Kea (subnet 1 by default) - UPDATED TO INCLUDE RESERVED POOL CONFIG
  async fetchAllData(subnetId = 1) {
    try {
      console.log(`Fetching all data for subnet ID: ${subnetId}`);
      const [leasesRes, reservationsRes, subnetsRes, reservedPoolRes] = await Promise.all([
        this.getLeases(subnetId),
        this.getReservations(subnetId),
        this.getSubnets(),
        this.getReservedPoolConfig()
      ]);

      console.log('All data fetched successfully.');
      return {
        leases: leasesRes || [],
        reservations: reservationsRes || [],
        subnets: subnetsRes || [],
        reservedPool: reservedPoolRes
      };
    } catch (error) {
      console.error('Error fetching data from Kea:', error);
      throw error;
    }
  },

  // Get active leases for a specific subnet
  async getLeases(subnetId = 1) {
    try {
      console.log(`Fetching leases for subnet ID: ${subnetId}`); // Added log
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
          console.log('Complete lease data structure (first lease):', JSON.stringify(leases[0], null, 2));
        }
                
        // Filter by subnet client-side if subnet specified
        if (subnetId) {
          leases = leases.filter(lease => lease['subnet-id'] === parseInt(subnetId));
        }
                
        console.log(`Found ${leases.length} leases in subnet ${subnetId} (after client-side filter)`); // Updated log
                
        return leases.map(lease => ({
          // Normalize property names for consistency
          ip_address: lease['ip-address'],
          mac_address: lease['hw-address'],
          hostname: lease.hostname || '',
          subnet_id: lease['subnet-id'],
          cltt: lease.cltt,
          valid_lft: lease['valid-lft'],
          expires_at: lease.expire,
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
      console.log(`Fetching reservations for subnet ID: ${subnetId}`); // Added log
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
      console.log('Fetching subnet configuration...'); // Added log
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
      console.log(`Attempting to delete lease for IP: ${ipAddress}`); // Added log
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
      console.log(`Attempting to create reservation for IP: ${reservationData.ipv4_address}`); // Added log
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

  // Update/modify reservation with lease management
  async updateReservation(hostId, reservationData, originalData = null) {
    try {
      console.log(`Attempting to update reservation for Host ID: ${hostId}, IP: ${reservationData.ipv4_address}`); // Added log
      // If IP address is changing, handle lease cleanup
      if (originalData && originalData.ipv4_address !== reservationData.ipv4_address) {
        console.log(`IP address changing from ${originalData.ipv4_address} to ${reservationData.ipv4_address}`);
                
        // Step 1: Delete the old lease if it exists
        try {
          console.log(`Attempting to delete old lease for ${originalData.ipv4_address}`);
          await this.deleteLease(originalData.ipv4_address);
          console.log(`Successfully deleted old lease for ${originalData.ipv4_address}`);
        } catch (error) {
          console.log(`Old lease deletion failed (may not exist): ${error.message}`);
          // Continue anyway - lease might not exist
        }
      }

      // Step 2: Update the reservation
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
                
        // Step 3: If IP changed, try to force DHCP renewal (if supported)
        if (originalData && originalData.ipv4_address !== reservationData.ipv4_address) {
          try {
            await this.forceRenewal(reservationData.dhcp_identifier);
          } catch (error) {
            console.log(`DHCP renewal force failed: ${error.message}`);
            // Not critical - continue
          }
        }
                
        return data[0];
      } else {
        throw new Error(data[0]?.text || 'Failed to update reservation');
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }
  },

  // Force DHCP renewal for a specific MAC address (if supported by network)
  async forceRenewal(macAddress) {
    try {
      // Note: DHCP FORCERENEW requires specific network setup and client support
      // This is a placeholder for potential future implementation
      console.log(`Attempting to force DHCP renewal for MAC: ${macAddress}`); // Added log
                
      // You could implement this using:
      // 1. DHCP FORCERENEW packets (requires network setup)
      // 2. Integration with network management tools
      // 3. Custom scripts on the DHCP server
                
      return { success: false, message: 'DHCP FORCERENEW not implemented' };
    } catch (error) {
      console.error('Error forcing DHCP renewal:', error);
      throw error;
    }
  },

  // Reclaim IP address (delete lease and optionally force renewal)
  async reclaimIP(ipAddress, macAddress = null) {
    try {
      console.log(`Attempting to reclaim IP address: ${ipAddress}`); // Added log
                
      // Delete the lease
      const success = await this.deleteLease(ipAddress);
                
      if (success && macAddress) {
        // Try to force the device to get a new IP
        try {
          await this.forceRenewal(macAddress);
        } catch (error) {
          console.log(`Could not force renewal: ${error.message}`);
        }
      }
                
      return success;
    } catch (error) {
      console.error('Error reclaiming IP:', error);
      throw error;
    }
  },

  // Delete reservation
  async deleteReservation(reservation) {
    try {
      console.log(`Attempting to delete reservation for IP: ${reservation.ip_address || reservation['ip-address']}`); // Added log
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
      console.log(`Finding next available IP for subnet ID: ${subnetId}`); // Added log
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
  },

  // HA Heartbeat monitoring functions
  async getHAHeartbeat(serverName = null) {
    const actualServerName = serverName || "unknown-server"; // Fallback if serverName is null

    try {
      const requestBody = {
        "command": "ha-heartbeat",
        "service": ["dhcp4"],
        "arguments": {
          "server-name": actualServerName
        }
      };

      console.log(`[HA Heartbeat] Sending request for ${actualServerName}:`, JSON.stringify(requestBody, null, 2));

      const response = await fetchWithAuth(`${API_BASE}`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      // *** ADDED LOG FOR SUCCESSFUL RAW RESPONSE HERE ***
      console.log(`[HA Heartbeat] Raw response for ${actualServerName}:`, JSON.stringify(data, null, 2)); 
            
      if (data[0] && data[0].result === 0) {
        console.log(`[HA Heartbeat] Successful for ${actualServerName}. State: ${data[0].arguments.state}`);
        return {
          success: true,
          state: data[0].arguments.state,
          dateTime: data[0].arguments['date-time'],
          scopes: data[0].arguments.scopes,
          unsentUpdateCount: data[0].arguments['unsent-update-count'],
          serverName: actualServerName,
          lastChecked: new Date().toISOString()
        };
      } else {
        const errorMessage = data[0]?.text || 'Unknown error during heartbeat';
        console.error(`[HA Heartbeat] Failed for ${actualServerName}: ${errorMessage}. Full response:`, JSON.stringify(data, null, 2)); // Log full data on failure
        return {
          success: false,
          error: errorMessage,
          serverName: actualServerName,
          lastChecked: new Date().toISOString()
        };
      }
    } catch (error) {
      // *** IMPROVED LOG FOR NETWORK/FETCH ERRORS HERE ***
      console.error(`[HA Heartbeat] Error getting heartbeat for ${actualServerName}:`, error.message, error); // Log message and full error object
      return {
        success: false,
        error: error.message,
        serverName: actualServerName,
        lastChecked: new Date().toISOString()
      };
    }
  },

  // Check HA status for both servers in the pair (only if HA is configured)
  async getHAStatus() {
    try {
      console.log('--- Starting HA Status Check ---');
      
      // First check if HA is configured
      const haConfig = await this.checkHAConfiguration();
      console.log('[HA Status] HA Configuration check result:', haConfig);
      
      if (!haConfig.configured) {
        console.log('[HA Status] HA not configured, skipping status check');
        return {
          configured: false,
          reason: haConfig.testMessage,
          overall: {
            status: 'not-configured',
            severity: 'info',
            message: 'High Availability not configured',
            details: haConfig.testMessage
          },
          servers: {},
          lastChecked: new Date().toISOString()
        };
      }
      
      console.log('[HA Status] HA is configured, proceeding with status check');
            
      const [server1Status, server2Status] = await Promise.allSettled([ // Use Promise.allSettled to ensure both promises run
        this.getHAHeartbeat('server1'),
        this.getHAHeartbeat('server2')
      ]);

      // *** ADDED LOGS FOR RESOLVED/REJECTED PROMISES HERE ***
      console.log('[HA Status] Server 1 Promise result:', JSON.stringify(server1Status, null, 2));
      console.log('[HA Status] Server 2 Promise result:', JSON.stringify(server2Status, null, 2));
      // --- END ADDED LOGS ---

      const processedServer1Status = server1Status.status === 'fulfilled' ? server1Status.value : { success: false, serverName: 'server1', error: server1Status.reason?.message || 'Promise rejected' };
      const processedServer2Status = server2Status.status === 'fulfilled' ? server2Status.value : { success: false, serverName: 'server2', error: server2Status.reason?.message || 'Promise rejected' };

      const overallStatus = this.evaluateHAStatus([processedServer1Status, processedServer2Status]);
      console.log('--- HA Status Check Complete ---');

      return {
        configured: true,
        overall: overallStatus,
        servers: {
          server1: processedServer1Status,
          server2: processedServer2Status
        },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting HA status:', error);
      return {
        configured: false,
        overall: {
          status: 'critical',
          severity: 'critical',
          message: 'Failed to check HA status',
          details: error.message
        },
        servers: {},
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  },

  // Evaluate overall HA health based on server responses
  evaluateHAStatus(serverStatuses) {
    console.log('[HA Evaluation] Starting evaluation with:', JSON.stringify(serverStatuses, null, 2));
            
    const successfulServers = serverStatuses.filter(s => s.success);
    const failedServers = serverStatuses.filter(s => !s.success);

    console.log(`[HA Evaluation] Successful servers: ${successfulServers.length}, Failed servers: ${failedServers.length}`);

    // If we can't reach any servers, critical error
    if (successfulServers.length === 0) {
      console.log('[HA Evaluation] No successful servers - overall status: critical');
      return {
        status: 'critical',
        severity: 'critical',
        message: 'Cannot communicate with any HA servers',
        details: 'Both servers are unreachable or not responding'
      };
    }

    // Get all states from successful servers
    const states = successfulServers.map(s => s.state).filter(state => state);
            
    console.log('[HA Evaluation] HA States detected from successful servers:', states);

    // Determine overall status based on the states
    let overallStatus = 'warning'; // Default to warning instead of healthy
    let statusMessage = 'HA cluster status unknown';
    let statusDetails = '';

    // Check for any partner-down states (RED)
    if (states.includes('partner-down')) {
      console.log('[HA Evaluation] Detected "partner-down" state - setting overall to critical.');
      overallStatus = 'critical';
      statusMessage = 'Partner down detected';
      statusDetails = 'One or more servers report partner-down state';
    }
    // Check for healthy states (GREEN): hot-standby, load-balancing, backup
    else if (states.some(state => ['hot-standby', 'load-balancing', 'backup'].includes(state))) {
      const healthyStates = states.filter(state => ['hot-standby', 'load-balancing', 'backup'].includes(state));
      console.log(`[HA Evaluation] Detected healthy states: ${healthyStates.join(', ')} - setting overall to healthy.`);
      overallStatus = 'healthy';
      statusMessage = 'HA cluster is healthy';
      statusDetails = `Server states: ${healthyStates.join(', ')}`;
    }
    // Any other states (YELLOW)
    else if (states.length > 0) {
      console.log(`[HA Evaluation] Detected other states: ${states.join(', ')} - setting overall to warning.`);
      overallStatus = 'warning';
      statusMessage = 'HA cluster in transition or unknown state';
      statusDetails = `Server states: ${states.join(', ')}`;
    }
    // No states detected
    else {
      console.log('[HA Evaluation] No HA states detected - setting overall to warning.');
      overallStatus = 'warning';
      statusMessage = 'No HA states detected';
      statusDetails = 'Servers responded but no states were found';
    }

    // Check for communication issues
    if (failedServers.length > 0) {
      if (overallStatus === 'healthy') {
        overallStatus = 'warning';
      }
      statusDetails += failedServers.length > 0 ? ` (${failedServers.length} server(s) unreachable)` : '';
      console.log(`[HA Evaluation] Added warning: ${failedServers.length} server(s) unreachable.`);
    }

    // Check unsent update counts for additional warnings
    const unsentCounts = successfulServers.map(s => s.unsentUpdateCount || 0);
    const maxUnsentCount = Math.max(...unsentCounts);
            
    if (maxUnsentCount > 0 && overallStatus === 'healthy') {
      overallStatus = 'warning';
      statusDetails += ` (${maxUnsentCount} unsent updates detected)`;
      console.log(`[HA Evaluation] Added warning: ${maxUnsentCount} unsent updates detected.`);
    }

    const result = {
      status: overallStatus,
      severity: overallStatus === 'critical' ? 'critical' :
                 overallStatus === 'warning' ? 'medium' : 'none',
      message: statusMessage,
      details: statusDetails,
      states: states, // Include detected states for debugging
      debugInfo: {
        successfulServers: successfulServers.length,
        failedServers: failedServers.length,
        detectedStates: states,
        rawResponses: successfulServers.map(s => ({
          serverName: s.serverName,
          state: s.state,
          success: s.success
        }))
      }
    };

    console.log('[HA Evaluation] Final HA status result:', JSON.stringify(result, null, 2));
    return result;
  }
};
