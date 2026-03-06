import React, { useState } from 'react';
import GeolocationMap from './GeolocationMap'; // if renamed to .jsx


const TrackingSystem = () => {
  const [selectedRole, setSelectedRole] = useState('');
  const [isRoleSelected, setIsRoleSelected] = useState(false);

  const handleRoleSelection = (role) => {
    setSelectedRole(role);
    setIsRoleSelected(true);
    // Save role to localStorage to persist through refreshes
    localStorage.setItem('userRole', role);
  };

  // Check for existing role on component mount
  React.useEffect(() => {
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
      setSelectedRole(savedRole);
      setIsRoleSelected(true);
    }
  }, []);

  if (!isRoleSelected) {
    return (
      <div style={styles.roleSelectionContainer}>
        <div style={styles.roleSelectionCard}>
          <h1 style={styles.title}>Select Your Role</h1>
          <div style={styles.roleButtonsContainer}>
            {['start', 'wholesaler', 'retailer', 'driver'].map((role, index) => (
              <button
                key={role}
                onClick={() => handleRoleSelection(role)}
                style={styles.roleButton(index)}
              >
                <h3 style={styles.roleButtonTitle}>
                  {role.charAt(0).toUpperCase() + role.slice(1)} User
                </h3>
                <p style={styles.roleButtonDescription}>
                  {role === 'start' && 'Track shipment from the origin point'}
                  {role === 'wholesaler' && 'Monitor incoming and outgoing shipments'}
                  {role === 'retailer' && 'Track incoming deliveries'}
                  {role === 'driver' && 'Share location and manage deliveries'}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}><span style={{color:"orange"}}>Nirvana</span><span style={{color:"blue"}}>-</span><span style={{color:"green"}}>SmartChain</span> Tracking System</h1>
          <div style={styles.headerRight}>
            <span style={styles.connectedText}>
              Connected as: {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('userRole');
                setIsRoleSelected(false);
                setSelectedRole('');
              }}
              style={styles.changeRoleButton}
            >
              Change Role
            </button>
          </div>
        </div>
      </div>

      <div style={styles.mapContainer}>
        <GeolocationMap userRole={selectedRole} />
      </div>
    </div>
  );
};

// Styles
const styles = {
  roleSelectionContainer: { 
    minHeight: '100vh',
    backgroundColor: '#F4F7FA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Poppins, sans-serif',
    padding: '1rem',
  },
  roleSelectionCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    maxWidth: '90%', // Adjust for smaller screens
    width: '100%',
    maxWidth: '600px',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#333',
    marginBottom: '1.5rem',
    letterSpacing: '0.5px',
  },
  roleButtonsContainer: {
    display: 'grid',
    gap: '1.5rem',
    gridTemplateColumns: '1fr', // Stack buttons on mobile
    '@media (min-width: 768px)': {
      gridTemplateColumns: '1fr 1fr', // Two columns on tablets
    },
  },
  roleButton: (index) => ({
    width: '100%',
    padding: '1.5rem',
    textAlign: 'left',
    backgroundColor: ['#E8F4FF', '#E6FFEA', '#F5E8FF', '#FFF7E6'][index],
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    fontSize: '1rem',
    outline: 'none',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    '&:hover': {
      backgroundColor: ['#D2E7FF', '#D2FFD6', '#ECD2FF', '#FFF2D2'][index],
      transform: 'scale(1.03)',
    },
  }),
  roleButtonTitle: {
    fontWeight: '600',
    fontSize: '1.125rem',
    marginBottom: '0.5rem',
    color: '#2D3748',
    letterSpacing: '0.5px',
  },
  roleButtonDescription: {
    fontSize: '0.875rem',
    color: '#4A4A4A',
    letterSpacing: '0.5px',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#F4F7FA',
    fontFamily: 'Poppins, sans-serif',
  },
  header: {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '1rem',
    borderBottom: '2px solid #E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerContent: {
    maxWidth: '90%',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap', // Allow items to wrap for smaller screens
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#333',
    letterSpacing: '0.5px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:"center",
    gap: '1rem',
    flexWrap: 'wrap',
  },
  connectedText: {
    fontSize: '0.875rem', // Standard text size for readability
    fontWeight: '500', // Medium weight for a balanced emphasis
    color: '#5A5A5A', // Neutral gray for a professional look
    letterSpacing: '0.5px', // Adds subtle spacing for clarity
    margin: '0.5rem 0', // Adds spacing around the text for better layout
    lineHeight: '1.5', // Improves readability
    transition: 'color 0.3s ease', // Smooth transition for potential interactive states
    '&:hover': {
        color: '#333333', // Slightly darker shade on hover for subtle interactivity
    },
},

  changeRoleButton: {
    fontSize: '0.875rem',
    color: '#E53E3E',
    backgroundColor: 'transparent',
    border: '2px solid #E53E3E',
    borderRadius: '8px', // Rounded corners
    cursor: 'pointer',
    textDecoration: 'none', // Removing underline for a cleaner look
    padding: '0.5rem 1rem', // Added padding for better click area
    transition: 'all 0.3s ease', // Smooth transition for hover and focus effects
    letterSpacing: '0.5px',
    fontWeight: 'bold', // Makes the text stand out
    '&:hover': {
        backgroundColor: '#E53E3E', // Highlight the background on hover
        color: '#FFFFFF', // Contrast text color
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // Subtle shadow on hover
    },
    '&:focus': {
        outline: 'none', // Remove the default focus outline
        boxShadow: '0 0 0 3px rgba(229, 62, 62, 0.5)', // Custom focus shadow
    },
    '&:active': {
        transform: 'scale(0.95)', // Adds a pressed effect
    },
}
,
  mapContainer: {
    flex: '1',
    overflow: 'hidden',
    padding: '0rem',
    paddingTop:'2rem',
    backgroundColor: '#FFF',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
};

export default TrackingSystem;
