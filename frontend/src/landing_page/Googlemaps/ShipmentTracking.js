// ShipmentTracking.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, RefreshCw } from 'lucide-react';
import { io } from "socket.io-client";
import axios from 'axios';
import ShowAssignedDrivers from "./ShowAssignedDrivers";
import "./ShipmentTrackingStyles.css"
import ChatComponent from './chatComponent';
import DeviationTracker from './DeviationTracker';
// Constants
const SOCKET_SERVER = "http://localhost:8000";
const API_URL = "  http://127.0.0.1:8000/api";
const GOOGLE_MAPS_API_KEY = 'AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4';
const DEFAULT_COORDINATES = {
  center: { lat: 22.5726, lng: 88.3639 },
};

// Helper function to parse and validate coordinates
const parseCoordinates = (coordString) => {
  if (!coordString) return null;
  
  try {
    const [lat, lng] = coordString.split(',').map(coord => {
      const num = parseFloat(coord.trim());
      return isNaN(num) ? null : num;
    });
    
    if (lat === null || lng === null) return null;
    
    // Basic coordinate validation
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    
    return { lat, lng };
  } catch (error) {
    console.error('Error parsing coordinates:', error);
    return null;
  }
};
// Styles
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
  top: 150px;
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
 border-radius: 16px;
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
  // States
  const [map, setMap] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);
  const [startLocation, setStartLocation] = useState(initialStartLocation);
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
  const [destination, setDestination] = useState(initialDestination);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
    const [routeDeviation, setRouteDeviation] = useState(false);
    const [deviationPath, setDeviationPath] = useState(null);

  const [lastDriverUpdate, setLastDriverUpdate] = useState(null);
  const [locationNames, setLocationNames] = useState({
    start: '',
    checkpoint: '',
    destination: ''
  });

  // Refs
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const startMarkerRef = useRef(null);
  const checkpointMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);

  // Load Google Maps Script
  useEffect(() => {
    if (!isAuthorized) return;

    if (!window.google && !document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGoogleMapsLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setIsGoogleMapsLoaded(true);
    }
  }, [isAuthorized]);

  // Initialize Map


  // Update the Initialize Map effect
    // Initialize Map
  // Map initialization useEffect
useEffect(() => {
  if (!isGoogleMapsLoaded || !mapRef.current || !isAuthorized) {
    return;
  }

  try {
    // Parse all coordinates first
    const startCoords = parseCoordinates(initialStartLocation);
    const checkpointCoords = parseCoordinates(initialCheckpoint);
    const destinationCoords = parseCoordinates(initialDestination);

    // Determine which points to use for the route
    let effectiveStartCoords = null;
    let effectiveDestinationCoords = null;
    let waypoints = [];
    let routeDescription = '';

    // Logic to determine route points based on available coordinates
    if (startCoords) {
      effectiveStartCoords = startCoords;
      if (destinationCoords) {
        effectiveDestinationCoords = destinationCoords;
        if (checkpointCoords) {
          waypoints = [{ location: checkpointCoords, stopover: true }];
          routeDescription = 'Complete route with all points';
        } else {
          routeDescription = 'Direct route from start to destination (no checkpoint)';
        }
      } else if (checkpointCoords) {
        effectiveDestinationCoords = checkpointCoords;
        routeDescription = 'Route from start to checkpoint (no destination)';
      }
    } else if (checkpointCoords) {
      effectiveStartCoords = checkpointCoords;
      if (destinationCoords) {
        effectiveDestinationCoords = destinationCoords;
        routeDescription = 'Route from checkpoint to destination (no start)';
      }
    }

    // Create map instance
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: effectiveStartCoords || DEFAULT_COORDINATES.center,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ],
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true
    });

    // Initialize directions services
    directionsServiceRef.current = new window.google.maps.DirectionsService();
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#0066CC",
        strokeWeight: 4,
        strokeOpacity: 0.7
      }
    });

    // Create markers for available points
    const createMarker = (position, label, title) => {
      if (position) {
        return new window.google.maps.Marker({
          position,
          map: mapInstance,
          label,
          title,
          animation: window.google.maps.Animation.DROP
        });
      }
      return null;
    };

    // Add markers based on available coordinates
    if (startCoords) {
      startMarkerRef.current = createMarker(startCoords, 'S', 'Start Location');
    }
    if (checkpointCoords) {
      checkpointMarkerRef.current = createMarker(checkpointCoords, 'C', 'Checkpoint');
    }
    if (destinationCoords) {
      destinationMarkerRef.current = createMarker(destinationCoords, 'D', 'Destination');
    }

    // Create route if we have sufficient points
    if (effectiveStartCoords && effectiveDestinationCoords) {
      const request = {
        origin: effectiveStartCoords,
        destination: effectiveDestinationCoords,
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
          addNotification(routeDescription, 'info');
        } else {
          console.error('Failed to create route:', status);
          addNotification('Failed to create route between available points', 'error');
        }
      });

      // Fit bounds to show all markers
      const bounds = new window.google.maps.LatLngBounds();
      if (startCoords) bounds.extend(startCoords);
      if (checkpointCoords) bounds.extend(checkpointCoords);
      if (destinationCoords) bounds.extend(destinationCoords);
      if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds);
      }
    } else {
      addNotification('Insufficient points to create a route', 'warning');
    }

    setMap(mapInstance);
    
    // Initialize socket with full route data
    initializeSocket(mapInstance);

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (driverMarker) {
        driverMarker.setMap(null);
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
      }
      if (checkpointMarkerRef.current) {
        checkpointMarkerRef.current.setMap(null);
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
      }
    };
  } catch (error) {
    console.error('Error initializing map:', error);
    addNotification('Error initializing map', 'error');
  }
}, [isGoogleMapsLoaded, isAuthorized, initialStartLocation, initialCheckpoint, initialDestination]);
  
    // Update Driver Marker
    const updateDriverMarker = (mapInstance, locationData) => {
      if (!mapInstance || !locationData?.latitude || !locationData?.longitude) {
        console.log('Missing map instance or location data for driver marker update');
        return;
      }
  
      try {
        const position = new window.google.maps.LatLng(
          parseFloat(locationData.latitude),
          parseFloat(locationData.longitude)
        );
  
        if (driverMarker) {
          driverMarker.setPosition(position);
          console.log('Updated existing driver marker position');
        } else {
          const newMarker = new window.google.maps.Marker({
            position: position,
            map: mapInstance,
            title: 'Driver Location',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
            animation: window.google.maps.Animation.DROP
          });
          
          setDriverMarker(newMarker);
          console.log('Created new driver marker');
        }
  
        mapInstance.panTo(position);
      } catch (error) {
        console.error('Error updating driver marker:', error);
        addNotification('Error updating driver location', 'error');
      }
    };

  // Authentication & Socket Connection
  useEffect(() => {
    const verifyAccess = async () => {
      if (!userId || !cartId || !userRole) {
        console.log("Missing required parameters for verification");
        return;
      }

      try {
        console.log("Verifying access for:", { userId, cartId, userRole });
        
        const response = await axios.post(`${API_URL}/shipment/verify-access`, {
          cart_id: cartId,
          user_id: userId,
          role: userRole
        });
        
        console.log("Verification response:", response.data);

        if (response.data.success && response.data.authorized) {
          setIsAuthorized(true);
          
          // Store shipment details if provided
          if (response.data.shipment) {
            setShipmentDetails(response.data.shipment);
          }
          
          initializeSocket();
          addNotification("Access verified successfully", "success");
        } else {
          setIsAuthorized(false);
          // addNotification(response.data.error || "Unauthorized access", "error");
        }
      } catch (error) {
        console.error("Access verification error:", error);
        setIsAuthorized(false);
        
        const errorMessage = error.response?.data?.error || 
                           error.response?.data?.details ||
                           error.message || 
                           "Access verification failed";
                           
        addNotification(errorMessage, "error");
      }
    };

    // Clean up function
    const cleanup = () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };

    if (userId && cartId && userRole) {
      verifyAccess();
    }

    return cleanup;
  }, [userId, cartId, userRole]);
  // Initialize Socket
  // const initializeSocket = () => {
  //   try {
  //     console.log('Initializing socket connection');
      
  //     socketRef.current = io(SOCKET_SERVER, {
  //       query: {
  //         user_id: userId,
  //         cart_id: cartId,
  //         role: userRole
  //       }
  //     });

  //     socketRef.current.on("connect", () => {
  //       console.log('Socket connected');
  //       setIsConnected(true);
  //       socketRef.current.emit("request-initial-state", { cart_id: cartId });
  //     });

  //     socketRef.current.on("disconnect", () => {
  //       console.log('Socket disconnected');
  //       setIsConnected(false);
  //     });

  //     socketRef.current.on("driver-location-update", (data) => {
  //       console.log('Received driver location update:', data);
  //       updateDriverMarker(data);
  //       setLastDriverUpdate(new Date());
  //     });

  //     // Handle initial state
  //     socketRef.current.on("initial-state", (data) => {
  //       console.log('Received initial state:', data);
  //       if (data.driver_location) {
  //         updateDriverMarker(data.driver_location);
  //       }
  //     });

  //     // Handle connection errors
  //     socketRef.current.on("connect_error", (error) => {
  //       console.error('Socket connection error:', error);
  //       addNotification('Lost connection to tracking server', 'error');
  //     });

  //   } catch (error) {
  //     console.error('Error initializing socket:', error);
  //     addNotification('Error connecting to tracking server', 'error');
  //   }
  // };

  // Create Route
  const createRoute = (mapInstance) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    try {
      const [startLat, startLng] = startLocation.split(',').map(coord => parseFloat(coord.trim()));
      const [checkpointLat, checkpointLng] = checkpoint.split(',').map(coord => parseFloat(coord.trim()));
      const [destLat, destLng] = destination.split(',').map(coord => parseFloat(coord.trim()));

      const request = {
        origin: { lat: startLat, lng: startLng },
        destination: { lat: destLat, lng: destLng },
        waypoints: [{
          location: { lat: checkpointLat, lng: checkpointLng },
          stopover: true
        }],
        travelMode: window.google.maps.TravelMode.DRIVING
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
          createMarkers(mapInstance, result.routes[0].legs);
        } else {
          addNotification('Failed to create route', 'error');
        }
      });
    } catch (error) {
      console.error('Error creating route:', error);
      addNotification('Error creating route', 'error');
    }
  };

  // Create Markers
  const createMarkers = (mapInstance, routeLegs) => {
    if (!mapInstance) return;

    // Clear existing markers
    if (startMarkerRef.current) startMarkerRef.current.setMap(null);
    if (checkpointMarkerRef.current) checkpointMarkerRef.current.setMap(null);
    if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);

    try {
      // Create new markers
      startMarkerRef.current = new window.google.maps.Marker({
        position: routeLegs[0].start_location,
        map: mapInstance,
        label: 'S',
        title: 'Start Location',
        animation: window.google.maps.Animation.DROP
      });

      checkpointMarkerRef.current = new window.google.maps.Marker({
        position: routeLegs[0].end_location,
        map: mapInstance,
        label: 'C',
        title: 'Checkpoint',
        animation: window.google.maps.Animation.DROP
      });

      destinationMarkerRef.current = new window.google.maps.Marker({
        position: routeLegs[1].end_location,
        map: mapInstance,
        label: 'D',
        title: 'Destination',
        animation: window.google.maps.Animation.DROP
      });

      // Fit bounds to show all markers
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(routeLegs[0].start_location);
      bounds.extend(routeLegs[0].end_location);
      bounds.extend(routeLegs[1].end_location);
      mapInstance.fitBounds(bounds);
    } catch (error) {
      console.error('Error creating markers:', error);
      addNotification('Error creating markers', 'error');
    }
  };

  // Initialize Socket Connection
 // Initialize Socket Connection


 // Helper function to construct route data
 const constructRouteData = () => {
   try {
     // Parse coordinates
     const parseCoords = (coordStr) => {
       if (!coordStr) return null;
       const [lat, lng] = coordStr.split(',').map(c => parseFloat(c.trim()));
       if (isNaN(lat) || isNaN(lng)) return null;
       return { lat, lng };
     };
 
     // Parse all coordinates
     const startCoords = parseCoords(initialStartLocation);
     const checkpointCoords = parseCoords(initialCheckpoint);
     const destCoords = parseCoords(initialDestination);
 
     // Create waypoints array from valid coordinates
     const waypoints = [];
     if (startCoords) waypoints.push(startCoords);
     if (checkpointCoords) waypoints.push(checkpointCoords);
     if (destCoords) waypoints.push(destCoords);
 
     // Return early if we don't have at least two points for a route
     if (waypoints.length < 2) {
       console.warn('Not enough valid coordinates to create a route');
       return null;
     }
 
     return {
       cart_id: cartId,
       route_data: {
         waypoints,
         current_location: waypoints[0], // Initial location is the start point
         status: 'ACTIVE',
         estimated_delivery_time: new Date(Date.now() + 24*60*60*1000).toISOString(),
         start_time: new Date().toISOString(),
         last_update: new Date().toISOString()
       }
     };
   } catch (error) {
     console.error('Error constructing route data:', error);
     return null;
   }
 };
 
 // Initialize Socket Connection
// Initialize Socket Connection
// Initialize Socket Connection
// Initialize Socket Connection
// Initialize Socket Connection
const initializeSocket = (mapInstance) => {
  try {
    console.log('Initializing socket connection...');
    
    socketRef.current = io(SOCKET_SERVER, {
      query: {
        user_id: userId,
        cart_id: cartId,
        role: userRole
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Handle successful connection
    socketRef.current.on("connect", () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      
      // Parse and validate coordinates
      const parseCoords = (coordStr) => {
        if (!coordStr) return null;
        const [lat, lng] = coordStr.split(',').map(c => parseFloat(c.trim()));
        return (!isNaN(lat) && !isNaN(lng)) ? { lat, lng } : null;
      };

      // Get all available coordinates
      const startCoords = parseCoords(initialStartLocation);
      const checkpointCoords = parseCoords(initialCheckpoint);
      const destCoords = parseCoords(initialDestination);

      console.log('Available coordinates:', {
        start: startCoords,
        checkpoint: checkpointCoords,
        destination: destCoords
      });

      // Create waypoints array from valid coordinates
      const waypoints = [];
      if (startCoords) waypoints.push(startCoords);
      if (checkpointCoords) waypoints.push(checkpointCoords);
      if (destCoords) waypoints.push(destCoords);

      console.log('Valid waypoints:', waypoints);

      // Create route if we have at least 2 valid points
      if (waypoints.length >= 2) {
        const routeData = {
          cart_id: cartId,
          route_data: {
            metadata: {
              startTime: new Date().toISOString(),
              startLocation: startCoords ? `${startCoords.lat}, ${startCoords.lng}` : '',
              checkpoint: checkpointCoords ? `${checkpointCoords.lat}, ${checkpointCoords.lng}` : '',
              destination: destCoords ? `${destCoords.lat}, ${destCoords.lng}` : ''
            },
            waypoints: waypoints
          }
        };

        console.log('Emitting route-created with data:', routeData);
        socketRef.current.emit("route-created", routeData);
      } else {
        console.warn('Not enough valid coordinates to create a route');
        addNotification("Need at least 2 valid locations to create a route", "warning");
      }
      
      // Request initial state
      socketRef.current.emit("request-initial-state", { cart_id: cartId });
    });

    // Handle route broadcast response
    socketRef.current.on("route-broadcast", (data) => {
      console.log('Route broadcast received:', data);
      if (data.route_data) {
        updateMapWithRoute(mapInstance, data.route_data);
      }
    });

    // Handle route error response
    socketRef.current.on("route-error", (data) => {
      console.log('Route error received:', data);
      
      // If it's a "route exists" error, request the existing route
      if (data.message.includes('exists')) {
        socketRef.current.emit('fetch-route', { cart_id: cartId });
      }
    });

    // Handle driver location updates
    socketRef.current.on("driver-location-update", (data) => {
      console.log('Driver location update:', data);
      if (mapInstance && data) {
        updateDriverMarker(mapInstance, data);
        setLastDriverUpdate(new Date());
      }
    });

    // Handle route deviation events
    socketRef.current.on("route-deviation", (data) => {
      console.log('Route deviation:', data);
      handleRouteDeviation(data, mapInstance);
    });

    // Handle disconnection
    socketRef.current.on("disconnect", (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.connect();
          }
        }, 2000);
      }
    });

    // Handle connection errors
    socketRef.current.on("connect_error", (error) => {
      console.error('Socket connection error:', error);
      addNotification('Connection issue - retrying...', 'warning');
    });

  } catch (error) {
    console.error('Error in socket initialization:', error);
    addNotification('Error initializing tracking connection', 'error');
  }
};

// Helper function to update map with route
const updateMapWithRoute = (mapInstance, routeData) => {
  if (!mapInstance || !routeData.waypoints || routeData.waypoints.length < 2) return;

  try {
    if (directionsServiceRef.current && directionsRendererRef.current) {
      const waypoints = routeData.waypoints;
      
      const request = {
        origin: waypoints[0],
        destination: waypoints[waypoints.length - 1],
        waypoints: waypoints.slice(1, -1).map(point => ({
          location: point,
          stopover: true
        })),
        travelMode: window.google.maps.TravelMode.DRIVING
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
          
          // Create markers for all waypoints
          waypoints.forEach((point, index) => {
            let label;
            if (index === 0) label = 'S';
            else if (index === waypoints.length - 1) label = 'D';
            else label = 'C';
            
            new window.google.maps.Marker({
              position: point,
              map: mapInstance,
              label: label,
              title: `Waypoint ${index + 1}`
            });
          });
        }
      });
    }
  } catch (error) {
    console.error('Error updating map with route:', error);
  }
};
  // Helper function to handle route deviations
  const handleRouteDeviation = (data, mapInstance) => {
    if (data.message === "Driver returned to route") {
      setRouteDeviation(false);
      addNotification("Driver has returned to the planned route", "success");
      clearDeviationPath();
    } else {
      setRouteDeviation(true);
      addNotification(data.message, "warning");
      if (data.start_location && data.current_location) {
        updateDeviationPath(data);
      }
    }
  };
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
  // Update Driver Marker
  // const updateDriverMarker = (mapInstance, locationData) => {
  //   try {
  //     if (!mapInstance) {
  //       console.log('Map not initialized yet');
  //       return;
  //     }
  //     if (!mapInstance || !locationData?.latitude || !locationData?.longitude) {
  //       return;
  //     }
  //     const position = new window.google.maps.LatLng(
  //       parseFloat(locationData.latitude),
  //       parseFloat(locationData.longitude)
  //     );

  //     if (driverMarker) {
  //       driverMarker.setPosition(position);
  //     } else {
  //       const newMarker = new window.google.maps.Marker({
  //         position: position,
  //         map: mapInstance,
  //         title: 'Driver Location',
  //         icon: {
  //           path: window.google.maps.SymbolPath.CIRCLE,
  //           scale: 8,
  //           fillColor: "#4285F4",
  //           fillOpacity: 1,
  //           strokeColor: "#ffffff",
  //           strokeWeight: 2,
  //         },
  //         animation: window.google.maps.Animation.DROP
  //       });
        
  //       setDriverMarker(newMarker);
  //     }

  //     mapInstance.panTo(position);
  //   } catch (error) {
  //     console.error('Error updating driver marker:', error);
  //     addNotification('Error updating driver location', 'error');
  //   }
  // };

  // Fetch Online Drivers
  const fetchOnlineDrivers = async () => {
    setIsLoadingDrivers(true);
    try {
      const response = await axios.post(`http://127.0.0.1:5000/fetch_drivers_online`, {
        user_id: userId
      });
  
      if (response.data.drivers && response.data.drivers.length > 0) {
        setDrivers(response.data.drivers);
      } else {
        addNotification('No online drivers available', 'warning');
        setDrivers([]); // Clear the drivers list if empty
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      addNotification(error.response?.data?.error || 'Failed to fetch drivers', 'error');
      setDrivers([]); // Clear drivers on error
    } finally {
      setIsLoadingDrivers(false);
    }
  };
  
  // Handle Driver Assignment
  const handleAssignDriver = async (driverId, distributorId) => {
    try {
      const response = await axios.post(`http://127.0.0.1:5000/assign_driver`, {
        cart_id: cartId,
        driver_id: driverId,
        distributor_id: distributorId
      });
  
      if (response.status === 200) {
        addNotification(response.data.message || 'Driver assigned successfully', 'success');
        setShowDriverModal(false);
        // Remove the assigned driver from the list
        setDrivers(prev => prev.filter(driver => driver.generated_unique_id !== driverId));
        
        // Optionally refresh the drivers list
        fetchOnlineDrivers();
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      addNotification(
        error.response?.data?.error || 'Failed to assign driver', 
        'error'
      );
    }
  };
  const updateDeviationPath = (data) => {
    if (!map) return;
  
    const { start_location, current_location } = data;
    
    // Clear existing deviation path
    if (deviationPath) {
      deviationPath.setMap(null);
    }
  
    // Create new polyline
    const newDeviationPath = new window.google.maps.Polyline({
      path: [
        { lat: start_location.lat, lng: start_location.lng },
        { lat: current_location.lat, lng: current_location.lng }
      ],
      strokeColor: '#ff6b6b',
      strokeWeight: 4,
      strokeOpacity: 0.8,
      icons: [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 4
        },
        offset: '0',
        repeat: '20px'
      }],
      map: map
    });
  
    setDeviationPath(newDeviationPath);
  };
  
  // Clear deviation path function for Google Maps
  const clearDeviationPath = () => {
    if (deviationPath) {
      deviationPath.setMap(null);
      setDeviationPath(null);
    }
  };
  // Add Notification
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Location Info Container Component
  const LocationInfoContainer = () => (
    <div className="info-container">
      <h2 style={{
        fontSize: "2rem",
        fontWeight: "bold",
        color: "#2575fc",
        textAlign: "center",
        margin: "20px 0",
        textTransform: "uppercase",
        letterSpacing: "2px",
        padding: '0px'
      }}>
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
      <ChatComponent
        userId={userId}
        cartId={cartId}
        role={userRole}
      />
      <DeviationTracker cartId={cartId}/>
   {(userRole === 'wholesaler' || userRole === 'manufacturer') && (
  <>
    <button 
      className="assign-driver-btn"
      onClick={() => {
        setShowDriverModal(true);
        fetchOnlineDrivers();
      }}
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

  // Driver Modal Component
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
                    <div className="distributor-id">
                      Distributor ID: {driver.distributor_id}
                    </div>
                    <div className="driver-status">
                      <span className="driver-dot online" />
                      <span className="online-status connected">
                        Available
                      </span>
                    </div>
                  </div>
                </div>
                <div className="assign-button-wrapper">
                  <button
                    className="assign-button"
                    onClick={() => handleAssignDriver(driver.generated_unique_id, driver.distributor_id)}
                  >
                    <span className="button-text">Assign Driver&nbsp;&nbsp;→</span>
                    
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <style jsx>{`
         .distributor-id {
          font-size: 0.875rem;
          color: #718096;
          margin-right: 16px;
        }

        .driver-details {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }
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
  // Add styles to document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (driverMarker) {
        driverMarker.setMap(null);
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
      }
      if (checkpointMarkerRef.current) {
        checkpointMarkerRef.current.setMap(null);
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
      }
    };
  }, []);

  if (!isAuthorized) {
    return (
      <div className="verifying-container">
      <div className="verifying-message">
        <span className="loading-text">Verifying access...</span>
      </div>
    </div> 
    );
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
      
      <div 
        ref={mapRef} 
        className="map-container" 
        style={{ width: '100%', height: '100vh' }}
      />
    </div>
  );
};

export default ShipmentTracking;