// import React, { useState, useEffect, useRef } from "react";
// import L from "leaflet";
// import { Menu, X } from 'lucide-react';
// import "leaflet-routing-machine";
// import "leaflet/dist/leaflet.css";
// import { io } from "socket.io-client";
// import axios from 'axios';

// // Suppress development console errors
// if (process.env.NODE_ENV === 'development') {
//   if (L && L.Routing && L.Routing.Line) {
//     const originalClearLines = L.Routing.Line.prototype._clearLines;
//     L.Routing.Line.prototype._clearLines = function() {
//       try {
//         originalClearLines.call(this);
//       } catch (e) {
//         // Silently catch the removeLayer error
//       }
//     };
//   }
// }

// const GeolocationMap = ({ 
//   userRole = '',
//   userId,
//   cartId,
//   initialStartLocation = '',
//   initialCheckpoint = '',
//   initialDestination = '' 
// }) => {
//   // State Management
//   // Driver-related state
//   const [driverModalOpen, setDriverModalOpen] = useState(false);
//   const [selectedDriver, setSelectedDriver] = useState(null);
//   const [demoDrivers, setDemoDrivers] = useState([
//     { id: "D001", name: "Aritra Dhar", connectionStatus: "Connected" },
//     { id: "D002", name: "Srinjoy Roy", connectionStatus: "Disconnected" },
//     { id: "D003", name: "Sourjya Saha", connectionStatus: "Connected" },
//   ]);
//   const [driverModalOpen, setDriverModalOpen] = useState(false);
//   const [selectedDriver, setSelectedDriver] = useState(null);
//   const [demoDrivers, setDemoDrivers] = useState([
//     { id: "D001", name: "Aritra Dhar", connectionStatus: "Connected" },
//     { id: "D002", name: "Srinjoy Roy", connectionStatus: "Disconnected" },
//     { id: "D003", name: "Sourjya Saha", connectionStatus: "Connected" },
//   ]);
//   const [map, setMap] = useState(null);
//   const [driverMarker, setDriverMarker] = useState(null);
//   const [startLocation, setStartLocation] = useState(initialStartLocation);
//   const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
//   const [destination, setDestination] = useState(initialDestination);
//   const [checkpointCoords, setCheckpointCoords] = useState({ lat: '', lon: '' });
//   const [destinationCoords, setDestinationCoords] = useState({ lat: '', lon: '' });
//   const [suggestions, setSuggestions] = useState({
//     checkpoint: [],
//     destination: [],
//     activeType: null
//   });
//   const [savedRoutes, setSavedRoutes] = useState([]);
//   const [currentRoute, setCurrentRoute] = useState(null);
//   const [notifications, setNotifications] = useState([]);
//   const [isTracking, setIsTracking] = useState(false);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [lastUpdate, setLastUpdate] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [lastDriverUpdate, setLastDriverUpdate] = useState(null);
//   const [driverUpdateCount, setDriverUpdateCount] = useState(0);
//   const [routeDeviation, setRouteDeviation] = useState(false);
//   const [deviationHistory, setDeviationHistory] = useState([]);

//   // Refs
//   const mapRef = useRef(null);
//   const socketRef = useRef(null);
//   const routingControlRef = useRef(null);
//   const destinationMarkerRef = useRef(null);
//   const checkpointMarkerRef = useRef(null);
//   const routePolylineRef = useRef(null);

//   // Icons
//   const taxiIcon = L.icon({
//     iconUrl: "media/NHC (1).png",
//     iconSize: [60, 60],
//     iconAnchor: [30, 30],
//     popupAnchor: [0, -30]
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

//   // Initialize map
//   useEffect(() => {
//     if (!mapRef.current) {
//       const mapInstance = L.map("map").setView([28.238, 83.9956], 13);
//       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//         attribution: "© OpenStreetMap contributors",
//         maxZoom: 18,
//       }).addTo(mapInstance);
      
//       mapRef.current = mapInstance;
//       setMap(mapInstance);
//     }

//     return () => {
//       if (mapRef.current) {
//         mapRef.current.remove();
//         mapRef.current = null;
//       }
//     };
//   }, []);

//   // Socket connection and authorization
//   useEffect(() => {
//     if (!map || !userId || !cartId) return;

//     // Verify access before connecting
//     const verifyAccess = async () => {
//       try {
//         const response = await axios.post("http://localhost:8000/api/shipment/verify-access", {
//           cart_id: cartId,
//           user_id: userId
//         });

//         if (response.data.authorized) {
//           initializeSocket();
//         } else {
//           addNotification("Unauthorized access", "error");
//         }
//       } catch (error) {
//         console.error("Access verification failed:", error);
//         addNotification("Authorization failed", "error");
//       }
//     };

//     const initializeSocket = () => {
//       socketRef.current = io("http://localhost:8000", {
//         query: { user_id: userId, cart_id: cartId, role: userRole }
//       });

//       socketRef.current.on("connect", () => {
//         setIsConnected(true);
//         socketRef.current.emit("request-initial-state", { cart_id: cartId });
//       });

//       socketRef.current.on("connect_error", (error) => {
//         setIsConnected(false);
//         addNotification("Connection error: " + error.message, "error");
//       });

//       setupSocketListeners();
//     };

//     verifyAccess();

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//       }
//     };
//   }, [map, userId, cartId, userRole]);

//   // Socket event listeners
//   const setupSocketListeners = () => {
//     if (!socketRef.current) return;

//     socketRef.current.on("initial-state", (data) => {
//       if (data.route) {
//         const waypoints = data.route.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
//         clearExistingRouteAndMarkers();
//         createRouteMarkers(waypoints);
//         createRoutingControl(waypoints);
//       }
//     });

//     socketRef.current.on("route-broadcast", (data) => {
//       if (data.route_data?.waypoints) {
//         const waypoints = data.route_data.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
//         clearExistingRouteAndMarkers();
//         createRouteMarkers(waypoints);
//         createRoutingControl(waypoints);

//         setCurrentRoute({
//           startPoint: data.route_data.metadata?.startLocation,
//           checkpoint: data.route_data.metadata?.checkpoint,
//           destination: data.route_data.metadata?.destination
//         });
//       }
//     });

//     socketRef.current.on("driver-location-update", (data) => {
//       updateDriverMarker(data);
//       setLastDriverUpdate(new Date());
//       setDriverUpdateCount(prev => prev + 1);
//     });

//     socketRef.current.on("route-deviation", (data) => {
//       addNotification(data.message, "warning");
//       setDeviationHistory(prev => [...prev, data]);
//       setRouteDeviation(true);
//     });
//   };

//   // Route submission handler
//   const handleRouteSubmit = (e) => {
//     e.preventDefault();
//     if (!startLocation || !destinationCoords || !cartId) {
//       addNotification("Please provide all required locations", "warning");
//       return;
//     }

//     const waypoints = [
//       L.latLng(...startLocation.split(',').map(Number)),
//       checkpointCoords ? L.latLng(checkpointCoords.lat, checkpointCoords.lon) : null,
//       L.latLng(destinationCoords.lat, destinationCoords.lon)
//     ].filter(Boolean);

//     const routeData = {
//       cart_id: cartId,
//       route_data: {
//         waypoints: waypoints.map(wp => ({
//           lat: wp.lat,
//           lng: wp.lng
//         })),
//         metadata: {
//           startLocation,
//           checkpoint,
//           destination,
//           checkpointCoords,
//           destinationCoords,
//           startTime: new Date().toISOString()
//         }
//       }
//     };

//     socketRef.current?.emit('route-created', routeData);
//     setIsTracking(true);
//     addNotification("Route tracking started", "success");
//   };

//   // Helper functions for markers and routes
//   const clearExistingRouteAndMarkers = () => {
//     if (map && routingControlRef.current) {
//       map.removeControl(routingControlRef.current);
//       routingControlRef.current = null;
//     }
    
//     [destinationMarkerRef, checkpointMarkerRef].forEach(markerRef => {
//       if (markerRef.current && markerRef.current._map) {
//         markerRef.current.remove();
//         markerRef.current = null;
//       }
//     });

//     if (routePolylineRef.current && routePolylineRef.current._map) {
//       routePolylineRef.current.remove();
//       routePolylineRef.current = null;
//     }
//   };

//   const createRouteMarkers = (waypoints) => {
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

//   const createRoutingControl = (waypoints) => {
//     if (map && routingControlRef.current) {
//       map.removeControl(routingControlRef.current);
//     }

//     routingControlRef.current = L.Routing.control({
//       waypoints,
//       routeWhileDragging: false,
//       addWaypoints: false,
//       draggableWaypoints: false,
//       lineOptions: {
//         styles: [{ color: '#0066CC', weight: 4 }]
//       },
//       createMarker: () => null
//     }).addTo(map);
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

//       if (driverMarker && !map.hasLayer(driverMarker)) {
//         map.addLayer(driverMarker);
//       }
//     } catch (error) {
//       console.error('Error updating driver marker:', error);
//     }
//   };

//   // Handler Functions
//   const handleCheckpointChange = (e) => {
//     const value = e.target.value;
//     setCheckpoint(value);
//     fetchSuggestions(value, "checkpoint");
//   };

//   const handleDestinationChange = (e) => {
//     const value = e.target.value;
//     setDestination(value);
//     fetchSuggestions(value, "destination");
//   };

//   const handleSuggestionSelection = (suggestion, type) => {
//     if (type === 'checkpoint') {
//       setCheckpoint(suggestion.name);
//       setCheckpointCoords({
//         lat: suggestion.lat,
//         lon: suggestion.lon
//       });
//     } else if (type === 'destination') {
//       setDestination(suggestion.name);
//       setDestinationCoords({
//         lat: suggestion.lat,
//         lon: suggestion.lon
//       });
//     }
//     setSuggestions(prev => ({ ...prev, [type]: [] }));
//   };

//   const handleSaveRoute = () => {
//     if (!startLocation || !destinationCoords || !cartId) {
//       addNotification("Cannot save route without required locations", "error");
//       return;
//     }
    
//     const routeData = {
//       id: Date.now(),
//       startPoint: startLocation,
//       checkpoint: checkpoint || "N/A",
//       destination: destination,
//       checkpointCoords: checkpointCoords,
//       destinationCoords: destinationCoords,
//       cartId: cartId,
//       routeWaypoints: routePolylineRef.current 
//         ? routePolylineRef.current.getLatLngs().map(latlng => ({
//             lat: latlng.lat, 
//             lng: latlng.lng
//           }))
//         : []
//     };

//     clearExistingRouteAndMarkers();
//     socketRef.current?.emit('route-saved', routeData);
//     setSavedRoutes(prev => [...prev, routeData]);
//     setIsTracking(false);
//     addNotification("Route saved successfully", "success");
//   };

//   const showTracking = (route) => {
//     if (!map || !route) {
//       addNotification("Invalid route data", "error");
//       return;
//     }
    
//     clearExistingRouteAndMarkers();
//     const waypoints = [];

//     // Process start point
//     if (route.startPoint) {
//       const startCoords = route.startPoint.split(',').map(coord => parseFloat(coord.trim()));
//       if (startCoords.length === 2 && !isNaN(startCoords[0]) && !isNaN(startCoords[1])) {
//         waypoints.push(L.latLng(startCoords[0], startCoords[1]));
//       }
//     }

//     // Add checkpoint
//     if (route.checkpointCoords?.lat && route.checkpointCoords?.lon) {
//       waypoints.push(L.latLng(route.checkpointCoords.lat, route.checkpointCoords.lon));
//     }

//     // Add destination
//     if (route.destinationCoords?.lat && route.destinationCoords?.lon) {
//       waypoints.push(L.latLng(route.destinationCoords.lat, route.destinationCoords.lon));
//     }

//     if (waypoints.length < 2) {
//       addNotification("Insufficient route data", "error");
//       return;
//     }

//     const routeData = {
//       cart_id: cartId,
//       route_data: {
//         waypoints: waypoints.map(wp => ({
//           lat: wp.lat,
//           lng: wp.lng
//         })),
//         metadata: {
//           startLocation: route.startPoint,
//           checkpoint: route.checkpoint,
//           destination: route.destination
//         }
//       }
//     };

//     socketRef.current?.emit('route-broadcast', routeData);
//     createRouteMarkers(waypoints);
//     createRoutingControl(waypoints);
    
//     const bounds = L.latLngBounds(waypoints);
//     map.fitBounds(bounds, { padding: [50, 50] });
//   };

//   // Driver assignment handler
//   const assignDriver = async (driverId) => {
//     try {
//       const response = await axios.post('http://localhost:8000/assign_driver', {
//         cart_id: cartId,
//         driver_id: driverId
//       });

//       if (response.status === 200) {
//         addNotification("Driver assigned successfully", "success");
//         setDriverModalOpen(false);
//         setSelectedDriver(null);
//       }
//     } catch (error) {
//       console.error("Error assigning driver:", error);
//       addNotification("Failed to assign driver", "error");
//     }
//   };

//   // UI Components
//   const TrackingStatus = () => {
//     if (!isTracking) return null;

//     const timeSinceLastUpdate = lastDriverUpdate 
//       ? Math.round((new Date() - new Date(lastDriverUpdate)) / 1000)
//       : null;

//     return (
//       <div className="tracking-status">
//         <div className="status-indicator">
//           <div className={`live-indicator ${isConnected ? 'connected' : ''}`} />
//           <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
//           {lastDriverUpdate && (
//             <>
//               <div>Last Update: {timeSinceLastUpdate}s ago</div>
//               <div>Updates: {driverUpdateCount}</div>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // Notification handling
//   const addNotification = (message, type = 'info') => {
//     const id = Date.now();
//     setNotifications(prev => [...prev, { id, message, type }]);
//     setTimeout(() => {
//       setNotifications(prev => prev.filter(n => n.id !== id));
//     }, 5000);
//   };

//   return (
//     <div className="tracking-container">
//       <div className="notification-container">
//         <TrackingStatus />
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

//       {userRole === 'start' && (
//         <div className="route-control-panel">
//           <form onSubmit={handleRouteSubmit}>
//           <h2 className="route-form-title">Track Delivery Route</h2>

// <div className="location-inputs">
// <div className="input-group">
// <label>Starting Point</label>
// <input
// type="text"
// value={startLocation}
// className="location-input"
// onChange={(e) => setStartLocation(e.target.value)}
// style={{ borderRadius: "10px" }}
// readOnly// Make it read-only as it is set automatically
// />
// </div>
// <div className="input-group">
// <label>Wholesaler Location</label>
// <input
// type="text"
// value={checkpoint}
// onChange={handleCheckpointChange}
// className="location-input"
// style={{ borderRadius: "10px" }}
// readOnly
// />
// {suggestions.checkpoint.length > 0 && (
// <ul className="suggestions-list">
// {suggestions.checkpoint.map((suggestion, index) => (
// <li
// key={index}
// onClick={() => {
// handleSuggestionSelection(suggestion, 'checkpoint');
// setSuggestions({ ...suggestions, checkpoint: [] });
// }}
// >
// {suggestion.name}
// </li>
// ))}
// </ul>
// )}
// </div>
// <div className="input-group">
// <label>Retailer Location</label>
// <input
// type="text"
// value={destination}
// onChange={handleDestinationChange}
// className="location-input"
// style={{ borderRadius: "10px" }}
// readOnly
// />
// {suggestions.destination.length > 0 && (
// <ul className="suggestions-list">
// {suggestions.destination.map((suggestion, index) => (
// <li
// key={index}
// onClick={() => {
// handleSuggestionSelection(suggestion, 'destination');
// setSuggestions({ ...suggestions, destination: [] });
// }}
// >
// {suggestion.name}
// </li>
// ))}
// </ul>
// )}
// </div>
// </div>
// <button
//   type="submit"
//   className="route-submit-btn"
//   disabled={!destinationCoords || !startLocation}
// >
//   Track Route
// </button>
// {/* <button
// type="button"
// className="use-location-btn"
// onClick={() => {
// navigator.geolocation.getCurrentPosition(
// (position) => {
// const { latitude, longitude } = position.coords;
// setStartLocation(`${latitude}, ${longitude}`);
// if (map) {
// map.setView([latitude, longitude], 13);
// }
// socketRef.current.emit("send-location", {
// latitude,
// longitude,
// role: userRole,
// });
// },
// () => {
// alert("Unable to fetch your current location.");
// }
// );
// }}
// >
// Use Current Location
// </button> */}
// {currentRoute && (
//   <button
//   type="button"
//   className="save-route-btn"
//   onClick={handleSaveRoute}
//   style={{
//     backgroundColor: "#4CAF50", // Green background
//     color: "white",             // White text
//     border: "none",             // No border
//     padding: "15px 20px",       // Spacing
//     textAlign: "center",        // Centered text
//     textDecoration: "none",     // No underline
//     display: "inline-block",    // Inline-block layout
//     fontSize: "16px",           // Font size
//     marginTop:"10px",
//     width:"100%",        // Margin for spacing
//     cursor: "pointer",          // Pointer cursor on hover
//     borderRadius: "5px",        // Rounded corners
//     boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow
//     transition: "all 0.3s ease", // Smooth transitions
//   }}
//   onMouseEnter={(e) => {
//     e.target.style.backgroundColor = "#45a049"; // Darker green on hover
//     e.target.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
//   }}
//   onMouseLeave={(e) => {
//     e.target.style.backgroundColor = "#4CAF50"; // Reset color
//     e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
//   }}
// >
//   Save Route
// </button>

// )}
//   <div>
// <div className="controls">

// <button
// onClick={() => setModalOpen(true)}
// style={{
// backgroundColor: "#007BFF", // Blue background
// color: "white",             // White text
// border: "none",             // No border
// padding: "15px 20px",       // Spacing
// textAlign: "center",        // Centered text
// textDecoration: "none",     // No underline
// fontSize: "16px",           // Font size
// borderRadius: "5px",        // Rounded corners
// cursor: "pointer",          // Pointer cursor on hover
// boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow
// transition: "all 0.3s ease", // Smooth transitions
// marginTop:"10px",
// width:"100%"     // Margin for spacing
// }}
// onMouseEnter={(e) => {
// e.target.style.backgroundColor = "#0056b3"; // Darker blue on hover
// e.target.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
// }}
// onMouseLeave={(e) => {
// e.target.style.backgroundColor = "#007BFF"; // Reset color
// e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
// }}
// >
// View Saved Routes
// </button>
// {/* Assign Driver Button */}
// <button
// type="button"
// onClick={() => setDriverModalOpen(true)}
// style={{
// backgroundColor: "#6B46C1",
// color: "white",
// border: "none",
// padding: "15px 20px",
// textAlign: "center",
// fontSize: "16px",
// borderRadius: "5px",
// cursor: "pointer",
// boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
// transition: "all 0.3s ease",
// marginTop: "10px",
// width: "100%"
// }}
// onMouseEnter={(e) => {
// e.target.style.backgroundColor = "#553C9A";
// e.target.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
// }}
// onMouseLeave={(e) => {
// e.target.style.backgroundColor = "#6B46C1";
// e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
// }}
// >
// Assign Driver
// </button>
// </div>

// {modalOpen && (
// <div className="overlay-modal-wrapper">
// <div className="modal-popup-container">
// <h3>Saved Routes</h3>
// {savedRoutes.length > 0 ? (
// <table className="saved-routes-table">
// <thead>
// <tr>
//   <th className="saved-routes-header">Start Point</th>
//   <th className="saved-routes-header">Checkpoint</th>
//   <th className="saved-routes-header">Destination</th>
//   <th className="saved-routes-header">Start Time</th>
//   <th className="saved-routes-header">Cart ID</th>
//   <th className="saved-routes-header">Actions</th>
// </tr>
// </thead>
// <tbody>
// {savedRoutes.map((route, index) => (
//   <tr key={index}>
//     <td className="saved-routes-data">{route.startPoint || "N/A"}</td>
//     <td className="saved-routes-data">{route.checkpoint || "N/A"}</td>
//     <td className="saved-routes-data">{route.destination || "N/A"}</td>
//     <td className="saved-routes-data">
//       {route.startTime
//         ? new Date(route.startTime).toLocaleString()
//         : "N/A"}
//     </td>
//     <td className="saved-routes-data">{route.cartId || "N/A"}</td>
//     <td>
//       <button
//         className="table-action-btn"
//         onClick={() => showTracking(route)}
//       >
//         Show Tracking
//       </button>
//     </td>
//   </tr>
// ))}
// </tbody>
// </table>
// ) : (
// <p>No saved routes available.</p>
// )}
// <button className="table-action-btn" onClick={() => setModalOpen(false)}>
// Close
// </button>
// </div>
// </div>
// )}

// </div>
// {driverModalOpen && (
// <div style={{
// position: "fixed",
// top: 0,
// left: 0,
// right: 0,
// bottom: 0,
// backgroundColor: "rgba(0, 0, 0, 0.5)",
// display: "flex",
// justifyContent: "center",
// alignItems: "center",
// zIndex: 1000
// }}>
// <div style={{
// backgroundColor: "white",
// padding: "2rem",
// borderRadius: "10px",
// width: "90%",
// maxWidth: "500px",
// maxHeight: "80vh",
// overflowY: "auto",
// position: "relative",
// boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)"
// }}>
// <h2 style={{
// marginTop: 0,
// marginBottom: "1.5rem",
// color: "#2D3748",
// fontSize: "1.5rem",
// fontWeight: "bold",
// textAlign: "center",
// borderBottom: "2px solid #E2E8F0",
// paddingBottom: "0.5rem"
// }}>
// Assign Driver
// </h2>

// <div style={{ marginBottom: "1.5rem" }}>
// {demoDrivers.map(driver => (
//   <div
//     key={driver.id}
//     style={{
//       padding: "1rem",
//       marginBottom: "0.75rem",
//       border: "1px solid #E2E8F0",
//       borderRadius: "10px",
//       display: "flex",
//       justifyContent: "space-between",
//       alignItems: "center",
//       backgroundColor: selectedDriver?.id === driver.id ? "#EBF4FF" : "white",
//       cursor: "pointer",
//       transition: "all 0.3s ease",
//       boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)"
//     }}
//     onClick={() => setSelectedDriver(driver)}
//   >
//     <div>
//       <div style={{ fontWeight: "bold", color: "#2D3748" }}>{driver.name}</div>
//       <div style={{ fontSize: "0.875rem", color: "#718096" }}>ID: {driver.id}</div>
//       <div style={{
//         fontSize: "0.875rem",
//         fontWeight: "bold",
//         color: driver.connectionStatus === "Connected" ? "#48BB78" : "#E53E3E",
//         marginTop: "0.5rem"
//       }}>
//         {driver.connectionStatus}
//       </div>
//     </div>
//     <div style={{
//       width: "48px",
//       height: "24px",
//       backgroundColor: selectedDriver?.id === driver.id ? "#4299E1" : "#CBD5E0",
//       borderRadius: "12px",
//       position: "relative",
//       transition: "background-color 0.3s ease",
//       cursor: "pointer"
//     }}>
//       <div style={{
//         width: "20px",
//         height: "20px",
//         backgroundColor: "white",
//         borderRadius: "50%",
//         position: "absolute",
//         top: "2px",
//         left: selectedDriver?.id === driver.id ? "26px" : "2px",
//         transition: "left 0.3s ease",
//         boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)"
//       }} />
//     </div>
//   </div>
// ))}
// </div>

// <div style={{
// display: "flex",
// justifyContent: "flex-end",
// gap: "1rem"
// }}>
// <button
//   onClick={() => {
//     setDriverModalOpen(false);
//     setSelectedDriver(null);
//   }}
//   style={{
//     padding: "0.5rem 1rem",
//     borderRadius: "5px",
//     border: "1px solid #E2E8F0",
//     backgroundColor: "white",
//     color: "#4A5568",
//     cursor: "pointer",
//     transition: "all 0.3s ease"
//   }}
//   onMouseEnter={(e) => {
//     e.target.style.backgroundColor = "#EDF2F7";
//   }}
//   onMouseLeave={(e) => {
//     e.target.style.backgroundColor = "white";
//   }}
// >
//   Cancel
// </button>
// <button
//   onClick={() => {
//     if (selectedDriver) {
//       console.log(`Assigned driver: ${selectedDriver.name} (${selectedDriver.id})`);
//       setDriverModalOpen(false);
//       setSelectedDriver(null);
//     }
//   }}
//   disabled={!selectedDriver}
//   style={{
//     padding: "0.5rem 1rem",
//     borderRadius: "5px",
//     border: "none",
//     backgroundColor: selectedDriver ? "#4299E1" : "#CBD5E0",
//     color: "white",
//     cursor: selectedDriver ? "pointer" : "not-allowed",
//     transition: "all 0.2s ease"
//   }}
//   onMouseEnter={(e) => {
//     if (selectedDriver) {
//       e.target.style.backgroundColor = "#3182CE";
//     }
//   }}
//   onMouseLeave={(e) => {
//     if (selectedDriver) {
//       e.target.style.backgroundColor = "#4299E1";
//     }
//   }}
// >
//   Assign
// </button>
// </div>
// </div>
// </div>
// )}

//           </form>
//         </div>
//       )}

//       <div id="map" className="map-container" />
//     </div>
//   );
// };

// export default GeolocationMap;




import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Menu, X } from 'lucide-react';
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import axios from 'axios';

// Constants
const SOCKET_SERVER = "http://localhost:8000";
const API_URL = "http://localhost:8000/api";

// CSS Styles
const styles = `
.tracking-container {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-container {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.info-container {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 380px;
  z-index: 2;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.location-info {
  margin-bottom: 20px;
}

.location-item {
  margin: 12px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #0066CC;
}

.location-label {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 4px;
}

.location-value {
  font-size: 1.1em;
  color: #333;
  font-weight: 500;
}

.assign-driver-btn {
  width: 100%;
  padding: 12px;
  background: #0066CC;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.assign-driver-btn:hover:not(:disabled) {
  background: #0052a3;
  transform: translateY(-1px);
}

.assign-driver-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: #333;
}

.driver-list {
  display: grid;
  gap: 16px;
}

.driver-list-empty {
  text-align: center;
  padding: 40px 20px;
  color: #666;
  font-size: 1.1em;
}

.driver-card {
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.driver-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.driver-info h3 {
  margin: 0;
  color: #333;
}

.driver-info p {
  margin: 4px 0 0 0;
  color: #666;
  font-size: 0.9em;
}

.driver-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  margin-top: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #40c057;
  box-shadow: 0 0 0 2px rgba(64, 192, 87, 0.2);
}

.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.notification {
  padding: 16px 20px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: slideIn 0.3s ease-out;
  border-left: 4px solid;
}

.notification.success {
  border-left-color: #40c057;
}

.notification.error {
  border-left-color: #ff6b6b;
}

.notification.warning {
  border-left-color: #ffd43b;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 18px;
  padding: 0 4px;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #333;
}

.status-indicator {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
}

.live-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff6b6b;
  transition: background-color 0.3s ease;
}

.live-indicator.connected {
  background: #40c057;
}

.refresh-button {
  background: none;
  border: none;
  color: #0066CC;
  cursor: pointer;
  font-size: 0.9em;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.refresh-button:hover {
  background: rgba(0, 102, 204, 0.1);
}

.loading-spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #0066CC;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const ShipmentTracking = ({ 
  userRole, 
  userId,
  cartId,
  initialStartLocation = '',
  initialCheckpoint = '',
  initialDestination = '' 
}) => {
  // ... (previous state management code remains the same)

  // New state for driver assignment
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [locationNames, setLocationNames] = useState({
    start: '',
    checkpoint: '',
    destination: ''
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [map, setMap] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);
  const [startLocation, setStartLocation] = useState(initialStartLocation);
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
  const [destination, setDestination] = useState(initialDestination);
  const [checkpointCoords, setCheckpointCoords] = useState({ lat: '', lon: '' });
  const [destinationCoords, setDestinationCoords] = useState({ lat: '', lon: '' });
  const [currentRoute, setCurrentRoute] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [lastDriverUpdate, setLastDriverUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [routeDeviation, setRouteDeviation] = useState(false);

  // Refs
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const routingControlRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const checkpointMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);

  // Custom icons
  const taxiIcon = L.icon({
    iconUrl: "media/NHC (1).png",
    iconSize: [60, 60],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const destinationIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-icon-2x.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [12, 41]
  });

  // Authentication & Authorization
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const response = await axios.post(`${API_URL}/shipment/verify-access`, {
          cart_id: cartId,
          user_id: userId
        });

        if (response.data.authorized) {
          setIsAuthorized(true);
          setShipmentDetails(response.data.shipment);
        } else {
          addNotification("Unauthorized access", "error");
        }
      } catch (error) {
        console.error("Access verification error:", error);
        addNotification("Access verification failed", "error");
      }
    };

    if (userId && cartId) {
      verifyAccess();
    }
  }, [userId, cartId]);

  // Parse coordinates from string format "lat, lng"
  const parseCoordinates = (coordString) => {
    if (!coordString) return null;
    const [lat, lng] = coordString.split(',').map(coord => parseFloat(coord.trim()));
    return { lat, lng };
  };

  // Create route from coordinates
  const createRoute = () => {
    if (!startLocation || !checkpoint || !destination) return;

    const start = parseCoordinates(startLocation);
    const mid = parseCoordinates(checkpoint);
    const end = parseCoordinates(destination);

    if (!start || !mid || !end) {
      addNotification("Invalid coordinates provided", "error");
      return;
    }

    const waypoints = [
      L.latLng(start.lat, start.lng),
      L.latLng(mid.lat, mid.lng),
      L.latLng(end.lat, end.lng)
    ];

    // Prepare route data
    const routeData = {
      waypoints: waypoints.map(wp => ({
        lat: wp.lat,
        lng: wp.lng
      })),
      metadata: {
        startLocation,
        checkpoint,
        destination,
        startTime: new Date().toISOString()
      }
    };

    // Emit route creation event
    socketRef.current?.emit('route-created', {
      cart_id: cartId,
      route_data: routeData
    });

    // Create route visualization
    clearExistingRouteAndMarkers();
    createRouteMarkers(waypoints);
    createRoutingControl(waypoints);
  };

  // Map initialization
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current && isAuthorized) {
        try {
          // Create map instance
          const mapInstance = L.map("map", {
            zoomControl: true,
            scrollWheelZoom: true
          });

          // Add tile layer
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 18,
          }).addTo(mapInstance);
          
          // Set initial view to a default location
          mapInstance.setView([22.5726, 88.3639], 13); // Centered on India
          
          mapRef.current = mapInstance;
          setMap(mapInstance);

          // Wait a moment for the map to be fully initialized
          await new Promise(resolve => setTimeout(resolve, 100));

          // Create route if coordinates are available
          if (startLocation && checkpoint && destination) {
            const start = parseCoordinates(startLocation);
            if (start) {
              mapInstance.setView([start.lat, start.lng], 13);
              createRoute();
            }
          }
        } catch (error) {
          console.error('Map initialization error:', error);
          addNotification('Error initializing map', 'error');
        }
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
      }
    };
  }, [isAuthorized, startLocation, checkpoint, destination]);

  // Socket connection and tracking
  useEffect(() => {
    if (!map || !isAuthorized) return;

    socketRef.current = io(SOCKET_SERVER, {
      query: {
        user_id: userId,
        cart_id: cartId,
        role: userRole
      }
    });

    // Socket event handlers
    socketRef.current.on("connect", () => {
      setIsConnected(true);
      socketRef.current.emit("request-initial-state", { cart_id: cartId });
      
      // Create route when socket is connected and coordinates are available
      if (startLocation && checkpoint && destination) {
        createRoute();
      }
    });

    socketRef.current.on("initial-state", handleInitialState);
    socketRef.current.on("route-broadcast", handleRouteBroadcast);
    socketRef.current.on("driver-location-update", handleDriverLocationUpdate);
    socketRef.current.on("route-deviation", handleRouteDeviation);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [map, isAuthorized]);

  // Handler functions
  const handleInitialState = (data) => {
    if (data.route) {
      const { route } = data;
      if (route.waypoints && route.waypoints.length > 0) {
        const waypoints = route.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
        clearExistingRouteAndMarkers();
        createRouteMarkers(waypoints);
        createRoutingControl(waypoints);
      }
    }
  };

  const handleRouteBroadcast = (data) => {
    if (!data?.waypoints) return;

    clearExistingRouteAndMarkers();
    const waypoints = data.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
    
    if (data.metadata) {
      setStartLocation(data.metadata.startLocation || "");
      setCheckpoint(data.metadata.checkpoint || "");
      setDestination(data.metadata.destination || "");
      setCheckpointCoords(data.metadata.checkpointCoords || null);
      setDestinationCoords(data.metadata.destinationCoords || null);
    }

    createRouteMarkers(waypoints);
    createRoutingControl(waypoints);
  };

  const handleDriverLocationUpdate = (data) => {
    updateDriverMarker(data);
    setLastDriverUpdate(new Date());
  };

  const handleRouteDeviation = (data) => {
    addNotification(data.message, "warning");
    setRouteDeviation(true);
  };

  // Helper functions
  const clearExistingRouteAndMarkers = () => {
    if (map && routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    
    if (map && destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
    
    if (map && checkpointMarkerRef.current) {
      checkpointMarkerRef.current.remove();
      checkpointMarkerRef.current = null;
    }
    
    if (map && routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
  };

  const createRoutingControl = (waypoints) => {
    try {
      // Wait for map to be ready
      if (!mapRef.current || !waypoints || waypoints.length < 2) {
        console.error("Map or waypoints not ready");
        return;
      }

      // Clear existing routing control if it exists
      if (routingControlRef.current && mapRef.current) {
        try {
          routingControlRef.current.remove();
        } catch (error) {
          console.debug('Error removing existing route:', error);
        }
        routingControlRef.current = null;
      }

      // Ensure the map is properly initialized
      const mapInstance = mapRef.current;

      // Create new routing control
      routingControlRef.current = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        showAlternatives: false,
        lineOptions: {
          styles: [
            { color: '#0066CC', weight: 4, opacity: 0.7 }, // Main route style
          ],
          missingRouteStyles: [
            { color: '#FF0000', weight: 4, opacity: 0.7, dashArray: '10,10' } // Style for missing route segments
          ]
        },
        createMarker: function() { return null; }, // Don't create default markers
        fitSelectedRoutes: true,
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
          suppressDemoServerWarning: true
        })
      }).addTo(map);

      // Handle route calculation events
      routingControlRef.current.on('routesfound', (e) => {
        try {
          const routes = e.routes;
          const coordinates = routes[0].coordinates;

          // Remove existing route polyline if it exists
          if (routePolylineRef.current && routePolylineRef.current._map) {
            routePolylineRef.current.remove();
          }

          // Create new route polyline
          routePolylineRef.current = L.polyline(coordinates, {
            color: '#0066CC',
            weight: 4,
            opacity: 0.7
          }).addTo(map);

          // Create route buffer for deviation detection (100 meters)
          const bufferOptions = {
            color: '#0066CC',
            weight: 100,
            opacity: 0.2
          };

          // Store route data for deviation checks
          setCurrentRoute({
            coordinates: coordinates,
            boundingBox: routePolylineRef.current.getBounds(),
            timestamp: new Date().toISOString()
          });

          // Fit map to show entire route with padding
          const bounds = routePolylineRef.current.getBounds();
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 16
          });

        } catch (error) {
          console.error('Error handling route calculation:', error);
          addNotification('Error calculating route', 'error');
        }
      });

      routingControlRef.current.on('routingerror', (error) => {
        console.error('Routing error:', error);
        addNotification('Error creating route. Please try again.', 'error');
      });

    } catch (error) {
      console.error('Error in createRoutingControl:', error);
      addNotification('Failed to create route visualization', 'error');
    }
  };

  const createRouteMarkers = (waypoints) => {
    if (waypoints.length > 0) {
      const destinationPoint = waypoints[waypoints.length - 1];
      destinationMarkerRef.current = L.marker(destinationPoint, {
        icon: destinationIcon
      })
      .bindPopup('Destination')
      .addTo(map);

      if (waypoints.length > 1) {
        const checkpointPoint = waypoints[1];
        checkpointMarkerRef.current = L.marker(checkpointPoint, {
          icon: destinationIcon
        })
        .bindPopup('Checkpoint')
        .addTo(map);
      }
    }
  };

  const updateDriverMarker = (locationData) => {
    if (!map || !locationData) return;

    const { latitude, longitude } = locationData;
    
    try {
      if (driverMarker) {
        driverMarker.setLatLng([latitude, longitude]);
      } else {
        const newDriverMarker = L.marker([latitude, longitude], {
          icon: taxiIcon,
          zIndexOffset: 1000
        }).addTo(map);
        
        newDriverMarker.bindPopup('Driver Location');
        setDriverMarker(newDriverMarker);
      }
    } catch (error) {
      console.error('Error updating driver marker:', error);
      addNotification("Error updating driver location", "error");
    }
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Fetch online drivers
  const fetchOnlineDrivers = async () => {
    setIsLoadingDrivers(true);
    try {
      const response = await axios.post(`${API_URL}/fetch_drivers_online`, {
        user_id: userId
      });

      if (response.data.drivers) {
        setDrivers(response.data.drivers);
      } else {
        addNotification('No online drivers available', 'warning');
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      addNotification('Failed to fetch drivers', 'error');
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  // Fetch drivers when modal opens
  useEffect(() => {
    if (showDriverModal) {
      fetchOnlineDrivers();
    }
  }, [showDriverModal]);

  // Convert coordinates to location names
  useEffect(() => {
    const convertToLocationName = async (coords) => {
      try {
        const [lat, lng] = coords.split(',').map(c => c.trim());
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        return response.data.display_name;
      } catch (error) {
        console.error('Error converting coordinates:', error);
        return coords;
      }
    };

    const updateLocationNames = async () => {
      if (startLocation) {
        const startName = await convertToLocationName(startLocation);
        setLocationNames(prev => ({ ...prev, start: startName }));
      }
      if (checkpoint) {
        const checkpointName = await convertToLocationName(checkpoint);
        setLocationNames(prev => ({ ...prev, checkpoint: checkpointName }));
      }
      if (destination) {
        const destinationName = await convertToLocationName(destination);
        setLocationNames(prev => ({ ...prev, destination: destinationName }));
      }
    };

    updateLocationNames();
  }, [startLocation, checkpoint, destination]);

  // Handle driver assignment
  const handleAssignDriver = async (driverId) => {
    try {
      const response = await axios.post(`${API_URL}/assign_driver`, {
        cart_id: cartId,
        driver_id: driverId
      });

      if (response.status === 200) {
        addNotification('Driver assigned successfully', 'success');
        setShowDriverModal(false);
        // Remove the assigned driver from the list
        setDrivers(prev => prev.filter(driver => driver.generated_unique_id !== driverId));
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      addNotification('Failed to assign driver', 'error');
    }
  };

  // Add style tag to document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Location Info Container Component
  const LocationInfoContainer = () => (
    <div className="info-container">
      <div className="location-info">
        <div className="location-item">
          <div className="location-label">Start Location</div>
          <div className="location-value">{locationNames.start || startLocation}</div>
        </div>
        <div className="location-item">
          <div className="location-label">Checkpoint</div>
          <div className="location-value">{locationNames.checkpoint || checkpoint}</div>
        </div>
        <div className="location-item">
          <div className="location-label">Destination</div>
          <div className="location-value">{locationNames.destination || destination}</div>
        </div>
      </div>
      <button 
        className="assign-driver-btn"
        onClick={() => setShowDriverModal(true)}
      >
        Assign Driver
      </button>
    </div>
  );

  // Driver Assignment Modal Component
  const DriverModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Available Online Drivers</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className="refresh-button"
              onClick={fetchOnlineDrivers}
              disabled={isLoadingDrivers}
            >
              Refresh
            </button>
            <button 
              className="modal-close"
              onClick={() => setShowDriverModal(false)}
            >
              ×
            </button>
          </div>
        </div>

        <div className="driver-list">
          {isLoadingDrivers ? (
            <div className="loading-spinner" />
          ) : drivers.length === 0 ? (
            <div className="driver-list-empty">
              No online drivers available at the moment
            </div>
          ) : (
            drivers.map(driver => (
              <div key={driver.generated_unique_id} className="driver-card">
                <div className="driver-info">
                  <h3>{driver.user_name}</h3>
                  <div className="driver-status">
                    <span className="status-dot online" />
                    Online
                  </div>
                </div>
                <button
                  className="assign-driver-btn"
                  onClick={() => handleAssignDriver(driver.generated_unique_id)}
                  style={{ width: 'auto', padding: '8px 16px' }}
                >
                  Assign
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (!isAuthorized) {
    return <div>Verifying access...</div>;
  }

  return (
    <div className="tracking-container">
      <LocationInfoContainer />
      {showDriverModal && <DriverModal />}
      
      <div className="notification-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <span>{notification.message}</span>
            <button
              className="close-btn"
              onClick={() => setNotifications(prev => 
                prev.filter(n => n.id !== notification.id)
              )}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      <div id="map" className="map-container" />
      
      <div className="status-indicator">
        <div className={`live-indicator ${isConnected ? 'connected' : ''}`} />
        <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
        {lastDriverUpdate && (
          <div>Last Update: {new Date(lastDriverUpdate).toLocaleTimeString()}</div>
        )}
      </div>
    </div>
  );
};

export default ShipmentTracking;