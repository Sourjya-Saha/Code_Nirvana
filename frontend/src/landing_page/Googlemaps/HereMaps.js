import React, { useEffect, useRef, useState } from 'react';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

const TrafficCongestionMap = () => {
  const mapElement = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routeLayer, setRouteLayer] = useState(null);
  const [driverMarker, setDriverMarker] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const simulationRef = useRef(null);

  const API_KEY = 'tnxv3bnAmab6I86JIQMHlFcS1CGpKnHN'; // Replace with your TomTom API key
  const calculateSegmentLength = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const lat1 = point1.latitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1) * Math.cos(lat2) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  const cities = {
    'Mumbai': [72.8777, 19.0760],
    'Delhi': [77.2090, 28.6139],
    'Bangalore': [77.5946, 12.9716],
    'Chennai': [80.2707, 13.0827],
    'Kolkata': [88.3639, 22.5726],
    'Hyderabad': [78.4867, 17.3850],
    'Thane': [72.9775, 19.2183],
    'Navi Mumbai': [73.0297, 19.0330],
    'Borivali': [72.8567, 19.2321],
    'Powai': [72.9049, 19.1162],
    'Andheri': [72.8497, 19.1136],
    'Bandra': [72.8547, 19.0596],
    'Worli': [72.8219, 19.0096],
    'Dadar': [72.8410, 19.0178]
  };

  const existingStyles = {
    container: {
      maxWidth: '1200px',
      margin: '20px auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '10px'
    },
    inputContainer: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px'
    },
    select: {
      flex: 1,
      padding: '12px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '16px'
    },
    button: {
      padding: '0 25px',
      backgroundColor: '#4a90e2',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    mapContainer: {
      height: '600px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '20px'
    },
    statCard: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    congestionPanel: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    error: {
      padding: '15px',
      backgroundColor: '#ffebee',
      color: '#c62828',
      borderRadius: '4px',
      marginBottom: '20px'
    },
    detailsContainer: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginTop: '15px'
    },
    detailCard: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '6px',
      border: '1px solid #e9ecef'
    },
    label: {
      color: '#6c757d',
      fontSize: '0.9rem',
      marginBottom: '5px'
    },
    value: {
      color: '#212529',
      fontSize: '1.1rem',
      fontWeight: '500'
    },
    section: {
      marginBottom: '15px'
    },
    sectionTitle: {
      fontSize: '1.2rem',
      fontWeight: '600',
      marginBottom: '10px',
      color: '#343a40'
    }
  };

  useEffect(() => {
    const loadMapScript = async () => {
      try {
        await Promise.all([
          loadScript('https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps-web.min.js'),
          loadScript('https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/services/services-web.min.js')
        ]);

        const ttMap = window.tt.map({
          key: API_KEY,
          container: mapElement.current,
          center: cities['Mumbai'],
          zoom: 12,
          stylesVisibility: {
            trafficFlow: true,
            trafficIncidents: true
          }
        });

        ttMap.addControl(new window.tt.NavigationControl());
        setMap(ttMap);
      } catch (err) {
        setError('Failed to load map: ' + err.message);
      }
    };

    loadMapScript();
    return () => map?.remove();
  }, []);

  const loadScript = (url) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const clearMap = () => {
    if (!map) return;
    
    markers.forEach(marker => marker.remove());
    setMarkers([]);
    
    if (routeLayer) {
      map.removeLayer(routeLayer.id);
      map.removeSource(routeLayer.sourceId);
      setRouteLayer(null);
    }
    
    if (driverMarker) {
      driverMarker.remove();
      setDriverMarker(null);
    }
  };

  const animateDriver = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return;
    
    const marker = new window.tt.Marker()
      .setLngLat(coordinates[0])
      .addTo(map);
    
    setDriverMarker(marker);

    let step = 0;
    const animate = () => {
      if (step < coordinates.length - 1) {
        step++;
        marker.setLngLat(coordinates[step]);
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const getCongestionLevel = (current, limit) => {
    if (!current || !limit) return 'UNKNOWN';
    const ratio = current / limit;
    if (ratio < 0.25) return 'SEVERE';
    if (ratio < 0.45) return 'HEAVY';
    if (ratio < 0.65) return 'MODERATE';
    if (ratio < 0.85) return 'LIGHT';
    return 'FREE_FLOW';
  };

  const getSegmentColor = (congestionLevel) => {
    switch (congestionLevel) {
      case 'SEVERE': return '#c62828';
      case 'HEAVY': return '#ef6c00';
      case 'MODERATE': return '#f9a825';
      case 'LIGHT': return '#558b2f';
      case 'FREE_FLOW': return '#1976d2';
      default: return '#757575';
    }
  };

  const calculateRoute = async (e) => {
    e.preventDefault();
    const startCity = e.target.start.value;
    const endCity = e.target.end.value;

    if (!map || startCity === endCity) {
      setError('Please select different cities');
      return;
    }

    setLoading(true);
    clearMap();

    try {
      const [startLon, startLat] = cities[startCity];
      const [endLon, endLat] = cities[endCity];

      // Add markers for start and end points
      const startMarker = new window.tt.Marker()
        .setLngLat([startLon, startLat])
        .addTo(map);
      
      const endMarker = new window.tt.Marker()
        .setLngLat([endLon, endLat])
        .addTo(map);
      
      setMarkers([startMarker, endMarker]);
      

      const response = await fetch(
        `https://api.tomtom.com/routing/1/calculateRoute/${startLat},${startLon}:${endLat},${endLon}/json?key=${API_KEY}&traffic=true&travelMode=car`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch route data');
      }

      const data = await response.json();
      const route = data.routes[0];
      const points = route.legs[0].points;

      // Format traffic data
      const trafficData = {
        geocoded_waypoints: [
          {
            geocoder_status: "OK",
            place_id: startCity,
            types: ["locality", "political"]
          },
          {
            geocoder_status: "OK",
            place_id: endCity,
            types: ["locality", "political"]
          }
        ],
        routes: [{
          summary: route.summary,
          legs: [{
            distance: {
              text: `${(route.summary.lengthInMeters / 1000).toFixed(1)} km`,
              value: route.summary.lengthInMeters
            },
            duration: {
              text: `${Math.round(route.summary.travelTimeInSeconds / 60)} mins`,
              value: route.summary.travelTimeInSeconds
            },
            duration_in_traffic: {
              text: `${Math.round(route.summary.trafficDelayInSeconds / 60)} mins`,
              value: route.summary.trafficDelayInSeconds
            },
            start_address: startCity,
            end_address: endCity,
            start_location: { lat: startLat, lng: startLon },
            end_location: { lat: endLat, lng: endLon }
          }]
        }],
        status: "OK"
      };

      // Draw route
      const coordinates = points.map(point => [point.longitude, point.latitude]);
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      };
      console.log(trafficData);

      const sourceId = 'route-source-' + Date.now();
      const layerId = 'route-layer-' + Date.now();

      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#4a90e2',
          'line-width': 6,
          'line-opacity': 0.8
        }
      });

      setRouteLayer({ id: layerId, sourceId });

      // Animate driver
      animateDriver(coordinates);

      // Fit map to show entire route
      const bounds = new window.tt.LngLatBounds();
      coordinates.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 100 });

      // Calculate congestion statistics
      const congestionStats = {};
      points.forEach(point => {
        const congestionLevel = getCongestionLevel(point.currentSpeed, point.speedLimit);
        if (!congestionStats[congestionLevel]) {
          congestionStats[congestionLevel] = {
            count: 0,
            totalLength: 0,
            speeds: [],
            averageSpeed: 0
          };
        }
        congestionStats[congestionLevel].count++;
        congestionStats[congestionLevel].speeds.push(point.currentSpeed || 0);
      });

      // Calculate average speeds
      Object.keys(congestionStats).forEach(level => {
        const stats = congestionStats[level];
        stats.averageSpeed = stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length;
      });

      setRouteData({
        trafficData,
        summary: {
          distance: trafficData.routes[0].legs[0].distance.text,
          duration: trafficData.routes[0].legs[0].duration.text,
          trafficDuration: trafficData.routes[0].legs[0].duration_in_traffic.text,
          departureTime: new Date().toLocaleString(),
          arrivalTime: new Date(Date.now() + route.summary.travelTimeInSeconds * 1000).toLocaleString()
        },
        congestionStats
      });

      setError('');
    } catch (err) {
      console.error('Route calculation error:', err);
      setError('Failed to calculate route: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };
  const transformRouteData = (tomTomResponse, startCity, endCity) => {
    // Extract the route information
    const route = tomTomResponse.routes[0];
    const points = route.legs[0].points;
    
    // Create steps from points
    const steps = points.map((point, index) => {
      if (index === points.length - 1) return null;
      
      const nextPoint = points[index + 1];
      const distance = calculateSegmentLength(point, nextPoint);
      
      return {
        distance: {
          text: `${distance.toFixed(1)} km`,
          value: Math.round(distance * 1000) // Convert to meters
        },
        duration: {
          text: `${Math.round(route.summary.travelTimeInSeconds / points.length)} mins`,
          value: Math.round(route.summary.travelTimeInSeconds / points.length)
        },
        end_location: {
          lat: nextPoint.latitude,
          lng: nextPoint.longitude
        },
        html_instructions: `Continue to next point`,
        polyline: {
          points: `${point.latitude},${point.longitude}|${nextPoint.latitude},${nextPoint.longitude}`
        },
        start_location: {
          lat: point.latitude,
          lng: point.longitude
        },
        travel_mode: "DRIVING"
      };
    }).filter(step => step !== null);
  
    // Calculate bounds
    const bounds = {
      northeast: {
        lat: Math.max(...points.map(p => p.latitude)),
        lng: Math.max(...points.map(p => p.longitude))
      },
      southwest: {
        lat: Math.min(...points.map(p => p.latitude)),
        lng: Math.min(...points.map(p => p.longitude))
      }
    };
  
    // Transform into desired format
    return {
      geocoded_waypoints: [
        {
          geocoder_status: "OK",
          place_id: startCity,
          types: ["locality", "political"]
        },
        {
          geocoder_status: "OK",
          place_id: endCity,
          types: ["locality", "political"]
        }
      ],
      routes: [
        {
          summary: route.summary.description || "Route Summary",
          legs: [
            {
              distance: {
                text: `${(route.summary.lengthInMeters / 1000).toFixed(1)} km`,
                value: route.summary.lengthInMeters
              },
              duration: {
                text: `${Math.round(route.summary.travelTimeInSeconds / 60)} mins`,
                value: route.summary.travelTimeInSeconds
              },
              duration_in_traffic: {
                text: `${Math.round(route.summary.trafficDelayInSeconds / 60)} mins`,
                value: route.summary.trafficDelayInSeconds
              },
              start_address: startCity,
              end_address: endCity,
              start_location: {
                lat: points[0].latitude,
                lng: points[0].longitude
              },
              end_location: {
                lat: points[points.length - 1].latitude,
                lng: points[points.length - 1].longitude
              },
              steps: steps,
              traffic_speed_entry: [],
              via_waypoint: []
            }
          ],
          overview_polyline: {
            points: points.map(p => `${p.latitude},${p.longitude}`).join('|')
          },
          bounds: bounds
        }
      ],
      status: "OK"
    };
  };

  const calculateCongestionStats = (points) => {
    const stats = {
      SEVERE: { count: 0, totalLength: 0, speeds: [], averageSpeed: 0, segments: [] },
      HEAVY: { count: 0, totalLength: 0, speeds: [], averageSpeed: 0, segments: [] },
      MODERATE: { count: 0, totalLength: 0, speeds: [], averageSpeed: 0, segments: [] },
      LIGHT: { count: 0, totalLength: 0, speeds: [], averageSpeed: 0, segments: [] },
      FREE_FLOW: { count: 0, totalLength: 0, speeds: [], averageSpeed: 0, segments: [] }
    };

    for (let i = 0; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
      
      // Calculate segment length
      const segmentLength = calculateSegmentLength(currentPoint, nextPoint);
      
      // Simulate speed if not provided
      const currentSpeed = currentPoint.currentSpeed || Math.random() * 60 + 20; // 20-80 km/h
      const speedLimit = currentPoint.speedLimit || 80; // Default speed limit
      
      const congestionLevel = getCongestionLevel(currentSpeed, speedLimit);
      
      stats[congestionLevel].count++;
      stats[congestionLevel].totalLength += segmentLength;
      stats[congestionLevel].speeds.push(currentSpeed);
      stats[congestionLevel].segments.push({
        start: [currentPoint.longitude, currentPoint.latitude],
        end: [nextPoint.longitude, nextPoint.latitude],
        speed: currentSpeed,
        length: segmentLength
      });
    }

    // Calculate averages and percentages
    Object.keys(stats).forEach(level => {
      const levelStats = stats[level];
      levelStats.averageSpeed = levelStats.speeds.length > 0 ?
        levelStats.speeds.reduce((a, b) => a + b, 0) / levelStats.speeds.length : 0;
      levelStats.percentage = (levelStats.totalLength / 
        Object.values(stats).reduce((sum, s) => sum + s.totalLength, 0)) * 100;
    });

    return stats;
  };

  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentSegmentIndex(0);
    
    const simulate = () => {
      if (!isSimulating) return;
      
      setCurrentSegmentIndex(prevIndex => {
        const points = routeData.trafficData.routes[0].legs[0].steps;
        if (prevIndex >= points.length - 1) {
          setIsSimulating(false);
          return 0;
        }
        return prevIndex + 1;
      });

      simulationRef.current = setTimeout(simulate, 1000 / simulationSpeed);
    };

    simulate();
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationRef.current) {
      clearTimeout(simulationRef.current);
    }
  };
  const renderSimulationControls = () => (
    <div style={styles.simulationControls}>
      <h3 style={styles.sectionTitle}>Speed Simulation</h3>
      <div style={styles.controlsContainer}>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={simulationSpeed}
          onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.speedLabel}>{simulationSpeed}x Speed</span>
        <button
          onClick={isSimulating ? stopSimulation : startSimulation}
          style={{
            ...styles.button,
            backgroundColor: isSimulating ? '#dc3545' : '#28a745'
          }}
        >
          {isSimulating ? 'Stop' : 'Start'} Simulation
        </button>
      </div>
    </div>
  );

  const renderCongestionStats = () => (
    <div style={styles.congestionPanel}>
      <h3 style={styles.sectionTitle}>Congestion Analysis</h3>
      {Object.entries(routeData.congestionStats).map(([level, stats]) => (
        <div key={level} style={styles.congestionRow}>
          <div style={styles.congestionHeader}>
            <span style={{
              ...styles.congestionIndicator,
              backgroundColor: getSegmentColor(level)
            }}/>
            <span style={styles.congestionLabel}>{level.replace('_', ' ')}</span>
          </div>
          <div style={styles.congestionDetails}>
            <div style={styles.stat}>
              <span>Segments:</span>
              <span>{stats.count}</span>
            </div>
            <div style={styles.stat}>
              <span>Length:</span>
              <span>{stats.totalLength.toFixed(2)} km</span>
            </div>
            <div style={styles.stat}>
              <span>Avg Speed:</span>
              <span>{Math.round(stats.averageSpeed)} km/h</span>
            </div>
            <div style={styles.stat}>
              <span>Percentage:</span>
              <span>{stats.percentage}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Add these to your existing styles object
  const additionalStyles = {
    simulationControls: {
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    controlsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    },
    slider: {
      flex: '1',
      height: '8px',
      borderRadius: '4px'
    },
    speedLabel: {
      minWidth: '80px',
      textAlign: 'center'
    },
    congestionRow: {
      marginBottom: '15px',
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px'
    },
    congestionHeader: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '10px'
    },
    congestionIndicator: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      marginRight: '8px'
    },
    congestionDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '10px'
    },
    stat: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.9rem'
    }
  };

  // Merge the additional styles with your existing styles
  const styles = { ...existingStyles, ...additionalStyles };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Traffic Congestion Map</h1>
      </div>

      <form onSubmit={calculateRoute} style={styles.form}>
        <select 
          name="start" 
          style={styles.select}
          defaultValue="Mumbai"
        >
          {Object.keys(cities).map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <select 
          name="end" 
          style={styles.select}
          defaultValue="Thane"
        >
          {Object.keys(cities).map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <button 
          type="submit" 
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {})
          }}
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate Route'}
        </button>
      </form>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

{routeData && (
        <div style={styles.detailsContainer}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Route Overview</h2>
            <div style={styles.detailsGrid}>
              <div style={styles.detailCard}>
                <div style={styles.label}>Start Location</div>
                <div style={styles.value}>
                  {routeData.trafficData.routes[0].legs[0].start_address}
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.label}>End Location</div>
                <div style={styles.value}>
                  {routeData.trafficData.routes[0].legs[0].end_address}
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.label}>Total Distance</div>
                <div style={styles.value}>
                  {routeData.trafficData.routes[0].legs[0].distance.text}
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.label}>Normal Duration</div>
                <div style={styles.value}>
                  {routeData.trafficData.routes[0].legs[0].duration.text}
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.label}>Traffic Delay</div>
                <div style={styles.value}>
                  {routeData.trafficData.routes[0].legs[0].duration_in_traffic.text}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Journey Details</h2>
            <div style={styles.detailsGrid}>
              <div style={styles.detailCard}>
                <div style={styles.label}>Departure Time</div>
                <div style={styles.value}>
                  {formatDateTime(routeData.trafficData.routes[0].summary.departureTime)}
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.label}>Arrival Time</div>
                <div style={styles.value}>
                  {formatDateTime(routeData.trafficData.routes[0].summary.arrivalTime)}
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.label}>Traffic Length</div>
                <div style={styles.value}>
                  {(routeData.trafficData.routes[0].summary.trafficLengthInMeters / 1000).toFixed(2)} km
                </div>
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Location Details</h2>
            <div style={styles.detailsGrid}>
              <div style={styles.detailCard}>
                <div style={styles.label}>Start Coordinates</div>
                <div style={styles.value}>
                  {`${routeData.trafficData.routes[0].legs[0].start_location.lat.toFixed(4)}, 
                    ${routeData.trafficData.routes[0].legs[0].start_location.lng.toFixed(4)}`}
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.label}>End Coordinates</div>
                <div style={styles.value}>
                  {`${routeData.trafficData.routes[0].legs[0].end_location.lat.toFixed(4)}, 
                    ${routeData.trafficData.routes[0].legs[0].end_location.lng.toFixed(4)}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {routeData && routeData.congestionStats && (
          <div style={styles.congestionPanel}>
            <h3 style={{...styles.statTitle, marginBottom: '15px'}}>
              Congestion Analysis
            </h3>
            {Object.entries(routeData.congestionStats).map(([level, stats]) => (
              <div
                key={level}
                style={{
                  ...styles.congestionLevel,
                  ...styles[level.toLowerCase()]
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <span
                        style={{
                          ...styles.congestionIndicator,
                          backgroundColor: getSegmentColor(level)
                        }}
                      />
                      {level.replace('_', ' ')}
                    </span>
                    <span>{stats.count} segments</span>
                  </div>
                  <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                    <div>Total Length: {stats.totalLength.toFixed(1)} km</div>
                    <div>Avg Speed: {Math.round(stats.averageSpeed)} km/h</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          {routeData && (
        <>
          {renderSimulationControls()}
          {renderCongestionStats()}
        </>
      )}

      <div style={styles.mapContainer} ref={mapElement} />
    </div>
  );
};

export default TrafficCongestionMap;