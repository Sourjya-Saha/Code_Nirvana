import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import io from 'socket.io-client';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '@/app/(tabs)/apiservices';

interface Notification {
  cart_id: string;
  driver_id: string;
}

const DriverNotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      if (!driverId) {
        Alert.alert('Error', 'Please login again');
        router.push('/login');
        return;
      }

      const response = await axios.post('http://172.20.10.5:5000/fetch_notifications', {
        driver_id: driverId
      });

      if (response.data.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to fetch notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);
  const initializeSocket = async (cartId: string, driverId: string) => {
    try {
      // Connect with a unique identifier
      const uniqueId = `${driverId}-${cartId}-${Date.now()}`;
      const socket = io('http://172.20.10.5:8000', {
        query: {
          user_id: driverId,
          cart_id: cartId,
          role: 'driver',
          connection_id: uniqueId
        },
        transports: ['websocket'],
        reconnection: false, // Disable auto-reconnection
        forceNew: true // Force a new connection
      });
  
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.close();
          reject(new Error('Connection timeout'));
        }, 5000);
  
        socket.on('connect', () => {
          clearTimeout(timeout);
          socket.once('disconnect', () => {
            socket.close();
          });
          resolve(socket);
        });
  
        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          socket.close();
          reject(error);
        });
      });
    } catch (error) {
      throw new Error('Failed to initialize socket');
    }
  };
  
  const handleStartTracking = async (cartId: string) => {
    try {
      setLoading(true);
      const driverId = await AsyncStorage.getItem('driverId');
      if (!driverId) {
        Alert.alert('Error', 'Please login again');
        router.push('/login');
        return;
      }
  
      // Verify access
      try {
        const response = await axios.post('http://172.20.10.5:8000/api/shipment/verify-access', {
          cart_id: cartId,
          user_id: driverId,
          role: 'driver'
        });
  
        if (!response.data.authorized) {
          Alert.alert('Error', 'Not authorized to track this shipment');
          return;
        }
      } catch (error) {
        console.error('Server verification error:', error);
        Alert.alert('Connection Error', 'Unable to verify access');
        return;
      }
  
      // Initialize socket and verify connection
      try {
        const socket = await initializeSocket(cartId, driverId);
        if (socket.connected) {
          // Store socket ID for cleanup
          await AsyncStorage.setItem('activeSocketId', socket.id);
          
          // Navigate to tracking screen
          router.push({
            pathname: '/routeTracking',
            params: { 
              cartId, 
              driverId,
              socketId: socket.id
            }
          });
        } else {
          throw new Error('Socket failed to connect');
        }
      } catch (error) {
        console.error('Socket connection error:', error);
        Alert.alert('Connection Error', 'Failed to establish connection');
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      if (driverId) {
        await apiService.logoutDriver(driverId);
        await AsyncStorage.removeItem('driverId');
      }
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={styles.notificationCard}>
      <View style={styles.notificationContent}>
        <MaterialIcons name="local-shipping" size={24} color="#4A6CF7" />
        <View style={styles.textContainer}>
          <Text style={styles.cartIdText}>Cart ID: {item.cart_id}</Text>
          <Text style={styles.subText}>New delivery assignment</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => handleStartTracking(item.cart_id)}
      >
        <Text style={styles.buttonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Your Deliveries</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.cart_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={48} color="#999" />
            <Text style={styles.emptyText}>No deliveries assigned yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FF',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 48,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E2A78',
  },
  logoutButton: {
    padding: 8,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cartIdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E2A78',
  },
  subText: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#4A6CF7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default DriverNotificationsScreen;