import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the AuthContext
const AuthContext = createContext();

// Create a custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// Create an AuthProvider component
export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(() => {
    // Check localStorage for a stored user ID when the component initializes
    return localStorage.getItem('userId');
  });

  const login = (id) => {
    setUserId(id); // Set the user ID when logging in
    localStorage.setItem('userId', id); // Store user ID in localStorage
  };

  const logout = () => {
    setUserId(null); // Clear the user ID on logout
    localStorage.removeItem('userId'); // Remove user ID from localStorage
  };

  const isAuthenticated = () => {
    return userId !== null; // Check if the user is authenticated
  };

  // Keep user ID in sync with localStorage on refresh
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ userId, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};