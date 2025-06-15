// staticIPAPI.js - API functions for managing static IP assignments

// For this demo, we'll use localStorage to store static IPs
// In a real implementation, this would be backed by your backend database

const STATIC_IPS_STORAGE_KEY = 'dhcp_static_ips';

/**
 * Generate a unique ID for static IP entries
 */
const generateStaticIPId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Get all static IP assignments from storage
 */
export const getStaticIPs = () => {
  try {
    const stored = localStorage.getItem(STATIC_IPS_STORAGE_KEY);
    if (!stored) return [];
    
    const staticIPs = JSON.parse(stored);
    return Array.isArray(staticIPs) ? staticIPs : [];
  } catch (error) {
    console.error('Error loading static IPs:', error);
    return [];
  }
};

/**
 * Save static IP assignments to storage
 */
const saveStaticIPs = (staticIPs) => {
  try {
    localStorage.setItem(STATIC_IPS_STORAGE_KEY, JSON.stringify(staticIPs));
    return true;
  } catch (error) {
    console.error('Error saving static IPs:', error);
    return false;
  }
};

/**
 * Add a new static IP assignment
 */
export const addStaticIP = (staticIPData) => {
  try {
    const staticIPs = getStaticIPs();
    
    // Check for duplicate IP address
    const existingIP = staticIPs.find(ip => ip.ip_address === staticIPData.ip_address);
    if (existingIP) {
      throw new Error(`IP address ${staticIPData.ip_address} is already assigned as a static IP`);
    }
    
    // Check for duplicate MAC address if provided
    if (staticIPData.mac_address) {
      const existingMAC = staticIPs.find(ip => 
        ip.mac_address && ip.mac_address.toLowerCase() === staticIPData.mac_address.toLowerCase()
      );
      if (existingMAC) {
        throw new Error(`MAC address ${staticIPData.mac_address} is already assigned to another static IP`);
      }
    }
    
    const newStaticIP = {
      id: generateStaticIPId(),
      ip_address: staticIPData.ip_address,
      mac_address: staticIPData.mac_address || '',
      hostname: staticIPData.hostname || '',
      description: staticIPData.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    staticIPs.push(newStaticIP);
    
    if (saveStaticIPs(staticIPs)) {
      console.log('Static IP added successfully:', newStaticIP);
      return newStaticIP;
    } else {
      throw new Error('Failed to save static IP assignment');
    }
  } catch (error) {
    console.error('Error adding static IP:', error);
    throw error;
  }
};

/**
 * Update an existing static IP assignment
 */
export const updateStaticIP = (staticIPId, updateData) => {
  try {
    const staticIPs = getStaticIPs();
    const index = staticIPs.findIndex(ip => ip.id === staticIPId);
    
    if (index === -1) {
      throw new Error('Static IP assignment not found');
    }
    
    // Check for duplicate IP address (excluding current record)
    if (updateData.ip_address) {
      const existingIP = staticIPs.find(ip => 
        ip.id !== staticIPId && ip.ip_address === updateData.ip_address
      );
      if (existingIP) {
        throw new Error(`IP address ${updateData.ip_address} is already assigned as a static IP`);
      }
    }
    
    // Check for duplicate MAC address if provided (excluding current record)
    if (updateData.mac_address) {
      const existingMAC = staticIPs.find(ip => 
        ip.id !== staticIPId && 
        ip.mac_address && 
        ip.mac_address.toLowerCase() === updateData.mac_address.toLowerCase()
      );
      if (existingMAC) {
        throw new Error(`MAC address ${updateData.mac_address} is already assigned to another static IP`);
      }
    }
    
    // Update the static IP
    staticIPs[index] = {
      ...staticIPs[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    if (saveStaticIPs(staticIPs)) {
      console.log('Static IP updated successfully:', staticIPs[index]);
      return staticIPs[index];
    } else {
      throw new Error('Failed to save static IP changes');
    }
  } catch (error) {
    console.error('Error updating static IP:', error);
    throw error;
  }
};

/**
 * Delete a static IP assignment
 */
export const deleteStaticIP = (staticIPId) => {
  try {
    const staticIPs = getStaticIPs();
    const index = staticIPs.findIndex(ip => ip.id === staticIPId);
    
    if (index === -1) {
      throw new Error('Static IP assignment not found');
    }
    
    const deletedStaticIP = staticIPs[index];
    staticIPs.splice(index, 1);
    
    if (saveStaticIPs(staticIPs)) {
      console.log('Static IP deleted successfully:', deletedStaticIP);
      return true;
    } else {
      throw new Error('Failed to delete static IP assignment');
    }
  } catch (error) {
    console.error('Error deleting static IP:', error);
    throw error;
  }
};

/**
 * Check if an IP address is already assigned as a static IP
 */
export const isStaticIPAssigned = (ipAddress) => {
  const staticIPs = getStaticIPs();
  return staticIPs.some(ip => ip.ip_address === ipAddress);
};

/**
 * Get static IP assignment by IP address
 */
export const getStaticIPByAddress = (ipAddress) => {
  const staticIPs = getStaticIPs();
  return staticIPs.find(ip => ip.ip_address === ipAddress);
};

/**
 * Validate static IP data before saving
 */
export const validateStaticIPData = (data) => {
  const errors = [];
  
  // Validate IP address
  if (!data.ip_address) {
    errors.push('IP address is required');
  } else {
    // Basic IP address format validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(data.ip_address)) {
      errors.push('Invalid IP address format');
    } else {
      // Check if each octet is valid (0-255)
      const octets = data.ip_address.split('.');
      const invalidOctets = octets.filter(octet => {
        const num = parseInt(octet);
        return isNaN(num) || num < 0 || num > 255;
      });
      if (invalidOctets.length > 0) {
        errors.push('IP address octets must be between 0 and 255');
      }
    }
  }
  
  // Validate MAC address if provided
  if (data.mac_address) {
    const macRegex = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/;
    if (!macRegex.test(data.mac_address)) {
      errors.push('Invalid MAC address format (use AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF)');
    }
  }
  
  // Validate hostname if provided
  if (data.hostname) {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    if (!hostnameRegex.test(data.hostname)) {
      errors.push('Invalid hostname format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};
