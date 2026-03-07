

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const getLocationName = async (lat, long) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`
    );
    const data = await response.json();
    return data.display_name;
  } catch (error) {
    console.error('Error fetching location:', error);
    return `${lat}°N, ${long}°E`;
  }
};

export default function Qrdetails({ route, navigation }) {
  const { uniqueid, photoPath } = route.params;
  const [locations, setLocations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRetailer, setExpandedRetailer] = useState(null);
  const [locationNames, setLocationNames] = useState({});

  const handleFetch = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: `file://${photoPath}`,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      const response = await fetch('http://172.20.10.6:5000/decode_qrr', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const [result] = await response.json();
      setLocations(result.data);
      
      // Fetch location names
      const manufacturer = result.data.participants.manufacturer;
      const wholesaler = result.data.participants.wholesaler;
      const retailers = result.data.participants.retailers;
      
      const names = {};
      names.manufacturer = await getLocationName(manufacturer.user_lat, manufacturer.user_long);
      names.wholesaler = await getLocationName(wholesaler.user_lat, wholesaler.user_long);
      
      for (const retailer of retailers) {
        names[retailer.user_id] = await getLocationName(retailer.user_lat, retailer.user_long);
      }
      
      setLocationNames(names);
      Alert.alert('Success', 'Details fetched successfully!');
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', `Failed to fetch details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const ProductCard = ({ product }) => (
    <View style={styles.productCard}>
      <Text style={styles.productName}>{product.name}</Text>
      <View style={styles.productDetails}>
        <Text style={styles.productInfo}>Category: {product.category}</Text>

        <Text style={styles.productInfo}>Quantity: {product.quantity}</Text>
        <Text style={styles.productInfo}>Expiry: {new Date(product.exp_date).toLocaleDateString()}</Text>
      
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        {/* <View style={styles.authenticationBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <Text style={styles.authenticationText}>Authorized and Genuine Pack</Text>
        </View> */}

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

        {isLoading && (
          <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
        )}

        {locations && (
          
          <View style={styles.detailsContainer}>
                    <View style={styles.authenticationBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <Text style={styles.authenticationText}>Authorized and Genuine Pack</Text>
        </View>
            {/* Manufacturer Card */}
            <View style={styles.participantCard}>
              <View style={styles.participantHeader}>
                <Ionicons name="business" size={24} color="#4B5563" />
                <Text style={styles.participantTitle}>Manufacturer</Text>
              </View>
              <Text style={styles.participantName}>{locations.participants.manufacturer.user_id}</Text>
              <Text style={styles.locationText}>{locationNames.manufacturer}</Text>
            </View>

            {/* Wholesaler Card */}
            <View style={styles.participantCard}>
              <View style={styles.participantHeader}>
                <Ionicons name="cube" size={24} color="#4B5563" />
                <Text style={styles.participantTitle}>Wholesaler</Text>
              </View>
              <Text style={styles.participantName}>{locations.participants.wholesaler.user_id}</Text>
              <Text style={styles.locationText}>{locationNames.wholesaler}</Text>
            </View>

            {/* Retailers Section */}
            <Text style={styles.sectionTitle}>Authorized Retailers</Text>
            {locations.participants.retailers.map((retailer, index) => (
              <TouchableOpacity
                key={index}
                style={styles.retailerCard}
                onPress={() => setExpandedRetailer(
                  expandedRetailer === retailer.user_id ? null : retailer.user_id
                )}
              >
                <View style={styles.participantHeader}>
                  <Ionicons name="people" size={24} color="#4B5563" />
                  <Text style={styles.participantTitle}>{retailer.user_id}</Text>
                  <Ionicons 
                    name={expandedRetailer === retailer.user_id ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#4B5563" 
                    style={styles.expandIcon}
                  />
                </View>
                <Text style={styles.locationText}>{locationNames[retailer.user_id]}</Text>
                
                {expandedRetailer === retailer.user_id && locations.cart_products[retailer.user_id] && (
                  <View style={styles.productsContainer}>
                    <Text style={styles.productsTitle}>Shipped Products</Text>
                    {Object.values(locations.cart_products[retailer.user_id]).map((item, idx) => (
                      <ProductCard key={idx} product={item.product_details} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
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
    marginBottom: 8,
  },
  participantTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  participantName: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 16,
  },
  retailerCard: {
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
  expandIcon: {
    marginLeft: 'auto',
  },
  productsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  productDetails: {
    gap: 4,
  },
  productInfo: {
    fontSize: 14,
    color: '#4B5563',
  },
});