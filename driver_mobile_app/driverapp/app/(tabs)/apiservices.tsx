import axios from 'axios';

const BASE_URL = 'http://172.20.10.5:5000';

export const apiService = {
  // Driver Authentication
  signupDriver: async (username, password, userType, driverOrg) => {
    try {
      const response = await axios.post(`${BASE_URL}/signup_driver`, {
        username,
        password,
        user_type: userType,
        driver_org: driverOrg
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  loginDriver: async (username, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/login_driver`, {
        username,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },


  logoutDriver: async (driverId) => {
    try {
      if (!driverId || driverId === 'undefined' || driverId === 'null') {
        throw new Error('Valid driver ID is required');
      }
      
      const response = await axios.post(`${BASE_URL}/logout_driver`, {
        generated_unique_id: driverId
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Driver Status Updates
  setDriverOccupied: async (driverId, isOccupied) => {
    try {
      if (!driverId || driverId === 'undefined' || driverId === 'null') {
        throw new Error('Valid driver ID is required');
      }

      const endpoint = isOccupied ? '/set_driver_occupied_1' : '/set_driver_occupied_0';
      const response = await axios.post(`${BASE_URL}${endpoint}`, {
        generated_unique_id: driverId
      });
      return response.data;
    } catch (error) {
      console.error('setDriverOccupied error:', error);
      throw error.response?.data || error.message;
    }
  },

  setDriverOnline: async (driverId, isOnline) => {
    try {
      if (!driverId || driverId === 'undefined' || driverId === 'null') {
        throw new Error('Valid driver ID is required');
      }

      const endpoint = isOnline ? '/set_driver_online_1' : '/set_driver_online_0';
      const response = await axios.post(`${BASE_URL}${endpoint}`, {
        generated_unique_id: driverId
      });
      return response.data;
    } catch (error) {
      console.error('setDriverOnline error:', error);
      throw error.response?.data || error.message;
    }
  }
};
