// SocketContext.tsx in expo for driver app
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface RouteData {
  waypoints: { lat: number; lng: number }[];
  metadata: {
    startLocation: string;
    destination: string;
    maxDeviationAllowed: number; // meters
  };
}

interface RouteDeviation {
  timestamp: string;
  driver_id: string;
  location: { lat: number; lng: number };
  distance: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionAttempts: number;
  currentRoute: RouteData | null;
  routeDeviations: RouteDeviation[];
  startLocationTracking: (driverId: string, locationCallback?: (location) => void) => Promise<Location.LocationSubscription>;
  clearRouteDeviations: () => void;
  retryConnection: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [routeDeviations, setRouteDeviations] = useState<RouteDeviation[]>([]);

  const initializeSocket = () => {
    // Increment connection attempts
    setConnectionAttempts(prev => prev + 1);

    const newSocket = io('http://0.0.0.0:8000', {
      query: { role: 'driver' },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionAttempts(0);
      console.log('Socket connected successfully');
    });

    newSocket.on('route-broadcast', (routeData: RouteData) => {
      console.log('Received route:', routeData);
      setCurrentRoute(routeData);
    });

    newSocket.on('route-deviation', (deviationData: RouteDeviation) => {
      console.log('Detailed Route Deviation:', {
        timestamp: deviationData.timestamp,
        driverId: deviationData.driver_id,
        location: deviationData.location,
        deviationDetails: {
          distance: deviationData.distance,
          severity: deviationData.severity,
          message: deviationData.message
        }
      });
      
      // Add new deviation to state
      setRouteDeviations(prevDeviations => [...prevDeviations, deviationData]);

      // Show alert based on severity
      Alert.alert(
        `${deviationData.severity.toUpperCase()} Route Deviation`,
        deviationData.message,
        [{ 
          text: 'OK', 
          onPress: () => console.log('Deviation alert acknowledged') 
        }]
      );
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);
    });

    setSocket(newSocket);
  };

  useEffect(() => {
    initializeSocket();

    return () => {
      socket?.disconnect();
    };
  }, []);

  const startLocationTracking = async (
    driverId: string, 
    locationCallback?: (location) => void
  ): Promise<Location.LocationSubscription> => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Location permission not granted');
      throw new Error('Location permission not granted');
    }

    const trackLocation = async (location: Location.LocationObject) => {
      try {
        const { latitude, longitude } = location.coords;

        // Call location callback if provided
        if (locationCallback) {
          locationCallback(location);
        }

        // Emit location update to server
        if (socket && isConnected) {
          socket.emit('driver-location-update', {
            driver_id: driverId,
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error tracking location:', error);
      }
    };

    // Set up continuous tracking
    const locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      },
      trackLocation
    );

    return locationSubscription;
  };

  const clearRouteDeviations = () => {
    setRouteDeviations([]);
  };

  const retryConnection = () => {
    socket?.disconnect();
    initializeSocket();
  };

  return (
    <SocketContext.Provider value={{
      socket, 
      isConnected, 
      connectionAttempts,
      currentRoute, 
      routeDeviations,
      startLocationTracking,
      clearRouteDeviations,
      retryConnection
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;