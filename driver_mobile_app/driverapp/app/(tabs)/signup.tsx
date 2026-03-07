import { apiService } from '@/app/(tabs)/apiservices';
import { SocketProvider, useSocket } from '@/app/(tabs)/SocketContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface SignupFormData {
  username: string;
  password: string;
  confirmPassword: string;
  driverOrg: string;
}

interface Organization {
  generated_unique_id: string;
  user_id: string;
  user_type: string;
}

const SignupScreenContent: React.FC = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    driverOrg: ''
  });
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { socket } = useSocket();
  const router = useRouter();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('http://172.20.10.5:8000/fetch_users');
      const data = await response.json();
      if (data.users) {
        setOrganizations(data.users);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch organizations');
      console.error('Error fetching organizations:', error);
    }
  };

  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.username || !formData.password || !formData.confirmPassword || !formData.driverOrg) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (formData.password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters long');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const response = await apiService.signupDriver(
        formData.username,
        formData.password,
        'driver',
        formData.driverOrg
      );

      Alert.alert(
        'Success',
        'Account created successfully! Please login to continue.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/login')
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Signup Error',
        error.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectOrganization = (org: Organization) => {
    handleInputChange('driverOrg', org.generated_unique_id);
    setShowOrgDropdown(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcons name="local-shipping" size={48} color="#3182CE" />
          <Text style={styles.headerText}>Driver Signup</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={formData.username}
          onChangeText={(value) => handleInputChange('username', value)}
          autoCapitalize="none"
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          secureTextEntry
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
          secureTextEntry
          editable={!isLoading}
        />

        <TouchableOpacity 
          style={styles.orgSelector}
          onPress={() => setShowOrgDropdown(!showOrgDropdown)}
          disabled={isLoading}
        >
          <Text style={styles.orgSelectorText}>
            {formData.driverOrg ? 
              organizations.find(org => org.generated_unique_id === formData.driverOrg)?.user_id :
              'Select Organization'}
          </Text>
          <MaterialIcons 
            name={showOrgDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#4A5568"
          />
        </TouchableOpacity>

        {showOrgDropdown && (
          <View style={styles.dropdownContainer}>
            {organizations.map((org) => (
              <TouchableOpacity
                key={org.generated_unique_id}
                style={styles.dropdownItem}
                onPress={() => selectOrganization(org)}
              >
                <Text style={styles.orgName}>{org.user_id}</Text>
                <Text style={styles.orgType}>({org.user_type})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.signupButton, isLoading && styles.disabledButton]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginLink} 
          onPress={() => router.push('/login')}
          disabled={isLoading}
        >
          <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const SignupScreen: React.FC = () => {
  return (
    <SocketProvider>
      <SignupScreenContent />
    </SocketProvider>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 10,
  },
  input: {
    height: 40,
    borderColor: '#CBD5E0',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orgSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    borderColor: '#CBD5E0',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orgSelectorText: {
    color: '#4A5568',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    borderColor: '#CBD5E0',
    borderWidth: 1,
    marginBottom: 20,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  orgName: {
    color: '#2D3748',
    fontSize: 14,
  },
  orgType: {
    color: '#718096',
    fontSize: 12,
    fontStyle: 'italic',
  },
  signupButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#3182CE',
    fontSize: 14,
  },
});

export default SignupScreen;