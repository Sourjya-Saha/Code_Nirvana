import React from 'react';
import { View, Text, StyleSheet, Linking, Button } from 'react-native';

export default function Shproute({ route }) {
  const { locations } = route.params || [];

  const generateGoogleMapsUrl = (locations) => {
    if (locations.length === 0) return '';

    // Construct the base URL for Google Maps directions
    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    
    // Start with the origin (first location)
    const origin = `${locations[0].user_lat},${locations[0].user_long}`;

    // Destination (last location)
    const destination = `${locations[locations.length - 1].user_lat},${locations[locations.length - 1].user_long}`;

    // Waypoints (locations in between)
    const waypoints = locations
      .slice(1, locations.length - 1) // Skip origin and destination
      .map(location => `${location.user_lat},${location.user_long}`)
      .join('|');

    // Complete URL with origin, destination, and waypoints
    return `${baseUrl}&origin=${origin}&destination=${destination}${waypoints ? '&waypoints=' + waypoints : ''}`;
  };

  const handleOpenGoogleMaps = () => {
    const url = generateGoogleMapsUrl(locations);
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Error opening URL:", err));
    } else {
      console.error("No locations available to show the route");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shproute</Text>
      <Button title="View Route in Google Maps" onPress={handleOpenGoogleMaps} />
      {locations && locations.length > 0 && (
        <View style={styles.locationsContainer}>
          <Text style={styles.sectionTitle}>Route Details</Text>
          {locations.map((location, index) => (
            <View key={index} style={styles.card}>
              <Text>{location.user_type.toUpperCase()}</Text>
              <Text>Latitude: {location.user_lat}°N</Text>
              <Text>Longitude: {location.user_long}°E</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  locationsContainer: { width: '100%' },
  card: { padding: 10, margin: 5, backgroundColor: '#fff', borderRadius: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginVertical: 10 },
});
