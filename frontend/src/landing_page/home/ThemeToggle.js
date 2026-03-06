import React from 'react';
import { Sun, Moon } from 'lucide-react';
import './theme.css'
const ThemeToggle = ({ isDarkMode, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className={`theme-toggle-btn ${isDarkMode ? 'dark' : 'light'}`}
    >
      {isDarkMode ? (
        <Sun className="theme-icon" />
      ) : (
        <Moon className="theme-icon dark-icon" />
      )}
    </button>
  );
};

export default ThemeToggle;