//with off routing


import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import { io } from "socket.io-client";
import "./GeolocationMapStyles.css";
const GeolocationMap = ({ userRole = 'start' }) => {
  // State management
  const [map, setMap] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);
  const [startLocation, setStartLocation] = useState("");
  const [checkpoint, setCheckpoint] = useState("");
  const [destination, setDestination] = useState("");
  const [checkpointCoords, setCheckpointCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [suggestions, setSuggestions] = useState({ checkpoint: [], destination: [] });
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentLocationMarker, setCurrentLocationMarker] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastDriverUpdate, setLastDriverUpdate] = useState(null);
  const [driverUpdateCount, setDriverUpdateCount] = useState(0);
  const [routeDeviation, setRouteDeviation] = useState(false);
  const [deviationHistory, setDeviationHistory] = useState([]);
  const [routeBuffer, setRouteBuffer] = useState(null);
  const MAX_DEVIATION_DISTANCE = 100; // meters
  const [selectedRoute, setSelectedRoute] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const routingControlRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const checkpointMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const locationUpdateInterval = useRef(null);

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
  if (!map) return;

  console.log('Initializing socket connection and tracking for role:', userRole);
  
  // Initialize socket connection with explicit error handling
  socketRef.current = io("http://localhost:3000", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    query: { role: userRole }
  });

  // Enhanced connection handlers
  socketRef.current.on("connect", () => {
    console.log("Connected to socket server with ID:", socketRef.current.id);
    setIsConnected(true);
    socketRef.current.emit("user-role", { role: userRole });
    
    // Request initial state after connection
    socketRef.current.emit("request-initial-state");
  });

  socketRef.current.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
    setIsConnected(false);
    addNotification("Connection error. Retrying...", "error");
  });

  // Handle initial state
  socketRef.current.on("initial-state", (data) => {
    console.log("Received initial state:", data);
    if (data.driverLocation) {
      updateDriverMarker(data.driverLocation);
    }
  });
  const handleLocationSuccess = (position) => {
    try {
      const { latitude, longitude } = position.coords;
      setStartLocation(`${latitude}, ${longitude}`);
  
      // Ensure map exists before operations
      if (!map) {
        console.error("Map is not initialized");
        return;
      }
  
      map.setView([latitude, longitude], 16);
  
      // Safe marker handling
      if (currentLocationMarker) {
        try {
          currentLocationMarker.setLatLng([latitude, longitude]);
        } catch (markerError) {
          console.error("Error updating marker location:", markerError);
          
          // Fallback: recreate marker if update fails
          const fallbackMarker = L.marker([latitude, longitude], {
            icon: currentLocationIcon
          })
          .bindPopup('Current Location')
          .addTo(map);
          setCurrentLocationMarker(fallbackMarker);
        }
      } else {
        const newCurrentLocationMarker = L.marker([latitude, longitude], {
          icon: currentLocationIcon
        })
        .bindPopup('Current Location')
        .addTo(map);
        setCurrentLocationMarker(newCurrentLocationMarker);
      }
  
      if (userRole === 'driver') {
        updateDriverLocation(latitude, longitude);
      }
    } catch (error) {
      console.error("Location handling error:", error);
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
    addNotification(`Driver has deviated from route: ${data.message}`, "warning");
    setDeviationHistory(prev => [...prev, data]);
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
    if (socketRef.current) {
      socketRef.current.off("driver-location-update", handleDriverLocationUpdate);
      socketRef.current.off("initial-state");
      socketRef.current?.off("route-broadcast");
      socketRef.current.disconnect();

    }
    if (map && driverMarker) {
      map.removeLayer(driverMarker);
    }
  };
}, [map, userRole]);
  
  // Make sure taxiIcon is properly defined
  
  // Helper Functions
  const updateDriverLocation = (latitude, longitude) => {
    console.log('updateDriverLocation called:', { latitude, longitude });
    
    if (!map) {
      console.log('Map not initialized in updateDriverLocation');
      return;
    }
  
    const driverData = {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      role: 'driver'
    };
  
    // Emit location update to server
    socketRef.current.emit("driver-location-update", driverData);
    console.log('Emitted driver-location-update:', driverData);
  
    // Force create/update driver marker
    try {
      if (driverMarker) {
        console.log('Updating existing driver marker in updateDriverLocation');
        driverMarker.setLatLng([latitude, longitude]);
      } else {
        console.log('Creating new driver marker in updateDriverLocation');
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
  
      setLastDriverUpdate(new Date());
      setDriverUpdateCount(prev => prev + 1);
    } catch (error) {
      console.error('Error in updateDriverLocation:', error);
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
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
      if (destinationMarkerRef.current) {
        map.removeLayer(destinationMarkerRef.current);
        destinationMarkerRef.current = null;
      }
      if (checkpointMarkerRef.current) {
        map.removeLayer(checkpointMarkerRef.current);
        checkpointMarkerRef.current = null;
      }
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
    } catch (error) {
      console.error("Error clearing route and markers:", error);
    }
  };
  const createRoutingControl = (waypoints) => {
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }
    
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
      
      // Clear previous route polyline
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
      }
      
      // Create new route polyline
      routePolylineRef.current = L.polyline(coordinates, {
        color: '#0066CC',
        weight: 4
      }).addTo(map);
  
      // Clear previous route buffer
      if (routeBufferRef.current) {
        map.removeLayer(routeBufferRef.current);
      }
      
      // Create new route buffer
      const bufferPoints = coordinates.map(coord => [coord.lat, coord.lng]);
      routeBufferRef.current = L.polyline(bufferPoints, {
        color: '#0066CC',
        weight: MAX_DEVIATION_DISTANCE / 10,
        opacity: 0.2
      }).addTo(map);
  
      setRouteBuffer(bufferPoints);
    });
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
        setSuggestions({
          ...suggestions,
          [type]: data.map(item => ({
            name: item.display_name,
            lat: item.lat,
            lon: item.lon
          }))
        });
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        addNotification("Error fetching location suggestions", "error");
      }
    }
  };

  const handleRouteSubmit = (e) => {
    e.preventDefault();
    if (!startLocation || !destinationCoords) {
      addNotification("Please provide both a starting point and a valid destination.", "warning");
      return;
    }
  
    const startCoords = startLocation.split(",").map(Number);
    if (startCoords.some(isNaN)) {
      addNotification("Invalid starting point coordinates.", "error");
      return;
    }
  
    const waypoints = [
      L.latLng(startCoords[0], startCoords[1]),
      checkpointCoords ? L.latLng(checkpointCoords.lat, checkpointCoords.lon) : null,
      L.latLng(destinationCoords.lat, destinationCoords.lon)
    ].filter(Boolean);
  
    // Prepare route data with metadata
    const routeData = {
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
    
    setStartTime(routeData.metadata.startTime);
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
      endTime: new Date().toISOString(),
      status: "Completed",
      routeWaypoints: routePolylineRef.current 
        ? routePolylineRef.current.getLatLngs().map(latlng => ({
            lat: latlng.lat, 
            lng: latlng.lng
          }))
        : []
    };
  
    // Clear current route from map
    clearExistingRouteAndMarkers();
  
    // Emit saved route to server
    socketRef.current?.emit('route-saved', routeData);
  
    setSavedRoutes(prev => [...prev, routeData]);
    setEndTime(new Date().toISOString());
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
    if (routeBufferRef.current) {
      map.removeLayer(routeBufferRef.current);
      routeBufferRef.current = null;
    }
    
    // Recenter to current location if possible
    if (currentLocationMarker) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          currentLocationMarker.setLatLng([latitude, longitude]);
          map.setView([latitude, longitude], 13);
        },
        () => {
          console.error("Unable to update current location");
        }
      );
    }
  };
  const routeBufferRef = useRef(null);
  


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
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 300px;
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
        align-items: center;
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
        top: 10px;
        left: 10px;
        background-color: #fff;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 1000;
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
                  <th>End Time</th>
                  <th>Status</th>
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
                    <td>{route.endTime ? new Date(route.endTime).toLocaleString() : "N/A"}</td>
                    <td>{route.status || "N/A"}</td>
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
    <div className="tracking-container">

      <div className="user-role-indicator">
        Connected as: {userRole.toUpperCase()}
      </div>
        <button
        onClick={() => setModalOpen(true)}
        className="view-saved-routes-btn"
      >
        View Saved Routes
      </button>

      {modalOpen && <SavedRoutesModal />}
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
 {userRole === 'start' && (
        <div className="geolocation-form-container">
          <form className="route-planner-form" onSubmit={handleRouteSubmit}>
            <h2 className="route-form-title">Track Delivery Route</h2>
            <div className="location-inputs">
              <div className="input-group">
                <label>Starting Point</label>
                <input
                  type="text"
                  value={startLocation}
                  readOnly
                  className="location-input"
                  style={{borderRadius:"10px"}}
                />
              </div>
              <div className="input-group">
                <label>Wholesaler Location</label>
                <input
                  type="text"
                  value={checkpoint}
                  onChange={(e) => {
                    setCheckpoint(e.target.value);
                    fetchSuggestions(e.target.value, 'checkpoint');
                  }}
                  className="location-input"
                  style={{borderRadius:"10px"}}
                />
                {suggestions.checkpoint.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.checkpoint.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          setCheckpoint(suggestion.name);
                          setCheckpointCoords({ lat: suggestion.lat, lon: suggestion.lon });
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
                  onChange={(e) => {
                    setDestination(e.target.value);
                    fetchSuggestions(e.target.value, 'destination');
                  }}
                  className="location-input"
                  style={{borderRadius:"10px"}}
                />
                {suggestions.destination.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.destination.map((suggestion, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          setDestination(suggestion.name);
                          setDestinationCoords({ lat: suggestion.lat, lon: suggestion.lon });
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
            <button
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
  </button>
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
    <th className="saved-routes-header">End Time</th>
    <th className="saved-routes-header">Status</th>
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
      <td className="saved-routes-data">
        {route.endTime
          ? new Date(route.endTime).toLocaleString()
          : "N/A"}
      </td>
      <td className="saved-routes-data">{route.status || "N/A"}</td>
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
    
          </form>
        </div>
      )}
      <div id="map" className="map-container" />
     
    </div>
  );
};

export default GeolocationMap;