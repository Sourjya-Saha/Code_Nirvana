import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { Factory, Store, Warehouse, Navigation, Package, Truck, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
const BACKEND_URL = 'http://localhost:8000';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '20px',
  },
  header: {
    marginBottom: '20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 0',
  },
  button: {
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'center',
    fontSize: '16px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
    '@media (min-width: 768px)': {
      gridTemplateColumns: '1fr 1fr',
    },
  },
  mapContainer: {
    height: '400px',
    width: '100%',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  detailsSection: {
    marginTop: '20px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '8px',
  },
  detailsLabel: {
    fontWeight: '500',
    color: '#444',
  },
  participantsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '10px',
    marginTop: '10px',
  },
  participantCard: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  alert: {
    backgroundColor: '#fff3f3',
    color: '#cc0000',
    padding: '12px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loginCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  loginTitle: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
    backgroundColor: 'white',
  },
};

// Rest of the component code remains the same, just replace all className references 
// with style={styles.correspondingStyle} and remove shadcn component imports

const RouteGenerator = ({ cartId, onRouteGenerated, manufacturerLocation, wholesalerLocation, retailerLocation }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRoute = async () => {
    setIsGenerating(true);
    try {
      const route = {
        waypoints: [
          { 
            lat: manufacturerLocation.lat, 
            lng: manufacturerLocation.lng,
            type: 'manufacturer'
          },
          { 
            lat: wholesalerLocation.lat, 
            lng: wholesalerLocation.lng,
            type: 'wholesaler'
          },
          { 
            lat: retailerLocation.lat, 
            lng: retailerLocation.lng,
            type: 'retailer'
          }
        ],
        estimated_delivery_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      onRouteGenerated(route);
    } catch (error) {
      console.error('Failed to generate route:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <button 
        onClick={generateRoute} 
        disabled={isGenerating}
        style={{
          ...styles.button,
          ...(isGenerating ? styles.buttonDisabled : {})
        }}
      >
        <Navigation size={20} />
        {isGenerating ? 'Generating Route...' : 'Generate Route'}
      </button>
    </div>
  );
};

const LocationMarker = ({ position, type, label }) => {
  const getIcon = () => {
    const iconProps = { size: 24 };
    switch (type) {
      case 'manufacturer':
        return <Factory {...iconProps} color="#0066cc" />;
      case 'wholesaler':
        return <Warehouse {...iconProps} color="#00cc66" />;
      case 'retailer':
        return <Store {...iconProps} color="#cc00cc" />;
      default:
        return <Package {...iconProps} />;
    }
  };

  return (
    <Marker position={[position.lat, position.lng]}>
      <Popup>{label}</Popup>
      {getIcon()}
    </Marker>
  );
};

// ShipmentTracker component implementation remains the same, just update the styles
// App component implementation remains the same, just update the styles

const ShipmentTracker = ({ 
  userId, 
  cartId, 
  userRole,
  manufacturerLocation,
  wholesalerLocation,
  retailerLocation 
}) => {
    const [socket, setSocket] = useState(null);
    const [shipmentDetails, setShipmentDetails] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [error, setError] = useState(null);
    const [participants, setParticipants] = useState(null);
  
    // Calculate map center based on all locations
    const getMapCenter = () => {
      const locations = [manufacturerLocation, wholesalerLocation, retailerLocation];
      const lat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const lng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
      return [lat, lng];
    };
  
    // Calculate map bounds to fit all locations
    const getMapBounds = () => {
      const locations = [manufacturerLocation, wholesalerLocation, retailerLocation];
      const latitudes = locations.map(loc => loc.lat);
      const longitudes = locations.map(loc => loc.lng);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      return [
        [minLat - 0.1, minLng - 0.1], // Add padding
        [maxLat + 0.1, maxLng + 0.1]
      ];
    };
  
    useEffect(() => {
      const verifyAccess = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/shipment/verify-access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartId, userId })
          });
          const data = await response.json();
          
          if (data.authorized) {
            setShipmentDetails(data.shipment);
            initializeSocket();
          } else {
            setError('Unauthorized access');
          }
        } catch (err) {
          setError('Failed to verify access');
        }
      };
  
      const fetchParticipants = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/shipment/${cartId}/participants`);
          const data = await response.json();
          setParticipants(data);
        } catch (err) {
          console.error('Failed to fetch participants:', err);
        }
      };
  
      verifyAccess();
      fetchParticipants();
    }, [userId, cartId]);
  
    const initializeSocket = () => {
      const newSocket = io(BACKEND_URL, {
        query: { user_id: userId, cart_id: cartId }
      });
  
      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('request-initial-state', { cart_id: cartId });
      });
  
      newSocket.on('initial-state', (data) => {
        if (data.route) setRouteData(data.route);
      });
  
      newSocket.on('route-broadcast', (data) => {
        setRouteData(data.route_data);
      });
  
      newSocket.on('driver-location-update', (data) => {
        setDriverLocation({
          lat: data.latitude,
          lng: data.longitude,
          timestamp: data.last_update
        });
      });
  
      newSocket.on('route-deviation', (data) => {
        setError(`Route Deviation Alert: ${data.message}`);
      });
  
      setSocket(newSocket);
  
      return () => newSocket.close();
    };
  
    const handleRouteGenerated = (route) => {
      if (socket) {
        socket.emit('route-created', {
          cart_id: cartId,
          route_data: route
        });
      }
    };

  if (error) {
    return (
      <div style={styles.alert}>
        <AlertTriangle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div>
              <h2 style={styles.title}>Shipment Tracking</h2>
              <p style={styles.subtitle}>Role: {userRole}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={24} />
              <span>Cart ID: {cartId}</span>
            </div>
          </div>
        </div>

        {userRole === 'start' && !routeData && (
          <RouteGenerator 
            cartId={cartId} 
            onRouteGenerated={handleRouteGenerated}
            manufacturerLocation={manufacturerLocation}
            wholesalerLocation={wholesalerLocation}
            retailerLocation={retailerLocation}
          />
        )}

        <div style={styles.grid}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Shipment Details
            </h3>
            {shipmentDetails && (
              <div style={styles.shipmentDetails}>
                <span style={{ fontWeight: '500' }}>Status:</span>
                <span>{shipmentDetails.status}</span>
                <span style={{ fontWeight: '500' }}>Driver:</span>
                <span>{shipmentDetails.user_name}</span>
                {shipmentDetails.estimated_delivery_time && (
                  <>
                    <span style={{ fontWeight: '500' }}>Estimated Delivery:</span>
                    <span>
                      {new Date(shipmentDetails.estimated_delivery_time).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div style={styles.mapContainer}>
            <MapContainer
              center={getMapCenter()}
              bounds={getMapBounds()}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              
              <LocationMarker 
                position={manufacturerLocation}
                type="manufacturer"
                label="Manufacturer"
              />
              <LocationMarker 
                position={wholesalerLocation}
                type="wholesaler"
                label="Wholesaler"
              />
              <LocationMarker 
                position={retailerLocation}
                type="retailer"
                label="Retailer"
              />
              
              {routeData && (
                <Polyline
                  positions={routeData.waypoints.map(wp => [wp.lat, wp.lng])}
                  color="blue"
                />
              )}
              
              {driverLocation && (
                <Marker position={[driverLocation.lat, driverLocation.lng]}>
                  <Popup>Driver's Current Location</Popup>
                  <Truck style={{ width: 24, height: 24, color: '#3b82f6' }} />
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
        
        {participants && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              Participants
            </h3>
            <div style={styles.participantsGrid}>
              {Object.entries(participants).map(([role, id]) => (
                <div key={role} style={styles.participantCard}>
                  <span style={{ fontWeight: '500' }}>
                    {role.replace('_id', '').toUpperCase()}:{' '}
                  </span>
                  <span>{id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NewGeolocation = ({ 
  manufacturerLocation, 
  wholesalerLocation, 
  retailerLocation 
}) => {
  const [userId, setUserId] = useState('');
  const [cartId, setCartId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const locations = {
    manufacturerLocation: { lat: 51.505, lng: -0.09 },
    wholesalerLocation: { lat: 51.51, lng: -0.1 },
    retailerLocation: { lat: 51.515, lng: -0.11 }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (userId && cartId && userRole) {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={styles.card}>
          <h1 style={{ ...styles.title, textAlign: 'center', marginBottom: '24px' }}>
            Drug Inventory Tracking
          </h1>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="userId" style={styles.label}>User ID</label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                style={styles.input}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="cartId" style={styles.label}>Cart ID</label>
              <input
                id="cartId"
                type="text"
                value={cartId}
                onChange={(e) => setCartId(e.target.value)}
                required
                style={styles.input}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="role" style={styles.label}>Role</label>
              <select
                id="role"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">Select Role</option>
                <option value="start">Start (Manufacturer)</option>
                <option value="wholesaler">Wholesaler</option>
                <option value="retailer">Retailer</option>
              </select>
            </div>
            <button type="submit" style={styles.button}>
              Track Shipment
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <ShipmentTracker 
    userId={userId} 
    cartId={cartId} 
    userRole={userRole}
    manufacturerLocation={locations.manufacturerLocation}
    wholesalerLocation={locations.wholesalerLocation}
    retailerLocation={locations.retailerLocation}
  />
  );
};

export default NewGeolocation;