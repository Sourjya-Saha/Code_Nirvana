import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function NearestStore({ route, navigation }) {
  const { uniqueid } = route.params;
  const [Stores, setStores] = useState([]);
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: '5km', value: '5' },
    { label: '10km', value: '10' },
    { label: '15km', value: '15' },
  ]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const sendLocation = async () => {
    const data = {
      radius: value,
      lat: location.latitude,
      lon: location.longitude,
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/get_retailers_within_radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.status === 200) {
        const storesArray = Object.keys(result).map((key) => ({
          name: key,
          ...result[key],
        }));
        setStores(storesArray);
      } else {
        Alert.alert('Error', result.error || 'Failed to fetch stores.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  };

  const fetchLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    const location = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  };

  const fetchMockLocation = () => {
    setLocation({
      latitude: 22.503415,
      longitude: 88.3497173,
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Nearest Store</Text>
      </Animated.View>

      <DropDownPicker
        open={open}
        value={value}
        items={items}
        onChangeValue={(val) => {
          setValue(val);
          sendLocation();
        }}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        placeholder="Select Distance"
        style={styles.dropdown}
        dropDownContainerStyle={styles.dropdownContainer}
        placeholderStyle={{ color: '#0a47f0' }}
        labelStyle={{ color: '#0a47f0' }}
        tickIconStyle={{ display: 'none' }}
      />

      <View style={styles.locationContainer}>
        <Ionicons name="location-sharp" size={24} color="#0a47f0" />
        <Text style={styles.locationText}>
          Latitude: {location.latitude}, Longitude: {location.longitude}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={fetchLocation}>
        <Text style={styles.buttonText}>Fetch Location</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.storeList}>
        {Stores.length === 0 ? (
          <Text style={styles.noStores}>No Nearby Stores</Text>
        ) : (
          Stores.map((store, index) => (
            <TouchableOpacity
              key={index}
              style={styles.storeItem}
              onPress={() =>
                navigation.navigate('Store', {
                  uniqueid,
                  storename: store.name,
                  storeid: store.generated_unique_id,
                })
              }
            >
              <Text style={styles.storeName}>{store.name}</Text>
              <View style={styles.storeDetailsContainer}>
                <Ionicons name="location-outline" size={18} color="#495057" />
                <Text style={styles.storeDetails}>Distance: {store.distance_km} km</Text>
              </View>
              {/* <View style={styles.storeDetailsContainer}>
                <Ionicons name="id-card-outline" size={18} color="#495057" />
                <Text style={styles.storeDetails}>ID: {store.generated_unique_id}</Text>
              </View> */}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  dropdown: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  locationText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noStores: {
    marginTop: 20,
    color: '#777',
    fontSize: 16,
    textAlign: 'center',
  },
  storeList: {
    marginTop: 20,
    width: '100%',
  },
  storeItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  storeDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  storeDetails: {
    fontSize: 14,
    color: '#777',
    marginLeft: 5,
  },
});