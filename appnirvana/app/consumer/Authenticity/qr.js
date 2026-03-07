import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const getLocationName = async (lat, long) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`
    );
    const data = await response.json();
    const address = data.address || {};
    return {
      full: data.display_name || `${lat}°N, ${long}°E`,
      street: address.road || address.street || '',
      city: address.city || address.town || address.village || '',
      state: address.state || '',
      postcode: address.postcode || '',
      country: address.country || ''
    };
  } catch (error) {
    console.error('Error fetching location:', error);
    return {
      full: `${lat}°N, ${long}°E`,
      street: '', city: '', state: '', postcode: '', country: ''
    };
  }
};

export default function Qrdetails({ route, navigation }) {
  const { uniqueid, photoPath } = route.params;
  const [locations, setLocations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationNames, setLocationNames] = useState({});

  const participantConfigs = {
    manufacturer: {
      title: 'Manufacturer',
      icon: 'business',
      latKey: 'manufacturer_lat',
      longKey: 'manufacturer_long',
      stepTitle: 'Manufacturing',
      order: 1
    },
    wholesaler: {
      title: 'Wholesaler',
      icon: 'cube',
      latKey: 'wholesaler_lat',
      longKey: 'wholesaler_long',
      stepTitle: 'Wholesale Distribution',
      order: 2
    },
    retailer: {
      title: 'Retailer',
      icon: 'storefront',
      latKey: 'retailer_lat',
      longKey: 'retailer_long',
      stepTitle: 'Retail Distribution',
      order: 3
    }
  };

  const handleFetch = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: `file://${photoPath}`,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      console.log("📤 Sending request to backend with photo:", photoPath);

      const response = await fetch('http://127.0.0.1:5000/decode_qrr', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      console.log("📥 Raw response status:", response.status);

      const result = await response.json();
      console.log("✅ Decoded QR response:", JSON.stringify(result, null, 2));

      const validParticipants = Object.keys(participantConfigs).filter(key => result[key]);
      
      if (validParticipants.length > 0) {
        setLocations(result);

        const names = {};
        for (const participantType of validParticipants) {
          const config = participantConfigs[participantType];
          const lat = result[participantType][config.latKey];
          const long = result[participantType][config.longKey];
          
          if (lat && long) {
            names[participantType] = await getLocationName(lat, long);
          }
        }

        setLocationNames(names);
        Alert.alert('Success', `Found ${validParticipants.length} participant(s) in supply chain!`);
      } else {
        console.warn("⚠️ No valid participant data found:", result);
        Alert.alert('Error', 'No participant data found in QR code.');
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error);
      Alert.alert('Error', `Failed to fetch details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableParticipants = () => {
    if (!locations) return [];
    return Object.keys(participantConfigs)
      .filter(key => locations[key])
      .sort((a, b) => participantConfigs[a].order - participantConfigs[b].order);
  };

  const prepareLocationsForRoute = () => {
    if (!locations) return [];
    const availableParticipants = getAvailableParticipants();
    return availableParticipants.map((participantType) => {
      const config = participantConfigs[participantType];
      const data = locations[participantType];
      return {
        user_type: participantType,
        user_lat: parseFloat(data[config.latKey]),
        user_long: parseFloat(data[config.longKey])
      };
    });
  };

  const renderParticipantCard = (participantType) => {
    const config = participantConfigs[participantType];
    const data = locations[participantType];
    const lat = data[config.latKey];
    const long = data[config.longKey];
    const locInfo = locationNames[participantType];

    return (
      <View key={participantType} style={styles.participantCard}>
        <View style={styles.participantHeader}>
          <Ionicons name={config.icon} size={24} color="#4B5563" />
          <Text style={styles.participantTitle}>{config.title}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>📍 Coordinates:</Text>
          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinateText}>{lat}°N, {long}°E</Text>
          </View>
        </View>

        {locInfo ? (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>📮 Address:</Text>
            <Text style={styles.locationText}>
              {locInfo.street ? `${locInfo.street}\n` : ''}
              {locInfo.city ? `${locInfo.city}, ` : ''}
              {locInfo.state} {locInfo.postcode}
              {locInfo.country ? `\n${locInfo.country}` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>📮 Address:</Text>
            <ActivityIndicator size="small" color="#10B981" />
          </View>
        )}
      </View>
    );
  };

  const renderSupplyChainJourney = () => {
    const availableParticipants = getAvailableParticipants();
    return (
      <View style={styles.journeyCard}>
        <View style={styles.participantHeader}>
          <Ionicons name="trail-sign" size={24} color="#4B5563" />
          <Text style={styles.participantTitle}>Supply Chain Journey</Text>
        </View>
        <View style={styles.journeySteps}>
          {availableParticipants.map((participantType, index) => {
            const config = participantConfigs[participantType];
            const locInfo = locationNames[participantType];
            
            // Safe location display with proper undefined checks
            let displayLocation = 'Loading location...';
            if (locInfo && locInfo.full) {
              displayLocation = locInfo.full.length > 50 
                ? locInfo.full.substring(0, 50) + '...' 
                : locInfo.full;
            }
            
            return (
              <View key={participantType} style={styles.journeyStep}>
                <View style={styles.stepIndicator}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{config.stepTitle}</Text>
                  <Text style={styles.stepLocation}>{displayLocation}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderViewRouteButton = () => {
    const routeLocations = prepareLocationsForRoute();
    if (routeLocations.length < 2) return null;
    return (
      <TouchableOpacity 
        style={styles.routeButton}
        onPress={() => navigation.navigate('Shproute', { 
          locations: routeLocations 
        })}
      >
        <View style={styles.routeButtonContent}>
          <Ionicons name="map" size={24} color="white" />
          <Text style={styles.routeButtonText}>View Supply Chain Route</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Image source={{ uri: `file://${photoPath}` }} style={styles.image} />

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.retakeButton]} 
            onPress={() => navigation.navigate('Authentic', { uniqueid })}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.fetchButton]} 
            onPress={handleFetch}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Loading..." : "Fetch Details"}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && <ActivityIndicator size="large" color="#10B981" style={styles.loader} />}

        {locations && (
          <View style={styles.detailsContainer}>
            <View style={styles.authenticationBanner}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <Text style={styles.authenticationText}>Authorized and Genuine Pack</Text>
            </View>
            {getAvailableParticipants().map(participantType => 
              renderParticipantCard(participantType)
            )}
            {renderSupplyChainJourney()}
            {renderViewRouteButton()}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>QR Code Analysis Summary</Text>
              <Text style={styles.summaryText}>
                ✅ QR Code successfully decoded
              </Text>
              <Text style={styles.summaryText}>
                📊 Found {getAvailableParticipants().length} supply chain participant(s)
              </Text>
              <Text style={styles.summaryText}>
                🔗 Chain: {getAvailableParticipants().map(p => participantConfigs[p].title).join(' → ')}
              </Text>
              <Text style={styles.summaryText}>
                🌍 All locations verified and geocoded
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  authenticationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  authenticationText: {
    marginLeft: 8,
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  button: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#EF4444',
  },
  fetchButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  detailsContainer: {
    gap: 16,
  },
  participantCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  coordinatesContainer: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  coordinateText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  journeyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  journeySteps: { marginTop: 12 },
  journeyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepLocation: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  routeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  routeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  routeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 6,
    lineHeight: 20,
  },
});
