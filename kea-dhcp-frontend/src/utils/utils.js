// utils.js - Updated with Reserved Pool Configuration Support

/**
 * Converts an IP address string to a numeric value for comparison
 * @param {string} ip - IP address like "192.168.1.100"
 * @returns {number} - Numeric representation
 */
const ipToNumber = (ip) => {
  if (!ip || typeof ip !== 'string') return 0;
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  
  return parts.reduce((acc, octet) => {
    const num = parseInt(octet, 10);
    if (isNaN(num) || num < 0 || num > 255) return 0;
    return (acc << 8) + num;
  }, 0) >>> 0;
};

/**
 * Calculates the number of IPs in a pool range
 * @param {string} startIP - Starting IP address
 * @param {string} endIP - Ending IP address
 * @returns {number} - Number of IPs in the range (inclusive)
 */
export const calculatePoolSize = (startIP, endIP) => {
  console.log('calculatePoolSize called with:', startIP, endIP);
  
  if (!startIP || !endIP) {
    console.log('Missing start or end IP');
    return 0;
  }
  
  const start = ipToNumber(startIP);
  const end = ipToNumber(endIP);
  
  console.log('IP conversion:', { startIP, endIP, start, end });
  
  if (start === 0 || end === 0 || end < start) {
    console.log('Invalid IP range');
    return 0;
  }
  
  const count = end - start + 1; // +1 because range is inclusive
  console.log('Pool size calculated:', count);
  return count;
};

/**
 * Calculates total IPs available from all pools in a subnet
 * @param {Array} pools - Array of pool objects with startIP and endIP
 * @returns {number} - Total number of IPs across all pools
 */
export const calculateTotalPoolIPs = (pools) => {
  console.log('calculateTotalPoolIPs called with:', pools);
  
  if (!pools || !Array.isArray(pools)) {
    console.log('No pools array provided');
    return 0;
  }
  
  const total = pools.reduce((total, pool) => {
    console.log('Processing pool:', pool);
    
    if (pool && pool.startIP && pool.endIP) {
      const poolSize = calculatePoolSize(pool.startIP, pool.endIP);
      console.log(`Pool ${pool.startIP} - ${pool.endIP} has ${poolSize} IPs`);
      return total + poolSize;
    }
    
    console.log('Pool missing startIP or endIP:', pool);
    return total;
  }, 0);
  
  console.log('Total pool IPs calculated:', total);
  return total;
};

/**
 * Calculates the number of usable host IPs from a subnet CIDR notation (fallback)
 * @param {string} subnetCidr - Subnet in CIDR format (e.g., "192.168.1.0/24")
 * @returns {number} - Number of usable host IPs (excluding network and broadcast)
 */
export const calculateUsableIPs = (subnetCidr) => {
    if (!subnetCidr || typeof subnetCidr !== 'string') return 0;
    
    const [, cidr] = subnetCidr.split('/');
    const cidrNum = parseInt(cidr);
    
    if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) return 0;
    
    const hostBits = 32 - cidrNum;
    const totalIPs = Math.pow(2, hostBits);
    
    // Subtract network address and broadcast address
    return Math.max(0, totalIPs - 2);
};

/**
 * Formats the lease expiration time into a human-readable string (e.g., "5d 3h", "2h 30m", "Expired").
 * It uses the client last transaction time (cltt) and valid lifetime (valid-lft) to calculate.
 *
 * @param {object} lease - The lease object containing cltt and valid-lft/valid_lft.
 * @returns {string} - The formatted expiration time or "Unknown" if data is missing/invalid.
 */
export const formatExpiration = (lease) => {
    if (!lease) {
        return 'No Data';
    }

    // Extract cltt and valid-lft fields, checking both common variations (e.g., valid-lft vs valid_lft)
    const cltt = lease.cltt || lease['cltt'];
    const validLft = lease['valid-lft'] || lease.valid_lft;

    // Proceed with calculation ONLY if both cltt and validLft are available and valid
    if (cltt !== undefined && cltt !== null && validLft !== undefined && validLft !== null) {
        const now = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
        const expirationTime = parseInt(cltt) + parseInt(validLft); // Lease expiry Unix timestamp

        // Ensure parsing resulted in valid numbers
        if (isNaN(expirationTime) || isNaN(now)) {
            return 'Error Calc';
        }

        const remainingSeconds = expirationTime - now; // Time left in seconds

        if (remainingSeconds <= 0) {
            return 'Expired';
        }

        const days = Math.floor(remainingSeconds / 86400); // 86400 seconds in a day
        const hours = Math.floor((remainingSeconds % 86400) / 3600); // Remaining seconds after days, converted to hours
        const minutes = Math.floor((remainingSeconds % 3600) / 60); // Remaining seconds after hours, converted to minutes

        if (days > 0) {
            // If there are days, show days and hours (or just days if hours is 0)
            return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
        }
        if (hours > 0) {
            // If there are hours (but no days), show hours and minutes (or just hours if minutes is 0)
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
        // If less than an hour, show only minutes
        return `${minutes}m`;
    }

    // Fallback if the calculation inputs are missing or parsing fails
    return 'Unknown';
};

/**
 * Formats a MAC address to uppercase.
 * @param {string} macAddress - The MAC address string.
 * @returns {string} - The uppercase MAC address or "N/A" if null/undefined.
 */
export const formatMacAddress = (macAddress) => {
    if (!macAddress) return 'N/A';
    return macAddress.toUpperCase();
};

/**
 * Calculates statistics for IP reservations using reserved pool configuration from environment.
 * This function now uses the reserved pool configuration instead of DHCP pools.
 * 
 * @param {Array<object>} reservations - An array of reservation objects.
 * @param {object} reservedPoolConfig - Reserved pool configuration from environment.
 * @param {number} subnetId - The subnet ID to calculate stats for (default: 1).
 * @returns {object} - An object containing total, reserved, available IP counts and a status.
 */
export const calculateIPStats = (reservations, reservedPoolConfig = null, subnetId = 1) => {
    console.log('calculateIPStats called with reservedPoolConfig:', reservedPoolConfig);
    
    if (!reservations || !Array.isArray(reservations)) {
        console.log('No reservations array provided');
        return {
            total: reservedPoolConfig?.total || 99,
            reserved: 0,
            available: reservedPoolConfig?.total || 99,
            status: 'Good',
            poolInfo: reservedPoolConfig?.range || 'Unknown'
        };
    }

    // Filter reservations for the specific subnet
    const subnetReservations = reservations.filter(r => {
        const rSubnetId = r.subnet_id;
        return rSubnetId === subnetId || rSubnetId === String(subnetId) || 
               (typeof rSubnetId === 'string' && rSubnetId.trim() === String(subnetId));
    });

    // Use reserved pool configuration
    let totalScope;
    let poolInfo = 'Unknown';
    
    if (reservedPoolConfig) {
        totalScope = reservedPoolConfig.total;
        poolInfo = `${reservedPoolConfig.range} (Reserved Pool)`;
        console.log(`Using reserved pool configuration: ${reservedPoolConfig.range} with ${totalScope} total IPs`);
    } else {
        // Fallback to default if no reserved pool config
        totalScope = 99; // Default for 192.168.1.2-100 (99 IPs)
        poolInfo = '192.168.1.2 - 192.168.1.100 (default reserved pool)';
        console.warn(`No reserved pool configuration provided, using default of ${totalScope} IPs`);
    }

    const reservedIPs = subnetReservations.length;
    const availableIPs = Math.max(0, totalScope - reservedIPs);
    
    // Calculate status based on percentage of available IPs
    const availablePercentage = totalScope > 0 ? (availableIPs / totalScope) * 100 : 100;
    const status = availablePercentage < 10 ? 'Low' : 
                   availablePercentage < 30 ? 'Moderate' : 'Good';

    const result = {
        total: totalScope,
        reserved: reservedIPs,
        available: availableIPs,
        status: status,
        poolInfo: poolInfo
    };

    console.log('calculateIPStats result (for reservations):', result);
    return result;
};

/**
 * Calculates statistics for active leases within a specific subnet using pool information.
 * This function continues to use DHCP pool information for lease statistics.
 * 
 * @param {Array<object>} leases - An array of lease objects.
 * @param {Array<object>} subnets - An array of subnet objects with pool information.
 * @param {number} subnetId - The subnet ID to calculate stats for (default: 1).
 * @returns {object} - An object containing total, active, available IP counts and a status.
 */
export const calculateLeaseStats = (leases, subnets = [], subnetId = 1) => {
    console.log('calculateLeaseStats called with:', {
        leasesLength: leases ? leases.length : 'null',
        subnetsLength: subnets ? subnets.length : 'null',
        subnetId
    });

    // Handle undefined or empty leases array more gracefully
    if (!leases || !Array.isArray(leases)) {
        console.log('No leases array provided, returning default');
        return {
            total: 115, // Default for 192.168.1.100-214 range (DHCP pool)
            active: 0,
            available: 115,
            status: 'Good',
            poolInfo: 'Unknown'
        };
    }

    // Filter leases for the specific subnet
    const subnetLeases = leases.filter(lease => {
        const lSubnetId = lease.subnet_id || lease['subnet-id']; // Check both common key names
        const matches = lSubnetId === subnetId || lSubnetId === String(subnetId) || 
               (typeof lSubnetId === 'string' && lSubnetId.trim() === String(subnetId));
        
        if (matches) {
            console.log('Found matching lease for subnet:', lSubnetId, lease.ip_address);
        }
        return matches;
    });

    console.log(`Found ${subnetLeases.length} leases in subnet ${subnetId}`);

    // Find the subnet configuration - be more flexible about finding it
    let subnet = null;
    if (subnets && Array.isArray(subnets) && subnets.length > 0) {
        subnet = subnets.find(s => 
            s.subnet_id === subnetId || s.id === subnetId ||
            s.subnet_id === String(subnetId) || s.id === String(subnetId)
        );
        console.log('Found subnet config:', subnet);
    }

    let totalScope;
    let poolInfo = 'Unknown';
    
    if (subnet && subnet.pools && subnet.pools.length > 0) {
        // Calculate total IPs from all DHCP pools
        totalScope = calculateTotalPoolIPs(subnet.pools);
        
        // Create a readable pool info string
        const poolRanges = subnet.pools.map(pool => pool.pool).join(', ');
        poolInfo = `${poolRanges} (DHCP Pool)`;
        
        console.log(`Calculated ${totalScope} total IPs from DHCP pools: ${poolRanges}`);
    } else if (subnet) {
        // Fallback to CIDR calculation if no pools defined
        const subnetCidr = subnet.subnet_prefix || subnet.subnet;
        totalScope = calculateUsableIPs(subnetCidr);
        poolInfo = `${subnetCidr} (full subnet)`;
        console.log(`No pools found, calculated ${totalScope} usable IPs from CIDR: ${subnetCidr}`);
    } else {
        // Fallback to default if subnet not found
        totalScope = 115; // Default for 192.168.1.100-214 (115 IPs)
        poolInfo = '192.168.1.100 - 192.168.1.214 (default DHCP pool)';
        console.warn(`Subnet ${subnetId} not found for lease stats, using default pool scope of ${totalScope}`);
    }

    const activeLeases = subnetLeases.length;
    const availableIPs = Math.max(0, totalScope - activeLeases); // Ensure non-negative
    
    // Calculate status based on percentage of available IPs
    const availablePercentage = totalScope > 0 ? (availableIPs / totalScope) * 100 : 100;
    const status = availablePercentage < 10 ? 'Low' : 
                   availablePercentage < 30 ? 'Moderate' : 'Good';

    const result = {
        total: totalScope,
        active: activeLeases,
        available: availableIPs,
        status: status,
        poolInfo: poolInfo
    };

    console.log('calculateLeaseStats result:', result);
    return result;
};

/**
 * Filters an array of data items based on a search term, matching against IP address, hostname, or MAC address.
 *
 * @param {Array<object>} data - The array of items (leases or reservations) to filter.
 * @param {string} searchTerm - The user's search input.
 * @returns {Array<object>} - The filtered array of items.
 */
export const filterData = (data, searchTerm) => {
    const trimmedSearchTerm = searchTerm.trim();

    // If the search term is empty, return all data
    if (!trimmedSearchTerm) {
        return data;
    }

    // Convert search term to lowercase for case-insensitive comparison (hostnames, IPs)
    const lowerCaseSearchTerm = trimmedSearchTerm.toLowerCase();
    // Convert search term to uppercase for MAC address comparison
    const upperCaseSearchTerm = trimmedSearchTerm.toUpperCase();

    const filtered = data.filter(item => {
        // IP Address (convert both to lowercase for consistent comparison)
        const ipMatch = item.ip_address && item.ip_address.toLowerCase().includes(lowerCaseSearchTerm);

        // Hostname (convert both to lowercase)
        const hostnameMatch = item.hostname && item.hostname.toLowerCase().includes(lowerCaseSearchTerm);

        // MAC Address (convert both to uppercase for comparison)
        const macMatch = item.mac_address && item.mac_address.toUpperCase().includes(upperCaseSearchTerm);
        
        return ipMatch || hostnameMatch || macMatch;
    });

    return filtered;
};

/**
 * Enriches reservation objects with lease status by matching them against active leases.
 * @param {Array<object>} reservations - An array of reservation objects.
 * @param {Array<object>} leases - An array of active lease objects.
 * @returns {Array<object>} - The reservations array with added `isActive` and `leaseInfo` properties.
 */
export const enrichReservationsWithLeaseStatus = (reservations, leases) => {
    // Ensure leases is an array before trying to map
    if (!leases || !Array.isArray(leases)) {
        return reservations.map(reservation => ({
            ...reservation,
            isActive: false,
            leaseInfo: null
        }));
    }

    return reservations.map(reservation => {
        // Find matching lease by IP address
        const matchingLease = leases.find(lease =>
            lease.ip_address === reservation.ip_address
        );

        return {
            ...reservation,
            isActive: !!matchingLease, // True if a matching lease is found
            leaseInfo: matchingLease || null // Store the matching lease object or null
        };
    });
};
