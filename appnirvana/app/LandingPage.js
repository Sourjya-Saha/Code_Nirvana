import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Easing,
  ImageBackground 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function LandingPage() {
  const navigation = useNavigation();
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateColor = () => {
      Animated.loop(
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 25000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        })
      ).start();
    };

    animateColor();
  }, []);

  const colorInterpolation = colorAnim.interpolate({
    inputRange: [
      0, 0.066, 0.133, 0.2, 0.266, 0.333, 0.4, 0.466, 0.533, 0.6, 0.666, 0.733, 0.8, 0.866, 1
    ],
    outputRange: [
      '#87a7e6', '#7a98e2', '#6c87d7', '#1c7ed4', '#0c7991', '#23a699', '#20b37d',
      '#5484e3', '#225ed6', '#0235de', '#0a02de', '#29258a', '#2e4694', '#7a98e2', '#87a7e6'
    ],
  });

  return (
    <ImageBackground
      source={require('../assets/images/landing.jpg')} // Adjust the path according to your project structure
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Animated.Text style={[styles.title1, { color: colorInterpolation }]}>
            Nirvana
          </Animated.Text>
          <Animated.Text style={[styles.title2, { color: colorInterpolation }]}>
            HealthChain
          </Animated.Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => navigation.navigate('LoginCon')}
            >
              <Text style={styles.optionText}>Login as Consumer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
            >
              <Text style={styles.optionText}>Login as Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(245, 240, 240,0.25)', // Semi-transparent overlay
  },
  container: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  title1: {
    fontSize: 59,
    fontWeight: 'bold',
    marginBottom: 1,
    alignSelf: 'flex-start',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title2: {
    fontSize: 49,
    fontWeight: 'bold',
    marginBottom: 5,
    alignSelf: 'flex-start',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionButton: {
    padding: 10,
    marginVertical: 10,
    borderColor: '#0a47f0',
    borderWidth: 2,
    backgroundColor: 'rgba(245, 240, 240, 0.9)',
    borderRadius: 100,
    width: '80%',
    alignItems: 'center',
  },
  optionText: {
    color: '#0a47f0',
    fontSize: 16,
    fontWeight: 'bold',
  },
});