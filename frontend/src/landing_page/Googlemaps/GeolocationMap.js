//with off routing



import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Menu, X } from 'lucide-react';
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import "./GeolocationMapStyles.css";
import axios from 'axios';
if (process.env.NODE_ENV === 'development') {
  // Override the _clearLines method of L.Routing.Line prototype
  if (L && L.Routing && L.Routing.Line) {
    const originalClearLines = L.Routing.Line.prototype._clearLines;
    L.Routing.Line.prototype._clearLines = function() {
      try {
        originalClearLines.call(this);
      } catch (e) {
        // Silently catch the removeLayer error
      }
    };
  }
}
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] instanceof Error) {
      if (args[0].stack?.includes('leaflet-routing-machine')) {
        return;
      }
    }
    if (typeof args[0] === 'string' && args[0].includes('removeLayer')) {
      return;
    }
    originalError.apply(console, args);
  };
}
const GeolocationMap = ({ 
  userRole = '',
  userId, // Add userId prop
  cartId,  // Add cartId prop
  initialStartLocation = '',
  initialCheckpoint = '',
  initialDestination = '' 
}) => {
   // State management
   const [map, setMap] = useState(null);
   const [driverMarker, setDriverMarker] = useState(null);
   const [startLocation, setStartLocation] = useState(initialStartLocation);
   const [checkpoint, setCheckpoint] = useState(initialCheckpoint);
   const [destination, setDestination] = useState(initialDestination);
   const [checkpointCoords, setCheckpointCoords] = useState({ lat: '', lon: '' });
   const [destinationCoords, setDestinationCoords] = useState({ lat: '', lon: '' });
   const [suggestions, setSuggestions] = useState({
     checkpoint: [],
     destination: [],
     activeType: null
   });
   const [savedRoutes, setSavedRoutes] = useState([]);
   const [currentRoute, setCurrentRoute] = useState(null);
   const [notifications, setNotifications] = useState([]);
   const [isTracking, setIsTracking] = useState(false);
   const [modalOpen, setModalOpen] = useState(false);
   const [startTime, setStartTime] = useState(null);
   const [endTime, setEndTime] = useState(null);
   const [lastUpdate, setLastUpdate] = useState(null);
   const [isConnected, setIsConnected] = useState(false);
   const [lastDriverUpdate, setLastDriverUpdate] = useState(null);
   const [driverUpdateCount, setDriverUpdateCount] = useState(0);
   const [routeDeviation, setRouteDeviation] = useState(false);
   const [deviationHistory, setDeviationHistory] = useState([]);
   const [routeBuffer, setRouteBuffer] = useState(null);
   const MAX_DEVIATION_DISTANCE = 100; // meters
   const [selectedRoute, setSelectedRoute] = useState(null);

   const [manufacturerMetamask, setManufacturerMetamask] = useState('');
   const [wholesalerMetamask, setWholesalerMetamask] = useState('');
   const [retailerMetamask, setRetailerMetamask] = useState('');
   
 
   // Refs
   const mapRef = useRef(null);
   const socketRef = useRef(null);
   const routingControlRef = useRef(null);
   const destinationMarkerRef = useRef(null);
   const checkpointMarkerRef = useRef(null);
   const routePolylineRef = useRef(null);
   const locationUpdateInterval = useRef(null);
   const routeBufferRef = useRef(null);
   const [driverModalOpen, setDriverModalOpen] = useState(false);
   const [selectedDriver, setSelectedDriver] = useState(null);
   
  
  const demoDrivers = [
    { id: "D001", name: "Aritra Dhar", connectionStatus: "Connected" },
    { id: "D002", name: "Srinjoy Roy", connectionStatus: "Disconnected" },
    { id: "D003", name: "Sourjya Saha", connectionStatus: "Connected" },
  ];
  const convertCoordsToLocation = async (lat, lon, type) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'YourAppName/1.0 (your@email.com)'
          }
        }
      );
      
      const data = await response.json();
      
      // Extract a meaningful display name
      const locationName = data.display_name || 
        `${data.address.city || data.address.town || data.address.village || 'Unknown Location'}`;
      
      // Update state based on the type
      if (type === 'checkpoint') {
        setCheckpoint(locationName);
        setCheckpointCoords({ lat, lon });
        
        // Trigger suggestions for the wholesaler location
        fetchSuggestions(locationName, 'checkpoint');
      } else if (type === 'destination') {
        setDestination(locationName);
        setDestinationCoords({ lat, lon });
        
        // Trigger suggestions for the retailer location
        fetchSuggestions(locationName, 'destination');
      }
      
      return locationName;
    } catch (error) {
      console.error("Error converting coordinates to location:", error);
      return null;
    }
  };
  
  // Modify your handleSetLocation function

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

  const startLocationIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [12, 41]
  });
  const currentLocationIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.8.0/dist/images/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [12, 41]
  });


  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const mapInstance = L.map("map").setView([28.238, 83.9956], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(mapInstance);
      
      mapRef.current = mapInstance;
      setMap(mapInstance);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Socket connection and location tracking
  // Combined useEffect for socket connection and location tracking
  // Update the socket connection and location tracking useEffect

  useEffect(() => {
    if (initialStartLocation) {
      // Directly set the start location from props
      setStartLocation(initialStartLocation);
  
      // Optional: If you want to center the map on the initial start location
      if (map) {
        const [lat, lon] = initialStartLocation.split(',').map(coord => parseFloat(coord.trim()));
        map.setView([lat, lon], 16);
      }
    }
    
    if (initialCheckpoint) {
      setCheckpoint(initialCheckpoint);
      fetchSuggestions(initialCheckpoint, 'checkpoint');
    }
    
    if (initialDestination) {
      setDestination(initialDestination);
      fetchSuggestions(initialDestination, 'destination');
    }
  }, [initialStartLocation, initialCheckpoint, initialDestination, map]);

useEffect(() => {
  if (!map) return;

  console.log('Initializing socket connection and tracking for role:', userRole);
  
  // Initialize socket connection with explicit error handling
  if (!cartId || !userId) {
      console.error('Missing cartId or userId');
      return;
    }

    socketRef.current = io("http://localhost:8000", {
      query: {
        user_id: userId,
        cart_id: cartId,
        role:  userRole 

      }
    });

  // Enhanced connection handlers
  socketRef.current.on("connect", () => {
    console.log("Connected to socket server with ID:", socketRef.current.id);
    setIsConnected(true);
    socketRef.current.emit("user-role", { role: userRole });
    
    // Request initial state after connection
    socketRef.current.emit("request-initial-state", { cart_id: cartId });
  });

  socketRef.current.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
    setIsConnected(false);
    addNotification("Connection error. Retrying...", "error");
  });

  // Handle initial state
  socketRef.current.on("initial-state", (data) => {
    if (data.route) {
      const { route } = data;
      if (route.waypoints && route.waypoints.length > 0) {
        const waypoints = route.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
        clearExistingRouteAndMarkers();
        createRouteMarkers(waypoints);
        createRoutingControl(waypoints);
      }
    }
  });
  const handleLocationSuccess = (position) => {
    try {
      const { latitude, longitude } = position.coords;
      
      // Ensure map exists before operations
      if (!map) {
        console.error("Map is not initialized");
        return;
      }
  
      // Center map on the current location
      map.setView([latitude, longitude], 16);
  
      // If initial start location is not set, use current location
      if (!initialStartLocation) {
        setStartLocation(`${latitude}, ${longitude}`);
        
        // Create a marker for the start location
        const startLocationMarker = L.marker([latitude, longitude], {
          icon: startLocationIcon
        })
        .bindPopup('Manufacturer Location')
        .addTo(map);
      } else {
        // If initialStartLocation is provided, parse its coordinates
        const [startLat, startLon] = initialStartLocation.split(',').map(coord => parseFloat(coord.trim()));
        
        // Create a marker for the start location
        const startLocationMarker = L.marker([startLat, startLon], {
          icon: startLocationIcon
        })
        .bindPopup('Manufacturer Location')
        .addTo(map);
      }
  
      // Update driver location if in driver role
      if (userRole === 'driver') {
        updateDriverLocation(latitude, longitude);
      }
    } catch (error) {
      console.error("Location handling error:", error);
      addNotification("Failed to retrieve location", "error");
    }
  };
  navigator.geolocation.getCurrentPosition(handleLocationSuccess);

  socketRef.current.on("route-broadcast", (routeData) => {
    console.log("Received route broadcast:", routeData);
    if (!routeData?.waypoints || !Array.isArray(routeData.waypoints)) {
      console.error("Invalid route data received");
      return;
    }

    clearExistingRouteAndMarkers();

    const waypoints = routeData.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
    
    // Update form fields if metadata is provided
    if (routeData.metadata) {
      setStartLocation(routeData.metadata.startLocation || "");
      setCheckpoint(routeData.metadata.checkpoint || "");
      setDestination(routeData.metadata.destination || "");
      setCheckpointCoords(routeData.metadata.checkpointCoords || null);
      setDestinationCoords(routeData.metadata.destinationCoords || null);
    }

    createRouteMarkers(waypoints);
    createRoutingControl(waypoints);

    // Fit map to show entire route
    const bounds = L.latLngBounds(waypoints);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Update route tracking state
    setCurrentRoute({
      startPoint: routeData.metadata?.startLocation,
      checkpoint: routeData.metadata?.checkpoint,
      destination: routeData.metadata?.destination
    });
    
    if (routeData.metadata?.startTime) {
      setStartTime(routeData.metadata.startTime);
      setIsTracking(true);
    }
  });
  // Enhanced driver location update handler
  const handleDriverLocationUpdate = (data) => {
    console.log("Received driver location update:", data);
    updateDriverMarker(data);
    setLastDriverUpdate(new Date());
    setDriverUpdateCount(prev => prev + 1);
  };

  // Centralized function to update driver marker
  const updateDriverMarker = (locationData) => {
    if (!map || !locationData) return;

    const { latitude, longitude } = locationData;
    
    try {
      if (driverMarker) {
        driverMarker.setLatLng([latitude, longitude]);
      } else {
        const newDriverMarker = L.marker([latitude, longitude], {
          icon: taxiIcon,
          zIndexOffset: 1000 // Ensure driver marker stays on top
        }).addTo(map);
        
        newDriverMarker.bindPopup('Driver Location');
        setDriverMarker(newDriverMarker);
      }

      // Force update marker visibility
      if (driverMarker && !map.hasLayer(driverMarker)) {
        map.addLayer(driverMarker);
      }
    } catch (error) {
      console.error('Error updating driver marker:', error);
      addNotification("Error updating driver location", "error");
    }
  };

  // Location tracking for driver role
  if (userRole === 'driver') {
    const startLocationTracking = () => {
      return navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Update local marker and emit to server
          const locationData = {
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
            role: 'driver'
          };
          
          updateDriverMarker(locationData);
          socketRef.current.emit("driver-location-update", locationData);
        },
        (error) => {
          console.error('Location tracking error:', error);
          addNotification("Location tracking error", "error");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    };

    const watchId = startLocationTracking();
    return () => navigator.geolocation.clearWatch(watchId);
  }

  // Set up socket listeners for all users
  socketRef.current.on("driver-location-update", handleDriverLocationUpdate);

  socketRef.current.on("route-deviation", (data) => {
    const { message, distance } = data;
    addNotification(message, "warning");
    setDeviationHistory(prev => [...prev, data]);
    setRouteDeviation(true);
  });


  // Enhanced driver location update handler with route deviation check
  socketRef.current.on("driver-location-update", (data) => {
    updateDriverMarker(data);
    setLastDriverUpdate(new Date());
    setDriverUpdateCount(prev => prev + 1);

    // Check for route deviation if route exists
    if (currentRoute && routePolylineRef.current) {
      checkRouteDeviation(data);
    }
  });

  // Cleanup function
  return () => {
    try{
    if (socketRef.current) {
      socketRef.current.off("driver-location-update", handleDriverLocationUpdate);
      socketRef.current.off("initial-state");
      socketRef.current?.off("route-broadcast");
      socketRef.current.disconnect();

    }
    if (map && driverMarker && driverMarker._map) {
      driverMarker.remove();
    }
  }
  catch (error) {
    // Silently handle cleanup errors
    console.debug("Cleanup error:", error);
  }
};
}, [map, userRole, startLocation, checkpoint, destination,cartId, userId]);
  
  // Make sure taxiIcon is properly defined
  
  // Helper Functions
  const updateDriverLocation = (latitude, longitude) => {
    if (!map || !cartId) return;

    const locationData = {
      cart_id: cartId,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    };

    socketRef.current.emit("driver-location-update", locationData);

    // Update local marker
    try {
      if (driverMarker) {
        driverMarker.setLatLng([latitude, longitude]);
      } else {
        const newDriverMarker = L.marker([latitude, longitude], {
          icon: taxiIcon
        })
        .bindPopup('Driver Location')
        .addTo(map);
        setDriverMarker(newDriverMarker);
      }

      setLastDriverUpdate(new Date());
      setDriverUpdateCount(prev => prev + 1);
    } catch (error) {
      console.error('Error updating driver marker:', error);
    }
  };

  const setupSocketListeners = () => {
    socketRef.current.on("receive-location", (data) => {
      console.log('Received location update:', data);
      
      if (!map) {
        console.log('Map not initialized in receive-location');
        return;
      }
      
      const { latitude, longitude, role } = data;
      
      // Update driver marker for all users
      if (role === 'driver') {
        try {
          if (driverMarker) {
            console.log('Updating existing driver marker in receive-location');
            driverMarker.setLatLng([latitude, longitude]);
          } else {
            console.log('Creating new driver marker in receive-location');
            const newDriverMarker = L.marker([latitude, longitude], {
              icon: taxiIcon
            })
            .bindPopup('Driver Location')
            .addTo(map);
            setDriverMarker(newDriverMarker);
          }
  
          // Ensure marker is on map
          if (driverMarker && !map.hasLayer(driverMarker)) {
            driverMarker.addTo(map);
          }
        } catch (error) {
          console.error('Error handling receive-location:', error);
        }
      }
      setLastUpdate(new Date());
    });
  
    socketRef.current.on("route-updated", handleRouteUpdate);
    socketRef.current.on("route-deviation", (data) => {
      addNotification(`Driver has deviated from the planned route at ${new Date(data.timestamp).toLocaleTimeString()}`, 'warning');
    });
  };
  const handleRouteUpdate = (data) => {
    if (!map || !data.route?.waypoints) return;

    clearExistingRouteAndMarkers();

    const waypoints = data.route.waypoints.map(wp => L.latLng(wp.lat, wp.lng));
    
    createRouteMarkers(waypoints);
    createRoutingControl(waypoints);
    
    const bounds = L.latLngBounds(waypoints);
    map.fitBounds(bounds, { padding: [50, 50] });
  };
  const clearExistingRouteAndMarkers = () => {
    try {
      // Only remove if map and control/layer exists
      if (map && routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      
      // Check if map and marker exists before removing
      if (map && destinationMarkerRef.current && destinationMarkerRef.current._map) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
      }
      
      if (map && checkpointMarkerRef.current && checkpointMarkerRef.current._map) {
        checkpointMarkerRef.current.remove();
        checkpointMarkerRef.current = null;
      }
      
      if (map && routePolylineRef.current && routePolylineRef.current._map) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
    } catch (error) {
      // Silently handle errors to prevent console warnings
      console.debug("Clearing route elements:", error);
    }
  };
  const createRoutingControl = (waypoints) => {
    try {
      if (map && routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }

      if (!map) return;

      routingControlRef.current = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        lineOptions: {
          styles: [{ color: '#0066CC', weight: 4 }]
        },
        createMarker: () => null
      }).addTo(map);

      routingControlRef.current.on('routesfound', (e) => {
        const coordinates = e.routes[0].coordinates;

        // Check if map exists and remove previous route polyline if it exists
        if (map && routePolylineRef.current && routePolylineRef.current._map) {
          routePolylineRef.current.remove();
        }

        // Create new route polyline only if map exists
        if (map) {
          routePolylineRef.current = L.polyline(coordinates, {
            color: '#0066CC',
            weight: 4
          }).addTo(map);

          // Clear previous route buffer with null check
          if (routeBufferRef && routeBufferRef.current && routeBufferRef.current._map) {
            routeBufferRef.current.remove();
          }

          // Create new route buffer
          const bufferPoints = coordinates.map(coord => [coord.lat, coord.lng]);
          if (map) {
            routeBufferRef.current = L.polyline(bufferPoints, {
              color: '#0066CC',
              weight: MAX_DEVIATION_DISTANCE / 10,
              opacity: 0.2
            }).addTo(map);
          }

          setRouteBuffer(bufferPoints);
        }
      });
    } catch (error) {
      // Silently handle errors
      console.debug("Error in routing control:", error);
    }
  };
  const createRouteMarkers = (waypoints) => {
    if (waypoints.length > 0) {
      const destinationPoint = waypoints[waypoints.length - 1];
      destinationMarkerRef.current = L.marker(destinationPoint, {
        icon: destinationIcon
      })
      .bindPopup('Retailer Location')
      .addTo(map);

      if (waypoints.length > 1) {
        const checkpointPoint = waypoints[1];
        checkpointMarkerRef.current = L.marker(checkpointPoint, {
          icon: destinationIcon
        })
        .bindPopup('Wholesaler Location')
        .addTo(map);
      }
    }
  };


  const checkRouteDeviation = (driverLocation) => {
    try {
      if (!routePolylineRef.current || !driverLocation) return;
  
      const driverLatLng = L.latLng(driverLocation.latitude, driverLocation.longitude);
      const routePoints = routePolylineRef.current.getLatLngs();
      
      // Safely validate route points
      if (!routePoints || routePoints.length < 2) return;
      
      // Calculate distance to the nearest point on route
      let minDistance = Infinity;
      let nearestPoint = null;
      
      for (let i = 0; i < routePoints.length - 1; i++) {
        const segmentStart = routePoints[i];
        const segmentEnd = routePoints[i + 1];
        
        // Ensure points have lat/lng
        if (!segmentStart || !segmentEnd) continue;
        
        // Safely extract coordinates
        const start = L.latLng(
          segmentStart.lat !== undefined ? segmentStart.lat : segmentStart[0], 
          segmentStart.lng !== undefined ? segmentStart.lng : segmentStart[1]
        );
        
        const end = L.latLng(
          segmentEnd.lat !== undefined ? segmentEnd.lat : segmentEnd[0], 
          segmentEnd.lng !== undefined ? segmentEnd.lng : segmentEnd[1]
        );
        
        // Calculate nearest point on line segment
        const point = closestPointOnSegment(driverLatLng, start, end);
        const distance = driverLatLng.distanceTo(point);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      }
  
      // Null check for nearestPoint
      if (!nearestPoint) return;
  
      // If deviation detected
      if (minDistance > MAX_DEVIATION_DISTANCE) {
        const deviationData = {
          timestamp: new Date().toISOString(),
          location: driverLocation,
          distance: minDistance,
          nearestPointOnRoute: {
            lat: nearestPoint.lat,
            lng: nearestPoint.lng
          }
        };
  
        // Update deviation history with visual feedback
        setDeviationHistory(prev => {
          const newHistory = [...prev, deviationData];
          
          // Safely add visual markers
          if (map && nearestPoint) {
            try {
              L.circle(driverLatLng, {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: 50
              }).addTo(map);
              
              L.polyline([driverLatLng, nearestPoint], {
                color: 'red',
                dashArray: '10, 10'
              }).addTo(map);
            } catch (visualError) {
              console.error("Error adding visual deviation markers:", visualError);
            }
          }
          return newHistory;
        });
  
        // Emit deviation to server
        if (socketRef.current) {
          socketRef.current.emit("route-deviation", deviationData);
        }
        
        setRouteDeviation(true);
        addNotification(`Route deviation detected: ${Math.round(minDistance)}m from route`, "warning");
      } else {
        setRouteDeviation(false);
      }
    } catch (error) {
      console.error("Route deviation check error:", error);
    }
  };
  const closestPointOnSegment = (point, lineStart, lineEnd) => {
    const line = L.LineUtil.pointToSegmentDistance(point, lineStart, lineEnd);
    return L.LineUtil.closestPointOnSegment(point, lineStart, lineEnd);
  };



  const validateRouteTracking = () => {
    if (!currentRoute || !routePolylineRef.current) {
      console.error("No active route to track");
      addNotification("No active route to track", "error");
      return false;
    }

    if (!isConnected) {
      console.error("Not connected to tracking server");
      addNotification("Not connected to tracking server", "error");
      return false;
    }

    return true;
  };
  const fetchSuggestions = async (query, type) => {
    if (query.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&addressdetails=1&limit=5`
        );
        
        const data = await response.json();

        // Immediately update suggestions and trigger display
        setSuggestions((prevSuggestions) => {
          const newSuggestions = data.map(item => ({
            name: item.display_name,
            lat: item.lat,
            lon: item.lon
          }));

          return {
            ...prevSuggestions,
            [type]: newSuggestions,
            activeType: type  // Add this to track which type of suggestions is active
          };
        });

        // Automatically select the first suggestion
        if (data.length > 0) {
          const firstSuggestion = data[0];
          if (type === 'checkpoint') {
            setCheckpoint(firstSuggestion.display_name);
            setCheckpointCoords({
              lat: firstSuggestion.lat,
              lon: firstSuggestion.lon
            });
          } else if (type === 'destination') {
            setDestination(firstSuggestion.display_name);
            setDestinationCoords({
              lat: firstSuggestion.lat,
              lon: firstSuggestion.lon
            });
          }
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        addNotification("Error fetching location suggestions", "error");
      }
    }
  };

  const handleSuggestionSelection = (suggestion, type) => {
    if (type === 'checkpoint') {
      setCheckpoint(suggestion.name);
      setCheckpointCoords({
        lat: suggestion.lat,
        lon: suggestion.lon
      });
    } else if (type === 'destination') {
      setDestination(suggestion.name);
      setDestinationCoords({
        lat: suggestion.lat,
        lon: suggestion.lon
      });
    }
  };

  // Remove the previous useEffect hooks as they are redundant now

  const handleCheckpointChange = (e) => {
    const value = e.target.value;
    setCheckpoint(value);
    fetchSuggestions(value, "checkpoint");
  };

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setDestination(value);
    fetchSuggestions(value, "destination");
  };
  const handleRouteSubmit = (e) => {
    e.preventDefault();
    if (!startLocation || !destinationCoords || !cartId) {
      addNotification("Please provide start location, destination, and cart ID", "warning");
      return;
    }

    const startCoords = startLocation.split(",").map(Number);
    if (startCoords.some(isNaN)) {
      addNotification("Invalid starting point coordinates", "error");
      return;
    }

    const waypoints = [
      L.latLng(startCoords[0], startCoords[1]),
      checkpointCoords ? L.latLng(checkpointCoords.lat, checkpointCoords.lon) : null,
      L.latLng(destinationCoords.lat, destinationCoords.lon)
    ].filter(Boolean);

    // Prepare route data with metadata
    const routeData = {
      cart_id: cartId,
      route_data: {
        waypoints: waypoints.map(wp => ({
          lat: wp.lat,
          lng: wp.lng
        })),
        metadata: {
          startLocation,
          checkpoint,
          destination,
          checkpointCoords,
          destinationCoords,
          startTime: new Date().toISOString()
        }
      }
    };

    // Emit to server
    socketRef.current.emit('route-created', routeData);

    // Update local state
    clearExistingRouteAndMarkers();
    createRouteMarkers(waypoints);
    createRoutingControl(waypoints);

    setCurrentRoute({
      startPoint: startLocation,
      checkpoint: checkpoint,
      destination: destination
    });
    
    setStartTime(routeData.route_data.metadata.startTime);
    setIsTracking(true);
    addNotification("Route tracking started", "success");
  };

  const handleSaveRoute = () => {
    if (!startLocation || !destinationCoords) {
      addNotification("Cannot save route without start and destination", "error");
      return;
    }
    
    const routeData = {
      id: Date.now(),
      startPoint: startLocation,
      checkpoint: checkpoint || "N/A",
      destination: destination,
      checkpointCoords: checkpointCoords,
      destinationCoords: destinationCoords,
      startTime: startTime,
      cartId: cartId, // Add cart ID to the saved route data
      routeWaypoints: routePolylineRef.current 
        ? routePolylineRef.current.getLatLngs().map(latlng => ({
            lat: latlng.lat, 
            lng: latlng.lng
          }))
        : []
    };
  
    // Console log the route data being saved
    console.log("Route Data Being Saved:", routeData);
  
    // Clear current route from map
    clearExistingRouteAndMarkers();
  
    // Emit saved route to server
    socketRef.current?.emit('route-saved', routeData);
  
    setSavedRoutes(prev => {
      // Console log the previous saved routes and the new route
      console.log("Previous Saved Routes:", prev);
      const updatedRoutes = [...prev, routeData];
      console.log("Updated Saved Routes:", updatedRoutes);
      return updatedRoutes;
    });
  
    setIsTracking(false);
    
    // Reset current route state
    clearRoute();
    addNotification("Route saved successfully", "success");
  };
 
const showTracking = (route) => {
  if (!map || !route) {
    addNotification("Invalid route or map not initialized", "error");
    return;
  }
  
  // Clear any existing route first
  clearExistingRouteAndMarkers();

  // Construct waypoints with robust error handling
  const waypoints = [];

  // Start point handling
  if (route.startPoint) {
    try {
      const startCoords = route.startPoint.split(',').map(coord => parseFloat(coord.trim()));
      if (startCoords.length === 2 && !isNaN(startCoords[0]) && !isNaN(startCoords[1])) {
        waypoints.push(L.latLng(startCoords[0], startCoords[1]));
      }
    } catch (error) {
      console.error("Error processing start point:", error);
    }
  }

  // Checkpoint handling
  if (route.checkpointCoords) {
    try {
      waypoints.push(L.latLng(route.checkpointCoords.lat, route.checkpointCoords.lon));
    } catch (error) {
      console.error("Error processing checkpoint:", error);
    }
  }

  // Destination handling
  if (route.destinationCoords) {
    try {
      waypoints.push(L.latLng(route.destinationCoords.lat, route.destinationCoords.lon));
    } catch (error) {
      console.error("Error processing destination:", error);
    }
  }

  // Fallback to stored waypoints
  if ((!waypoints.length || waypoints.length < 2) && route.routeWaypoints?.length > 0) {
    waypoints.splice(0, waypoints.length, ...route.routeWaypoints.map(wp => L.latLng(wp.lat, wp.lng)));
  }

  if (waypoints.length < 2) {
    addNotification("Insufficient route data for tracking", "error");
    return;
  }
  const routeData = {
    waypoints: waypoints.map(wp => ({
      lat: wp.lat,
      lng: wp.lng
    })),
    metadata: {
      startLocation: route.startPoint,
      checkpoint: route.checkpoint,
      destination: route.destination,
      checkpointCoords: route.checkpointCoords,
      destinationCoords: route.destinationCoords
    }
  };

  // Broadcast route to all connected users
  socketRef.current?.emit('route-broadcast', routeData);


  setSelectedRoute(route);
  createRouteMarkers(waypoints);
  createRoutingControl(waypoints);
  

  const bounds = L.latLngBounds(waypoints);
  map.fitBounds(bounds, { padding: [50, 50] });
 
};

  const clearRoute = () => {
    try{
    // Enhanced to ensure complete cleanup
    clearExistingRouteAndMarkers();
    setStartLocation("");
    setCheckpoint("");
    setDestination("");
    setCheckpointCoords(null);
    setDestinationCoords(null);
    setCurrentRoute(null);
    setStartTime(null);
    setEndTime(null);
    
    // Reset route tracking state
    setIsTracking(false);
    setRouteDeviation(false);
    
    // Reset route buffer and polyline references
    if (map && routeBufferRef?.current && routeBufferRef.current._map) {
      routeBufferRef.current.remove();  // Using .remove() instead of removeLayer
      routeBufferRef.current = null;
    }
    
    // Recenter to current location if possible
    // if (currentLocationMarker) {
    //   navigator.geolocation.getCurrentPosition(
    //     (position) => {
    //       const { latitude, longitude } = position.coords;
    //       currentLocationMarker.setLatLng([latitude, longitude]);
    //       map.setView([latitude, longitude], 13);
    //     },
    //     () => {
    //       console.error("Unable to update current location");
    //     }
    //   );
    // }
}  catch (error) {
    console.debug("Error in clearRoute:", error);  // This will be suppressed in development
  }
  };
 
  
  const [isFormOpen, setIsFormOpen] = useState(false);

  const toggleForm = () => {
    setIsFormOpen(!isFormOpen);
  };

  const addNotification = (message, type = 'warning') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  console.log(lastDriverUpdate);
  console.log(driverUpdateCount)
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
          /* Responsive Notification and Status Styles */
.notification-container {

}

.notification {
  background-color: #ff4444;
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.5s ease-out;
  display: flex;
  justify-content: space-between;
 
  height:120px;

  /* Responsive adjustments */
  max-width: 100%;
  box-sizing: border-box;
}

.notification .close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0 5px;
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

.notification.warning { background-color: #ff9800; }
.notification.success { background-color: #4CAF50; }

.status-indicator {
  position: fixed;
  bottom: 20px; /* Changed from top to bottom */
  left: 20px; /* Relative positioning */
  background-color: #fff;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
  
  
  /* Responsive adjustments */
  max-width: calc(100% - 40px);
  box-sizing: border-box;
}

.live-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #4CAF50;
  border-radius: 50%;
  margin-right: 5px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* Media Queries for Enhanced Responsiveness */
@media screen and (max-width: 768px) {
  .notification-container,
  .status-indicator {
    width: calc(100% - 40px);
    max-width: none;
    left: 20px;
    right: 20px;
  }

 
  .notification .close-btn {
    margin-top: 10px;
  }
}

@media screen and (max-width: 480px) {
  .notification-container,
  .status-indicator {
    width: calc(100% - 20px);
    left: 10px;
    right: 10px;
  }

  .notification {
    padding: 10px 15px;
    font-size: 14px;
  }
}
    `;
    document.head.appendChild(styleElement);
    return () => document.head.removeChild(styleElement);
  }, []);
  const TrackingStatus = () => {
    if (!isTracking) return null;

    const timeSinceLastUpdate = lastDriverUpdate 
      ? Math.round((new Date() - new Date(lastDriverUpdate)) / 1000)
      : null;

    return (
      <div className="tracking-status">
        <div className="status-indicator">
          <div className={`live-indicator ${isConnected ? 'connected' : ''}`} />
          <span>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
          {lastDriverUpdate && (
            <>
              <div>Last Update: {timeSinceLastUpdate}s ago</div>
              <div>Updates Received: {driverUpdateCount}</div>
            </>
          )}
        </div>
      </div>
    );
  };

  const SavedRoutesModal = () => {
    return (
      <div className="overlay-modal-wrapper">
        <div className="modal-popup-container">
          <h3>Saved Routes</h3>
          {savedRoutes.length > 0 ? (
            <table className="saved-routes-table">
              <thead>
                <tr>
                  <th>Start Point</th>
                  <th>Checkpoint</th>
                  <th>Destination</th>
                  <th>Start Time</th>
                  <th>Cart ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedRoutes.map((route, index) => (
                  <tr key={route.id || index}>
                    <td>{route.startPoint || "N/A"}</td>
                    <td>{route.checkpoint || "N/A"}</td>
                    <td>{route.destination || "N/A"}</td>
                    <td>{route.startTime ? new Date(route.startTime).toLocaleString() : "N/A"}</td>
                    <td>{route.cartId || "N/A"}</td>
                    <td>
                      <button 
                        className="table-action-btn" 
                        onClick={() => showTracking(route)}
                      >
                        Show Tracking
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No saved routes available.</p>
          )}
          <button 
            className="table-action-btn" 
            onClick={() => setModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="tracking-container" style={{marginTop:"-2rem"}}>
  
      <div className="notification-container">
      <TrackingStatus />
    {notifications.map(notification => (
      <div key={notification.id} className={`notification ${notification.type}`}>
        <span>{notification.message}</span>
        <button
          className="close-btn"
          onClick={() =>
            setNotifications((prev) =>
              prev.filter((n) => n.id !== notification.id)
            )
          }
        >
          &times;
        </button>
      </div>
    ))}
  </div>
 {userRole === 'start'  && (
        <div className={`geolocation-form-container ${isFormOpen ? 'mobile-form-open' : ''}`}>
          <form className="route-planner-form" onSubmit={handleRouteSubmit}>
            <h2 className="route-form-title">Track Delivery Route</h2>

            <div className="location-inputs">
      <div className="input-group">
        <label>Starting Point</label>
        <input
          type="text"
          value={startLocation}
          className="location-input"
          onChange={(e) => setStartLocation(e.target.value)}
          style={{ borderRadius: "10px" }}
         readOnly// Make it read-only as it is set automatically
        />
      </div>
      <div className="input-group">
        <label>Wholesaler Location</label>
        <input
          type="text"
          value={checkpoint}
          onChange={handleCheckpointChange}
          className="location-input"
          style={{ borderRadius: "10px" }}
          readOnly
        />
       {suggestions.checkpoint.length > 0 && (
  <ul className="suggestions-list">
    {suggestions.checkpoint.map((suggestion, index) => (
      <li
        key={index}
        onClick={() => {
          handleSuggestionSelection(suggestion, 'checkpoint');
          setSuggestions({ ...suggestions, checkpoint: [] });
        }}
      >
        {suggestion.name}
      </li>
    ))}
  </ul>
)}
      </div>
      <div className="input-group">
        <label>Retailer Location</label>
        <input
          type="text"
          value={destination}
          onChange={handleDestinationChange}
          className="location-input"
          style={{ borderRadius: "10px" }}
          readOnly
        />
     {suggestions.destination.length > 0 && (
  <ul className="suggestions-list">
    {suggestions.destination.map((suggestion, index) => (
      <li
        key={index}
        onClick={() => {
          handleSuggestionSelection(suggestion, 'destination');
          setSuggestions({ ...suggestions, destination: [] });
        }}
      >
        {suggestion.name}
      </li>
    ))}
  </ul>
)}
      </div>
    </div>
            <button
              type="submit"
              className="route-submit-btn"
              disabled={!destinationCoords || !startLocation}
            >
              Track Route
            </button>
            {/* <button
    type="button"
    className="use-location-btn"
    onClick={() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setStartLocation(`${latitude}, ${longitude}`);
          if (map) {
            map.setView([latitude, longitude], 13);
          }
          socketRef.current.emit("send-location", {
            latitude,
            longitude,
            role: userRole,
          });
        },
        () => {
          alert("Unable to fetch your current location.");
        }
      );
    }}
  >
    Use Current Location
  </button> */}
            {currentRoute && (
              <button
              type="button"
              className="save-route-btn"
              onClick={handleSaveRoute}
              style={{
                backgroundColor: "#4CAF50", // Green background
                color: "white",             // White text
                border: "none",             // No border
                padding: "15px 20px",       // Spacing
                textAlign: "center",        // Centered text
                textDecoration: "none",     // No underline
                display: "inline-block",    // Inline-block layout
                fontSize: "16px",           // Font size
                marginTop:"10px",
                width:"100%",        // Margin for spacing
                cursor: "pointer",          // Pointer cursor on hover
                borderRadius: "5px",        // Rounded corners
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow
                transition: "all 0.3s ease", // Smooth transitions
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#45a049"; // Darker green on hover
                e.target.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#4CAF50"; // Reset color
                e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
              }}
            >
              Save Route
            </button>
            
            )}
              <div>
      <div className="controls">
        
      <button
  onClick={() => setModalOpen(true)}
  style={{
    backgroundColor: "#007BFF", // Blue background
    color: "white",             // White text
    border: "none",             // No border
    padding: "15px 20px",       // Spacing
    textAlign: "center",        // Centered text
    textDecoration: "none",     // No underline
    fontSize: "16px",           // Font size
    borderRadius: "5px",        // Rounded corners
    cursor: "pointer",          // Pointer cursor on hover
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow
    transition: "all 0.3s ease", // Smooth transitions
       marginTop:"10px",
       width:"100%"     // Margin for spacing
  }}
  onMouseEnter={(e) => {
    e.target.style.backgroundColor = "#0056b3"; // Darker blue on hover
    e.target.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = "#007BFF"; // Reset color
    e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  }}
>
  View Saved Routes
</button>
  {/* Assign Driver Button */}
  <button
      type="button"
      onClick={() => setDriverModalOpen(true)}
      style={{
        backgroundColor: "#6B46C1",
        color: "white",
        border: "none",
        padding: "15px 20px",
        textAlign: "center",
        fontSize: "16px",
        borderRadius: "5px",
        cursor: "pointer",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
        marginTop: "10px",
        width: "100%"
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = "#553C9A";
        e.target.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = "#6B46C1";
        e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
      }}
    >
      Assign Driver
    </button>
      </div>

      {modalOpen && (
  <div className="overlay-modal-wrapper">
    <div className="modal-popup-container">
      <h3>Saved Routes</h3>
      {savedRoutes.length > 0 ? (
        <table className="saved-routes-table">
          <thead>
            <tr>
              <th className="saved-routes-header">Start Point</th>
              <th className="saved-routes-header">Checkpoint</th>
              <th className="saved-routes-header">Destination</th>
              <th className="saved-routes-header">Start Time</th>
              <th className="saved-routes-header">Cart ID</th>
              <th className="saved-routes-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {savedRoutes.map((route, index) => (
              <tr key={index}>
                <td className="saved-routes-data">{route.startPoint || "N/A"}</td>
                <td className="saved-routes-data">{route.checkpoint || "N/A"}</td>
                <td className="saved-routes-data">{route.destination || "N/A"}</td>
                <td className="saved-routes-data">
                  {route.startTime
                    ? new Date(route.startTime).toLocaleString()
                    : "N/A"}
                </td>
                <td className="saved-routes-data">{route.cartId || "N/A"}</td>
                <td>
                  <button
                    className="table-action-btn"
                    onClick={() => showTracking(route)}
                  >
                    Show Tracking
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No saved routes available.</p>
      )}
      <button className="table-action-btn" onClick={() => setModalOpen(false)}>
        Close
      </button>
    </div>
  </div>
)}

    </div>
    {driverModalOpen && (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "10px",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "80vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)"
        }}>
          <h2 style={{
            marginTop: 0,
            marginBottom: "1.5rem",
            color: "#2D3748",
            fontSize: "1.5rem",
            fontWeight: "bold",
            textAlign: "center",
            borderBottom: "2px solid #E2E8F0",
            paddingBottom: "0.5rem"
          }}>
            Assign Driver
          </h2>

          <div style={{ marginBottom: "1.5rem" }}>
            {demoDrivers.map(driver => (
              <div
                key={driver.id}
                style={{
                  padding: "1rem",
                  marginBottom: "0.75rem",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: selectedDriver?.id === driver.id ? "#EBF4FF" : "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)"
                }}
                onClick={() => setSelectedDriver(driver)}
              >
                <div>
                  <div style={{ fontWeight: "bold", color: "#2D3748" }}>{driver.name}</div>
                  <div style={{ fontSize: "0.875rem", color: "#718096" }}>ID: {driver.id}</div>
                  <div style={{
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                    color: driver.connectionStatus === "Connected" ? "#48BB78" : "#E53E3E",
                    marginTop: "0.5rem"
                  }}>
                    {driver.connectionStatus}
                  </div>
                </div>
                <div style={{
                  width: "48px",
                  height: "24px",
                  backgroundColor: selectedDriver?.id === driver.id ? "#4299E1" : "#CBD5E0",
                  borderRadius: "12px",
                  position: "relative",
                  transition: "background-color 0.3s ease",
                  cursor: "pointer"
                }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: selectedDriver?.id === driver.id ? "26px" : "2px",
                    transition: "left 0.3s ease",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)"
                  }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem"
          }}>
            <button
              onClick={() => {
                setDriverModalOpen(false);
                setSelectedDriver(null);
              }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "5px",
                border: "1px solid #E2E8F0",
                backgroundColor: "white",
                color: "#4A5568",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#EDF2F7";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "white";
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedDriver) {
                  console.log(`Assigned driver: ${selectedDriver.name} (${selectedDriver.id})`);
                  setDriverModalOpen(false);
                  setSelectedDriver(null);
                }
              }}
              disabled={!selectedDriver}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "5px",
                border: "none",
                backgroundColor: selectedDriver ? "#4299E1" : "#CBD5E0",
                color: "white",
                cursor: selectedDriver ? "pointer" : "not-allowed",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (selectedDriver) {
                  e.target.style.backgroundColor = "#3182CE";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedDriver) {
                  e.target.style.backgroundColor = "#4299E1";
                }
              }}
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    )}
  
          </form>
        </div>
      )}
      <div id="map" className="map-container" />
     
    </div>
  );
};

export default GeolocationMap;