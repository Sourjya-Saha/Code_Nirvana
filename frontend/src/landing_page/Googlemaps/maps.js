// //Js code for my website
// import React, { useState, useEffect, useRef } from "react";
// import L from "leaflet";
// import { Menu, X, RefreshCw } from 'lucide-react';
// import "leaflet-routing-machine";
// import "leaflet/dist/leaflet.css";
// import { io } from "socket.io-client";
// import axios from 'axios';
// import './ShowAssignedDrivers'
// import './ShipmentTrackingStyles.css'
// import ShowAssignedDrivers from "./ShowAssignedDrivers";
// // Constants
// const SOCKET_SERVER = "http://localhost:8000";
// const API_URL = "http://localhost:8000/api";

// const ShipmentTracking = ({ 
//   userRole, 
//   userId,
//   cartId,
//   initialStartLocation = '',
//   initialCheckpoint = '',
//   initialDestination = '' 
// }) => {
//   // ... (previous state management code remains the same)

//   // New state for driver assignment
//   const [showDriverModal, setShowDriverModal] = useState(false);
//   const [drivers, setDrivers] = useState([]);
//   const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
//   const [locationNames, setLocationNames] = useState({
//     start: '',
//     checkpoint: '',
//     destination: ''
//   });
//   const [isAuthorized, setIsAuthorized] = useState(false);
//   const [shipmentDetails, setShipmentDetails] = useState(null);
//   const [map, setMap] = useState(null);
//   const [driverMarker, setDriverMarker] = useState(null);
//   const [startLocation, setStartLocation] = useState(initialStartLocation);
//   const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
//   const [destination, setDestination] = useState(initialDestination);
//   const [checkpointCoords, setCheckpointCoords] = useState({ lat: '', lon: '' });
//   const [destinationCoords, setDestinationCoords] = useState({ lat: '', lon: '' });
//   const [currentRoute, setCurrentRoute] = useState(null);
//   const [notifications, setNotifications] = useState([]);
//   const [isTracking, setIsTracking] = useState(false);
//   const [lastDriverUpdate, setLastDriverUpdate] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [routeDeviation, setRouteDeviation] = useState(false);

//   // Refs
//   const mapRef = useRef(null);
//   const socketRef = useRef(null);
//   const routingControlRef = useRef(null);
//   const destinationMarkerRef = useRef(null);
//   const checkpointMarkerRef = useRef(null);
//   const routePolylineRef = useRef(null);
//   const startMarkerRef = useRef(null)
//   // Custom icons
//   const taxiIcon = L.icon({
//     iconUrl: "media/NHC (1).png",
//     iconSize: [60, 60],
//     iconAnchor: [16, 32],
//     popupAnchor: [0, -32]
//   });

//   const destinationIcon = L.icon({
//     iconUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-icon-2x.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-shadow.png",
//     shadowSize: [41, 41],
//     shadowAnchor: [12, 41]
//   });
//   const startIcon = L.icon({
//     iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -34],
//     shadowUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-shadow.png",
//     shadowSize: [41, 41],
//     shadowAnchor: [12, 41]
//   });
//   // Authentication & Authorization
//   useEffect(() => {
//     const verifyAccess = async () => {
//       try {
//         const response = await axios.post(`${API_URL}/shipment/verify-access`, {
//           cart_id: cartId,
//           user_id: userId
//         });

//         if (response.data.authorized) {
//           setIsAuthorized(true);
//           setShipmentDetails(response.data.shipment);
//         } else {
//           addNotification("Unauthorized access", "error");
//         }
//       } catch (error) {
//         console.error("Access verification error:", error);
//         addNotification("Access verification failed", "error");
//       }
//     };

//     if (userId && cartId) {
//       verifyAccess();
//     }
//   }, [userId, cartId]);

//   // Parse coordinates from string format "lat, lng"
//   const parseCoordinates = (coordString) => {
//     if (!coordString) return null;
//     const [lat, lng] = coordString.split(',').map(coord => parseFloat(coord.trim()));
//     return { lat, lng };
//   };

//   // Create route from coordinates
//   const createRoute = () => {
//     if (!startLocation || !checkpoint || !destination) return;

//     const start = parseCoordinates(startLocation);
//     const mid = parseCoordinates(checkpoint);
//     const end = parseCoordinates(destination);

//     if (!start || !mid || !end) {
//       addNotification("Invalid coordinates provided", "error");
//       return;
//     }

//     const waypoints = [
//       L.latLng(start.lat, start.lng),
//       L.latLng(mid.lat, mid.lng),
//       L.latLng(end.lat, end.lng)
//     ];

//     // Prepare route data
//     const routeData = {
//       waypoints: waypoints.map(wp => ({
//         lat: wp.lat,
//         lng: wp.lng
//       })),
//       metadata: {
//         startLocation,
//         checkpoint,
//         destination,
//         startTime: new Date().toISOString()
//       }
//     };

//     // Emit route creation event
//     socketRef.current?.emit('route-created', {
//       cart_id: cartId,
//       route_data: routeData
//     });

//     // Create route visualization
//     clearExistingRouteAndMarkers();
//     createRouteMarkers(waypoints);
//     createRoutingControl(waypoints);
//   };

//   // Map initialization
//   useEffect(() => {
//     const initializeMap = async () => {
//       if (!mapRef.current && isAuthorized) {
//         try {
//           // Create map instance
//           const mapInstance = L.map("map", {
//             zoomControl: true,
//             scrollWheelZoom: true
//           });

//           // Add tile layer
//           L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//             attribution: "© OpenStreetMap contributors",
//             maxZoom: 18,
//           }).addTo(mapInstance);
          
//           // Set initial view to a default location
//           mapInstance.setView([22.5726, 88.3639], 13); // Centered on India
          
//           mapRef.current = mapInstance;
//           setMap(mapInstance);

//           // Wait a moment for the map to be fully initialized
//           await new Promise(resolve => setTimeout(resolve, 100));

//           // Create route if coordinates are available
//           if (startLocation && checkpoint && destination) {
//             const start = parseCoordinates(startLocation);
//             if (start) {
//               mapInstance.setView([start.lat, start.lng], 13);
//               createRoute();
//             }
//           }
//         } catch (error) {
//           console.error('Map initialization error:', error);
//           addNotification('Error initializing map', 'error');
//         }
//       }
//     };

//     initializeMap();

//     return () => {
//       if (mapRef.current) {
//         try {
//           mapRef.current.remove();
//           mapRef.current = null;
//         } catch (error) {
//           console.error('Error cleaning up map:', error);
//         }
//       }
//     };
//   }, [isAuthorized, startLocation, checkpoint, destination]);

//   // Socket connection and tracking
//   useEffect(() => {
//     if (!map || !isAuthorized) return;

//     socketRef.current = io(SOCKET_SERVER, {
//       query: {
//         user_id: userId,
//         cart_id: cartId,
//         role: userRole
//       }
//     });

//     // Socket event handlers
//     socketRef.current.on("connect", () => {
//       setIsConnected(true);
//       socketRef.current.emit("request-initial-state", { cart_id: cartId });
      
//       // Create route when socket is connected and coordinates are available
//       if (startLocation && checkpoint && destination) {
//         createRoute();
//       }
//     });

//     socketRef.current.on("initial-state", handleInitialState);
//     socketRef.current.on("route-broadcast", handleRouteBroadcast);
//     socketRef.current.on("driver-location-update", handleDriverLocationUpdate);
//     socketRef.current.on("route-deviation", handleRouteDeviation);

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }
//     };
//   }, [map, isAuthorized]);

//   // Handler functions
//   const handleInitialState = (data) => {
//     if (data.route) {
//       const { route } = data;
//       if (route.waypoints && route.waypoints.length > 0) {
//         const waypoints = route.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
//         clearExistingRouteAndMarkers();
//         createRouteMarkers(waypoints);
//         createRoutingControl(waypoints);
//       }
//     }
//   };

//   const handleRouteBroadcast = (data) => {
//     if (!data?.waypoints) return;

//     clearExistingRouteAndMarkers();
//     const waypoints = data.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
    
//     if (data.metadata) {
//       setStartLocation(data.metadata.startLocation || "");
//       setCheckpoint(data.metadata.checkpoint || "");
//       setDestination(data.metadata.destination || "");
//       setCheckpointCoords(data.metadata.checkpointCoords || null);
//       setDestinationCoords(data.metadata.destinationCoords || null);
//     }

//     createRouteMarkers(waypoints);
//     createRoutingControl(waypoints);
//   };

//   const handleDriverLocationUpdate = (data) => {
//     updateDriverMarker(data);
//     setLastDriverUpdate(new Date());
//   };

//   const handleRouteDeviation = (data) => {
//     addNotification(data.message, "warning");
//     setRouteDeviation(true);
//   };

//   // Helper functions
//   const clearExistingRouteAndMarkers = () => {
//     if (map && routingControlRef.current) {
//       map.removeControl(routingControlRef.current);
//       routingControlRef.current = null;
//     }
    
//     if (map && destinationMarkerRef.current) {
//       destinationMarkerRef.current.remove();
//       destinationMarkerRef.current = null;
//     }
    
//     if (map && checkpointMarkerRef.current) {
//       checkpointMarkerRef.current.remove();
//       checkpointMarkerRef.current = null;
//     }
    
//     if (map && routePolylineRef.current) {
//       routePolylineRef.current.remove();
//       routePolylineRef.current = null;
//     }
//     if (map && startMarkerRef.current) {
//       startMarkerRef.current.remove();
//       startMarkerRef.current = null;
//     }
//   };

//   const createRoutingControl = (waypoints) => {
//     try {
//       // Wait for map to be ready
//       if (!mapRef.current || !waypoints || waypoints.length < 2) {
//         console.error("Map or waypoints not ready");
//         return;
//       }

//       // Clear existing routing control if it exists
//       if (routingControlRef.current && mapRef.current) {
//         try {
//           routingControlRef.current.remove();
//         } catch (error) {
//           console.debug('Error removing existing route:', error);
//         }
//         routingControlRef.current = null;
//       }

//       // Ensure the map is properly initialized
//       const mapInstance = mapRef.current;

//       // Create new routing control
//       routingControlRef.current = L.Routing.control({
//         waypoints,
//         routeWhileDragging: false,
//         addWaypoints: false,
//         draggableWaypoints: false,
//         showAlternatives: false,
//         lineOptions: {
//           styles: [
//             { color: '#0066CC', weight: 4, opacity: 0.7 }, // Main route style
//           ],
//           missingRouteStyles: [
//             { color: '#FF0000', weight: 4, opacity: 0.7, dashArray: '10,10' } // Style for missing route segments
//           ]
//         },
//         createMarker: function() { return null; }, // Don't create default markers
//         fitSelectedRoutes: true,
//         router: L.Routing.osrmv1({
//           serviceUrl: 'https://router.project-osrm.org/route/v1',
//           profile: 'driving',
//           suppressDemoServerWarning: true
//         })
//       }).addTo(map);

//       // Handle route calculation events
//       routingControlRef.current.on('routesfound', (e) => {
//         try {
//           const routes = e.routes;
//           const coordinates = routes[0].coordinates;

//           // Remove existing route polyline if it exists
//           if (routePolylineRef.current && routePolylineRef.current._map) {
//             routePolylineRef.current.remove();
//           }

//           // Create new route polyline
//           routePolylineRef.current = L.polyline(coordinates, {
//             color: '#0066CC',
//             weight: 4,
//             opacity: 0.7
//           }).addTo(map);

//           // Create route buffer for deviation detection (100 meters)
//           const bufferOptions = {
//             color: '#0066CC',
//             weight: 100,
//             opacity: 0.2
//           };

//           // Store route data for deviation checks
//           setCurrentRoute({
//             coordinates: coordinates,
//             boundingBox: routePolylineRef.current.getBounds(),
//             timestamp: new Date().toISOString()
//           });

//           // Fit map to show entire route with padding
//           const bounds = routePolylineRef.current.getBounds();
//           map.fitBounds(bounds, {
//             padding: [50, 50],
//             maxZoom: 16
//           });

//         } catch (error) {
//           console.error('Error handling route calculation:', error);
//           addNotification('Error calculating route', 'error');
//         }
//       });

//       routingControlRef.current.on('routingerror', (error) => {
//         console.error('Routing error:', error);
//         addNotification('Error creating route. Please try again.', 'error');
//       });

//     } catch (error) {
//       console.error('Error in createRoutingControl:', error);
//       addNotification('Failed to create route visualization', 'error');
//     }
//   };

//   const createRouteMarkers = (waypoints) => {
//     const startPoint = waypoints[0];
// startMarkerRef.current = L.marker(startPoint, {
//   icon: startIcon
// })
// .bindPopup('Start Location')
// .addTo(map);
//     if (waypoints.length > 0) {
//       const destinationPoint = waypoints[waypoints.length - 1];
//       destinationMarkerRef.current = L.marker(destinationPoint, {
//         icon: destinationIcon
//       })
//       .bindPopup('Destination')
//       .addTo(map);

//       if (waypoints.length > 1) {
//         const checkpointPoint = waypoints[1];
//         checkpointMarkerRef.current = L.marker(checkpointPoint, {
//           icon: destinationIcon
//         })
//         .bindPopup('Checkpoint')
//         .addTo(map);
//       }
//     }
//   };

//   const updateDriverMarker = (locationData) => {
//     if (!map || !locationData) return;

//     const { latitude, longitude } = locationData;
    
//     try {
//       if (driverMarker) {
//         driverMarker.setLatLng([latitude, longitude]);
//       } else {
//         const newDriverMarker = L.marker([latitude, longitude], {
//           icon: taxiIcon,
//           zIndexOffset: 1000
//         }).addTo(map);
        
//         newDriverMarker.bindPopup('Driver Location');
//         setDriverMarker(newDriverMarker);
//       }
//     } catch (error) {
//       console.error('Error updating driver marker:', error);
//       addNotification("Error updating driver location", "error");
//     }
//   };

//   const addNotification = (message, type = 'info') => {
//     const id = Date.now();
//     setNotifications(prev => [...prev, { id, message, type }]);
//     setTimeout(() => {
//       setNotifications(prev => prev.filter(n => n.id !== id));
//     }, 5000);
//   };

//   // Fetch online drivers
//   const fetchOnlineDrivers = async () => {
//     setIsLoadingDrivers(true);
//     try {
//       const response = await axios.post(`http://127.0.0.1:5000/fetch_drivers_online`, {
//         user_id: userId
//       });

//       if (response.data.drivers) {
//         setDrivers(response.data.drivers);
//       } else {
//         addNotification('No online drivers available', 'warning');
//       }
//     } catch (error) {
//       console.error('Error fetching drivers:', error);
//       addNotification('Failed to fetch drivers', 'error');
//     } finally {
//       setIsLoadingDrivers(false);
//     }
//   };

//   // Fetch drivers when modal opens
//   useEffect(() => {
//     if (showDriverModal) {
//       fetchOnlineDrivers();
//     }
//   }, [showDriverModal]);

//   // Convert coordinates to location names
//   useEffect(() => {
//     const convertToLocationName = async (coords) => {
//       try {
//         const [lat, lng] = coords.split(',').map(c => c.trim());
//         const response = await axios.get(
//           `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
//         );
//         return response.data.display_name;
//       } catch (error) {
//         console.error('Error converting coordinates:', error);
//         return coords;
//       }
//     };

//     const updateLocationNames = async () => {
//       if (startLocation) {
//         const startName = await convertToLocationName(startLocation);
//         setLocationNames(prev => ({ ...prev, start: startName }));
//       }
//       if (checkpoint) {
//         const checkpointName = await convertToLocationName(checkpoint);
//         setLocationNames(prev => ({ ...prev, checkpoint: checkpointName }));
//       }
//       if (destination) {
//         const destinationName = await convertToLocationName(destination);
//         setLocationNames(prev => ({ ...prev, destination: destinationName }));
//       }
//     };

//     updateLocationNames();
//   }, [startLocation, checkpoint, destination]);

//   // Handle driver assignment
//   const handleAssignDriver = async (driverId) => {
//     try {
//       const response = await axios.post(`http://127.0.0.1:5000/assign_driver`, {
//         cart_id: cartId,
//         driver_id: driverId
//       });

//       if (response.status === 200) {
//         addNotification('Driver assigned successfully', 'success');
//         setShowDriverModal(false);
//         // Remove the assigned driver from the list
//         setDrivers(prev => prev.filter(driver => driver.generated_unique_id !== driverId));
//       }
//     } catch (error) {
//       console.error('Error assigning driver:', error);
//       addNotification('Failed to assign driver', 'error');
//     }
//   };

//   // Add style tag to document
//   useEffect(() => {
//     const styleElement = document.createElement('style');
//     styleElement.innerHTML = styles;
//     document.head.appendChild(styleElement);

//     return () => {
//       document.head.removeChild(styleElement);
//     };
//   }, []);

//   // Location Info Container Component
//   const LocationInfoContainer = () => (
//     <div className="info-container">
//       <h2
//   style={{
   
//     fontSize: "2rem",
//     fontWeight: "bold",
//     color: "#2575fc",
//     textAlign: "center",
//     margin: "20px 0",
//     textTransform: "uppercase",
//     letterSpacing: "2px",
//     padding:'0px'
    
//   }}
// >
//   Track your Shipment
// </h2>

//       <div className="location-info">
//         <div className="location-item">
//           <div className="location-label">Manufacturer Location</div>
//           <div className="location-value">{locationNames.start || startLocation}</div>
//         </div>
//         <div className="location-item">
//           <div className="location-label">Wholesaler Location</div>
//           <div className="location-value">{locationNames.checkpoint || checkpoint}</div>
//         </div>
//         <div className="location-item">
//           <div className="location-label">Retailer Location</div>
//           <div className="location-value">{locationNames.destination || destination}</div>
//         </div>
//       </div>
//       {userRole === 'start' && (
//   <>
//     <button 
//       className="assign-driver-btn"
//       onClick={() => setShowDriverModal(true)}
//     >
//       Assign Driver
//     </button>
//     <ShowAssignedDrivers cartId={cartId} />
//   </>
// )}

//       <div className="status-indicator">
//         <div className={`live-indicator ${isConnected ? 'connected' : ''}`} />
//         <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
//         {lastDriverUpdate && (
//           <div>Last Update: {new Date(lastDriverUpdate).toLocaleTimeString()}</div>
//         )}
//       </div>
      
//     </div>
//   );

//   // Driver Assignment Modal Component
//   const DriverModal = () => (
//     <div className="modal-overlay">
//     <div className="modal-content">
//       <div className="modal-header-driver">
//         <h2>Available Online Drivers</h2>
//         <div className="header-actions">
//           <button 
//             className="refresh-button"
//             onClick={fetchOnlineDrivers}
//             disabled={isLoadingDrivers}
//           >
//             <RefreshCw size={18} className={isLoadingDrivers ? 'spinning' : ''} />
//             <span>Refresh</span>
//           </button>
//           <button 
//             className="close-button-driver"
//             onClick={() => setShowDriverModal(false)}
//           >
//             <X size={24} />
//           </button>
//         </div>
//       </div>

//       <div className="driver-list">
//         {isLoadingDrivers ? (
//           <div className="loading-container">
//             <div className="loading-spinner" />
//             <p>Finding available drivers...</p>
//           </div>
//         ) : drivers.length === 0 ? (
//           <div className="empty-state">
//             <div className="empty-icon">🚖</div>
//             <p>No online drivers available at the moment</p>
//             <button 
//               className="retry-button"
//               onClick={fetchOnlineDrivers}
//             >
//               Try Again
//             </button>
//           </div>
//         ) : (
//           drivers.map(driver => (
//             <div key={driver.generated_unique_id} className="driver-card">
//               <div className="driver-avatar">
//                 {driver.user_name.charAt(0).toUpperCase()}
//               </div>
//               <div className="driver-info">
                
//                 <div className="driver-name">{driver.user_name}</div>
//                 <div className="driver-details">
//                   <div className="driver-id">
//                     Driver ID: {driver.generated_unique_id}
//                   </div>
//                   <div className="driver-status">
//                     <span className={`driver-dot ${driver.driver_online ? 'online' : 'offline'}`} />
//                     <span className={`online-status ${driver.driver_online ? 'connected' : 'disconnected'}`}>
//                       {driver.driver_online ? 'Available' : 'Unavailable'}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//               <div className="assign-button-wrapper">
//                 <button
//                   className="assign-button"
//                   onClick={() => handleAssignDriver(driver.generated_unique_id)}
//                 >
//                   <span className="button-text">Assign Driver</span>
//                   <span className="button-icon">→</span>
//                 </button>
//               </div>
//             </div>
//           ))
//         )}
//       </div>
      
//     </div>
//   </div>
// );
//   if (!isAuthorized) {
//     return <div>Verifying access...</div>;
//   }

//   return (
//     <div className="tracking-container">
//       <LocationInfoContainer />
//       {showDriverModal && <DriverModal />}
      
//       <div className="notification-container">
//         {notifications.map(notification => (
//           <div key={notification.id} className={`notification ${notification.type}`}>
//             <span>{notification.message}</span>
//             <button
//               className="close-btn"
//               onClick={() => setNotifications(prev => 
//                 prev.filter(n => n.id !== notification.id)
//               )}
//             >
//               ×
//             </button>
//           </div>
//         ))}
//       </div>
      
//       <div id="map" className="map-container"  />
      
//       <div className="status-indicator">
//         <div className={`live-indicator ${isConnected ? 'connected' : ''}`} />
//         <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
//         {lastDriverUpdate && (
//           <div>Last Update: {new Date(lastDriverUpdate).toLocaleTimeString()}</div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ShipmentTracking;