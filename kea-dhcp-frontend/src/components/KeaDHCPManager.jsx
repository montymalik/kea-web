// KeaDHCPManager.jsx - Main Component (Refactored)
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { calculateIPStats, calculateLeaseStats, filterData, enrichReservationsWithLeaseStatus } from '../utils/utils';

// Import all components
import Header from './Header';
import TabNavigation from './TabNavigation';
import SearchBar from './SearchBar';
import IPStats from './IPStats';
import LeasesTable from './LeasesTable';
import ReservationsTable from './ReservationsTable';
import AddReservationModal from './AddReservationModal';
import ReservationDetailsModal from './ReservationDetailsModal';
import ModifyReservationModal from './ModifyReservationModal';
import { DeleteConfirmationModal, ModifyConfirmationModal } from './ConfirmationModals';
import LeaseStats from './LeaseStats';

const KeaDHCPManager = () => {
  // Sta:width: ,te management
  const [activeTab, setActiveTab] = useState('leases');
  const [leases, setLeases] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showDetailsCard, setShowDetailsCard] = useState(false);
  const [showModifyCard, setShowModifyCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showModifyConfirm, setShowModifyConfirm] = useState(false);
  
  // Form data states
  const [modifyData, setModifyData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [newReservation, setNewReservation] = useState({
    dhcp_identifier: '',
    subnet_id: '',
    ipv4_address: '',
    hostname: ''
  });

  // Computed values
  const ipStats = useMemo(() => calculateIPStats(reservations), [reservations]);
  const leaseStats = useMemo(() => calculateLeaseStats(leases), [leases]);
  const filteredLeases = useMemo(() => filterData(leases, searchTerm), [leases, searchTerm]);
  
  // Enrich reservations with lease status before filtering
  const enrichedReservations = useMemo(() => 
    enrichReservationsWithLeaseStatus(reservations, leases), 
    [reservations, leases]
  );
  const filteredReservations = useMemo(() => 
    filterData(enrichedReservations, searchTerm), 
    [enrichedReservations, searchTerm]
  );

  // Data fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.fetchAllData();
      if (data.leases) setLeases(data.leases);
      if (data.reservations) setReservations(data.reservations);
      if (data.subnets) setSubnets(data.subnets);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error connecting to the server. Make sure the backend is running.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
  const deleteReservation = async (hostId) => {
    try {
      const success = await api.deleteReservation(hostId);
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
      // Delete old reservation and create new one
      await api.deleteReservation(selectedReservation.host_id);
      await api.createReservation(modifyData);
      
      await fetchData();
      closeAllModals();
      alert('Reservation updated successfully');
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert(`Error updating reservation: ${error.message}`);
    }
  };

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

  // Modal handlers
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

  const closeAllModals = () => {
    setShowDetailsCard(false);
    setShowModifyCard(false);
    setShowDeleteConfirm(false);
    setShowModifyConfirm(false);
    setSelectedReservation(null);
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
        />

        {activeTab === 'leases' && <LeaseStats leaseStats={leaseStats} leases={filteredLeases} />}
        {activeTab === 'reservations' && <IPStats ipStats={ipStats} enrichedReservations={enrichedReservations} />}

        <SearchBar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeTab={activeTab}
          onAddReservation={() => setShowAddForm(true)}
        />

        {activeTab === 'leases' && (
          <LeasesTable 
            leases={filteredLeases}
            onDeleteLease={deleteLease}
          />
        )}

        {activeTab === 'reservations' && (
          <ReservationsTable 
            reservations={filteredReservations}
            onOpenDetails={openDetailsCard}
          />
        )}

        {/* Modals */}
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

        <DeleteConfirmationModal
          show={showDeleteConfirm}
          reservation={selectedReservation}
          onConfirm={() => deleteReservation(selectedReservation.host_id)}
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
