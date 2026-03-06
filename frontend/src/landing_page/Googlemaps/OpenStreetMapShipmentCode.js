//Js code for my website
import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Menu, X, RefreshCw } from 'lucide-react';
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import axios from 'axios';
import './ShowAssignedDrivers'
import './ShipmentTrackingStyles.css'
import ShowAssignedDrivers from "./ShowAssignedDrivers";
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
  left: 60px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 380px;
  z-index: 2;
  width:500px;
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
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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



.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 1.1em;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 6px;
}

.driver-details {
  display: flex;
  align-items: center;
  gap: 16px;
}

.driver-id {
  font-size: 0.9em;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 4px;
}

.online-status {
  font-size: 0.9em;
  font-weight: 500;
}

.online-status.connected {
  color: #2f9e44;
}

.online-status.disconnected {
  color: #e03131;
}

.assign-button {
  background: #0066CC;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.assign-button:hover:not(:disabled) {
  background: #0052a3;
  transform: translateY(-1px);
}

.assign-button:disabled {
  background: #e9ecef;
  color: #adb5bd;
  cursor: not-allowed;
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
 margin-top:15px;
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
  const [routePolyline, setRoutePolyline] = useState([]);
  // Refs
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const routingControlRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const checkpointMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const startMarkerRef = useRef(null)
  // Custom icons

  // "media/NHC (1).png"
  const taxiIcon = L.icon({
    iconUrl:"media/NHC (1).png", // Replace with your actual icon URL
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30]
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
  const startIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
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
          user_id: userId,
          role: userRole
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
    if (!mapRef.current || !isAuthorized) return;

    socketRef.current = io(SOCKET_SERVER, {
      query: {
        user_id: userId,
        cart_id: cartId,
        role: userRole
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Socket event handlers
    socketRef.current.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      socketRef.current.emit("request-initial-state", { cart_id: cartId });
      
      // Create route when socket is connected and coordinates are available
      if (startLocation && checkpoint && destination) {
        createRoute();
      }
    });

    // socketRef.current.on("initial-state", handleInitialState);
    socketRef.current.on("route-broadcast", handleRouteBroadcast);
    socketRef.current.on("driver-location-update", (data) => {
      console.log("Received driver location update:", data);
      
      if (data.latitude && data.longitude) {
        updateDriverMarker({
          latitude: data.latitude,
          longitude: data.longitude
        });
        setLastDriverUpdate(new Date(data.last_update));
        
        // Update map bounds to include driver and route
        updateMapBounds(data);
      }
    });
  
    socketRef.current.on("route-deviation", (data) => {
      console.log("Route deviation event:", data);
      
      if (data.message === "Driver returned to route") {
        setRouteDeviation(false);
        addNotification("Driver has returned to the planned route", "success");
        
        // Clear any deviation visualizations
        clearDeviationPath();
      } else {
        setRouteDeviation(true);
        addNotification(data.message, "warning");
        
        // Visualize the deviation path
        if (data.start_location && data.current_location) {
          updateDeviationPath(data);
        }
      }
    });
  
    socketRef.current.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [mapRef.current, isAuthorized]);

  // Handler functions
  const handleInitialState = (data) => {
    console.log("Received initial state:", data);
    if (data.route) {
      try {
        const routeData = typeof data.route === 'string' ? JSON.parse(data.route) : data.route;
        if (routeData.waypoints && routeData.waypoints.length > 0) {
          const waypoints = routeData.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
          clearExistingRouteAndMarkers();
          createRouteMarkers(waypoints);
          createRoutingControl(waypoints);
        }

        // If there's current location data, show driver marker
        if (routeData.current_location) {
          const location = typeof routeData.current_location === 'string' 
            ? JSON.parse(routeData.current_location)
            : routeData.current_location;
            
          updateDriverMarker({
            latitude: location.latitude,
            longitude: location.longitude
          });
        }
      } catch (error) {
        console.error('Error handling initial state:', error);
        addNotification('Error loading initial state', 'error');
      }
    }
  };

  // useEffect(() => {
  //   return () => {
  //     if (map && driverMarker) {
  //       map.removeLayer(driverMarker);
  //     }
  //   };
  // }, []);

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
    if (map && startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
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
    const startPoint = waypoints[0];
startMarkerRef.current = L.marker(startPoint, {
  icon: startIcon
})
.bindPopup('Start Location')
.addTo(map);
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
    if (!mapRef.current || !locationData?.latitude || !locationData?.longitude) {
      console.warn('Invalid map or location data:', { 
        map: !!mapRef.current, 
        locationData 
      });
      return;
    }
  
    const { latitude, longitude } = locationData;
    
    try {
      const markerIcon = L.icon({
        iconUrl: "media/NHC (1).png",
        iconSize: [60, 60],
        iconAnchor: [30, 30],
        popupAnchor: [0, -30]
      });
  
      if (driverMarker) {
        // Smoothly animate to new position
        driverMarker.setLatLng([latitude, longitude]);
      } else {
        // Create new marker
        const newMarker = L.marker([latitude, longitude], {
          icon: markerIcon,
          zIndexOffset: 1000
        }).addTo(mapRef.current);
        
        newMarker.bindPopup('Driver Location');
        setDriverMarker(newMarker);
      }
    } catch (error) {
      console.error('Driver marker update failed:', error);
      addNotification("Failed to update driver location", "error");
    }
  };
  
  const updateMapBounds = (data) => {
    if (!mapRef.current || !data.latitude || !data.longitude) return;
  
    const driverLatLng = L.latLng(data.latitude, data.longitude);
    
    if (routePolyline.length > 0) {
      // Include route and driver location in bounds
      const bounds = L.latLngBounds([...routePolyline, driverLatLng]);
      mapRef.current.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 16 // Prevent excessive zoom
      });
    } else {
      // Center on driver if no route is available
      mapRef.current.setView(driverLatLng, 14, {
        animate: true,
        duration: 1
      });
    }
  };
  
  // New functions to handle deviation visualization
  let deviationPath = null;
  
  const updateDeviationPath = (data) => {
    if (!mapRef.current) return;
  
    const { start_location, current_location } = data;
    
    if (deviationPath) {
      mapRef.current.removeLayer(deviationPath);
    }
  
    deviationPath = L.polyline(
      [
        [start_location.lat, start_location.lng],
        [current_location.lat, current_location.lng]
      ],
      {
        color: '#ff6b6b',
        weight: 4,
        dashArray: '10, 10',
        opacity: 0.8
      }
    ).addTo(mapRef.current);
  };
  
  const clearDeviationPath = () => {
    if (deviationPath && mapRef.current) {
      mapRef.current.removeLayer(deviationPath);
      deviationPath = null;
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
      const response = await axios.post(`http://127.0.0.1:5000/fetch_drivers_online`, {
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
      const response = await axios.post(`http://127.0.0.1:5000/assign_driver`, {
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
      <h2
  style={{
   
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#2575fc",
    textAlign: "center",
    margin: "20px 0",
    textTransform: "uppercase",
    letterSpacing: "2px",
    padding:'0px'
    
  }}
>
  Track your Shipment
</h2>

      <div className="location-info">
        <div className="location-item">
          <div className="location-label">Manufacturer Location</div>
          <div className="location-value">{locationNames.start || startLocation}</div>
        </div>
        <div className="location-item">
          <div className="location-label">Wholesaler Location</div>
          <div className="location-value">{locationNames.checkpoint || checkpoint}</div>
        </div>
        <div className="location-item">
          <div className="location-label">Retailer Location</div>
          <div className="location-value">{locationNames.destination || destination}</div>
        </div>
      </div>
      {userRole === 'start' && (
  <>
    <button 
      className="assign-driver-btn"
      onClick={() => setShowDriverModal(true)}
    >
      Assign Driver
    </button>
    <ShowAssignedDrivers cartId={cartId} />
  </>
)}

      <div className="status-indicator">
        <div className={`live-indicator ${isConnected ? 'connected' : ''}`} />
        <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
        {lastDriverUpdate && (
          <div>Last Update: {new Date(lastDriverUpdate).toLocaleTimeString()}</div>
        )}
      </div>
      
    </div>
  );

  // Driver Assignment Modal Component
  const DriverModal = () => (
    <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header-driver">
        <h2>Available Online Drivers</h2>
        <div className="header-actions">
          <button 
            className="refresh-button"
            onClick={fetchOnlineDrivers}
            disabled={isLoadingDrivers}
          >
            <RefreshCw size={18} className={isLoadingDrivers ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            className="close-button-driver"
            onClick={() => setShowDriverModal(false)}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="driver-list">
        {isLoadingDrivers ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Finding available drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚖</div>
            <p>No online drivers available at the moment</p>
            <button 
              className="retry-button"
              onClick={fetchOnlineDrivers}
            >
              Try Again
            </button>
          </div>
        ) : (
          drivers.map(driver => (
            <div key={driver.generated_unique_id} className="driver-card">
              <div className="driver-avatar">
                {driver.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="driver-info">
                
                <div className="driver-name">{driver.user_name}</div>
                <div className="driver-details">
                  <div className="driver-id">
                    Driver ID: {driver.generated_unique_id}
                  </div>
                  <div className="driver-status">
                    <span className={`driver-dot ${driver.driver_online ? 'online' : 'offline'}`} />
                    <span className={`online-status ${driver.driver_online ? 'connected' : 'disconnected'}`}>
                      {driver.driver_online ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="assign-button-wrapper">
                <button
                  className="assign-button"
                  onClick={() => handleAssignDriver(driver.generated_unique_id)}
                >
                  <span className="button-text">Assign Driver</span>
                  <span className="button-icon">→</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease-out;
          font-family: 'Poppins', sans-serif;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 600px;
          max-height: 85vh;
          overflow: hidden;
          font-family: 'Poppins', sans-serif;
          animation: slideUp 0.3s ease-out;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
                      0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header-driver {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #edf2f7;
        }

        .modal-header-driver h2 {
          font-size: 1.5rem;
          color: #2d3748;
          margin: 0;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          background: #f7fafc;
          color: #4a5568;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
              margin-bottom: 10px;
        }

        .refresh-button:hover:not(:disabled) {
          background: #edf2f7;
          color: #2d3748;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .close-button-driver {
          background: none;
          border: none;
          color: #718096;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
              margin-bottom: 10px;
        }

        .close-button-driver:hover {
          background: #f7fafc;
          color: #2d3748;
        }

        .driver-list {
          padding: 24px;
          overflow-y: auto;
          max-height: calc(85vh - 80px);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 0;
          color: #718096;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #edf2f7;
          border-top-color: #4299e1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 48px 0;
          color: #718096;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .retry-button {
          margin-top: 16px;
          padding: 8px 16px;
          background: #edf2f7;
          border: none;
          border-radius: 8px;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s;
        }

        .retry-button:hover {
          background: #e2e8f0;
          color: #2d3748;
        }

        .driver-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: 12px;
          background: white;
          margin-bottom: 16px;
          border: 1px solid #edf2f7;
          transition: all 0.2s;
        }

        .driver-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                      0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border-color: #4299e1;
        }

        .driver-avatar {
          width: 48px;
          height: 48px;
          background: #4299e1;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .driver-info {
          flex: 1;
        }

        .driver-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 4px;
        }

        .driver-details {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .driver-id {
          font-size: 0.875rem;
          color: #718096;
        }

        .driver-status {
          display: flex;
          align-items: center;
          gap: 6px;
              margin-bottom: 3px;
        }

         .driver-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .driver-dot.online {
          background: #22c55e;
        }

        .driver-dot.offline {
          background: #ef4444;
        }

        .online-status {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .online-status.connected {
          color: #22c55e;
        }

        .online-status.disconnected {
          color: #ef4444;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        .assign-button-wrapper {
          position: relative;
          overflow: hidden;
        }

        .assign-button {
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          overflow: hidden;
          padding: 0;
          transition: all 0.3s;
          display: flex;
          align-items: center;
        }

        .assign-button:hover {
          background: #3182ce;
        }

        .button-text {
          padding: 10px 16px;
        }

        .button-icon {
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
        }

        .assign-button:hover .button-icon {
          transform: translateX(4px);
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
        {routeDeviation && (
          <div className="deviation-warning">
            ⚠️ Route deviation detected
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentTracking;