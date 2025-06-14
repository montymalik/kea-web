// Updated KeaDHCPManager.jsx - Main component with Static IP support

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { calculateIPStats, filterData, enrichReservationsWithLeaseStatus, calculateLeaseStats } from '../utils/utils';

// Import all components
import Header from './Header';
import TabNavigation from './TabNavigation';
import SearchBar from './SearchBar';
import IPStats from './IPStats';
import LeaseStats from './LeaseStats';
import LeasesTable from './LeasesTable';
import ReservationsTable from './ReservationsTable';
import StaticIPTable from './StaticIPTable';
import AddReservationModal from './AddReservationModal';
import AddStaticIPModal from './AddStaticIPModal';
import ReservationDetailsModal from './ReservationDetailsModal';
import StaticIPDetailsModal from './StaticIPDetailsModal';
import EditStaticIPModal from './EditStaticIPModal';
import ModifyReservationModal from './ModifyReservationModal';
import HAStatusModal from './HAStatusModal';
import { DeleteConfirmationModal, ModifyConfirmationModal } from './ConfirmationModals';

const KeaDHCPManager = () => {
  // State management
  const [activeTab, setActiveTab] = useState('leases');
  const [leases, setLeases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [staticIPs, setStaticIPs] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [reservedPool, setReservedPool] = useState(null);
  const [haStatus, setHaStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
    
  // Modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddStaticIPForm, setShowAddStaticIPForm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedStaticIP, setSelectedStaticIP] = useState(null);
  const [showDetailsCard, setShowDetailsCard] = useState(false);
  const [showStaticIPDetails, setShowStaticIPDetails] = useState(false);
  const [showModifyCard, setShowModifyCard] = useState(false);
  const [showEditStaticIP, setShowEditStaticIP] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModifyConfirm, setShowModifyConfirm] = useState(false);
  const [showHAStatusModal, setShowHAStatusModal] = useState(false);
    
  // Form data states
  const [modifyData, setModifyData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [newReservation, setNewReservation] = useState({
    dhcp_identifier: '',
    subnet_id: '',
    ipv4_address: '',
    hostname: ''
  });
  const [newStaticIP, setNewStaticIP] = useState({
    ip_address: '',
    mac_address: '',
    hostname: '',
    description: ''
  });
  const [editStaticIP, setEditStaticIP] = useState({
    ip_address: '',
    mac_address: '',
    hostname: '',
    description: ''
  });

  // Computed values - Now includes static IPs in IP stats calculation
  const ipStats = useMemo(() => {
    console.log('Calculating IP stats with reservedPool:', reservedPool, 'and staticIPs:', staticIPs.length);
    return calculateIPStats(reservations, staticIPs, reservedPool, 1);
  }, [reservations, staticIPs, reservedPool]);
    
  const leaseStats = useMemo(() => {
    console.log('Calculating lease stats with:', leases.length, 'leases and subnets:', subnets.length, 'subnets');
    
    try {
      const stats = calculateLeaseStats(leases, subnets, 1);
      console.log('Lease stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('Error calculating lease stats:', error);
      return {
        total: 254,
        active: 0,
        available: 254,
        status: 'Good',
        subnetCidr: 'Unknown'
      };
    }
  }, [leases, subnets]);
    
  const filteredLeases = useMemo(() => {
    console.log('Filtering leases:', leases.length, 'total leases, search term:', searchTerm);
    const filtered = filterData(leases, searchTerm);
    console.log('Filtered leases:', filtered.length);
    return filtered;
  }, [leases, searchTerm]);
    
  // Enrich reservations with lease status before filtering
  const enrichedReservations = useMemo(() => 
    enrichReservationsWithLeaseStatus(reservations, leases), 
    [reservations, leases]
  );
  const filteredReservations = useMemo(() => 
    filterData(enrichedReservations, searchTerm), 
    [enrichedReservations, searchTerm]
  );

  // Filter static IPs
  const filteredStaticIPs = useMemo(() => 
    filterData(staticIPs, searchTerm), 
    [staticIPs, searchTerm]
  );

  // Data fetching - Updated to include static IPs
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both primary data and HA status concurrently
      const [allData, haStatusData] = await Promise.all([
        api.fetchAllData(),
        api.getHAStatus()
      ]);

      console.log('Raw API data (leases, reservations, subnets, reservedPool, staticIPs):', allData);
      console.log('HA Status data received:', haStatusData);

      if (allData.leases) {
        console.log('Setting leases:', allData.leases.length, 'leases');
        setLeases(allData.leases);
      } else {
        console.log('No leases data received');
        setLeases([]);
      }
        
      if (allData.reservations) {
        console.log('Setting reservations:', allData.reservations.length, 'reservations');
        setReservations(allData.reservations);
      } else {
        console.log('No reservations data received');
        setReservations([]);
      }

      if (allData.staticIPs) {
        console.log('Setting static IPs:', allData.staticIPs.length, 'static IPs');
        setStaticIPs(allData.staticIPs);
      } else {
        console.log('No static IPs data received');
        setStaticIPs([]);
      }
        
      if (allData.subnets) {
        console.log('Setting subnets:', allData.subnets.length, 'subnets');
        setSubnets(allData.subnets);
      } else {
        console.log('No subnets data received');
        setSubnets([]);
      }

      if (allData.reservedPool) {
        console.log('Setting reserved pool config:', allData.reservedPool);
        setReservedPool(allData.reservedPool);
      } else {
        console.log('No reserved pool config received');
        setReservedPool(null);
      }

      // Set HA status
      if (haStatusData) {
        console.log('Setting HA status:', haStatusData);
        if (haStatusData.configured === false) {
          console.log('HA not configured, setting haStatus to null');
          setHaStatus(null);
        } else {
          setHaStatus(haStatusData);
        }
      } else {
        console.log('No HA status data received');
        setHaStatus(null);
      }
    } catch (error) {
      console.error('Error fetching data or HA status:', error);
      alert('Error connecting to the server. Make sure the backend is running.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // HA STATUS HANDLERS
  const handleHAStatusClick = () => {
    console.log('HA Status clicked, current status:', haStatus);
    setShowHAStatusModal(true);
  };

  const refreshHAStatus = async () => {
    try {
      console.log('Refreshing HA status...');
      const haStatusData = await api.getHAStatus();
      console.log('Refreshed HA status:', haStatusData);
      setHaStatus(haStatusData);
    } catch (error) {
      console.error('Error refreshing HA status:', error);
      alert('Error refreshing HA status');
    }
  };

  // Lease operations
  const deleteLease = async (ipAddress) => {
    if (!confirm(`Delete lease for ${ipAddress}?`)) return;
    
    try {
      const success = await api.deleteLease(ipAddress);
      if (success) {
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

  // Reservation operations
  const deleteReservation = async (reservation) => {
    try {
      const success = await api.deleteReservation(reservation);
      if (success) {
        await fetchData();
        closeAllModals();
        alert('Reservation deleted successfully');
      } else {
        alert('Failed to delete reservation');
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      alert('Error deleting reservation');
    }
  };

  const addReservation = async () => {
    try {
      await api.createReservation(newReservation);
      await fetchData();
      setShowAddForm(false);
      setNewReservation({
        dhcp_identifier: '',
        subnet_id: '',
        ipv4_address: '',
        hostname: ''
      });
      alert('Reservation added successfully');
    } catch (error) {
      console.error('Error adding reservation:', error);
      alert(`Failed to add reservation: ${error.message}`);
    }
  };

  const updateReservation = async () => {
    try {
      await api.updateReservation(selectedReservation.host_id, modifyData, originalData);
      
      await fetchData();
      closeAllModals();
      
      if (originalData.ipv4_address !== modifyData.ipv4_address) {
        alert(`Reservation updated successfully!\n\nIP changed from ${originalData.ipv4_address} to ${modifyData.ipv4_address}.\nOld lease has been deleted. The device should request the new IP on next DHCP renewal.`);
      } else {
        alert('Reservation updated successfully');
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert(`Error updating reservation: ${error.message}`);
    }
  };

  // Static IP operations
  const addStaticIPAssignment = async () => {
    try {
      await api.addStaticIPAssignment(newStaticIP);
      await fetchData();
      setShowAddStaticIPForm(false);
      setNewStaticIP({
        ip_address: '',
        mac_address: '',
        hostname: '',
        description: ''
      });
      alert('Static IP assignment added successfully');
    } catch (error) {
      console.error('Error adding static IP:', error);
      alert(`Failed to add static IP: ${error.message}`);
    }
  };

  const editStaticIPAssignment = async () => {
    try {
      await api.updateStaticIPAssignment(selectedStaticIP.id, editStaticIP);
      await fetchData();
      closeAllModals();
      alert('Static IP assignment updated successfully');
    } catch (error) {
      console.error('Error updating static IP:', error);
      alert(`Error updating static IP: ${error.message}`);
    }
  };

  const deleteStaticIPAssignment = async (staticIP) => {
    if (!confirm(`Delete static IP assignment for ${staticIP.ip_address}?`)) return;
    
    try {
      const success = await api.deleteStaticIPAssignment(staticIP.id);
      if (success) {
        await fetchData();
        closeAllModals();
        alert('Static IP assignment deleted successfully');
      } else {
        alert('Failed to delete static IP assignment');
      }
    } catch (error) {
      console.error('Error deleting static IP:', error);
      alert('Error deleting static IP assignment');
    }
  };

  // Enhanced next available IP function (considers static IPs)
  const getNextAvailableIP = async () => {
    if (!newReservation.subnet_id) {
      alert('Please select a subnet first');
      return;
    }
    
    try {
      const data = await api.getNextAvailableIP(newReservation.subnet_id);
      setNewReservation({...newReservation, ipv4_address: data.nextAvailableIP});
    } catch (error) {
      console.error('Error fetching next available IP:', error);
      alert(`No available IPs found: ${error.message}`);
    }
  };

  // Enhanced next available IP for static IPs
  const getNextAvailableIPForStatic = async () => {
    try {
      const data = await api.getNextAvailableIP(1); // Assuming subnet 1
      setNewStaticIP({...newStaticIP, ip_address: data.nextAvailableIP});
    } catch (error) {
      console.error('Error fetching next available IP for static assignment:', error);
      alert(`No available IPs found: ${error.message}`);
    }
  };

  // Modal handlers for reservations
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

  // Modal handlers for static IPs
  const openStaticIPDetails = (staticIP) => {
    setSelectedStaticIP(staticIP);
    setShowStaticIPDetails(true);
  };

  const openEditStaticIP = (staticIP) => {
    setSelectedStaticIP(staticIP);
    setEditStaticIP({
      ip_address: staticIP.ip_address,
      mac_address: staticIP.mac_address || '',
      hostname: staticIP.hostname || '',
      description: staticIP.description || ''
    });
    setShowStaticIPDetails(false);
    setShowEditStaticIP(true);
  };

  const closeAllModals = () => {
    setShowDetailsCard(false);
    setShowStaticIPDetails(false);
    setShowModifyCard(false);
    setShowEditStaticIP(false);
    setShowDeleteConfirm(false);
    setShowModifyConfirm(false);
    setShowHAStatusModal(false);
    setSelectedReservation(null);
    setSelectedStaticIP(null);
  };

  const handleModifySubmit = () => {
    setShowModifyConfirm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header loading={loading} onRefresh={fetchData} />
        
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TabNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          leasesCount={leases.length}
          reservationsCount={reservations.length}
          staticIPsCount={staticIPs.length}
        />

        {activeTab === 'leases' && leaseStats && (
          <LeaseStats 
            leaseStats={leaseStats} 
            leases={filteredLeases}
            haStatus={haStatus}
            onHAStatusClick={handleHAStatusClick}
          />
        )}
        {activeTab === 'reservations' && (
          <IPStats 
            ipStats={ipStats} 
            enrichedReservations={enrichedReservations}
            staticIPs={staticIPs}
            haStatus={haStatus}
            onHAStatusClick={handleHAStatusClick}
          />
        )}
        {activeTab === 'static-ips' && (
          <IPStats 
            ipStats={ipStats} 
            enrichedReservations={enrichedReservations}
            staticIPs={staticIPs}
            haStatus={haStatus}
            onHAStatusClick={handleHAStatusClick}
          />
        )}

        <SearchBar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeTab={activeTab}
          onAddReservation={() => setShowAddForm(true)}
          onAddStaticIP={() => setShowAddStaticIPForm(true)}
        />

        {activeTab === 'leases' && (
          <>
            {loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-500">Loading leases...</div>
              </div>
            ) : (
              <LeasesTable 
                leases={filteredLeases}
                onDeleteLease={deleteLease}
              />
            )}
          </>
        )}

        {activeTab === 'reservations' && (
          <ReservationsTable 
            reservations={filteredReservations}
            onOpenDetails={openDetailsCard}
          />
        )}

        {activeTab === 'static-ips' && (
          <StaticIPTable 
            staticIPs={filteredStaticIPs}
            onOpenDetails={openStaticIPDetails}
            onEdit={openEditStaticIP}
            onDelete={deleteStaticIPAssignment}
          />
        )}

        {/* Reservation Modals */}
        <AddReservationModal
          show={showAddForm}
          onClose={() => setShowAddForm(false)}
          newReservation={newReservation}
          setNewReservation={setNewReservation}
          subnets={subnets}
          onSubmit={addReservation}
          onGetNextAvailableIP={getNextAvailableIP}
        />

        <ReservationDetailsModal
          show={showDetailsCard}
          reservation={selectedReservation}
          onClose={closeAllModals}
          onDelete={() => setShowDeleteConfirm(true)}
          onModify={openModifyCard}
        />

        <ModifyReservationModal
          show={showModifyCard}
          modifyData={modifyData}
          setModifyData={setModifyData}
          subnets={subnets}
          onClose={closeAllModals}
          onSubmit={handleModifySubmit}
        />

        {/* Static IP Modals */}
        <AddStaticIPModal
          show={showAddStaticIPForm}
          onClose={() => setShowAddStaticIPForm(false)}
          newStaticIP={newStaticIP}
          setNewStaticIP={setNewStaticIP}
          onSubmit={addStaticIPAssignment}
          onGetNextAvailableIP={getNextAvailableIPForStatic}
        />

        <StaticIPDetailsModal
          show={showStaticIPDetails}
          staticIP={selectedStaticIP}
          onClose={closeAllModals}
          onEdit={openEditStaticIP}
          onDelete={deleteStaticIPAssignment}
        />

        <EditStaticIPModal
          show={showEditStaticIP}
          editStaticIP={editStaticIP}
          setEditStaticIP={setEditStaticIP}
          onClose={closeAllModals}
          onSubmit={editStaticIPAssignment}
        />

        {/* System Modals */}
        <HAStatusModal
          show={showHAStatusModal}
          haStatus={haStatus}
          onClose={() => setShowHAStatusModal(false)}
          onRefresh={refreshHAStatus}
        />

        <DeleteConfirmationModal
          show={showDeleteConfirm}
          reservation={selectedReservation}
          onConfirm={() => deleteReservation(selectedReservation)}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        <ModifyConfirmationModal
          show={showModifyConfirm}
          originalData={originalData}
          modifyData={modifyData}
          onConfirm={updateReservation}
          onCancel={() => setShowModifyConfirm(false)}
        />
      </div>
    </div>
  );
};

export default KeaDHCPManager;
