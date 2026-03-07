import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';

const INITIAL_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const BasicGoogleMap: React.FC = () => {
  const [mapStatus, setMapStatus] = useState('Initializing...');
  const [provider, setProvider] = useState(PROVIDER_DEFAULT);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // Try to determine the best provider
    if (Platform.OS === 'android') {
      setProvider(PROVIDER_GOOGLE);
      setMapStatus('Using Google provider on Android');
    } else {
      setProvider(PROVIDER_DEFAULT);
      setMapStatus('Using default provider on iOS');
    }
  }, []);

  const handleMapReady = () => {
    setMapStatus('✅ Map is ready and loaded');
    console.log('Map is ready');
  };

  const handleError = (error: any) => {
    console.log('Full error object:', error);
    const errorMessage = error?.nativeEvent?.error || error?.message || JSON.stringify(error);
    setMapStatus(`❌ Error: ${errorMessage}`);
    console.error('Map error details:', {
      error,
      nativeEvent: error?.nativeEvent,
      message: error?.message
    });
  };

  const handleRegionChange = (region: any) => {
    console.log('Region changed:', region);
  };

  const handlePress = (event: any) => {
    console.log('Map pressed:', event.nativeEvent.coordinate);
    setMapStatus('Map interaction detected');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#e0e0e0' }}>
      {/* Header info */}
      <View style={{
        backgroundColor: '#333',
        padding: 10,
        paddingTop: 40,
      }}>
        <Text style={{ color: 'white', fontSize: 12 }}>
          Platform: {Platform.OS} | Provider: {provider === PROVIDER_GOOGLE ? 'Google' : 'Default'}
        </Text>
        <Text style={{ color: 'white', fontSize: 12 }}>
          react-native-maps: 1.18.0
        </Text>
      </View>

      {/* Map */}
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          provider={provider}
          style={{ 
            flex: 1,
            backgroundColor: '#ff0000' // Red background to see if map container is rendering
          }}
          initialRegion={INITIAL_REGION}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          showsTraffic={false}
          showsIndoors={true}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
          onMapReady={handleMapReady}
          onError={handleError}
          onRegionChangeComplete={handleRegionChange}
          onPress={handlePress}
          onMapLoaded={() => {
            setMapStatus('✅ Map tiles loaded');
            console.log('Map loaded completely');
          }}
        >
          <Marker
            coordinate={{
              latitude: INITIAL_REGION.latitude,
              longitude: INITIAL_REGION.longitude,
            }}
            title="San Francisco"
            description="Test marker location"
            pinColor="red"
          />
        </MapView>
      </View>

      {/* Status overlay */}
      <View style={{
        position: 'absolute',
        bottom: 50,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.9)',
        padding: 15,
        borderRadius: 10,
      }}>
        <Text style={{ 
          color: 'white', 
          fontSize: 12,
          textAlign: 'center'
        }}>
          Status: {mapStatus}
        </Text>
        <Text style={{ 
          color: '#ccc', 
          fontSize: 10,
          textAlign: 'center',
          marginTop: 5
        }}>
          Check console for detailed logs
        </Text>
      </View>
    </View>
  );
};

export default BasicGoogleMap;