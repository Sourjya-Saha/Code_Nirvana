import React, { useRef, useEffect } from 'react';
import { 
  View, Text, Animated, Dimensions, StatusBar, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const containerGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Clean, professional animation sequence
    Animated.sequence([
      // Logo fade in and scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      
      // Brief pause
      Animated.delay(200),
      
      // Text fade in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to login after animation
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.replace('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }
        ]}
      >
        <Image 
          source={require('../../assets/images/NirvanaSmartChainLogo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* Company Text */}
      <Animated.View
        style={[
          styles.textContainer,
          { opacity: textOpacity }
        ]}
      >
        <Text style={styles.companyName}>
          Nirvana<Text style={styles.accent}>SmartChain</Text>
        </Text>
        <Text style={styles.tagline}>Pharmaceutical Logistics Platform</Text>
      </Animated.View>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 10,
  },
  logoImage: {
    width: 170,
    height: 170,
  },
  textContainer: {
    alignItems: 'center',
  },
  companyName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  accent: {
    color: '#00CFFF',
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
};

export default SplashScreen;