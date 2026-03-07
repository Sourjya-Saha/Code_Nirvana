// DriverNotificationsScreen.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Notification {
  cart_id: string;
  driver_id: string;
}

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <View style={styles.loadingContent}>
      <ActivityIndicator size="large" color="#4A6CF7" />
      <Text style={styles.loadingText}>Loading notifications...</Text>
    </View>
  </View>
);

const DriverNotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      if (!driverId) {
        setNotifications([]);
        Alert.alert('Error', 'Please login again');
        router.push('/login');
        return;
      }

      const response = await axios.post('http://172.20.10.5:5000/fetch_notifications', {
        driver_id: driverId
      });

      if (response.data.notifications) {
        setNotifications(response.data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (!refreshing) {
        Alert.alert('Error', 'Failed to fetch notifications');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true); // Show loading screen when screen is focused
      fetchNotifications();
      const pollingInterval = setInterval(fetchNotifications, 30000);
      
      return () => {
        clearInterval(pollingInterval);
      };
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleStartTracking = async (cartId: string) => {
    try {
      const driverId = await AsyncStorage.getItem('driverId');
      if (!driverId) {
        Alert.alert('Error', 'Please login again');
        router.push('/login');
        return;
      }

      router.push({
        pathname: '/routeTracking',
        params: { cartId, driverId }
      });
    } catch (error) {
      console.error('Error starting tracking:', error);
      Alert.alert('Error', 'Failed to start tracking');
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Deliveries</Text>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.cart_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E2A78',
    marginBottom: 16,
    marginTop: 48,
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