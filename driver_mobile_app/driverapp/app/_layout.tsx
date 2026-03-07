import { Stack } from 'expo-router';
import { Tabs } from 'expo-router';
import React from 'react';
import { SocketProvider } from '@/app/(tabs)/SocketContext';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  return (
    <SocketProvider>
      {/* Define the root stack navigator */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Non-authenticated screens */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="splash" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="testmap" options={{ animation: 'fade' }} />
        {/* Authenticated screens */}
        <Stack.Screen name="routeTracking" options={{ animation: 'fade' }} />
        
        {/* Tab screens group */}
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </SocketProvider>
  );
}

// Then define your tab layout in a separate file: app/(tabs)/_layout.tsx
export function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          display: 'none', // This will hide the tab bar completely
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}