import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocketProvider } from '@/app/(tabs)/SocketContext';



export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkLoginStatus = async () => {
      try {
        const driverId = await AsyncStorage.getItem('driverId');
        
        // Wait a moment to allow the app to initialize
        setTimeout(() => {
          if (driverId) {
            // User is logged in, go to route tracking
            router.replace(`/routeTracking?driverId=${driverId}`);
          } else {
            // User needs to log in, first show splash screen
            router.replace('/splash');
          }
        }, 100);
      } catch (error) {
        console.error('Error checking login status:', error);
        router.replace('/splash');
      }
    };

    checkLoginStatus();
  }, []);

  // Return null as this is just a router component
  return null;
}