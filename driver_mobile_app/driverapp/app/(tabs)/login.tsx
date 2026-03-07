import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Animated, 
  Dimensions, Alert, StatusBar, Pressable, StyleSheet, ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '@/app/(tabs)/SocketContext';
import { apiService } from '@/app/(tabs)/apiservices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const { socket, isConnected } = useSocket();
  
  // Animation references - IMPORTANT: Separate JS and Native animations
  const cardAnimation = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const inputAnim1 = useRef(new Animated.Value(30)).current;
  const inputAnim2 = useRef(new Animated.Value(40)).current;
  const buttonAnim = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;
  const loadingSpinner = useRef(new Animated.Value(0)).current;
  
  // Enhanced visual effects - These will use JS driver (not native)
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const cityLightPulse = useRef(new Animated.Value(0)).current;
  
  // City lights and traffic elements
  const [cityElements] = useState(() => ({
    cityLights: Array.from({ length: 32 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 3 + Math.random() * 4, // Increased from 1.5-4.5 to 3-9
      opacity: 0.4 + Math.random() * 0.6, // Increased from 0.2-0.7 to 0.4-1.0
      color: Math.random() > 0.7 ? 
        `rgba(255, 255, 170, ${0.4 + Math.random() * 0.6})` : // Brighter yellows
        `rgba(255, 200, 100, ${0.4 + Math.random() * 0.6})`, // Brighter oranges
      pulseSpeed: 800 + Math.random() * 1600, // Slightly faster pulses
      pulseDelay: Math.random() * 2000
    })),
    trafficLights: Array.from({ length: 16 }, () => ({ // Added more traffic lights
      x: Math.random() * width,
      y: Math.random() * height,
      size: 3 + Math.random() * 4, // Increased from 2-4 to 3-7
      color: Math.random() > 0.6 ? 
        (Math.random() > 0.5 ? 'rgba(255, 80, 50, 0.8)' : 'rgba(50, 255, 100, 0.8)') : // More opacity
        'rgba(50, 150, 255, 0.8)', // More opacity
      blinkRate: 1500 + Math.random() * 3000 // Slightly faster blinks
    }))
  }));
  
  // Initialize animations
  useEffect(() => {
    // Logo entrance animation - Using JS driver
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1.1,
        duration: 800,
        useNativeDriver: false, // Changed to false for consistency
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: false, // Changed to false for consistency
      }),
      
    ]),Animated.loop(
      Animated.sequence([
        Animated.timing(cityLightPulse, {
          toValue: 1,
          duration: 2000, // Faster pulse
          useNativeDriver: false,
        }),
        Animated.timing(cityLightPulse, {
          toValue: 0.3,
          duration: 2000, // Faster pulse
          useNativeDriver: false,
        }),
      ])
    ).start();
    
    // Logo glow animation - Using JS driver as it manipulates non-transform/opacity
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(logoGlow, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
    
    // City lights pulse animation - Using JS driver as it manipulates non-transform/opacity
  

    // Card and form animations - All using native driver consistently
    Animated.sequence([
      // Card entrance animation
      Animated.timing(cardAnimation, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.delay(100),
      // Form elements entrance - Sequenced for better performance
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(inputAnim1, {
            toValue: 0,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.spring(inputAnim2, {
            toValue: 0,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
          Animated.spring(buttonAnim, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(buttonScale, {
            toValue: 1,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
   
    
    // Loading spinner animation
    if (isLoading) {
      Animated.loop(
        Animated.timing(loadingSpinner, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingSpinner.setValue(0);
    }

    
  }, [isLoading]);

  const handleInputFocus = (inputName) => {
    setFocusedInput(inputName);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleInputBlur = () => {
    setFocusedInput(null);
  };

  const handleLogin = async () => {
    try {
      if (!username || !password) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Authentication Required', 'Please enter both username and password');
        return;
      }
  
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Button press animation - Using native driver consistently
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      try {
        const response = await apiService.loginDriver(username, password);
        
        if (!response || !response.unique_user_id) {
          throw new Error('Invalid response from server');
        }
  
        await AsyncStorage.setItem('driverId', response.unique_user_id.toString());
        
        if (isConnected && socket) {
          socket.emit('user-role', { 
            role: 'driver', 
            driver_id: response.unique_user_id 
          });
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
        // Always use native driver consistently for these animations
        Animated.sequence([
          Animated.parallel([
            Animated.timing(cardAnimation, {
              toValue: 1.05,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(formOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(cardAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          router.push(`/routeTracking?driverId=${response.unique_user_id}`);
        });
      } catch (apiError) {
        console.error('API Error:', apiError);
        throw new Error('Authentication failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Authentication Failed', 
        error.message || 'Please verify your credentials and try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
      setIsLoading(false);
    }
  };

  // Calculate derived values from animations
  const cardTranslateY = cardAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0]
  });
  
  const spinnerRotation = loadingSpinner.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const logoGlowIntensity = logoGlow.interpolate({
    inputRange: [0.3, 1],
    outputRange: [3, 15]
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Map Background */}
      <ImageBackground 
        source={require('../../assets/images/dark-map-background.png')} 
        style={styles.mapBackground}
        resizeMode="cover"
      >
        {/* Semi-transparent dark overlay */}
        <View style={styles.mapOverlay} />
        
        {/* Light Grid Overlay */}
        <View style={styles.mapGrid}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View 
              key={`grid-h-${i}`} 
              style={[
                styles.gridLine, 
                { top: (i * height / 10), width: width }
              ]} 
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <View 
              key={`grid-v-${i}`} 
              style={[
                styles.gridLine, 
                { left: (i * width / 10), height: height }
              ]} 
            />
          ))}
        </View>
        
        {/* City Lights
        {cityElements.cityLights.map((light, index) => {
        const lightOpacity = cityLightPulse.interpolate({
          inputRange: [0.3, 1],
          outputRange: [light.opacity * 0.4, light.opacity]
        });
        
        const lightSize = cityLightPulse.interpolate({
          inputRange: [0.3, 1],
          outputRange: [light.size * 0.7, light.size * 1.3]
        });
        
        const glowRadius = cityLightPulse.interpolate({
          inputRange: [0.3, 1],
          outputRange: [light.size, light.size * 3]
        });
        
        return (
          <Animated.View
            key={`light-${index}`}
            style={[
              styles.cityLight,
              {
                left: light.x,
                top: light.y,
                width: lightSize,
                height: lightSize,
                backgroundColor: light.color,
                opacity: lightOpacity,
                shadowColor: light.color,
                shadowOpacity: lightOpacity,
                shadowRadius: glowRadius,
                borderRadius: 50,
              }
            ]}
          />
        );
      })}
        
        {/* Traffic Lights */}
        {/* {cityElements.trafficLights.map((light, index) => {
        // Create pulsing effect for traffic lights
        const lightOpacity = light.animRef ? light.animRef.interpolate({
          inputRange: [0.3, 1],
          outputRange: [0.5, 0.9]
        }) : 0.7;
        
        const lightSize = light.animRef ? light.animRef.interpolate({
          inputRange: [0.3, 1],
          outputRange: [light.size * 0.8, light.size * 1.2]
        }) : light.size;
        
        const glowRadius = light.animRef ? light.animRef.interpolate({
          inputRange: [0.3, 1],
          outputRange: [light.size * 2, light.size * 4]
        }) : light.size * 3;
        
        return (
          <Animated.View
            key={`traffic-${index}`}
            style={[
              styles.trafficLight,
              {
                left: light.x,
                top: light.y,
                width: lightSize,
                height: lightSize,
                backgroundColor: light.color,
                shadowColor: light.color,
                shadowOpacity: lightOpacity,
                shadowRadius: glowRadius,
                borderRadius: 50,
              }
            ]}
          />
        );
      })} */} 
      </ImageBackground>

      {/* Enhanced Logo Section */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            shadowRadius: logoGlowIntensity
          }
        ]}
      >
        
          <MaterialCommunityIcons 
            name="map-marker-path" 
            size={40} 
            color="#00FFAA" 
            style={styles.logoIcon} 
          />
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoText}>Nirvana<Text style={{color: "#00FFAA"}}>SmartChain</Text></Text>
            <Text style={styles.logoTagline}>Secure Pharmaceutical Logistics</Text>
          </View>
        
      </Animated.View>

      {/* Login Card - Enhanced Glass Effect */}
      <Animated.View 
        style={[
          styles.loginCardContainer,
          
        ]}
      >
       
         <View
  
  style={styles.loginCard}
>
            <View style={styles.loginHeaderContainer}>
              <MaterialCommunityIcons name="account-lock" size={24} color="#00FFAA" style={styles.loginHeaderIcon} />
              <Text style={styles.loginTitle}>Welcome Captain !</Text>
            </View>
            
            <Animated.View style={{ opacity: formOpacity }}>
              {/* Username Input */}
              <Animated.View 
                style={[
                  styles.inputContainer,
                  focusedInput === 'username' && styles.inputContainerFocused,
                  { transform: [{ translateX: inputAnim1 }] }
                ]}
              >
                <MaterialCommunityIcons 
                  name="account-key" 
                  size={22} 
                  color={focusedInput === 'username' ? "#00FFAA" : "#6B7280"} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  editable={!isLoading}
                  onFocus={() => handleInputFocus('username')}
                  onBlur={handleInputBlur}
                />
                {username && (
                  <TouchableOpacity onPress={() => setUsername('')}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={18}
                      color="#9CA3AF"
                      style={{ opacity: 0.7 }}
                    />
                  </TouchableOpacity>
                )}
              </Animated.View>

              {/* Password Input */}
              <Animated.View 
                style={[
                  styles.inputContainer,
                  focusedInput === 'password' && styles.inputContainerFocused,
                  { transform: [{ translateX: inputAnim2 }] }
                ]}
              >
                <MaterialCommunityIcons 
                  name="shield-key" 
                  size={22} 
                  color={focusedInput === 'password' ? "#00FFAA" : "#6B7280"} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
                  onFocus={() => handleInputFocus('password')}
                  onBlur={handleInputBlur}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* Enhanced Login Button */}
              <Animated.View 
                style={{
                  transform: [
                    { translateY: buttonAnim },
                    { scale: buttonScale }
                  ]
                }}
              >
                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.loginButtonContainer,
                    {
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#00CFFF', '#00FFAA']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.loginButton}
                  >
                    {isLoading ? (
                      <Animated.View 
                        style={{
                          transform: [{ rotate: spinnerRotation }]
                        }}
                      >
                        <MaterialCommunityIcons name="loading" size={24} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="map-marker-check" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.loginButtonText}>Sign In</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </View>
       
      </Animated.View>
      
      {/* Enhanced Footer */}
      <View style={styles.footer}>
        <LinearGradient
          colors={['rgba(10, 25, 50, 0.7)', 'rgba(10, 25, 50, 0.5)']}
          style={styles.footerGradient}
        >
          <MaterialCommunityIcons name="shield-check" size={14} color="#00CFFF" style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>Nirvana SmartChain v1.0.1</Text>
        </LinearGradient>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 35, 0.3)',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 191, 255, 0.04)',
  },
  cityLight: {
    position: 'absolute',
    borderRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10, // Added for Android shadow effect
  },
  trafficLight: {
    position: 'absolute',
    borderRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15, // Added for Android shadow effect
  },
  logoContainer: {
    position: 'absolute',
    top:130,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 20,
   
  },
  logoBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoIcon: {
    marginRight: 12,
    shadowColor: '#00FFAA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  logoTextContainer: {
    alignItems: 'center',
  },
  logoText: {
    textAlign: 'center',        // text-center
    fontSize: 28,               // text-5xl (~40px)
    fontWeight:'800',  
    
    // textShadowColor: 'rgba(0, 191, 255, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,       // font-bold
    lineHeight: 38,             // md:leading-[60px] (adjusted)
    letterSpacing: -1,          // tracking-tighter
    marginTop: 20,              // mt-5
    color: '#FFFFFF',  
  },
  logoTagline: {
    color: '#D0D8E0',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 3,
    fontWeight: '500',
  },
  loginCardContainer: {
    width: '85%',
    marginTop:80,
    maxWidth: 400,
    top:50,
    overflow: 'hidden',
    elevation: 10,
  },
 
loginCard: {
  padding: 20,
  borderRadius: 24,
  backgroundColor: 'transparent',
},
  loginHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginHeaderIcon: {
    marginRight: 10,
    shadowColor: '#00FFAA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
  },
  loginTitle: {
    textAlign: 'center',        // text-center
    fontSize: 22,               // text-5xl (~40px)
    fontWeight:'800',  
   
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,       // font-bold
    lineHeight: 38,             // md:leading-[60px] (adjusted)
    letterSpacing: -1,          // tracking-tighter

    color: '#FFFFFF',  
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  inputContainerFocused: {
    borderColor: '#00FFAA',
    
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loginButtonContainer: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#00FFAA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  loginButtonText: {
    textAlign: 'center',        // text-center
    fontSize: 19,               // text-5xl (~40px)
    fontWeight:'800',  
   
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius:  8,      // font-bold
        // md:leading-[60px] (adjusted)
    letterSpacing: -1,          // tracking-tighter

    color: '#FFFFFF',  
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 255, 0.2)',
  },
  footerText: {
    color: '#ADBDCC',
    fontSize: 12,
    letterSpacing: 0.5,
  }
});