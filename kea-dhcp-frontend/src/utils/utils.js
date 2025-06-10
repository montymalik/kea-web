// utils.js - Complete and Corrected Utility Functions

/**
 * Formats the lease expiration time into a human-readable string (e.g., "5d 3h", "2h 30m", "Expired").
 * It uses the client last transaction time (cltt) and valid lifetime (valid-lft) to calculate.
 *
 * @param {object} lease - The lease object containing cltt and valid-lft/valid_lft.
 * @returns {string} - The formatted expiration time or "Unknown" if data is missing/invalid.
 */
export const formatExpiration = (lease) => {
    // console.log('formatExpiration called with lease:', lease);
    // console.log('lease type:', typeof lease);
    // console.log('lease keys:', lease ? Object.keys(lease) : 'no keys');

    if (!lease) {
        // console.log('Lease is null/undefined');
        return 'No Data';
    }

    // Extract cltt and valid-lft fields, checking both common variations (e.g., valid-lft vs valid_lft)
    const cltt = lease.cltt || lease['cltt'];
    const validLft = lease['valid-lft'] || lease.valid_lft;

    // console.log('Found cltt:', cltt, 'validLft:', validLft);

    // Proceed with calculation ONLY if both cltt and validLft are available and valid
    if (cltt !== undefined && cltt !== null && validLft !== undefined && validLft !== null) {
        const now = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
        const expirationTime = parseInt(cltt) + parseInt(validLft); // Lease expiry Unix timestamp

        // Ensure parsing resulted in valid numbers
        if (isNaN(expirationTime) || isNaN(now)) {
            // console.error('Invalid numerical values for expiration calculation:', { cltt, validLft, expirationTime, now });
            return 'Error Calc';
        }

        const remainingSeconds = expirationTime - now; // Time left in seconds

        // console.log('Lease expiration calculation:', {
        //     cltt: cltt,
        //     validLft: validLft,
        //     expirationTime: expirationTime,
        //     now: now,
        //     remainingSeconds: remainingSeconds,
        //     remainingHours: remainingSeconds / 3600
        // });

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

    } else {
        // This block executes if cltt or validLft were missing
        // console.log('Missing required fields for expiration calculation:', {
        //     cltt: cltt,
        //     validLft: validLft,
        //     clttUndefined: cltt === undefined,
        //     validLftUndefined: validLft === undefined
        // });
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
 * Calculates statistics for IP reservations within a specific subnet (ID 1).
 * @param {Array<object>} reservations - An array of reservation objects.
 * @returns {object} - An object containing total, reserved, available IP counts and a status.
 */
export const calculateIPStats = (reservations) => {
    const subnet1Reservations = reservations.filter(r => {
        const subnetId = r.subnet_id;
        // Robust check for subnet_id being 1 (number or string)
        return subnetId === 1 || subnetId === '1' || (typeof subnetId === 'string' && subnetId.trim() === '1');
    });

    const totalScope = 99; // Define your total scope for subnet 1 here
    const reservedIPs = subnet1Reservations.length;
    const availableIPs = totalScope - reservedIPs;
    const status = availableIPs < 20 ? 'Low' : availableIPs < 60 ? 'Moderate' : 'Good';

    return {
        total: totalScope,
        reserved: reservedIPs,
        available: availableIPs,
        status: status
    };
};

/**
 * Calculates statistics for active leases within a specific subnet (ID 1).
 * @param {Array<object>} leases - An array of lease objects.
 * @returns {object} - An object containing total, active, available IP counts and a status.
 */
export const calculateLeaseStats = (leases) => {
    // Handle undefined or empty leases array
    if (!leases || !Array.isArray(leases)) {
        return {
            total: 200, // Default total scope for leases
            active: 0,
            available: 200,
            status: 'Good'
        };
    }

    const subnet1Leases = leases.filter(lease => {
        const subnetId = lease.subnet_id || lease['subnet-id']; // Check both common key names
        // Robust check for subnet_id being 1 (number or string)
        return subnetId === 1 || subnetId === '1' || (typeof subnetId === 'string' && subnetId.trim() === '1');
    });

    const totalScope = 200; // Define your total scope for leases here
    const activeLeases = subnet1Leases.length;
    const availableIPs = totalScope - activeLeases;
    const status = availableIPs < 40 ? 'Low' : availableIPs < 120 ? 'Moderate' : 'Good';

    return {
        total: totalScope,
        active: activeLeases,
        available: availableIPs,
        status: status
    };
};

/**
 * Filters an array of data items based on a search term, matching against IP address, hostname, or MAC address.
 *
 * @param {Array<object>} data - The array of items (leases or reservations) to filter.
 * @param {string} searchTerm - The user's search input.
 * @returns {Array<object>} - The filtered array of items.
 */
export const filterData = (data, searchTerm) => {
    // console.log('filterData called with:', data.length, 'items, searchTerm:', `"${searchTerm}"`);

    const trimmedSearchTerm = searchTerm.trim();

    // If the search term is empty, return all data
    if (!trimmedSearchTerm) {
        // console.log('No search term, returning all data');
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

    // console.log('filterData result:', filtered.length, 'items');
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
