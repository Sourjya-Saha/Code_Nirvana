import { apiService } from '@/app/(tabs)/apiservices';
import useRouteTracking from '@/app/(tabs)/useRouteTracking';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import io from 'socket.io-client';
const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyCjH-5tCALXqN26NU5gF6LBl66gllE0rrw';
interface NavigationState {
  isActive: boolean;
  currentLegIndex: number;
  distance: string;
  duration: string;
  nextManeuver: string;
  nextManeuverDistance: string;
}

// New DirectionsResult interface
interface DirectionsResult {
  legs: Array<{
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    steps: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      html_instructions: string;
      maneuver?: string;
    }>;
  }>;
}
interface RouteMetadata {
  startTime: string;
  checkpoint: string;
  destination: string;
  startLocation: string;
}

interface RouteWaypoint {
  lat: number;
  lng: number;
}

interface Route {
  metadata: RouteMetadata;
  waypoints: RouteWaypoint[];
}

const TrackingScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [shouldFitToCoordinates, setShouldFitToCoordinates] = useState(true);
  const [routeLegsPolylines, setRouteLegsPolylines] = useState([]);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isActive: false,
    currentLegIndex: 0,
    distance: '',
    duration: '',
    nextManeuver: '',
    nextManeuverDistance: ''
  });
  const directionsRef = useRef(null);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const socketRef = useRef(null);
  const cartId = params.cartId as string;
  const driverId = params.driverId as string;
  const [isCompletingTransaction, setIsCompletingTransaction] = useState(false);
  const { isDeviating, deviationStartPoint } = useRouteTracking(socket, currentLocation, routeLegsPolylines, cartId, driverId);
  const initializeSocket = async () => {
    if (socket) {
      console.log('Disconnecting existing socket');
      socket.disconnect();
    }

    console.log('Initializing socket with:', {
      driverId,
      cartId,
      role: 'driver'
    });

    const newSocket = io('http://172.20.10.5:8000', {
      query: {
        user_id: driverId,
        cart_id: cartId,
        role: 'driver'
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  
    newSocket.on('connect', () => {
      console.log('Socket connected successfully. ID:', newSocket.id);
      setIsConnected(true);
      socketRef.current = newSocket;
      setSocket(newSocket);
      newSocket.emit('request-initial-state', { cart_id: cartId });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected. Reason:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
      Alert.alert('Connection Error', 'Failed to connect to server');
    });

    // Add listeners for acknowledgments and errors
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Handle initial state with the new data format
    newSocket.on('initial-state', (data) => {
      console.log('Initial state received:', data);
      if (data.route) {
        try {
          const route = typeof data.route === 'string' 
            ? JSON.parse(data.route) 
            : data.route;
          handleRouteData(route);
        } catch (error) {
          console.error('Error parsing route data:', error);
        }
      }
    });

    setSocket(newSocket);
    return newSocket;
  };

  const parseCoordinates = (coordString: string) => {
    try {
      // Split by comma and trim any whitespace
      const [lat, lng] = coordString.split(',').map(coord => parseFloat(coord.trim()));
      
      // Validate coordinates
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates');
      }
      
      // Ensure coordinates are within valid ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn('Coordinates outside normal range:', { lat, lng });
      }
      
      return {
        latitude: lat,
        longitude: lng
      };
    } catch (error) {
      console.error('Error parsing coordinates:', coordString, error);
      return null;
    }
  };


  const fetchRouteDirections = async (route: Route) => {
    if (!route?.metadata) return;
  
    try {
      const startCoords = parseCoordinates(route.metadata.startLocation);
      const checkpointCoords = parseCoordinates(route.metadata.checkpoint);
      const destCoords = parseCoordinates(route.metadata.destination);
  
      // Validate all coordinates are present
      if (!startCoords || !checkpointCoords || !destCoords) {
        throw new Error('Invalid coordinates in route data');
      }
  
      const googleApiKey = Platform.select({
        ios: 'AIzaSyCjH-5tCALXqN26NU5gF6LBl66gllE0rrw',
        android: 'AIzaSyCjH-5tCALXqN26NU5gF6LBl66gllE0rrw'
      });
  
      // Request routes with alternatives and overview=full for more detailed paths
      const firstLegUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${startCoords.latitude},${startCoords.longitude}&destination=${checkpointCoords.latitude},${checkpointCoords.longitude}&mode=driving&alternatives=false&overview=full&key=${googleApiKey}`;
      
      const secondLegUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${checkpointCoords.latitude},${checkpointCoords.longitude}&destination=${destCoords.latitude},${destCoords.longitude}&mode=driving&alternatives=false&overview=full&key=${googleApiKey}`;
  
      const [firstLegResponse, secondLegResponse] = await Promise.all([
        fetch(firstLegUrl),
        fetch(secondLegUrl)
      ]);
  
      const [firstLegData, secondLegData] = await Promise.all([
        firstLegResponse.json(),
        secondLegResponse.json()
      ]);
  
      if (firstLegData.status === 'OK' && secondLegData.status === 'OK') {
        // Function to extract detailed path from steps
        const getDetailedPath = (route) => {
          const path = [];
          route.legs[0].steps.forEach(step => {
            // Get detailed polyline for each step
            const points = decodePolyline(step.polyline.points);
            path.push(...points);
          });
          return path;
        };
  
        // Improved polyline decoder function
        const decodePolyline = (encoded) => {
          if (!encoded) return [];
          
          const poly = [];
          let index = 0;
          const len = encoded.length;
          let lat = 0;
          let lng = 0;
  
          while (index < len) {
            let b;
            let shift = 0;
            let result = 0;
  
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
  
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
  
            shift = 0;
            result = 0;
  
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
  
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
  
            const point = {
              latitude: lat * 1e-5,
              longitude: lng * 1e-5
            };
  
            // Validate point is within reasonable bounds
            if (point.latitude >= -90 && point.latitude <= 90 &&
                point.longitude >= -180 && point.longitude <= 180) {
              poly.push(point);
            }
          }
  
          return poly;
        };
  
        // Get detailed paths for both legs
        const firstLegPath = getDetailedPath(firstLegData.routes[0]);
        const secondLegPath = getDetailedPath(secondLegData.routes[0]);
  
        // Validate paths
        console.log('Path validation:', {
          firstLegPoints: firstLegPath.length,
          secondLegPoints: secondLegPath.length,
          firstLegStart: firstLegPath[0],
          firstLegEnd: firstLegPath[firstLegPath.length - 1],
          secondLegStart: secondLegPath[0],
          secondLegEnd: secondLegPath[secondLegPath.length - 1]
        });
  
        // Ensure paths connect to markers
        const ensureConnection = (path, startCoord, endCoord) => {
          if (path.length === 0) return [startCoord, endCoord];
          
          const result = [...path];
          // Add start point if it doesn't match
          if (Math.abs(path[0].latitude - startCoord.latitude) > 0.0001 ||
              Math.abs(path[0].longitude - startCoord.longitude) > 0.0001) {
            result.unshift(startCoord);
          }
          // Add end point if it doesn't match
          if (Math.abs(path[path.length - 1].latitude - endCoord.latitude) > 0.0001 ||
              Math.abs(path[path.length - 1].longitude - endCoord.longitude) > 0.0001) {
            result.push(endCoord);
          }
          return result;
        };
  
        // Connect paths to markers
        const finalFirstLegPath = ensureConnection(firstLegPath, startCoords, checkpointCoords);
        const finalSecondLegPath = ensureConnection(secondLegPath, checkpointCoords, destCoords);
  
        setRouteLegsPolylines([finalFirstLegPath, finalSecondLegPath]);
        setShouldFitToCoordinates(true);
  
        // Fit map to show entire route
        if (mapRef.current) {
          const allCoords = [...finalFirstLegPath, ...finalSecondLegPath];
          mapRef.current.fitToCoordinates(allCoords, {
            edgePadding: { 
              top: 100,
              right: 100,
              bottom: 100,
              left: 100
            },
            animated: true
          });
        }
      } else {
        console.error('Route fetching failed:', {
          firstLegStatus: firstLegData.status,
          firstLegError: firstLegData.error_message,
          secondLegStatus: secondLegData.status,
          secondLegError: secondLegData.error_message
        });
        
        // Use straight lines as fallback
        setRouteLegsPolylines([
          [startCoords, checkpointCoords],
          [checkpointCoords, destCoords]
        ]);
      }
    } catch (error) {
      console.error('Error in fetchRouteDirections:', error);
      
      // Fallback to straight lines
      const coordinates = [startCoords, checkpointCoords, destCoords].filter(Boolean);
      if (coordinates.length === 3) {
        setRouteLegsPolylines([[coordinates[0], coordinates[1]], [coordinates[1], coordinates[2]]]);
      }
    }
  };
  // Modify the handleRouteData function
  const handleRouteData = (route: Route) => {
    if (!route?.waypoints) return;
    setCurrentRoute(route);
    fetchRouteDirections(route);
  };

  // const startLocationTracking = async () => {
  //   try {
  //     const { status } = await Location.requestForegroundPermissionsAsync();
  //     if (status !== 'granted') {
  //       Alert.alert('Permission Denied', 'Location permission is required');
  //       return;
  //     }
  
  //     console.log('Starting location tracking...');
      
  //     if (locationSubscription.current) {
  //       console.log('Removing existing location subscription');
  //       locationSubscription.current.remove();
  //     }
  
  //     // Configure location tracking settings
  //     const locationConfig = {
  //       accuracy: Location.Accuracy.BestForNavigation,
  //       timeInterval: 5000,
  //       distanceInterval: 10,
  //       mayShowUserSettingsDialog: false
  //     };
  
  //     try {
  //       locationSubscription.current = await Location.watchPositionAsync(
  //         locationConfig,
  //         (location) => {
  //           const { latitude, longitude } = location.coords;
  //           console.log('New location received:', { latitude, longitude });
            
  //           setCurrentLocation(location);
            
  //           // Check socket connection and emit update
  //           if (socketRef.current?.connected) {
  //             const locationUpdate = {
  //               cart_id: cartId,
  //               latitude,
  //               longitude,
  //               timestamp: new Date().toISOString()
  //             };
              
  //             console.log('Emitting location update:', locationUpdate);
  //             socketRef.current.emit('driver-location-update', locationUpdate);
  //           } else {
  //             console.warn('Socket disconnected - attempting reconnection', {
  //               socketExists: !!socketRef.current,
  //               isConnected: socketRef.current?.connected
  //             });
              
  //             // Enhanced reconnection logic
  //             if (!socketRef.current) {
  //               initializeSocket();
  //             } else if (!socketRef.current.connected) {
  //               socketRef.current.connect();
  //             }
  //           }
  //         }
  //       );
  //     } catch (subscriptionError) {
  //       console.error('Location subscription error:', subscriptionError);
  //       Alert.alert(
  //         'Location Error',
  //         'Failed to track location. Please check your device settings.',
  //         [
  //           { text: 'OK' },
  //           { 
  //             text: 'Retry',
  //             onPress: () => startLocationTracking()
  //           }
  //         ]
  //       );
  //     }
  
  //   } catch (error) {
  //     console.error('Location tracking error:', error);
  //     Alert.alert('Error', 'Failed to start location tracking. Please try again.');
  //   }
  // };
  
  // Add socket event listeners for route deviation
  const setupSocketListeners = () => {
    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      Alert.alert('Connection Error', error.message);
    });
  
    socketRef.current.on('route-deviation', (data) => {
      console.log('Route deviation detected:', data);
      // Show deviation alert to driver
      Alert.alert(
        'Route Deviation',
        data.message || 'You have deviated from the planned route',
        [{ text: 'OK' }]
      );
    });
  };

  // Initialize both socket and location tracking
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (!cartId || !driverId) {
        console.error('Missing required parameters:', { cartId, driverId });
        return;
      }

      console.log('Starting initialization with:', { cartId, driverId });

      try {
        // Initialize socket first
        const newSocket = initializeSocket();
        
        if (isMounted) {
          // Wait for socket to connect before starting location tracking
          await new Promise((resolve) => {
            const checkConnection = setInterval(() => {
              if (newSocket.connected) {
                clearInterval(checkConnection);
                resolve(true);
              }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
              clearInterval(checkConnection);
              resolve(false);
            }, 5000);
          });

          // Start location tracking
          await startLocationTracking();
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();

    // Cleanup function
    return () => {
      isMounted = false;
      console.log('Cleaning up...');
      
      if (locationSubscription.current) {
        console.log('Removing location subscription');
        locationSubscription.current.remove();
      }
      
      if (socketRef.current) {
        console.log('Disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [cartId, driverId]);


  const handleLogout = async () => {
    try {
      if (socket) {
        socket.disconnect();
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      const driverId = await AsyncStorage.getItem('driverId');
      if (driverId) {
        await apiService.logoutDriver(driverId);
        await AsyncStorage.removeItem('driverId');
      }
      // Clear route data
      setCurrentRoute(null);
      setRouteLegsPolylines([]);
      setCurrentLocation(null); 
      await AsyncStorage.removeItem('driverId');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };
  // Add navigation handler for shipments
  const handleShipmentsPress = () => {
    router.push('/notifications');
  };
  const onRegionChangeComplete = () => {
    if (mapRef.current && routeLegsPolylines.length > 0 && shouldFitToCoordinates) {
      const allCoords = routeLegsPolylines.flat();
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      });
      // Reset the flag after fitting
      setShouldFitToCoordinates(false);
    }
  };
console.log(currentRoute);
const handleCompleteTransaction = async () => {
  Alert.alert(
    'Complete Transaction',
    'Are you sure you want to complete this transaction?',
    [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setIsCompletingTransaction(true);
            
            const response = await fetch('http://172.20.10.5:8000/update_route_status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cart_id: cartId
              })
            });

            const data = await response.json();

            if (response.ok) {
              if (data.message === 'Route status updated successfully') {
                Alert.alert(
                  'Success',
                  'Transaction completed successfully!',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push('/notifications')
                    }
                  ]
                );
              } else {
                // Format the distance message if it exists
                let message = data.message;
                if (message && message.includes('Distance from the final location')) {
                  const distanceMatch = message.match(/:\s*(\d+\.?\d*)/);
                  if (distanceMatch) {
                    const distance = parseFloat(distanceMatch[1]);
                    const distanceInKm = (distance / 1000).toFixed(2);
                    message = `Cart is not near final location.\nDistance from the final location: ${distanceInKm} kms`;
                  }
                }
                
                Alert.alert(
                  'Cannot Complete',
                  message || data.error
                );
              }
            } else {
              Alert.alert(
                'Error',
                data.error || 'Failed to process request'
              );
            }
          } catch (error) {
            console.error('Error completing transaction:', error);
            Alert.alert(
              'Error',
              'Network error. Please check your connection and try again.'
            );
          } finally {
            setIsCompletingTransaction(false);
          }
        }
      }
    ]
  );
};

const startNavigation = () => {
  if (!currentLocation || !currentRoute?.metadata) {
    Alert.alert('Error', 'Cannot start navigation without current location or route');
    return;
  }

  setNavigationState(prev => ({
    ...prev,
    isActive: true,
    currentLegIndex: 0
  }));
  
  if (mapRef.current) {
    mapRef.current.setCamera({
      center: {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      },
      heading: currentLocation.coords.heading || 0,
      pitch: 60,
      zoom: 18,
      duration: 1000
    });
  }
};

const exitNavigation = () => {
  setNavigationState(prev => ({
    ...prev,
    isActive: false
  }));
  setShouldFitToCoordinates(true);
};

const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const onDirectionsReady = (result: DirectionsResult) => {
  console.log('Directions result received:', JSON.stringify(result, null, 2));

  if (!result?.legs?.[0]) {
    console.warn('Invalid directions result structure');
    return;
  }

  try {
    const currentLeg = result.legs[0];
    const firstStep = currentLeg.steps[0];

    if (!currentLeg.distance || !currentLeg.duration || !firstStep) {
      console.warn('Missing required direction data');
      return;
    }

    const updatedState = {
      distance: currentLeg.distance.text,
      duration: currentLeg.duration.text,
      nextManeuver: stripHtmlTags(firstStep.html_instructions),
      nextManeuverDistance: firstStep.distance.text
    };

    console.log('Updating navigation state with:', updatedState);

    setNavigationState(prev => ({
      ...prev,
      ...updatedState
    }));
  } catch (error) {
    console.error('Error processing directions:', error);
    setNavigationState(prev => ({
      ...prev,
      nextManeuver: 'Navigation data unavailable',
      nextManeuverDistance: 'Calculating...'
    }));
  }
};

const updateNavigationCamera = () => {
  if (!navigationState.isActive || !currentLocation || !mapRef.current) return;

  mapRef.current.setCamera({
    center: {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude
    },
    heading: currentLocation.coords.heading || 0,
    pitch: 60,
    zoom: 18,
    duration: 1000
  });
};
// Enhanced location tracking with heading
const startLocationTracking = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required');
      return;
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
        mayShowUserSettingsDialog: false
      },
      (location) => {
        setCurrentLocation(location);
        updateNavigationCamera();
        
        // Emit location update to socket
        if (socketRef.current?.connected) {
          socketRef.current.emit('driver-location-update', {
            cart_id: cartId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
            timestamp: new Date().toISOString()
          });
        }
      }
    );
  } catch (error) {
    console.error('Location tracking error:', error);
    Alert.alert('Error', 'Failed to start location tracking');
  }
};

// Navigation overlay component
const NavigationOverlay = () => (
  <View style={styles.navigationOverlay}>
    <View style={styles.navigationHeader}>
      <Text style={styles.navigationTitle}>Navigation Active</Text>
      <TouchableOpacity onPress={exitNavigation} style={styles.exitButton}>
        <MaterialIcons name="close" size={24} color="white" />
      </TouchableOpacity>
    </View>
    
    <View style={styles.navigationInfo}>
      <View style={styles.infoRow}>
        <MaterialIcons name="directions-car" size={24} color="white" />
        <Text style={styles.infoText}>
          {navigationState.distance || 'Calculating distance...'}
        </Text>
        <Text style={styles.infoText}>
          {navigationState.duration || 'Calculating time...'}
        </Text>
      </View>
      
      <View style={styles.maneuverContainer}>
        <MaterialIcons name="turn-right" size={32} color="white" />
        <View style={styles.maneuverTextContainer}>
          <Text style={styles.maneuverText}>
            {navigationState.nextManeuver || 'Getting next instruction...'}
          </Text>
          <Text style={styles.maneuverDistance}>
            {navigationState.nextManeuverDistance || 'Calculating...'}
          </Text>
        </View>
      </View>
    </View>
  </View>
);
  return (
    <View style={styles.container}>
    <MapView
      ref={mapRef}
      provider={Platform.select({
        ios: PROVIDER_DEFAULT,
        android: PROVIDER_GOOGLE
      })}
      style={styles.map}
      initialRegion={currentLocation ? {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
      } : undefined}
      showsUserLocation={true}
      followsUserLocation={navigationState.isActive}
      showsCompass={!navigationState.isActive}
      showsTraffic={true}
      zoomEnabled={true}
      scrollEnabled={true}
      rotateEnabled={true}
      onRegionChangeComplete={onRegionChangeComplete}
      mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {currentLocation && (
        <Marker
          coordinate={{
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude
          }}
          title="Your Location"
        >
          <View style={styles.markerContainer}>
            <Image
              source={require('@/assets/images/NHC (1).png')}
              style={styles.markerImage}
            />
          </View>
        </Marker>

        
        
      )}
      
      {isDeviating && (
    <Marker
      coordinate={{
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      }}
    >
      <View style={styles.deviationMarker}>
        <MaterialIcons name="warning" size={24} color="#FFC107" />
      </View>
    </Marker>
  )}
      {routeLegsPolylines.map((polyline, index) => (
        <Polyline
          key={index}
          coordinates={polyline}
          strokeWidth={Platform.select({
            ios: 3,
            android: 5
          })}
          strokeColor={index === 0 ? "#4A6CF7" : "#F44336"}
        />
      ))}

      {currentRoute?.metadata && (
        <>
          <Marker
            coordinate={parseCoordinates(currentRoute.metadata.startLocation)}
            title="Start"
          >
            <View style={styles.iconContainer}>
              <MaterialIcons 
                name="trip-origin" 
                size={Platform.select({ ios: 24, android: 30 })} 
                color="#4CAF50" 
              />
            </View>
          </Marker>
          <Marker
            coordinate={parseCoordinates(currentRoute.metadata.checkpoint)}
            title="Checkpoint"
          >
            <View style={styles.iconContainer}>
              <MaterialIcons 
                name="store" 
                size={Platform.select({ ios: 24, android: 30 })} 
                color="#4A6CF7" 
              />
            </View>
          </Marker>
          <Marker
            coordinate={parseCoordinates(currentRoute.metadata.destination)}
            title="Destination"
          >
            <View style={styles.iconContainer}>
              <MaterialIcons 
                name="location-on" 
                size={Platform.select({ ios: 24, android: 30 })} 
                color="#F44336" 
              />
            </View>
          </Marker>
        </>
      )}

      
{navigationState.isActive && currentRoute?.metadata && (
        <MapViewDirections
          origin={currentLocation ? {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude
          } : parseCoordinates(currentRoute.metadata.startLocation)}
          destination={parseCoordinates(
            navigationState.currentLegIndex === 0 
              ? currentRoute.metadata.checkpoint 
              : currentRoute.metadata.destination
          )}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={5}
          strokeColor="#4A6CF7"
          mode="DRIVING"
          optimizeWaypoints={true}
          precision="high"
          resetOnChange={false}
          timePrecision="now"
          onReady={onDirectionsReady}
          onError={(error) => {
            console.error('Directions error:', error);
            Alert.alert('Navigation Error', 'Failed to load directions');
          }}
        />
      )}


    </MapView>
    <TouchableOpacity 
  style={styles.centerMapButton}
  onPress={() => {
    setShouldFitToCoordinates(true);
  }}
>
  <MaterialIcons name="center-focus-strong" size={24} color="#1E2A78" />
</TouchableOpacity>

      <View style={styles.headerContainer}>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <TouchableOpacity
          style={styles.notificationBox}
          onPress={handleShipmentsPress}
        >
          <MaterialIcons name="notifications" size={28} color="#3182CE" />
          <Text style={styles.notificationText}>Your Shipments</Text>
        </TouchableOpacity>
        {!navigationState.isActive && currentRoute && (
        <TouchableOpacity 
          style={styles.startNavigationButton}
          onPress={startNavigation}
        >
          <MaterialIcons name="navigation" size={24} color="white" />
          <Text style={styles.startNavigationText}>Start Navigation</Text>
        </TouchableOpacity>
      )}

      {navigationState.isActive && <NavigationOverlay />}
        {currentRoute?.metadata ? (
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>Route Details</Text>
            <Text style={styles.locationTitle}>{cartId}</Text>
            <View style={styles.locationItem}>
              <MaterialIcons name="trip-origin" size={20} color="#4CAF50" />
              <Text style={styles.locationText}>{currentRoute.metadata.startLocation}</Text>
            </View>
            <View style={styles.locationItem}>
              <MaterialIcons name="store" size={20} color="#4A6CF7" />
              <Text style={styles.locationText}>{currentRoute.metadata.checkpoint}</Text>
            </View>
            <View style={styles.locationItem}>
              <MaterialIcons name="location-on" size={20} color="#F44336" />
              <Text style={styles.locationText}>{currentRoute.metadata.destination}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.completeButton,
                isCompletingTransaction && styles.completeButtonDisabled
              ]}
              onPress={handleCompleteTransaction}
              disabled={isCompletingTransaction}
            >
              {isCompletingTransaction ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.completeButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={24} color="white" />
                  <Text style={styles.completeButtonText}>Complete Transaction</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noRouteContainer}>
            <MaterialIcons name="route" size={48} color="#CBD5E0" />
            <Text style={styles.noRouteText}>No active routes</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width,
    height,
  },
  centerMapButton: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  notificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notificationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3182CE',
    marginLeft: 8,
  },
  noRouteContainer: {
    alignItems: 'center',
    padding: 16,
  },
  noRouteText: {
    fontSize: 16,
    color: '#718096',
    marginVertical: 12,
  },
  headerContainer: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonDisabled: {
    backgroundColor: '#90CAF9',
    opacity: 0.8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2A78',
  },
  logoutButton: {
    padding: 8,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  locationInfo: {
    gap: 12,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E2A78',
    marginBottom: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  
  markerContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationOverlay: {
    position: 'absolute',
    top: Platform.select({ ios: 60, android: 48 }),
    left: 16,
    right: 16,
    backgroundColor: 'rgba(30, 42, 120, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navigationTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exitButton: {
    padding: 8,
  },
  navigationInfo: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  maneuverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  maneuverTextContainer: {
    flex: 1,
  },
  maneuverText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  maneuverDistance: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  startNavigationButton: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    right: 16,
    backgroundColor: '#4A6CF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  startNavigationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    backgroundColor: 'transparent',
   
    padding: Platform.select({ ios: 4, android: 6 }),
   
   
    elevation: Platform.select({ ios: 0, android: 5 }),
  
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  markerImage: {
    width: Platform.select({
      ios: 40,
      android: 35
    }),
    height: Platform.select({
      ios: 55,
      android: 48
    }),
    resizeMode: 'contain',
  },
  deviationMarker: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FFC107'
  }
});

export default TrackingScreen;