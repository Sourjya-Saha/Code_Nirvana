// LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SocketProvider, useSocket } from '@/app/(tabs)/SocketContext';
import { MaterialIcons } from '@expo/vector-icons';
import { apiService } from '@/app/(tabs)/apiservices';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreenContent: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      if (!username || !password) {
        Alert.alert('Error', 'Please enter both username and password');
        return;
      }
  
      const response = await apiService.loginDriver(username, password);
      console.log('Login response:', response);
  
      if (!response || !response.unique_user_id) {
        throw new Error('Invalid response from server');
      }
  
      // Store the driver ID
      await AsyncStorage.setItem('driverId', response.unique_user_id.toString());
      
      // Navigate to notifications screen after successful login
      router.push('/notifications');
      
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Error', 
        error.message || 'Failed to login. Please check your credentials and try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="local-shipping" size={48} color="#3182CE" />
        <Text style={styles.headerText}>Driver Login</Text>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const LoginScreen: React.FC = () => {
  return (
    <SocketProvider>
      <LoginScreenContent />
    </SocketProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 10,
  },
  input: {
    height: 40,
    borderColor: '#CBD5E0',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationText: {
    fontSize: 16,
    color: '#2D3748',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  notificationContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginTop: 10,
    width: '100%',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2D3748',
    display: 'flex', // Enable flexbox
    justifyContent: 'center', // Align content horizontally
    alignItems: 'center', // Align content vertically
    textAlign: 'center', // Ensure text is centered inside the element
  },
  
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  notificationTextDetail: {
    fontSize: 14,
    color: '#4A5568',
    marginLeft: 10,
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
    color: '#2D3748',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#3182CE',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;