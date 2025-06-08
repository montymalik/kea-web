// utils.js - Utility functions

export const formatExpiration = (expiresAt) => {
  const expireDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expireDate - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffMs < 0) return 'Expired';
  if (diffHours > 24) return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`;
  if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
  return `${diffMinutes}m`;
};

export const formatMacAddress = (macAddress) => {
  if (!macAddress) return 'N/A';
  return macAddress.toUpperCase();
};

export const calculateIPStats = (reservations) => {
  const subnet1Reservations = reservations.filter(r => {
    const subnetId = r.subnet_id;
    return subnetId === 1 || subnetId === '1' || subnetId === "1" || 
           (typeof subnetId === 'string' && subnetId.trim() === '1');
  });
  
  const totalScope = 99;
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

export const calculateLeaseStats = (leases) => {
  const subnet1Leases = leases.filter(lease => {
    const subnetId = lease.subnet_id;
    return subnetId === 1 || subnetId === '1' || subnetId === "1" || 
           (typeof subnetId === 'string' && subnetId.trim() === '1');
  });
  
  const totalScope = 200;
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

export const filterData = (data, searchTerm) => {
  return data.filter(item =>
    item.ip_address.includes(searchTerm) ||
    (item.hostname && item.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.mac_address.includes(searchTerm.toUpperCase())
  );
};

export const enrichReservationsWithLeaseStatus = (reservations, leases) => {
  return reservations.map(reservation => {
    // Find matching lease by IP address
    const matchingLease = leases.find(lease => 
      lease.ip_address === reservation.ip_address
    );
    
    return {
      ...reservation,
      isActive: !!matchingLease,
      leaseInfo: matchingLease || null
    };
  });
};
