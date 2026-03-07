import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function SideCON({ navigation, uniqueid, toggleMenu }) {
  return (
    <View style={styles.menuContainer}>
      <StatusBar style="dark" />
      
      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={() => {
          navigation.navigate('Neareststore', { uniqueid });
          toggleMenu();
        }}
      >
        <Text style={styles.menuText}>Shop from Nearest Store</Text>
        <Ionicons name="chevron-forward" size={24} color="#0a47f0" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={() => {
          navigation.navigate('CONorders', { uniqueid });
          toggleMenu();
        }}
      >
        <Text style={styles.menuText}>My Orders</Text>
        <Ionicons name="chevron-forward" size={24} color="#0a47f0" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={() => {
          navigation.navigate('Authentic', { uniqueid });
          toggleMenu();
        }}
      >
        <Text style={styles.menuText}>Verify Product Authenticity</Text>
        <Ionicons name="chevron-forward" size={24} color="#0a47f0" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={() => {
          navigation.navigate('LandingPage');
          toggleMenu();
        }}
      >
        <Text style={styles.menuText}>Log Out</Text>
        <Ionicons name="chevron-forward" size={24} color="#0a47f0" />
      </TouchableOpacity>

     
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: '#ffffff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuText: {
    color: '#0a47f0',
    fontSize: 18,
    fontWeight: 'bold',
  },
});