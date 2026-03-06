import React, { useState, useRef, useCallback,useEffect } from "react";
import { GoogleMap, DirectionsRenderer, TrafficLayer, Autocomplete, useLoadScript } from "@react-google-maps/api";
// Custom error boundary component
class MapErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }
  
    static getDerivedStateFromError(error) {
      return { hasError: true };
    }
  
    componentDidCatch(error, errorInfo) {
      // You can log the error to an error reporting service here
      console.log('Map error caught:', error);
    }
  
    render() {
      if (this.state.hasError) {
        return this.props.fallback || null;
      }
      return this.props.children;
    }
  }
const styles = {
  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '20px auto',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  header: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#333',
  },
  mapContainer: {
    width: '100%',
    height: '400px',
    marginBottom: '20px',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  inputGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '20px',
  },
  congestionInfo: {
    padding: '15px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
  },
  errorMessage: {
    color: '#dc3545',
    fontSize: '14px',
    marginTop: '5px',
  },
  loadingMessage: {
    textAlign: 'center',
    padding: '20px',
    fontSize: '16px',
    color: '#666',
  }
};

const libraries = ["places"];

const TrafficMap = () => {
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [congestionLevel, setCongestionLevel] = useState("");
  const [error, setError] = useState("");
  const [rawDirectionsResponse, setRawDirectionsResponse] = useState(null);
  
  const originRef = useRef(null);
  const destinationRef = useRef(null);
  
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [map, setMap] = useState(null);
  const handleScriptLoad = useCallback(() => {
    window.gm_authFailure = () => {
      console.log('Google Maps authentication error handled');
    };
  }, []);
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (
        args[0]?.includes?.('Script error') ||
        args[0]?.includes?.('handleError') ||
        args[0]?.message?.includes?.('Script error')
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4",
    libraries,
    onLoad: handleScriptLoad,
  });

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const handleOriginSelect = () => {
    if (originRef.current) {
      const place = originRef.current.getPlace();
      if (place && place.geometry) {
        setOrigin({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
        setError("");
      }
    }
  };

  const handleDestinationSelect = () => {
    if (destinationRef.current) {
      const place = destinationRef.current.getPlace();
      if (place && place.geometry) {
        setDestination({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
        setError("");
      }
    }
  };

  const fetchRoute = useCallback(() => {
    if (!origin || !destination) {
      setError("Please select both origin and destination");
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess",
        },
      },
      (result, status) => {
        if (status === "OK") {
          // Store the raw directions response for the DirectionsRenderer
          setRawDirectionsResponse(result);

          // Format the data for our custom use
          const formattedTrafficData = {
            geocoded_waypoints: result.geocoded_waypoints.map((waypoint) => ({
              geocoder_status: waypoint.geocoder_status,
              place_id: waypoint.place_id,
              types: waypoint.types,
            })),
            routes: result.routes.map((route) => ({
              summary: route.summary,
              bounds: route.bounds,
              legs: route.legs.map((leg) => ({
                distance: leg.distance,
                duration: leg.duration,
                duration_in_traffic: leg.duration_in_traffic,
                start_address: leg.start_address,
                end_address: leg.end_address,
                start_location: leg.start_location,
                end_location: leg.end_location,
                steps: leg.steps.map((step) => ({
                  distance: step.distance,
                  duration: step.duration,
                  html_instructions: step.html_instructions,
                  polyline: step.polyline,
                })),
              })),
              overview_polyline: route.overview_polyline,
            })),
            status,
          };

          const leg = result.routes[0].legs[0];
          const duration = leg.duration.value;
          const durationInTraffic = leg.duration_in_traffic.value;
          
          let congestion = "";
          if (durationInTraffic > duration * 1.5) {
            congestion = "High Congestion";
          } else if (durationInTraffic > duration * 1.2) {
            congestion = "Medium Congestion";
          } else {
            congestion = "Low Congestion";
          }
          
          console.log("Traffic Data:", JSON.stringify(formattedTrafficData, null, 2));
          setCongestionLevel(congestion);
          setDirectionsResponse(formattedTrafficData);

          // Fit the map bounds to the route
          if (map && result.routes[0].bounds) {
            map.fitBounds(result.routes[0].bounds);
          }

          setError("");
        } else {
          setError(`Error fetching directions: ${status}`);
          console.error(`Error fetching directions ${status}`);
        }
      }
    );
  }, [origin, destination, map]);

  if (loadError) {
    return <div style={styles.errorMessage}>Error loading maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div style={styles.loadingMessage}>Loading Maps...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Google Maps Traffic Data</h1>
      
      <div style={styles.inputGroup}>
        <label style={styles.label}>Starting Point</label>
        <Autocomplete
          onLoad={autocomplete => {
            originRef.current = autocomplete;
          }}
          onPlaceChanged={handleOriginSelect}
          restrictions={{ country: "in" }}
        >
          <input
            type="text"
            placeholder="Enter starting location"
            style={styles.input}
          />
        </Autocomplete>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Destination</label>
        <Autocomplete
          onLoad={autocomplete => {
            destinationRef.current = autocomplete;
          }}
          onPlaceChanged={handleDestinationSelect}
          restrictions={{ country: "in" }}
        >
          <input
            type="text"
            placeholder="Enter destination"
            style={styles.input}
          />
        </Autocomplete>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      <button 
        onClick={fetchRoute}
        style={{
          ...styles.button,
          backgroundColor: (!origin || !destination) ? '#ccc' : '#4a90e2',
          cursor: (!origin || !destination) ? 'not-allowed' : 'pointer',
        }}
        disabled={!origin || !destination}
      >
        Track Route
      </button>

      <MapErrorBoundary
        fallback={<div style={styles.errorMessage}>Map loading error. Please try again later.</div>}
      >
        <div style={styles.mapContainer}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={styles.mapContainer}
              center={origin || { lat: 12.971598, lng: 77.594566 }}
              zoom={7}
              onLoad={onMapLoad}
              options={{
                gestureHandling: 'cooperative',
                maxZoom: 18,
                minZoom: 3,
              }}
            >
              {rawDirectionsResponse && (
                <>
                  <DirectionsRenderer
                    directions={rawDirectionsResponse}
                    options={{
                      polylineOptions: {
                        strokeColor: "#2196F3",
                        strokeWeight: 6,
                      },
                      suppressMarkers: false,
                    }}
                  />
                  <TrafficLayer autoUpdate />
                </>
              )}
            </GoogleMap>
          ) : (
            <div style={styles.loadingMessage}>Loading Map...</div>
          )}
        </div>
      </MapErrorBoundary>

      {congestionLevel && (
        <div style={styles.congestionInfo}>
          Traffic Congestion: {congestionLevel}
        </div>
      )}
    </div>
  );
};

// Function to wrap the component with error handling
const TrafficMapWithErrorHandling = () => {
  return (
    <React.StrictMode>
      <MapErrorBoundary>
        <TrafficMap />
      </MapErrorBoundary>
    </React.StrictMode>
  );
};

export default TrafficMapWithErrorHandling;