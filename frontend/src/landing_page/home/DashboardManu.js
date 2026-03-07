import React, { useState, useEffect } from "react";
import SideManu from "../SideManu";
import "./ShipmentTracker.css"; // For styling
import { ethers } from "ethers"; // ethers v6
import CardTransactionRegistry from "./CardTransactionRegistry.json"; // Import your ABI JSON
import contractConfig from '../Shipment/contractAddress.json';
 import PredictMedications from "./Medication";
 import axios from 'axios';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../user_login/AuthContext';
import GeolocationMap from "../Googlemaps/GeolocationMap";
import ManufacturerNotifications from "./ManufactureNotifications";
import { Margin } from "@mui/icons-material";
import ShipmentTracking from "../Googlemaps/ShipmentTracking";
// Register the components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


 const getTruckPosition = (status) => {
  switch (status) {
    case "PENDING":
      return "0%";
    case "IN_TRANSIT_WHOLESALER":
      return "25%";
    case "WHOLESALER_RECEIVED":
      return "50%";
    case "IN_TRANSIT_RETAILER":
      return "75%";
    case "DELIVERED":
      return "94%";
    default:
      return "0%";
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case "PENDING":
      return "status-pending";
    case "IN_TRANSIT_WHOLESALER":
      return "status-in_transit";
    case "WHOLESALER_RECEIVED":
      return "status-received_by_wholesaler";
    case "IN_TRANSIT_RETAILER":
      return "status-in_transit";
    case "DELIVERED":
      return "status-completed";
    default:
      return "";
  }
};
// eslint-disable-next-line
function DashManu({ }) {
  const { userId } = useAuth(); // Get the logged-in user's ID from AuthContext

  const [contract, setContract] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]); // Updated: use for shipment data
  const [showTracker, setShowTracker] = useState([]);
  const [animating, setAnimating] = useState([]);
  // eslint-disable-next-line
  const [errorMessage, setErrorMessage] = useState("");
  const [showMetricsGraph, setShowMetricsGraph] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);// for storing connected wallet addresss
  const [locationData, setLocationData] = useState({});
const contractAddress = contractConfig.registryAddress;

  const [startLocation, setStartLocation] = useState(null);
  const [checkpointLocation, setCheckpointLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [selectedShipmentLocations, setSelectedShipmentLocations] = useState(null);
  const [isGeolocationMapOpen, setIsGeolocationMapOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [transactionsData, setTransactionsData] = useState([]);
  const [hashMismatchError, setHashMismatchError] = useState(""); // For hash mismatch

  const styles={
    notificationContainer: {
      alignItems: 'center', // Aligning items vertically (applies only when flex is active)
      justifyContent: 'space-between', // Spacing out elements (applies only when flex is active)
      backgroundColor: '#f8f9fa', // Light background for the container
      padding: '15px', // Adding padding around the container
      borderRadius: '8px', // Rounded corners
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)', // Subtle shadow for a card-like effect
     // Ensuring the container takes full width
      marginTop:"0px",
      marginBottom: '20px', // Centering the container with space above and below
      transition: 'all 0.3s ease-in-out', // Smooth transition for changes
      marginRight:'15px',
    },
    notificationTitle: {
      fontSize: '20px', // Larger font for the title
      fontWeight: 'bold', // Bold title text
      color: '#333', // Dark text color
      margin: 0, // Removing default margin
    },
    notifications: {
      color: 'white', // White text for the notifications
      padding: '10px 15px', // Padding inside the notifications component
      borderRadius: '5px', // Rounded corners for the notifications
      cursor: 'pointer', // Pointer cursor for interactivity
      textAlign: 'center', // Center align content inside the Notifications
      transition: 'all 0.3s ease-in-out', // Smooth transition for styles
    },
  }

  // Function to handle Notifications click
  const handleNotificationsClick = () => {
    setIsNotificationsOpen((prevState) => !prevState);
  };

  const calculateTransactionMetrics = (transactions) => {
    // Check if transactions is a valid array
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalTransactionValue: 0,
        averageTransactionValue: 0,
        paidTransactions: 0,
        unpaidTransactions: 0
      };
    }
  
    const totalTransactions = transactions.length;
    
    // Safe calculation of total transaction value
    const totalTransactionValue = transactions.reduce((sum, transaction) => {
      // Add type checking and default to 0 if total is undefined or not a number
      const transactionTotal = transaction.total && !isNaN(transaction.total) 
        ? parseFloat(transaction.total) 
        : 0;
      return sum + transactionTotal;
    }, 0);
  
    const averageTransactionValue = totalTransactions > 0 
      ? totalTransactionValue / totalTransactions 
      : 0;
  
    const paidTransactions = transactions.filter(t => 
      t.status && t.status.toLowerCase() === 'paid'
    ).length;
  
    const unpaidTransactions = totalTransactions - paidTransactions;
  
    return {
      totalTransactions,
      totalTransactionValue,
      averageTransactionValue,
      paidTransactions,
      unpaidTransactions
    };
  };
  
  // In the useEffect, add more logging
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userId) return;
  
      try {
        const response = await fetch('http://127.0.0.1:5000/get_all_transactions_manu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manu_id: userId }),
        });
        
        const transactions = await response.json();
        
        // Add logging to understand the data structure
        console.log('Fetched transactions:', transactions);
        console.log('Type of transactions:', typeof transactions);
        console.log('Is transactions an array?', Array.isArray(transactions));
        
        setTransactionsData(transactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };
  
    fetchTransactions();
  }, [userId]);


useEffect(() => {
    const init = async () => {
      await loadContract();
      setErrorMessage("");
      setHashMismatchError("");
    };
    init();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (contract && walletAddress) {
      fetchAllTransactions();
      setErrorMessage(""); // Call this only after the contract and wallet address are set
      setHashMismatchError(""); // Call this only after the contract and wallet address are set
    }
    // eslint-disable-next-line
  }, [contract, walletAddress]); // Adding both contract and walletAddress as dependencies


  const loadContract = async () => {
    if (typeof window.ethereum !== "undefined") {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      
      const checksummedAddress = ethers.getAddress(accounts[0]); // Get the checksummed address
      setWalletAddress(checksummedAddress); // Store the checksummed address
  
      const provider = new ethers.BrowserProvider(window.ethereum); // Create a provider for MetaMask
      const signer = await provider.getSigner(checksummedAddress); // Get the signer for the wallet address
      const cardTransactionRegistry = new ethers.Contract(
        contractAddress,
        CardTransactionRegistry.abi,
        signer
      );
      setErrorMessage("");
      setHashMismatchError("");
      setContract(cardTransactionRegistry);
    }
  };

 
  // New method to convert coordinates to location name
  const handleSetLocation = async (shipment) => {
    try {
      const cartId = shipment.cardId;
      
      // Clean up addresses by checking for 42 spaces
      const manufacturerMetamask = shipment.receiverAddressM?.trim() === "                                          " ? "" : shipment.receiverAddressM;
      const wholesalerMetamask = shipment.receiverAddressW?.trim() === "                                          " ? "" : shipment.receiverAddressW;
      const retailerMetamask = shipment.receiverAddressR?.trim() === "                                          " ? "" : shipment.receiverAddressR;
  
      // Check if we have at least two addresses to create a meaningful route
      if (!cartId || (!manufacturerMetamask && !wholesalerMetamask && !retailerMetamask)) {
        addNotification('Insufficient location data for tracking', 'warning');
        return;
      }
  
      const response = await axios.post('http://127.0.0.1:5000/get_lats_longs', null, {
        params: {
          cart_id: cartId,
          manufacturer_address: manufacturerMetamask,
          wholesaler_address: wholesalerMetamask,
          retailer_address: retailerMetamask,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (response.status === 200) {
        const locationData = response.data;
        
        // Helper function to safely format coordinates
        const formatCoords = (location, latKey, longKey) => {
          if (location && location[latKey] && location[longKey]) {
            const lat = parseFloat(location[latKey]);
            const long = parseFloat(location[longKey]);
            if (!isNaN(lat) && !isNaN(long)) {
              return `${lat}, ${long}`;
            }
          }
          return '';
        };
  
        // Format coordinates with null checks
        const manufacturerCoords = formatCoords(locationData.manufacturer, 'manufacturer_lat', 'manufacturer_long');
        const wholesalerCoords = formatCoords(locationData.wholesaler, 'wholesaler_lat', 'wholesaler_long');
        const retailerCoords = formatCoords(locationData.retailer, 'retailer_lat', 'retailer_long');
  
        // Check if we have at least two valid coordinates
        let validCoordinates = [
          manufacturerCoords,
          wholesalerCoords,
          retailerCoords
        ].filter(coords => coords !== '').length;
  
        if (validCoordinates < 2) {
          addNotification('Not enough valid coordinates to create a route', 'error');
          return;
        }
  
        // Create shipment locations object
        const shipmentLocations = {
          startLocation: manufacturerCoords,
          checkpointLocation: wholesalerCoords,
          destinationLocation: retailerCoords,
          cartId: cartId,
          userId: userId
        };
  
        // Log for debugging
        console.log("Location Data:", {
          manufacturer: manufacturerCoords,
          wholesaler: wholesalerCoords,
          retailer: retailerCoords
        });
  
        setSelectedShipmentLocations(shipmentLocations);
        setIsGeolocationMapOpen(true);
  
        // Show appropriate notification based on available coordinates
        if (!manufacturerCoords) {
          addNotification('Manufacturer location unavailable. Using wholesaler as start point.', 'info');
        } else if (!wholesalerCoords) {
          addNotification('Wholesaler location unavailable. Creating direct route.', 'info');
        } else if (!retailerCoords) {
          addNotification('Retailer location unavailable. Using wholesaler as destination.', 'info');
        }
      }
    } catch (error) {
      console.error('Error setting location:', error);
      addNotification('Failed to retrieve location data', 'error');
    }
  };
  
  // Add this helper function to show notifications
  const addNotification = (message, type = 'info') => {
    // You can integrate this with your existing notification system
    // For now, we'll use alert as a fallback
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
  };
    
  const handleTransactionError = (error) => {
    // Reset both errors first
    setHashMismatchError("");
    setErrorMessage("");
  
    if (error.message && error.message.includes("Hash mismatch")) {
      const hashData = error.reason.slice(15);
      
      // // Immediately check conditions and set appropriate error message
      // if (hashData.slice(0, 42) !== walletAddress) {
      //   setErrorMessage("manufacture wallet address mismatch");
      // } 
      //  if (hashData.slice(42, 84) !== formInput.receiverAddressW) {
      //   setErrorMessage("Wholesaler wallet address mismatch");
      // }
      //  if (hashData.slice(84, 126) !== formInput.receiverAddressR) {
      //   setErrorMessage("Retailer wallet address mismatch");
      // } 
      //  if (hashData.slice(126, 136) !== formInput.date) {
      //   setErrorMessage("Date mismatch");
      // }
      
      setHashMismatchError(hashData);
      console.log(errorMessage)
    } else {
      setErrorMessage(error.reason || error.message || "An unknown error occurred");
      console.log(errorMessage)
    }
  };

  const fetchAllTransactions = async () => {
    if (contract) {
      try {
        const [cardIds, strhash, statuses] = await contract.getAllTransactions();
        const formattedTransactions = [];

        for (let i = 0; i < cardIds.length; i++) {
           if (strhash[i].slice(0, 42) === walletAddress) { // Match the address properly
            formattedTransactions.push({
              cardId: cardIds[i],
              receiverAddressW: strhash[i].slice(42, 84),
              receiverAddressR: strhash[i].slice(84, 126),
              date: strhash[i].slice(126, 136),
              receiverAddressM: strhash[i].slice(0, 42),
              status: statuses[i]
            });
           }
        }

        setAllTransactions(formattedTransactions);
        setErrorMessage("");
        setHashMismatchError("");
      } catch (error) {
        handleTransactionError(error);
      }
    }
  };

  const toggleTracker = (index) => {
    setShowTracker((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });

    if (!showTracker[index]) {
      setAnimating((prev) => {
        const updated = [...prev];
        updated[index] = true;
        return updated;
      });

      setTimeout(() => {
        setAnimating((prev) => {
          const updated = [...prev];
          updated[index] = false;
          return updated;
        });
      }, 100); // Increased timeout for smoother effect
    }
  };
  const statusCounts = allTransactions.reduce((acc, shipment) => {
    acc[shipment.status] = (acc[shipment.status] || 0) + 1;
    return acc;
  }, {});

  const [productsData, setProductsData] = useState([]);
  const [cartData, setCartData] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        const productsResponse = await fetch('http://127.0.0.1:5000/getProductsManu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
        const products = await productsResponse.json();
        setProductsData(products);

        const cartsResponse = await fetch('http://127.0.0.1:5000/getCartsManu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
        const carts = await cartsResponse.json();
        setCartData(carts);
        console.log("USERID" , userId)
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);


  if (loading) {
    return<div><div className='load'> <div className='loader'>Loading...</div></div><p className='lding'>Loading Your Dashboard....</p></div>;
  }
 

  // Calculate metrics
  const totalProducts = productsData.length;
  const totalCarts = cartData.length;
  const totalInventoryValue = productsData.reduce((acc, product) => {
    return acc + (product.price_per_unit * product.quantity_of_uom);
  }, 0);
  const getBarChartData = () => {
    return {
      labels: [
        'Total Products',
        'Total Carts',
        'Pending Shipments',
        'In Transit to Wholesaler',
        'Wholesaler Received',
        'In Transit to Retailer',
        'Delivered Shipments',
      ],
      datasets: [
        {
          label: 'Metrics',
          data: [
            totalProducts,
            totalCarts,
            statusCounts["PENDING"] || 0,
            statusCounts["IN_TRANSIT_WHOLESALER"] || 0,
            statusCounts["WHOLESALER_RECEIVED"] || 0,
            statusCounts["IN_TRANSIT_RETAILER"] || 0,
            statusCounts["DELIVERED"] || 0,
          ],
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  };
  const options = {
    scales: {
        x: {
            grid: {
                display: false, // Disable grid lines for the x-axis
            },
        },
        y: {
            grid: {
                display: false, // Disable grid lines for the y-axis
            },
        },
    },
};
const {
  totalTransactions,
  totalTransactionValue,
  averageTransactionValue,
  paidTransactions,
  unpaidTransactions
} = calculateTransactionMetrics(transactionsData);

  return (
    <div className="dash-board">
  <SideManu />
    
      <h2 style={{
    fontSize: '30px', // Adjust font size
    color: '#333', // Dark gray color
    textAlign: 'center', // Center align text
    margin: '20px 0', // Add space above and below
    fontWeight: 'bold', // Make the text bold
    textTransform: 'uppercase', // Make text uppercase
    letterSpacing: '1.5px', // Add spacing between letters
   // Add an underline effect
    // Space between text and underline
    width: 'fit-content', // Fit content width
    marginInline: 'auto',
    marginTop:"88px" // Center horizontally
  }}>wELCOME BACK! , USER</h2>
      <div className="dashboard-metric">
  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-box"></i></div>
      <h2>{totalProducts}</h2>
    </div>
    <p>Number of Products</p>
  </div>

  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-cart-plus"></i></div>
      <h2>{totalCarts}</h2>
    </div>
    <p>Number of Carts</p>
  </div>

  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-wallet"></i></div>
      <h2>&#x20b9;{totalInventoryValue.toFixed(1)}</h2>
    </div>
    <p>Total Value of Inventory</p>
  </div>

  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-clock"></i></div>
      <h2>{statusCounts["PENDING"] || 0}</h2>
    </div>
    <p>Pending Shipments</p>
  </div>

  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-truck"></i></div>
      <h2>{statusCounts["IN_TRANSIT_WHOLESALER"] || 0}</h2>
    </div>
    <p>In Transit to Wholesaler</p>
  </div>

  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-warehouse"></i></div>
      <h2>{statusCounts["WHOLESALER_RECEIVED"] || 0}</h2>
    </div>
    <p>Wholesaler Received</p>
  </div>

  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-shipping-fast"></i></div>
      <h2>{statusCounts["IN_TRANSIT_RETAILER"] || 0}</h2>
    </div>
    <p>In Transit to Retailer</p>
  </div>

  <div className="metric-card">
    <div className="metric-header">
      <div className="metric-icon"><i className="fas fa-check-circle"></i></div>
      <h2>{statusCounts["DELIVERED"] || 0}</h2>
    </div>
    <p>Delivered Shipments</p>
  </div>
  <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon"><i className="fas fa-money-bill-wave"></i></div>
          <h2>₹{totalTransactionValue.toFixed(2)}</h2>
        </div>
        <p>Total Transaction Value</p>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon"><i className="fas fa-calculator"></i></div>
          <h2>{totalTransactions}</h2>
        </div>
        <p>Total Transactions</p>
      </div>

      <div className="metric-card">
        <div className="metric-header">
        <div className="metric-icon"><i className="fas fa-rupee-sign"></i></div>
          <h2>₹{averageTransactionValue.toFixed(2)}</h2>
        </div>
        <p>Avg Transaction Value</p>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon"><i className="fas fa-thumbs-up"></i></div>
          <h2>{paidTransactions}</h2>
        </div>
        <p>Paid Transactions</p>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon"><i className="fas fa-exclamation-triangle"></i></div>
          <h2>{unpaidTransactions}</h2>
        </div>
        <p>Unpaid Transactions</p>
      </div>

  <button onClick={() => setShowMetricsGraph(prev => !prev)} className="toggle-graph-button">
    {showMetricsGraph ? "Hide Metrics Graph" : "Show Metrics Graph"}
  </button>
</div>
<div style={{display:"flex" , justifyContent:"center" , alignItems:"center"}}>
      <div >
      {showMetricsGraph && (  <div className="bar-chart-container">
        <h2 style={{
    fontSize: '30px', // Adjust font size
    color: '#6366F1', // Dark gray color
    textAlign: 'center', // Center align text
    margin: '20px 0', // Add space above and below
    fontWeight: 'bold', // Make the text bold
    textTransform: 'uppercase', // Make text uppercase
    letterSpacing: '1.5px', // Add spacing between letters
     // Space between text and underline
    width: 'fit-content', // Fit content width
    marginInline: 'auto' // Center horizontally
  }}>metrics bar graph</h2>
  <Bar 
  data={{
    ...getBarChartData(),
    datasets: [
      {
        ...getBarChartData().datasets[0],
        borderRadius: 5, // Set the border radius for each bar
      },
    ],
  }} 
  options={{
    responsive: true,
    scales: {
      x: {
        grid: {
          display: false, // Disable grid lines for the x-axis
        },
        categoryPercentage: 0.8, // Adjust this to control the bar width
        barPercentage: 0.8, // Adjust this to control the gap between bars
      },
      y: {
        beginAtZero: true,
        grid: {
          display: false, // Disable grid lines for the y-axis
        },
      },
    },
  }} 
/>


</div>
     )}
     </div>
     </div>
     <div
      style={{
        ...styles.notificationContainer,
        display: isNotificationsOpen ? 'block' : 'flex', // Dynamically toggle between 'block' and 'flex'
      }}
    >
      {/* Conditionally render the <p> tag */}
      {!isNotificationsOpen && (
        <p style={styles.notificationTitle}>Check your notifications</p>
      )}

      {/* Notifications Component */}
      <div
        onClick={handleNotificationsClick}
        style={{
          ...styles.notifications,
          width: isNotificationsOpen ? '100%' : 'auto', // Full width when open
        }}
      >
        <ManufacturerNotifications />
      </div>
    </div>
      <div className="shipment-container">
      <h2 style={{
    fontSize: '26px', // Adjust font size
    color: '#333', // Dark gray color
    textAlign: 'center', // Center align text
    margin: '20px 0', // Add space above and below
    fontWeight: 'bold', // Make the text bold
    textTransform: 'uppercase', // Make text uppercase
    letterSpacing: '1.5px', // Add spacing between letters
    borderBottom: '2px solid #FF6384', // Add an underline effect
    paddingBottom: '10px', // Space between text and underline
    width: 'fit-content', // Fit content width
    marginInline: 'auto' // Center horizontally
  }}>Shipment table</h2>
        <table className="shipment-table">
          <thead>
            <tr>
            <th>Cart ID</th>
              <th>Wholesaler Address</th>
              <th>Retailer Address</th>
              <th>Date</th>
              <th>ManuFactureAddress</th>
              
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
          {allTransactions.map((shipment, index) => {
  // Helper function to check for 42 spaces
  const isEmptyAddress = (address) => {
    if (!address) return true;
    const trimmed = address.trim();
    return trimmed === '' || trimmed === '                                          ';
  };

  return (
    <tr key={shipment.cardId}>
      <td>{shipment.cardId}</td>
      <td>
        {isEmptyAddress(shipment.receiverAddressW) ? 
          '' : 
          shipment.receiverAddressW}
      </td>
      <td>
        {isEmptyAddress(shipment.receiverAddressR) ? 
          '' : 
          shipment.receiverAddressR}
      </td>
      <td>{shipment.date}</td>
      <td>
        {isEmptyAddress(shipment.receiverAddressM) ? 
          '' : 
          shipment.receiverAddressM}
      </td>
      <td>
        <span className={getStatusClass(shipment.status)}>
          {shipment.status.replace(/_/g, " ")}
        </span>
      </td>
     <td style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          className={`ship-button ${
            showTracker[index] ? "hide-tracking" : "show-tracking"
          }`}
          onClick={() => toggleTracker(index)}
        >
          {showTracker[index] ? "Hide Status" : "Show Status"}
        </button>
        <button
          className="location-button"
          onClick={() => handleSetLocation(shipment)}
        >
          Live Tracking
        </button>
      </td>
    </tr>
  );
})}
          </tbody>
        </table>

  
        {isGeolocationMapOpen && selectedShipmentLocations && (
  <div className="geolocation-modal">
    <div className="geolocation-modal-content">
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.headerTitle}>
              <span style={{color:"orange"}}>Nirvana</span>
              <span style={{color:"blue"}}>-</span>
              <span style={{color:"green"}}>SmartChain</span> Tracking System
            </h1>
            <div style={styles.headerRight}>
              <div style={{display:'flex' , justifyContent:"center"}}>
            <span
  className="connectedText"
  style={{
    color: "#ffffff",
    backgroundColor: "#6a11cb",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "500",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
    display: "inline-block",
    marginBottom:'10px',
   
  }}
>
  Connected as: Manufacturer
</span>
</div>

              <button 
                className="close-modal-btn" 
                onClick={() => setIsGeolocationMapOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div style={styles.mapContainer}>
          <ShipmentTracking
            userRole="manufacturer"
            userId={selectedShipmentLocations.userId}
            cartId={selectedShipmentLocations.cartId}
            initialStartLocation={selectedShipmentLocations.startLocation}        // Already in coordinate format
            initialCheckpoint={selectedShipmentLocations.checkpointLocation}     // Already in coordinate format
            initialDestination={selectedShipmentLocations.destinationLocation}   // Already in coordinate format
          />
        </div>
      </div>
    </div>
  </div>
)}

        {allTransactions.map(
          (shipment, index) =>
            showTracker[index] && (
              <div key={index} className="shipment-item">
                <h3 className="h3-ship">Shipment #{shipment.cardId}</h3>
                <div className="enhanced-progress-bar">
                  <div className="progress-background"></div>
                  <div
                    className={`truck ${animating[index] ? "animate-truck" : ""}`}
                    style={{
                      left: animating[index] ? "0%" : getTruckPosition(shipment.status),
                    }}
                  >
                    <img src="media/NHC (1).png" width={95} className="truck-img" alt="truck" />
                  </div>
                  <div className="status-dot" style={{ left: "0%" }}></div>
                  <div className="status-dot" style={{ left: "25%" }}></div>
                  <div className="status-dot" style={{ left: "50%" }}></div>
                  <div className="status-dot" style={{ left: "75%" }}></div>
                  <div className="status-dot" style={{ left: "99%" }}></div>
                  <div className="status-checkpoint" style={{ left: "0%" }}>
                    Booking
                  </div>
                  <div className="status-checkpoint" style={{ left: "25%" }}>
                    In Transit to Wholesaler
                  </div>
                  <div className="status-checkpoint" style={{ left: "50%" }}>
                    Package Received
                  </div>
                  <div className="status-checkpoint" style={{ left: "75%" }}>
                    In Transit to Retailer
                  </div>
                  <div className="status-checkpoint" style={{ left: "100%" }}>
                    Completed
                  </div>
                </div>
              </div>
            )
        )}
      </div>



      {/* <PredictMedications/> */}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#F4F7FA',
    fontFamily: 'Poppins, sans-serif',
  },
  connectedText:{
    fontFamily: "'Roboto', sans-serif",
    textAlign: "center",
    padding: "50px",
    background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
    color: "white",
    borderRadius: "15px",
    boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)",
    maxWidth: "800px",
    margin: "50px auto",
    transition: "transform 0.3s ease",
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
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#333',
    letterSpacing: '0.5px',
  },
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

export default DashManu;