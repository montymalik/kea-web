import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Plus, RefreshCw, Network, Monitor, Edit, X, Check } from 'lucide-react';

// API configuration - using proxy to avoid CORS
const API_BASE = '/api';

const KeaDHCPManager = () => {
  const [activeTab, setActiveTab] = useState('leases');
  const [leases, setLeases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailsCard, setShowDetailsCard] = useState(false);
  const [showModifyCard, setShowModifyCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModifyConfirm, setShowModifyConfirm] = useState(false);
  const [modifyData, setModifyData] = useState({});
  const [originalData, setOriginalData] = useState({});

  // Form state for adding reservations
  const [newReservation, setNewReservation] = useState({
    dhcp_identifier: '',
    subnet_id: '',
    ipv4_address: '',
    hostname: ''
  });

  // IP statistics calculation using useMemo
  const ipStats = useMemo(() => {
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
  }, [reservations]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leasesRes, reservationsRes, subnetsRes] = await Promise.all([
        fetch(`${API_BASE}/leases`),
        fetch(`${API_BASE}/reservations`),
        fetch(`${API_BASE}/subnets`)
      ]);

      if (leasesRes.ok) setLeases(await leasesRes.json());
      if (reservationsRes.ok) setReservations(await reservationsRes.json());
      if (subnetsRes.ok) setSubnets(await subnetsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error connecting to the server. Make sure the backend is running.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteLease = async (ipAddress) => {
    if (!confirm(`Delete lease for ${ipAddress}?`)) return;
    
    try {
      const response = await fetch(`${API_BASE}/leases/${ipAddress}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchData();
        alert('Lease deleted successfully');
      } else {
        alert('Failed to delete lease');
      }
    } catch (error) {
      console.error('Error deleting lease:', error);
      alert('Error deleting lease');
    }
  };

  const deleteReservation = async (hostId) => {
    try {
      const response = await fetch(`${API_BASE}/reservations/${hostId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchData();
        setShowDetailsCard(false);
        setShowDeleteConfirm(false);
        alert('Reservation deleted successfully');
      } else {
        alert('Failed to delete reservation');
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      alert('Error deleting reservation');
    }
  };

  const openDetailsCard = (reservation) => {
    setSelectedReservation(reservation);
    setShowDetailsCard(true);
  };

  const openModifyCard = () => {
    setModifyData({
      dhcp_identifier: selectedReservation.mac_address,
      subnet_id: selectedReservation.subnet_id,
      ipv4_address: selectedReservation.ip_address,
      hostname: selectedReservation.hostname || ''
    });
    setOriginalData({
      dhcp_identifier: selectedReservation.mac_address,
      subnet_id: selectedReservation.subnet_id,
      ipv4_address: selectedReservation.ip_address,
      hostname: selectedReservation.hostname || ''
    });
    setShowDetailsCard(false);
    setShowModifyCard(true);
  };

  const handleModifySubmit = () => {
    setShowModifyConfirm(true);
  };

  const updateReservation = async () => {
    try {
      const deleteResponse = await fetch(`${API_BASE}/reservations/${selectedReservation.host_id}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete old reservation');
      }

      const createResponse = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(modifyData)
      });
      
      if (createResponse.ok) {
        await fetchData();
        setShowModifyCard(false);
        setShowModifyConfirm(false);
        setSelectedReservation(null);
        alert('Reservation updated successfully');
      } else {
        const error = await createResponse.json();
        alert(`Failed to update reservation: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Error updating reservation');
    }
  };

  const closeAllModals = () => {
    setShowDetailsCard(false);
    setShowModifyCard(false);
    setShowDeleteConfirm(false);
    setShowModifyConfirm(false);
    setSelectedReservation(null);
  };

  const addReservation = async () => {
    try {
      const response = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newReservation)
      });
      
      if (response.ok) {
        await fetchData();
        setShowAddForm(false);
        setNewReservation({
          dhcp_identifier: '',
          subnet_id: '',
          ipv4_address: '',
          hostname: ''
        });
        alert('Reservation added successfully');
      } else {
        const error = await response.json();
        alert(`Failed to add reservation: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding reservation:', error);
      alert('Error adding reservation');
    }
  };

  const getNextAvailableIP = async () => {
    if (!newReservation.subnet_id) {
      alert('Please select a subnet first');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/available-ips/subnet/${newReservation.subnet_id}`);
      
      if (response.ok) {
        const data = await response.json();
        setNewReservation({...newReservation, ipv4_address: data.nextAvailableIP});
      } else {
        const error = await response.json();
        alert(`No available IPs found: ${error.error}`);
      }
    } catch (error) {
      console.error('Error fetching next available IP:', error);
      alert('Error fetching next available IP');
    }
  };

  const formatExpiration = (expiresAt) => {
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

  const formatMacAddress = (macAddress) => {
    if (!macAddress) return 'N/A';
    return macAddress.toUpperCase();
  };

  const filteredLeases = leases.filter(lease =>
    lease.ip_address.includes(searchTerm) ||
    (lease.hostname && lease.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    lease.mac_address.includes(searchTerm.toUpperCase())
  );

  const filteredReservations = reservations.filter(reservation =>
    reservation.ip_address.includes(searchTerm) ||
    (reservation.hostname && reservation.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    reservation.mac_address.includes(searchTerm.toUpperCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Network className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Kea DHCP Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('leases')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leases'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Monitor className="h-4 w-4" />
                <span>Active Leases ({leases.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reservations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Network className="h-4 w-4" />
                <span>Reservations ({reservations.length})</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Simple IP Statistics - text only */}
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Subnet 1 IP Status</h3>
                <p className="text-sm text-gray-600">Range: 192.168.1.1 - 192.168.1.100</p>
              </div>
              
              <div className="flex space-x-8 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{ipStats.total}</div>
                  <div className="text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">{ipStats.reserved}</div>
                  <div className="text-gray-500">Reserved</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{ipStats.available}</div>
                  <div className="text-gray-500">Available</div>
                </div>
                <div className="text-center">
                  <div className={`font-semibold ${
                    ipStats.status === 'Low' ? 'text-red-600' : 
                    ipStats.status === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {ipStats.status}
                  </div>
                  <div className="text-gray-500">Status</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by IP, hostname, or MAC address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
          
          {activeTab === 'reservations' && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Reservation</span>
            </button>
          )}
        </div>

        {/* Active Leases Tab */}
        {activeTab === 'leases' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MAC Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hostname
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subnet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeases.map((lease) => (
                    <tr key={lease.ip_address} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lease.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {formatMacAddress(lease.mac_address)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lease.hostname || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lease.subnet_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          lease.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {lease.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatExpiration(lease.expires_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => deleteLease(lease.ip_address)}
                          className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeases.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No active leases found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MAC Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hostname
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subnet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.host_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => openDetailsCard(reservation)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {reservation.ip_address}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {formatMacAddress(reservation.mac_address)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.hostname || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.subnet_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => openDetailsCard(reservation)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReservations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No reservations found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Reservation Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Reservation</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="aa:bb:cc:dd:ee:ff"
                    value={newReservation.dhcp_identifier}
                    onChange={(e) => setNewReservation({...newReservation, dhcp_identifier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="192.168.1.100"
                      value={newReservation.ipv4_address}
                      onChange={(e) => setNewReservation({...newReservation, ipv4_address: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={getNextAvailableIP}
                      className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                    >
                      Next Available
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subnet ID
                  </label>
                  <select
                    required
                    value={newReservation.subnet_id}
                    onChange={(e) => setNewReservation({...newReservation, subnet_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Subnet</option>
                    {subnets.map(subnet => (
                      <option key={subnet.subnet_id} value={subnet.subnet_id}>
                        {subnet.subnet_id} - {subnet.subnet_prefix}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hostname (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="hostname"
                    value={newReservation.hostname}
                    onChange={(e) => setNewReservation({...newReservation, hostname: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addReservation}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Add Reservation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reservation Details Card */}
        {showDetailsCard && selectedReservation && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Reservation Details</h3>
                <button
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">IP Address</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedReservation.ip_address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">MAC Address</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedReservation.mac_address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Subnet ID</label>
                    <p className="text-sm text-gray-900">{selectedReservation.subnet_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Host ID</label>
                    <p className="text-sm text-gray-900">{selectedReservation.host_id}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Hostname</label>
                    <p className="text-sm text-gray-900">{selectedReservation.hostname || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={openModifyCard}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4" />
                  <span>Modify</span>
                </button>
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modify Reservation Card */}
        {showModifyCard && selectedReservation && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Modify Reservation</h3>
                <button
                  onClick={closeAllModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MAC Address
                  </label>
                  <input
                    type="text"
                    value={modifyData.dhcp_identifier}
                    onChange={(e) => setModifyData({...modifyData, dhcp_identifier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={modifyData.ipv4_address}
                    onChange={(e) => setModifyData({...modifyData, ipv4_address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subnet ID
                  </label>
                  <select
                    value={modifyData.subnet_id}
                    onChange={(e) => setModifyData({...modifyData, subnet_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subnets.map(subnet => (
                      <option key={subnet.subnet_id} value={subnet.subnet_id}>
                        {subnet.subnet_id} - {subnet.subnet_prefix}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hostname
                  </label>
                  <input
                    type="text"
                    value={modifyData.hostname}
                    onChange={(e) => setModifyData({...modifyData, hostname: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeAllModals}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModifySubmit}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <Check className="h-4 w-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedReservation && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete the reservation for <strong>{selectedReservation.ip_address}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteReservation(selectedReservation.host_id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modify Confirmation Modal */}
        {showModifyConfirm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Changes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please review the changes below and confirm:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="font-medium text-gray-700">Field</div>
                  <div className="font-medium text-gray-700">Current</div>
                  <div className="font-medium text-gray-700">New</div>
                  
                  <div className="text-gray-600">MAC Address</div>
                  <div className="font-mono text-xs">{originalData.dhcp_identifier}</div>
                  <div className={`font-mono text-xs ${originalData.dhcp_identifier !== modifyData.dhcp_identifier ? 'text-blue-600 font-medium' : ''}`}>
                    {modifyData.dhcp_identifier}
                  </div>
                  
                  <div className="text-gray-600">IP Address</div>
                  <div className="font-mono text-xs">{originalData.ipv4_address}</div>
                  <div className={`font-mono text-xs ${originalData.ipv4_address !== modifyData.ipv4_address ? 'text-blue-600 font-medium' : ''}`}>
                    {modifyData.ipv4_address}
                  </div>
                  
                  <div className="text-gray-600">Subnet ID</div>
                  <div>{originalData.subnet_id}</div>
                  <div className={originalData.subnet_id !== modifyData.subnet_id ? 'text-blue-600 font-medium' : ''}>
                    {modifyData.subnet_id}
                  </div>
                  
                  <div className="text-gray-600">Hostname</div>
                  <div>{originalData.hostname || 'N/A'}</div>
                  <div className={originalData.hostname !== modifyData.hostname ? 'text-blue-600 font-medium' : ''}>
                    {modifyData.hostname || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModifyConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={updateReservation}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Confirm Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeaDHCPManager;
