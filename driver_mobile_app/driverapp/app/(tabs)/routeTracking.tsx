import { apiService } from '@/app/(tabs)/apiservices';
import useRouteTracking from '@/app/(tabs)/useRouteTracking';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import io from 'socket.io-client';
import ChatComponent from './ChatComponent';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4';

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


const NavigationOverlay = ({ navigationState, exitNavigation }) => {
  const getManeuverIcon = (instruction = '') => {
    const instructionLower = instruction.toLowerCase();
    if (instructionLower.includes('turn right')) return 'turn-right';
    if (instructionLower.includes('turn left')) return 'turn-left';
    if (instructionLower.includes('u-turn')) return 'u-turn';
    if (instructionLower.includes('merge')) return 'merge';
    if (instructionLower.includes('take exit')) return 'exit-to-app';
    if (instructionLower.includes('roundabout')) return 'rotate-right';
    if (instructionLower.includes('continue')) return 'arrow-upward';
    if (instructionLower.includes('arrive')) return 'place';
    return 'directions';
  };

  return (
    <View style={styles.navigationOverlay}>
      <LinearGradient
        colors={['rgba(30, 42, 120, 0.95)', 'rgba(74, 108, 247, 0.95)']}
        style={styles.gradientOverlay}
      >
        <View style={styles.navigationHeader}>
          <View style={styles.navigationTitleContainer}>
            <MaterialIcons name="navigation" size={24} color="white" />
            <Text style={styles.navigationTitle}>Active Navigation</Text>
          </View>
          <TouchableOpacity onPress={exitNavigation} style={styles.exitButton}>
            <MaterialIcons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.navigationInfo}>
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <MaterialIcons name="directions-car" size={24} color="white" />
              <Text style={styles.infoCardTitle}>Distance</Text>
              <Text style={styles.infoCardValue}>
                {navigationState.distance || 'Calculating...'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <MaterialIcons name="access-time" size={24} color="white" />
              <Text style={styles.infoCardTitle}>ETA</Text>
              <Text style={styles.infoCardValue}>
                {navigationState.duration || 'Calculating...'}
              </Text>
            </View>
          </View>

          <View style={styles.maneuverContainer}>
            <MaterialIcons
              name={getManeuverIcon(navigationState.nextManeuver)}
              size={32}
              color="white"
            />
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
      </LinearGradient>
    </View>
  );
};

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
  // FIX: ref to prevent location callbacks firing state updates during logout
  const isLoggingOut = useRef(false);
  const cartId = params.cartId as string;
  const driverId = params.driverId as string;
  const [isCompletingTransaction, setIsCompletingTransaction] = useState(false);
  const { isDeviating, deviationStartPoint } = useRouteTracking(socket, currentLocation, routeLegsPolylines, cartId, driverId);
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const detailsAnimation = useRef(new Animated.Value(0)).current;
  const [showChat, setShowChat] = useState(false);
  const [locationNames, setLocationNames] = useState({
    start: '',
    checkpoint: '',
    destination: ''
  });


  const initializeSocket = async () => {
    // FIX: use socketRef to avoid stale closure from socket state
    if (socketRef.current) {
      console.log('Disconnecting existing socket');
      socketRef.current.disconnect();
      socketRef.current = null;
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

  const parseCoordinates = (coordString: string | null | undefined) => {
    try {
      // Return null if the input is empty, null, or undefined
      if (!coordString) {
        return null;
      }

      // Handle different coordinate formats
      let lat: number, lng: number;

      // Check if it's a string with comma
      if (typeof coordString === 'string' && coordString.includes(',')) {
        // Split by comma and trim any whitespace
        const [latStr, lngStr] = coordString.split(',').map(coord => coord.trim());
        lat = parseFloat(latStr);
        lng = parseFloat(lngStr);
      }
      // Handle if it's already an object with lat/lng properties
      else if (typeof coordString === 'object' && coordString !== null) {
        const coords = coordString as any;
        if ('lat' in coords && 'lng' in coords) {
          lat = parseFloat(coords.lat);
          lng = parseFloat(coords.lng);
        } else if ('latitude' in coords && 'longitude' in coords) {
          lat = parseFloat(coords.latitude);
          lng = parseFloat(coords.longitude);
        } else {
          throw new Error('Invalid coordinate object format');
        }
      } else {
        throw new Error('Invalid coordinate format');
      }

      // Validate the parsed numbers
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Coordinates contain invalid numbers');
      }

      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn('Coordinates outside normal range:', { lat, lng });
      }

      // Return in the format expected by the map
      return {
        latitude: lat,
        longitude: lng
      };
    } catch (error) {
      console.error('Error parsing coordinates:', coordString, error);
      return null;
    }
  };

  const determineValidRoutePoints = (route) => {
    if (!route?.metadata) return null;
    const { startLocation, checkpoint, destination } = route.metadata;

    console.log('Determining route points for:', { startLocation, checkpoint, destination });

    // Full route (all points present)
    if (startLocation && checkpoint && destination) {
      console.log('Using full route');
      return {
        type: 'full_route',
        points: [startLocation, checkpoint, destination]
      };
    }

    // Start to checkpoint route
    if (startLocation && checkpoint && !destination) {
      console.log('Using start to checkpoint route');
      return {
        type: 'start_to_checkpoint',
        points: [startLocation, checkpoint]
      };
    }

    // Checkpoint to destination route
    if (!startLocation && checkpoint && destination) {
      console.log('Using checkpoint to destination route');
      return {
        type: 'checkpoint_to_destination',
        points: [checkpoint, destination]
      };
    }

    // Start to destination route
    if (startLocation && !checkpoint && destination) {
      console.log('Using start to destination route');
      return {
        type: 'start_to_destination',
        points: [startLocation, destination]
      };
    }

    console.log('No valid route configuration found');
    return null;
  };


  const fetchRouteDirections = async (route: Route) => {
    if (!route?.metadata) return;

    try {
      const startCoords = route.metadata.startLocation ? parseCoordinates(route.metadata.startLocation) : null;
      const checkpointCoords = route.metadata.checkpoint ? parseCoordinates(route.metadata.checkpoint) : null;
      const destCoords = route.metadata.destination ? parseCoordinates(route.metadata.destination) : null;

      // Determine valid route points
      let validRoutePoints;

      // Case 1: If startLocation is empty, use checkpoint as start and destination as end
      if (!startCoords && checkpointCoords && destCoords) {
        validRoutePoints = {
          start: checkpointCoords,
          end: destCoords,
          isSingleLeg: true
        };
      }
      // Case 2: If checkpoint is empty, route from start to destination
      else if (!checkpointCoords && startCoords && destCoords) {
        validRoutePoints = {
          start: startCoords,
          end: destCoords,
          isSingleLeg: true
        };
      }
      // Case 3: If destination is empty, route from start to checkpoint
      else if (!destCoords && startCoords && checkpointCoords) {
        validRoutePoints = {
          start: startCoords,
          end: checkpointCoords,
          isSingleLeg: true
        };
      }
      // Case 4: Full route with all points
      else if (startCoords && checkpointCoords && destCoords) {
        validRoutePoints = {
          start: startCoords,
          checkpoint: checkpointCoords,
          end: destCoords,
          isSingleLeg: false
        };
      } else {
        throw new Error('Invalid or insufficient coordinates in route data');
      }

      const googleApiKey = Platform.select({
        ios: 'AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4',
        android: 'AIzaSyCKMi4KBlb1RmR_E3AbguOPL2YKjfaCvn4'
      });

      let routeResponses;
      let routeData;

      if (validRoutePoints.isSingleLeg) {
        // Single leg route
        const routeUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${validRoutePoints.start.latitude},${validRoutePoints.start.longitude}&destination=${validRoutePoints.end.latitude},${validRoutePoints.end.longitude}&mode=driving&alternatives=false&overview=full&key=${googleApiKey}`;

        const response = await fetch(routeUrl);
        const data = await response.json();
        routeResponses = [data];
        routeData = routeResponses;
      } else {
        // Two leg route
        const firstLegUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${validRoutePoints.start.latitude},${validRoutePoints.start.longitude}&destination=${validRoutePoints.checkpoint.latitude},${validRoutePoints.checkpoint.longitude}&mode=driving&alternatives=false&overview=full&key=${googleApiKey}`;
        const secondLegUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${validRoutePoints.checkpoint.latitude},${validRoutePoints.checkpoint.longitude}&destination=${validRoutePoints.end.latitude},${validRoutePoints.end.longitude}&mode=driving&alternatives=false&overview=full&key=${googleApiKey}`;

        const [firstLegResponse, secondLegResponse] = await Promise.all([
          fetch(firstLegUrl),
          fetch(secondLegUrl)
        ]);

        routeData = await Promise.all([
          firstLegResponse.json(),
          secondLegResponse.json()
        ]);
      }

      // Function to extract detailed path from steps
      const getDetailedPath = (route) => {
        const path = [];
        route.legs[0].steps.forEach(step => {
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

          if (point.latitude >= -90 && point.latitude <= 90 &&
              point.longitude >= -180 && point.longitude <= 180) {
            poly.push(point);
          }
        }

        return poly;
      };

      // Process route data based on whether it's single or two legs
      if (validRoutePoints.isSingleLeg) {
        if (routeData[0].status === 'OK') {
          const path = getDetailedPath(routeData[0].routes[0]);

          const finalPath = ensureConnection(path, validRoutePoints.start, validRoutePoints.end);
          setRouteLegsPolylines([finalPath]);
          setShouldFitToCoordinates(true);

          if (mapRef.current) {
            mapRef.current.fitToCoordinates(finalPath, {
              edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
              animated: true
            });
          }
        } else {
          console.error('Route fetching failed:', routeData[0].status);
          setRouteLegsPolylines([[validRoutePoints.start, validRoutePoints.end]]);
        }
      } else {
        if (routeData[0].status === 'OK' && routeData[1].status === 'OK') {
          const firstLegPath = getDetailedPath(routeData[0].routes[0]);
          const secondLegPath = getDetailedPath(routeData[1].routes[0]);

          console.log('Path validation:', {
            firstLegPoints: firstLegPath.length,
            secondLegPoints: secondLegPath.length,
            firstLegStart: firstLegPath[0],
            firstLegEnd: firstLegPath[firstLegPath.length - 1],
            secondLegStart: secondLegPath[0],
            secondLegEnd: secondLegPath[secondLegPath.length - 1]
          });

          const finalFirstLegPath = ensureConnection(firstLegPath, validRoutePoints.start, validRoutePoints.checkpoint);
          const finalSecondLegPath = ensureConnection(secondLegPath, validRoutePoints.checkpoint, validRoutePoints.end);

          setRouteLegsPolylines([finalFirstLegPath, finalSecondLegPath]);
          setShouldFitToCoordinates(true);

          if (mapRef.current) {
            const allCoords = [...finalFirstLegPath, ...finalSecondLegPath];
            mapRef.current.fitToCoordinates(allCoords, {
              edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
              animated: true
            });
          }
        } else {
          console.error('Route fetching failed:', {
            firstLegStatus: routeData[0].status,
            firstLegError: routeData[0].error_message,
            secondLegStatus: routeData[1].status,
            secondLegError: routeData[1].error_message
          });

          setRouteLegsPolylines([
            [validRoutePoints.start, validRoutePoints.checkpoint],
            [validRoutePoints.checkpoint, validRoutePoints.end]
          ]);
        }
      }
    } catch (error) {
      console.error('Error in fetchRouteDirections:', error);

      // Create fallback route with available coordinates
      const startCoords = route.metadata.startLocation ? parseCoordinates(route.metadata.startLocation) : null;
      const checkpointCoords = route.metadata.checkpoint ? parseCoordinates(route.metadata.checkpoint) : null;
      const destCoords = route.metadata.destination ? parseCoordinates(route.metadata.destination) : null;
      const coordinates = [startCoords, checkpointCoords, destCoords].filter(Boolean);
      if (coordinates.length >= 2) {
        if (coordinates.length === 2) {
          setRouteLegsPolylines([[coordinates[0], coordinates[1]]]);
        } else {
          setRouteLegsPolylines([[coordinates[0], coordinates[1]], [coordinates[1], coordinates[2]]]);
        }
      }
    }
  };

  // Helper function to ensure path connects to markers
  const ensureConnection = (path, startCoord, endCoord) => {
    if (path.length === 0) return [startCoord, endCoord];

    const result = [...path];
    if (Math.abs(path[0].latitude - startCoord.latitude) > 0.0001 ||
        Math.abs(path[0].longitude - startCoord.longitude) > 0.0001) {
      result.unshift(startCoord);
    }
    if (Math.abs(path[path.length - 1].latitude - endCoord.latitude) > 0.0001 ||
        Math.abs(path[path.length - 1].longitude - endCoord.longitude) > 0.0001) {
      result.push(endCoord);
    }
    return result;
  };

  // Modify the handleRouteData function
  const handleRouteData = async (route: Route) => {
    if (!route?.metadata) return;

    console.log('Processing route metadata:', route.metadata);
    setCurrentRoute(route);

    const routePoints = determineValidRoutePoints(route);
    if (!routePoints) {
      console.error('No valid route points available');
      return;
    }

    fetchRouteDirections(route);

    // Set loading state
    setLocationNames({
      start: route.metadata.startLocation ? 'Fetching address...' : '',
      checkpoint: route.metadata.checkpoint ? 'Fetching address...' : '',
      destination: route.metadata.destination ? 'Fetching address...' : ''
    });

    try {
      let updatedLocationNames = {
        start: '',
        checkpoint: '',
        destination: ''
      };

      switch (routePoints.type) {
        case 'start_to_checkpoint':
          console.log('Fetching addresses for start to checkpoint route');
          if (route.metadata.startLocation && route.metadata.checkpoint) {
            const [startAddr, checkpointAddr] = await Promise.all([
              getAddressFromCoords(route.metadata.startLocation),
              getAddressFromCoords(route.metadata.checkpoint)
            ]);

            updatedLocationNames = {
              start: startAddr || 'Address not found',
              checkpoint: checkpointAddr || 'Address not found',
              destination: '' // Empty as destination not provided
            };
          }
          break;

        case 'checkpoint_to_destination':
          console.log('Fetching addresses for checkpoint to destination route');
          if (route.metadata.checkpoint && route.metadata.destination) {
            const [checkpointAddr, destAddr] = await Promise.all([
              getAddressFromCoords(route.metadata.checkpoint),
              getAddressFromCoords(route.metadata.destination)
            ]);

            updatedLocationNames = {
              start: '', // Empty as start not provided
              checkpoint: checkpointAddr || 'Address not found',
              destination: destAddr || 'Address not found'
            };
          }
          break;

        case 'start_to_destination':
          console.log('Fetching addresses for start to destination route');
          if (route.metadata.startLocation && route.metadata.destination) {
            const [startAddr, destAddr] = await Promise.all([
              getAddressFromCoords(route.metadata.startLocation),
              getAddressFromCoords(route.metadata.destination)
            ]);

            updatedLocationNames = {
              start: startAddr || 'Address not found',
              checkpoint: '', // Empty as checkpoint not provided
              destination: destAddr || 'Address not found'
            };
          }
          break;

        case 'full_route':
          console.log('Fetching addresses for full route');
          if (route.metadata.startLocation && route.metadata.checkpoint && route.metadata.destination) {
            const [startAddr, checkpointAddr, destAddr] = await Promise.all([
              getAddressFromCoords(route.metadata.startLocation),
              getAddressFromCoords(route.metadata.checkpoint),
              getAddressFromCoords(route.metadata.destination)
            ]);

            updatedLocationNames = {
              start: startAddr || 'Address not found',
              checkpoint: checkpointAddr || 'Address not found',
              destination: destAddr || 'Address not found'
            };
          }
          break;
      }

      console.log('Setting location names:', updatedLocationNames);
      setLocationNames(updatedLocationNames);

    } catch (error) {
      console.error('Error in handleRouteData:', error);
      setLocationNames({
        start: route.metadata.startLocation ? 'Error fetching address' : '',
        checkpoint: route.metadata.checkpoint ? 'Error fetching address' : '',
        destination: route.metadata.destination ? 'Error fetching address' : ''
      });
    }
  };

  // Add socket event listeners for route deviation
  const setupSocketListeners = () => {
    if (!socketRef.current) return;

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
        const newSocket = await initializeSocket();

        if (isMounted) {
          // Wait for socket to connect before starting location tracking
          await new Promise((resolve) => {
            const checkConnection = setInterval(() => {
              if (newSocket?.connected) {
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
        // FIX: null out after removal to prevent double-removal race
        locationSubscription.current = null;
      }

      if (socketRef.current) {
        console.log('Disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [cartId, driverId]);


  // ─── FIXED LOGOUT ──────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      // FIX: Mark logout in progress so location callbacks stop updating state
      isLoggingOut.current = true;

      // FIX: Stop location tracking FIRST — before any navigation
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      // FIX: Disconnect both socketRef and socket state
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

      const storedDriverId = await AsyncStorage.getItem('driverId');
      if (storedDriverId) {
        await apiService.logoutDriver(storedDriverId);
        await AsyncStorage.removeItem('driverId');
      }

      // Clear all route and location state
      setCurrentRoute(null);
      setRouteLegsPolylines([]);
      setCurrentLocation(null);
      setIsConnected(false);

      // FIX: router.replace (not push) + setTimeout to defer navigation
      // until after React finishes processing state updates and Root Layout
      // is fully mounted — this directly fixes "navigate before mount" error
      setTimeout(() => {
        router.replace('/');
      }, 150);

    } catch (error) {
      console.error('Logout error:', error);
      isLoggingOut.current = false;
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

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
              console.log("Route status complete", data);
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

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const startNavigation = () => {
    // FIX: null-safe coords check — original had no ?. guard
    if (!currentLocation?.coords || !currentRoute?.metadata) {
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
    // console.log('Directions result received:', JSON.stringify(result, null, 2));

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
    // FIX: null-safe coords check
    if (!navigationState.isActive || !currentLocation?.coords || !mapRef.current) return;

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

      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
          mayShowUserSettingsDialog: false
        },
        (location) => {
          // FIX: Guard against state updates after logout begins
          if (isLoggingOut.current) return;

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
  const toggleDeliveryDetails = () => {
    const toValue = showDeliveryDetails ? 0 : 1;
    setShowDeliveryDetails(!showDeliveryDetails);
    Animated.spring(detailsAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();
  };

  const ActionButtons = () => (
    <View style={styles.container}>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.showDetailsButton]}
          onPress={handleShipmentsPress}
        >
          <MaterialIcons name="notifications" size={28} color="white" />
          <Text style={styles.actionButtonText}>Your Shipments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.startNavButton]}
          onPress={startNavigation}
        >
          <MaterialIcons name="navigation" size={24} color="white" />
          <Text style={styles.actionButtonText}>Start Navigation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.showDetailsButton]}
          onPress={toggleDeliveryDetails}
        >
          <MaterialIcons name="info-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Show Delivery Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.startNavButton]}
          onPress={toggleChat}
        >
          <MaterialIcons name="chat" size={24} color="white" />
          <Text style={styles.actionButtonText}>
            {showChat ? 'Close Chat' : 'Open Chat'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showChat}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleChat}
      >
        <View style={styles.modalContainer}>
          <View style={styles.chatContainer}>
            <ChatComponent
              userId={driverId}
              cartId={cartId}
              role="driver"
              onClose={toggleChat}
            />
          </View>
        </View>
      </Modal>
    </View>
  );


  const getAddressFromCoords = async (coords) => {
    try {
      if (!coords) {
        console.log('No coordinates provided');
        return '';
      }

      let lat, lng;

      // Handle string coordinates (e.g., "22.364063, 88.432667")
      if (typeof coords === 'string') {
        [lat, lng] = coords.split(',').map(coord => parseFloat(coord.trim()));
      }
      // Handle object coordinates (e.g., {lat: 22.364063, lng: 88.432667})
      else if (typeof coords === 'object' && coords !== null) {
        if ('lat' in coords && 'lng' in coords) {
          lat = parseFloat(coords.lat);
          lng = parseFloat(coords.lng);
        } else if ('latitude' in coords && 'longitude' in coords) {
          lat = parseFloat(coords.latitude);
          lng = parseFloat(coords.longitude);
        }
      }

      // Validate coordinates
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates:', coords);
        return 'Invalid coordinates';
      }

      console.log(`Fetching address for: ${lat},${lng}`);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      console.log('Geocoding response:', data);

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        console.error('Geocoding failed:', data.status);
        return 'Address not found';
      }

    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Error fetching address';
    }
  };

  const DeliveryDetails = () => {
    const translateY = detailsAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0]
    });

    const getLocationItems = () => {
      if (!currentRoute?.metadata) return [];

      const { startLocation, checkpoint, destination } = currentRoute.metadata;

      // Case 1: Start location is empty
      if (!startLocation && checkpoint && destination) {
        return [
          { icon: "store", color: "#4A6CF7", title: "Start", address: locationNames.checkpoint },
          { icon: "location-on", color: "#F44336", title: "Destination", address: locationNames.destination }
        ];
      }

      // Case 2: Checkpoint is empty
      if (!checkpoint && startLocation && destination) {
        return [
          { icon: "trip-origin", color: "#4CAF50", title: "Start", address: locationNames.start },
          { icon: "location-on", color: "#F44336", title: "Destination", address: locationNames.destination }
        ];
      }

      // Case 3: Destination is empty
      if (!destination && startLocation && checkpoint) {
        return [
          { icon: "trip-origin", color: "#4CAF50", title: "Start", address: locationNames.start },
          { icon: "store", color: "#4A6CF7", title: "Destination", address: locationNames.checkpoint }
        ];
      }

      // Case 4: All locations present
      if (startLocation && checkpoint && destination) {
        return [
          { icon: "trip-origin", color: "#4CAF50", title: "Pickup", address: locationNames.start },
          { icon: "store", color: "#4A6CF7", title: "Checkpoint", address: locationNames.checkpoint },
          { icon: "location-on", color: "#F44336", title: "Destination", address: locationNames.destination }
        ];
      }

      return [];
    };

    return (
      <Animated.View style={[styles.deliveryDetailsContainer, { transform: [{ translateY }] }]}>
        {currentRoute?.metadata ? (
          <View style={styles.locationInfo}>
            <TouchableOpacity onPress={toggleDeliveryDetails}>
              <View style={styles.head}>
                <Text style={styles.Title}>Route Details</Text>
                <Text style={styles.cartId}>#{cartId}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.locationsList}>
              {getLocationItems().map((location, index, array) => (
                <View key={index} style={styles.locationItem}>
                  <View style={styles.locationIcon}>
                    <MaterialIcons name={location.icon} size={24} color={location.color} />
                    {index < array.length - 1 && <View style={styles.verticalLine} />}
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationTitle}>{location.title}</Text>
                    <Text style={styles.locationAddress}>{location.address || 'Loading address...'}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.completeButton, isCompletingTransaction && styles.completeButtonDisabled]}
              onPress={handleCompleteTransaction}
              disabled={isCompletingTransaction}
            >
              <View style={styles.buttonContent}>
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
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={toggleDeliveryDetails}>
            <View style={styles.noRouteContainer}>
              <View style={styles.noRouteIcon}>
                <MaterialIcons name="route" size={48} color="#3949AB" />
              </View>
              <Text style={styles.noRouteText}>No active routes</Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        // FIX: null-safe initialRegion — crashes when currentLocation is null after logout
        initialRegion={currentLocation?.coords ? {
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
        {/* FIX: null-safe — original did currentLocation && which doesn't guard .coords */}
        {currentLocation?.coords && (
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

        {/* FIX: null-safe deviation marker — original had no null guard on currentLocation */}
        {isDeviating && currentLocation?.coords && (
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

        {routeLegsPolylines.length > 0 && routeLegsPolylines.map((polyline, index) => (
          polyline && Array.isArray(polyline) && polyline.length >= 2 && (
            <Polyline
              key={index}
              coordinates={polyline}
              strokeWidth={Platform.select({
                ios: 3,
                android: 5
              })}
              strokeColor="#4A6CF7"
              zIndex={1}
            />
          )
        ))}

        {currentRoute?.metadata && (
          <>
            {/* Start Location Marker */}
            {currentRoute.metadata.startLocation && (
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
            )}

            {/* Checkpoint Marker */}
            {currentRoute.metadata.checkpoint && (
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
            )}

            {/* Destination Marker */}
            {currentRoute.metadata.destination && (
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
            )}
          </>
        )}

        {navigationState.isActive && currentRoute?.metadata && (
          <MapViewDirections
            // FIX: null-safe origin
            origin={currentLocation?.coords ? {
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


      {!navigationState.isActive && (
        <>
          <View style={styles.headerContainer}>
            <View style={styles.connectionStatus}>
              <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
              <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
          {!showDeliveryDetails && <ActionButtons />}
        </>
      )}

      {navigationState.isActive && (
        <NavigationOverlay
          navigationState={navigationState}
          exitNavigation={exitNavigation}
        />
      )}

      {showDeliveryDetails && <DeliveryDetails />}

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

  },
  locationTitle: {
    fontSize: 16, // Slightly larger for modern feel
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold', // Match platform styles
    color: '#1A237E', // Deep blue for a modern aesthetic
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5, // Subtle spacing for clean typography
    // Center-align for better balance
    // Optional: All caps for modern design
  },
  Title: {
    fontSize: 22, // Slightly larger for modern feel
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold', // Match platform styles
    color: 'white', // Deep blue for a modern aesthetic
    fontFamily: 'Poppins_700Bold',
    marginLeft: 16,
    letterSpacing: 0.5, // Subtle spacing for clean typography
    // Center-align for better balance
    // Optional: All caps for modern design
  },
  locationText: {
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '600',
    lineHeight: 22,
  },
  locationTextContainer: {
    flex: 1
  },
  markerContainer: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartId: {
    fontSize: 14,
    color: '#3949AB',
    fontWeight: '600',
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden'
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
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4A6CF7',
    padding: 14,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: 'column',
    gap: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  startNavButton: {
    backgroundColor: '#4A6CF7'
  },
  showDetailsButton: {
    backgroundColor: '#1E2A78'
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  shipmentsButton: {
    backgroundColor: '#4A6FA5', // Blue shade
  },
  navigationButton: {
    backgroundColor: '#47A025', // Green shade
  },
  detailsButton: {
    backgroundColor: '#9252A3', // Purple shade
  },
  chatButton: {
    backgroundColor: '#D95829', // Orange shade
  },
  deliveryDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    // padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20
  },
  // ... [add all the new styles for navigation overlay and other components]
  gradientOverlay: {
    borderRadius: 12,
    padding: 16
  },
  navigationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center'
  },
  infoCardTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8
  },
  infoCardValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500'
  },
  locationsList: {
    marginTop: 4,
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 18,
    gap: 10
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16
  },
  locationIcon: {
    alignItems: 'center'
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  verticalLine: {
    width: 2,
    height: 70,
    backgroundColor: '#E0E0E0',
    marginVertical: 4
  },
  locationDetails: {
    flex: 1,
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4
  },
  locationAddress: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: Platform.select({ ios: 18, android: 16 }),
    marginTop: 22,
    marginLeft: 32,
    marginRight: 32,
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1 }]
  },
  completeButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  completeButtonDisabled: {
    backgroundColor: '#A5D6A7',
    shadowOpacity: 0
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: 0.5
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  noRouteContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 16
  },
  noRouteIcon: {
    backgroundColor: '#EEF2FF',
    padding: 24,
    borderRadius: 28,
    shadowColor: '#3949AB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  noRouteText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    width: width * 0.9,
    height: height * 0.8,
    // backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});

export default TrackingScreen;