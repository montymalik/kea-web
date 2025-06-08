// api.js - API service functions
const API_BASE = '/api';

export const api = {
  // Fetch all data
  async fetchAllData() {
    const [leasesRes, reservationsRes, subnetsRes] = await Promise.all([
      fetch(`${API_BASE}/leases`),
      fetch(`${API_BASE}/reservations`),
      fetch(`${API_BASE}/subnets`)
    ]);

    const data = {};
    if (leasesRes.ok) data.leases = await leasesRes.json();
    if (reservationsRes.ok) data.reservations = await reservationsRes.json();
    if (subnetsRes.ok) data.subnets = await subnetsRes.json();
    
    return data;
  },

  // Lease operations
  async deleteLease(ipAddress) {
    const response = await fetch(`${API_BASE}/leases/${ipAddress}`, {
      method: 'DELETE'
    });
    return response.ok;
  },

  // Reservation operations
  async deleteReservation(hostId) {
    const response = await fetch(`${API_BASE}/reservations/${hostId}`, {
      method: 'DELETE'
    });
    return response.ok;
  },

  async createReservation(reservationData) {
    const response = await fetch(`${API_BASE}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reservationData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return response.json();
  },

  async getNextAvailableIP(subnetId) {
    const response = await fetch(`${API_BASE}/available-ips/subnet/${subnetId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return response.json();
  }
};
