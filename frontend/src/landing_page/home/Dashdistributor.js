import React, { useState, useEffect } from "react";
import SideDistributor from "../SidebarDistributor";
import ShipmentTracking from "../Googlemaps/ShipmentTracking.js";
import axios from 'axios';
import "./DashDistributor.css";
import { useAuth } from '../user_login/AuthContext';
import ThemeToggle from "./ThemeToggle.js";

function Dashdistruibtor() {
  const { userId } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [manufacturers, setManufacturers] = useState({});
  const [wholesalers, setWholesalers] = useState({});
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipmentLoading, setShipmentLoading] = useState({});
  const [driverShipments, setDriverShipments] = useState({});
  const [expandedDrivers, setExpandedDrivers] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => {
    if (userId) {
      fetchInitialData();
    }
  }, [userId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const driversResponse = await axios.post('http://127.0.0.1:5000/fetch_drivers_for_distributor', {
        driver_org_actual: userId
      });
      setDrivers(driversResponse.data.users);

      const manufacturersResponse = await axios.get('http://127.0.0.1:5000/get_manufacturer_users');
      const wholesalersResponse = await axios.get('http://127.0.0.1:5000/get_wholesaler_users');
      setManufacturers(manufacturersResponse.data);
      setWholesalers(wholesalersResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again.');
      setLoading(false);
    }
  };
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  

  const handleFetchShipments = async (driverId) => {
    try {
      setShipmentLoading(prev => ({ ...prev, [driverId]: true }));
      const response = await axios.post('http://127.0.0.1:5000/fetch_shipments', {
        driver_id: driverId
      });
      
      const fetchedShipments = response.data.shipments || [];
      setDriverShipments(prev => ({
        ...prev,
        [driverId]: fetchedShipments
      }));
      setExpandedDrivers(prev => ({
        ...prev,
        [driverId]: true
      }));

      if (fetchedShipments.length === 0) {
        alert('No active shipments found for this driver');
      }
    } catch (error) {
      console.error('Error fetching driver shipments:', error);
      alert('Error fetching shipment data');
    } finally {
      setShipmentLoading(prev => ({ ...prev, [driverId]: false }));
    }
  };

  const handleTrackShipment = (shipment) => {
    try {
      const routeData = JSON.parse(shipment.route_data);
      setSelectedShipment({
        cartId: shipment.cart_id,
        startLocation: routeData.metadata.startLocation,
        checkpoint: routeData.metadata.checkpoint,
        destination: routeData.metadata.destination
      });
      setIsMapOpen(true);
    } catch (error) {
      console.error('Error parsing shipment data:', error);
      alert('Error processing shipment data');
    }
  };

  const getOrganizationName = (orgId) => {
    const manufacturerEntry = Object.entries(manufacturers).find(([_, id]) => id === orgId);
    if (manufacturerEntry) return manufacturerEntry[0];
    
    const wholesalerEntry = Object.entries(wholesalers).find(([_, id]) => id === orgId);
    if (wholesalerEntry) return wholesalerEntry[0];
    
    return `Organization ${orgId}`;
  };

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => d.driver_online === 1).length;
  const occupiedDrivers = drivers.filter(d => d.driver_occupied === 1).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button className="retry-button" onClick={fetchInitialData}>
          Retry
        </button>
      </div>
    );
  }

  return (
      <div className={`distributor-command-center ${isDarkMode ? '' : 'light-mode'}`}>
    <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
    <SideDistributor />
      
      <div className="command-center-main">
        <h1 className="command-center-heading">
          <span className="heading-accent">Distributor</span> Dashboard
        </h1>
        
        <div className="analytics-grid">
          <div className="analytics-tile">
            <div className="analytics-icon-wrapper">
              <i className="fas fa-users"></i>
            </div>
            <div className="analytics-data">
              <h3 className="analytics-label">Total Drivers</h3>
              <p className="analytics-value">{totalDrivers}</p>
            </div>
          </div>
  
          <div className="analytics-tile">
            <div className="analytics-icon-wrapper">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="analytics-data">
              <h3 className="analytics-label">Active Drivers</h3>
              <p className="analytics-value">{activeDrivers}</p>
            </div>
          </div>
  
          <div className="analytics-tile">
            <div className="analytics-icon-wrapper">
              <i className="fas fa-truck"></i>
            </div>
            <div className="analytics-data">
              <h3 className="analytics-label">Occupied Drivers</h3>
              <p className="analytics-value">{occupiedDrivers}</p>
            </div>
          </div>
        </div>
  
        <div className="fleet-grid">
          {drivers.map(driver => (
            <div key={driver.generated_unique_id} className="fleet-member-card">
              <div className="fleet-member-header">
                <div className="fleet-member-identity">
                  <i className="fas fa-user-circle fleet-member-avatar"></i>
                  <div>
                    <h3 className="fleet-member-name">{driver.user_name}</h3>
                    <span className="fleet-member-org">{getOrganizationName(driver.driver_org)}</span>
                  </div>
                </div>
                <span className={`fleet-status-indicator ${driver.driver_online ? 'active' : 'inactive'}`}>
                  {driver.driver_online ? 'Online' : 'Offline'}
                </span>
              </div>
  
              <div className="fleet-member-details">
                <div className="fleet-detail-row">
                  <span className="fleet-detail-label">Status:</span>
                  <span className={`fleet-detail-value ${driver.driver_occupied ? 'occupied' : 'availableee'}`}>
                    {driver.driver_occupied ? 'Occupied' : 'Available'}
                  </span>
                </div>
                <div className="fleet-detail-row">
                  <span className="fleet-detail-label">Driver ID:</span>
                  <span className="fleet-detail-value">{driver.generated_unique_id}</span>
                </div>
              </div>
  
              <div className="shipment-controls">
                {!driverShipments[driver.generated_unique_id] ? (
                  <button 
                    className="fetch-shipment-btn"
                    onClick={() => handleFetchShipments(driver.generated_unique_id)}
                    disabled={shipmentLoading[driver.generated_unique_id]}
                  >
                    {shipmentLoading[driver.generated_unique_id] ? (
                      <>
                        <div className="loading-indicator"></div>
                        <span>Fetching Shipments...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-truck-loading"></i>
                        <span>View Active Shipments</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="shipment-list-container">
                    <div className="shipment-list-header">
                      <h4 className="shipment-list-title">Active Shipments</h4>
                      <button 
                        className="refresh-shipment-btn"
                        onClick={() => handleFetchShipments(driver.generated_unique_id)}
                      >
                        <i className="fas fa-sync-alt"></i>
                      </button>
                    </div>
                    {driverShipments[driver.generated_unique_id].length > 0 ? (
                      driverShipments[driver.generated_unique_id].map(shipment => (
                        <div key={shipment.cart_id} className="shipment-card">
                          <div className="shipment-info">
                            <div className="shipment-info-item">
                              <i className="fas fa-box"></i>
                              Cart ID: {shipment.cart_id}
                            </div>
                            <div className="shipment-info-item">
                              <i className="fas fa-clock"></i>
                              Status: {shipment.status}
                            </div>
                          </div>
                          <button 
                            className="track-shipment-btn"
                            onClick={() => handleTrackShipment(shipment)}
                          >
                            <i className="fas fa-map-marker-alt"></i>
                            Show Live Tracking
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="shipment-info-item">No active shipments found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
  
      {isMapOpen && selectedShipment && (
        <div className="map-overlay">
          <div className="map-container">
            <div className="map-header">
              <h3 className="map-title">Live Tracking - Cart ID: {selectedShipment.cartId}</h3>
              <button 
                className="close-map-btn"
                onClick={() => setIsMapOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <ShipmentTracking
              userRole="distributor"
              userId={userId}
              cartId={selectedShipment.cartId}
              initialStartLocation={selectedShipment.startLocation}
              initialCheckpoint={selectedShipment.checkpoint}
              initialDestination={selectedShipment.destination}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashdistruibtor;