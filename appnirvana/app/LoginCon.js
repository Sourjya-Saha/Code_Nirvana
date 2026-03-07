import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

export default function LoginCon() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [userType, setUserType] = useState('Consumer');
  const [option, setOption] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [message, setMessage] = useState('');
  const [uniqueid, setuniqueid] = useState('');

  useEffect(() => {
    let targetValue = 0;
    if (option === 2) targetValue = -39;
    if (option === 3) targetValue = -80;

    Animated.parallel([
      Animated.timing(translateYAnim, {
        toValue: targetValue,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [option]);

  const handleSignUp = async () => {
    if (password !== repeatPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const data = {
      username: username,
      password: password,
      user_type: userType,
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/signup_app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.status === 201) {
        setMessage(result.message);
        Alert.alert('Success', result.message);
        navigation.navigate('HomeCon', { uniqueid: result.unique_user_id });
      } else {
        setMessage(result.error);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage('An error occurred. Please try again.');
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  const handleSignIn = async () => {
    const data = {
      username: username,
      password: password,
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/login_app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.status === 200) {
        setMessage(result.message);
        setuniqueid(result.unique_user_id);
        navigation.navigate('HomeCon', { uniqueid: result.unique_user_id });
      } else {
        setMessage(result.error);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('An error occurred. Please try again.');
      Alert.alert('Error', `Fetch error: ${error.message}`);
    }
  };

  const renderInputIcon = (name) => (
    <MaterialCommunityIcons name={name} size={24} color="#6B7280" style={styles.inputIcon} />
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.background}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Animated.View
              style={[
                styles.headerHeadings,
                { 
                  transform: [{ translateY: translateYAnim }],
                  opacity: fadeAnim 
                }
              ]}
            >
              <Text style={styles.headerHeadingSpan}>Welcome Back</Text>
              <Text style={styles.headerHeadingSpan}>Create Account</Text>
              <Text style={styles.headerHeadingSpan}>Reset Password</Text>
            </Animated.View>
          </View>

          {/* Options */}
          <View style={styles.options}>
            {['Sign In', 'Sign Up', 'Forgot'].map((text, index) => (
              <TouchableOpacity 
                key={text}
                onPress={() => setOption(index + 1)}
                style={[
                  styles.optionButton,
                  option === index + 1 && styles.activeOptionButton
                ]}
              >
                <Text style={[
                  styles.optionText,
                  option === index + 1 && styles.activeOptionText
                ]}>
                  {text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <Animated.View style={[styles.accountForm, { opacity: fadeAnim }]}>
            <View style={styles.formFields}>
              <View style={styles.inputContainer}>
                {renderInputIcon('account')}
                <TextInput
                  style={styles.input}
                  placeholder="Username or Number"
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                {renderInputIcon('lock')}
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {option === 2 && (
                <View style={styles.inputContainer}>
                  {renderInputIcon('lock-check')}
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat Password"
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9CA3AF"
                    value={repeatPassword}
                    onChangeText={setRepeatPassword}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={option === 1 ? handleSignIn : handleSignUp}
            >
              <Text style={styles.submitButtonText}>
                {option === 1 ? 'Sign In' : option === 2 ? 'Sign Up' : 'Reset Password'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: '#4F46E5',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.95)', // Slightly transparent primary color
  },
  header: {
    height: 30,
    width: width * 0.8,
    overflow: 'hidden',
    marginBottom: 40,
  },
  headerHeadings: {
    position: 'absolute',
    width: '100%',
  },
  headerHeadingSpan: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 3,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: width * 0.8,
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 5,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeOptionButton: {
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.7,
  },
  activeOptionText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    opacity: 1,
  },
  accountForm: {
    width: width * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});