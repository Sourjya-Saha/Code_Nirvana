import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Manual Location Input Component
const ManualLocationInput = ({ socket, cartId }) => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const simulateLocationUpdate = () => {
    if (!socket) {
      Alert.alert('Error', 'No active socket connection');
      return;
    }

    const locationUpdate = {
      cart_id: cartId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date().toISOString()
    };

    console.log('Sending manual location update:', locationUpdate);
    socket.emit('driver-location-update', locationUpdate);
    Alert.alert('Location Update', `Location updated to: ${latitude}, ${longitude}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Manual Location Input</Text>
      <TextInput
        style={styles.input}
        placeholder="Latitude"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Longitude"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numeric"
      />
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#4A6CF7' }]}
        onPress={simulateLocationUpdate}
      >
        <Text style={styles.buttonText}>Update Location</Text>
      </TouchableOpacity>
    </View>
  );
};

// Deviation Testing Component
const DeviationScenarios = ({ socket, cartId, currentRoute }) => {
  const [activeDeviation, setActiveDeviation] = useState(null);

  const generateDeviationScenario = (type) => {
    if (!currentRoute?.waypoints?.length) {
      Alert.alert('Error', 'No valid route found');
      return;
    }

    const startPoint = currentRoute.waypoints[0];
    let deviatedLocation;
    const currentTime = new Date().toISOString();

    if (type === 'return' && !activeDeviation) {
      Alert.alert('Error', 'No active deviation to return from');
      return;
    }

    switch (type) {
      case 'slight':
        // About 200m deviation
        deviatedLocation = {
          latitude: startPoint.lat + 0.002,
          longitude: startPoint.lng + 0.002
        };
        setActiveDeviation({
          start_location: {
            lat: deviatedLocation.latitude,
            lng: deviatedLocation.longitude
          },
          start_time: currentTime
        });
        break;

      case 'moderate':
        // About 500m deviation
        deviatedLocation = {
          latitude: startPoint.lat + 0.005,
          longitude: startPoint.lng + 0.005
        };
        setActiveDeviation({
          start_location: {
            lat: deviatedLocation.latitude,
            lng: deviatedLocation.longitude
          },
          start_time: currentTime
        });
        break;

      case 'extreme':
        // About 1km deviation
        deviatedLocation = {
          latitude: startPoint.lat + 0.01,
          longitude: startPoint.lng + 0.01
        };
        setActiveDeviation({
          start_location: {
            lat: deviatedLocation.latitude,
            lng: deviatedLocation.longitude
          },
          start_time: currentTime
        });
        break;

      case 'return':
        // Return to original route point
        deviatedLocation = {
          latitude: startPoint.lat,
          longitude: startPoint.lng
        };
        
        // Create end deviation data
        const endDeviationData = {
          cart_id: cartId,
          start_location: activeDeviation.start_location,
          end_location: {
            lat: deviatedLocation.latitude,
            lng: deviatedLocation.longitude
          },
          start_time: activeDeviation.start_time,
          end_time: currentTime,
          message: "Driver returned to route"
        };

        // Send location update with deviation data
        console.log('Sending return to route update:', {
          location: deviatedLocation,
          deviation: endDeviationData
        });

        socket.emit('driver-location-update', {
          cart_id: cartId,
          latitude: deviatedLocation.latitude,
          longitude: deviatedLocation.longitude,
          timestamp: currentTime,
          deviation_data: endDeviationData
        });

        // Clear active deviation
        setActiveDeviation(null);
        Alert.alert('Route Update', 'Returned to original route');
        return;
    }

    // Send location update for deviation
    const locationUpdate = {
      cart_id: cartId,
      latitude: deviatedLocation.latitude,
      longitude: deviatedLocation.longitude,
      timestamp: currentTime
    };

    console.log('Sending deviation location update:', locationUpdate);
    socket.emit('driver-location-update', locationUpdate);

    const actionType = type.charAt(0).toUpperCase() + type.slice(1);
    Alert.alert('Deviation Update', `${actionType} deviation simulated`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Route Deviation Testing</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#4CAF50' }]}
          onPress={() => generateDeviationScenario('slight')}
          disabled={!!activeDeviation}
        >
          <Text style={styles.buttonText}>Slight Deviation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#FFC107' }]}
          onPress={() => generateDeviationScenario('moderate')}
          disabled={!!activeDeviation}
        >
          <Text style={styles.buttonText}>Moderate Deviation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#F44336' }]}
          onPress={() => generateDeviationScenario('extreme')}
          disabled={!!activeDeviation}
        >
          <Text style={styles.buttonText}>Extreme Deviation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { 
            backgroundColor: activeDeviation ? '#2196F3' : '#CCCCCC' 
          }]}
          onPress={() => generateDeviationScenario('return')}
          disabled={!activeDeviation}
        >
          <Text style={styles.buttonText}>Return to Route</Text>
        </TouchableOpacity>
      </View>

      {activeDeviation && (
        <View style={styles.activeDeviationContainer}>
          <Text style={styles.activeDeviationTitle}>Active Deviation</Text>
          <Text style={styles.activeDeviationText}>
            Started: {new Date(activeDeviation.start_time).toLocaleString()}
          </Text>
          <Text style={styles.activeDeviationText}>
            From: {JSON.stringify(activeDeviation.start_location)}
          </Text>
        </View>
      )}
    </View>
  );
};

// Main Panel Component
const RouteDeviationTestingPanel = ({ socket, cartId, currentRoute }) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [deviations, setDeviations] = useState([]);
  const [activeDeviation, setActiveDeviation] = useState(null);

  useEffect(() => {
    if (socket) {
      socket.on('route-deviation', (data) => {
        console.log('Received route deviation event:', data);
        
        if (data.type === 'start') {
          // Store the start of deviation
          const newDeviation = {
            cart_id: data.cart_id,
            start_location: data.location,
            start_time: new Date().toISOString(),
            distance: data.distance,
            message: data.message
          };
          setActiveDeviation(newDeviation);
        } 
        else if (data.type === 'end') {
          // Complete the deviation record
          if (activeDeviation) {
            const completedDeviation = {
              cart_id: data.cart_id,
              start_location: activeDeviation.start_location,
              end_location: data.location,
              start_time: activeDeviation.start_time,
              end_time: new Date().toISOString(),
              distance: activeDeviation.distance,
              message: "Driver returned to route",
              type: 'completed_deviation'
            };
            setDeviations(prev => [...prev, completedDeviation]);
            setActiveDeviation(null);
          }
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('route-deviation');
      }
    };
  }, [socket, activeDeviation]);

  const renderDeviationCard = (deviation, index) => (
    <View key={index} style={[
      styles.deviationHistoryItem,
      styles.routeReturnItem
    ]}>
      <Text style={styles.deviationTitle}>Route Deviation Record</Text>
      <Text style={styles.deviationTime}>
        Start: {new Date(deviation.start_time).toLocaleString()}
      </Text>
      <Text style={styles.deviationTime}>
        End: {new Date(deviation.end_time).toLocaleString()}
      </Text>
      <Text style={styles.deviationText}>
        From: {JSON.stringify(deviation.start_location)}
      </Text>
      <Text style={styles.deviationText}>
        To: {JSON.stringify(deviation.end_location)}
      </Text>
      <Text style={styles.deviationDistance}>
        Maximum Deviation: {Math.round(deviation.distance)}m
      </Text>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#4A6CF7' }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Testing Panel</Text>
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Route Testing Panel</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <ManualLocationInput 
                socket={socket} 
                cartId={cartId}
              />
              
              <DeviationScenarios 
                socket={socket}
                cartId={cartId}
                currentRoute={currentRoute}
              />
              
              {/* Deviation History */}
              <View style={styles.container}>
                <Text style={styles.sectionTitle}>Completed Deviations</Text>
                {deviations.length === 0 ? (
                  <Text style={styles.emptyText}>No deviations recorded</Text>
                ) : (
                  deviations.map((deviation, index) => (
                    <View key={index} style={[
                      styles.deviationHistoryItem,
                      deviation.type === 'deviation_detected' ? styles.deviationDetectedItem : styles.routeReturnItem
                    ]}>
                      {deviation.type === 'deviation_detected' ? (
                        // Deviation Detection Display
                        <>
                          <Text style={styles.deviationTitle}>Deviation Detected</Text>
                          <Text style={styles.deviationTime}>
                            Time: {new Date(deviation.timestamp).toLocaleString()}
                          </Text>
                          <Text style={styles.deviationText}>
                            Location: {JSON.stringify(deviation.current_location)}
                          </Text>
                          <Text style={styles.deviationDistance}>
                            Distance from route: {Math.round(deviation.distance)}m
                          </Text>
                        </>
                      ) : (
                        // Return to Route Display
                        <>
                          <Text style={styles.deviationTitle}>Route Return Completed</Text>
                          <Text style={styles.deviationTime}>
                            Start: {new Date(deviation.start_time).toLocaleString()}
                          </Text>
                          <Text style={styles.deviationTime}>
                            End: {new Date(deviation.end_time).toLocaleString()}
                          </Text>
                          <Text style={styles.deviationText}>
                            From: {JSON.stringify(deviation.start_location)}
                          </Text>
                          <Text style={styles.deviationText}>
                            To: {JSON.stringify(deviation.end_location)}
                          </Text>
                          <Text style={styles.deviationMessage}>
                            {deviation.message}
                          </Text>
                        </>
                      )}
                    </View>
                  ))
                )}
              </View>
              <View style={styles.container}>
        <Text style={styles.sectionTitle}>Deviation History</Text>
        {activeDeviation && (
          <View style={[styles.deviationHistoryItem, styles.activeDeviationItem]}>
            <Text style={styles.deviationTitle}>Active Deviation</Text>
            <Text style={styles.deviationTime}>
              Started: {new Date(activeDeviation.start_time).toLocaleString()}
            </Text>
            <Text style={styles.deviationText}>
              From: {JSON.stringify(activeDeviation.start_location)}
            </Text>
            <Text style={styles.deviationDistance}>
              Distance: {Math.round(activeDeviation.distance)}m
            </Text>
          </View>
        )}
        
        {deviations.length === 0 ? (
          <Text style={styles.emptyText}>No completed deviations</Text>
        ) : (
          deviations.map(renderDeviationCard)
        )}
      </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
     

    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    position: 'absolute',
    top: 120,
    right: 16,
    zIndex: 999,  // Add high zIndex
    elevation: 6,  // Add elevation for Android
  },
  container: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E2A78',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E2A78',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  buttonContainer: {
    gap: 10,
  },
  activeDeviationItem: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  deviationDistance: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 4,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  deviationHistoryItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  deviationDetectedItem: {
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  routeReturnItem: {
    borderLeftColor: '#4A6CF7',
    backgroundColor: '#EFF6FF',
  },
  deviationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E2A78',
    marginBottom: 6,
  },
  deviationTime: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  deviationText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  deviationDistance: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    marginTop: 4,
  },
  deviationMessage: {
    fontSize: 14,
    color: '#1E2A78',
    fontWeight: '500',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    padding: 20,
  },
  activeDeviationContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#FEF3F2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  activeDeviationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B91C1C',
    marginBottom: 4,
  },
  activeDeviationText: {
    fontSize: 12,
    color: '#991B1B',
  }
});

export default RouteDeviationTestingPanel;