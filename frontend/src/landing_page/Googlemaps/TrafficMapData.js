import React, { useState, useRef, useCallback } from "react";
import { GoogleMap, DirectionsRenderer, TrafficLayer, Autocomplete, useLoadScript } from "@react-google-maps/api";

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

const mapOptions = {
  gestureHandling: 'cooperative',
  maxZoom: 18,
  minZoom: 3,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
};

const TrafficMapData = () => {
  const [map, setMap] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [congestionLevel, setCongestionLevel] = useState("");
  const [error, setError] = useState("");
  
  const originRef = useRef(null);
  const destinationRef = useRef(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4",
    libraries,
    version: "weekly"
  });

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const handleOriginSelect = () => {
    if (originRef.current) {
      const place = originRef.current.getPlace();
      if (place && place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setOrigin(location);
        if (map) {
          map.panTo(location);
          map.setZoom(12);
        }
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
    if (!origin || !destination || !window.google || !map) {
      setError("Please ensure both locations are selected and map is loaded");
      return;
    }

    try {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
      }, (result, status) => {
        if (status === "OK" && result) {
          setDirectionsResponse(result);
          
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
          
          setCongestionLevel(congestion);
          setError("");

          // Fit bounds after setting directions
          if (result.routes[0].bounds) {
            map.fitBounds(result.routes[0].bounds);
          }
        } else {
          setError(`Error fetching directions: ${status}`);
          setDirectionsResponse(null);
          setCongestionLevel("");
        }
      });
    } catch (err) {
      setError("Error calculating route. Please try again.");
      console.error("Route calculation error:", err);
    }
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

      <div style={styles.mapContainer}>
        <GoogleMap
          mapContainerStyle={styles.mapContainer}
          center={origin || { lat: 12.971598, lng: 77.594566 }}
          zoom={7}
          onLoad={onMapLoad}
          options={mapOptions}
        >
          {map && directionsResponse && (
            <>
              <DirectionsRenderer
                options={{
                  directions: directionsResponse,
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: "#2196F3",
                    strokeWeight: 6,
                    strokeOpacity: 0.8,
                  },
                }}
              />
              <TrafficLayer autoUpdate />
            </>
          )}
        </GoogleMap>
      </div>

      {congestionLevel && (
        <div style={styles.congestionInfo}>
          Traffic Congestion: {congestionLevel}
        </div>
      )}
    </div>
  );
};

export default TrafficMapData;