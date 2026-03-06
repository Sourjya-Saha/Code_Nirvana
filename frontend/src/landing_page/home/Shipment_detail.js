import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar";
import "./ShipmentTracker.css"; // For styling
import { ethers } from "ethers"; // ethers v6
import CardTransactionRegistry from "./CardTransactionRegistry.json"; // Import your ABI JSON
import contractConfig from '../Shipment/contractAddress.json';
import Nav from "./Nav";
import AddCartProducts from "./AddCartButton";
import GeolocationMap from "../Googlemaps/GeolocationMap";
import axios from 'axios';
import { useAuth } from '../user_login/AuthContext';
import ShipmentTracking from "../Googlemaps/ShipmentTracking.js";


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
  

export default function Shipment_Details(){
      const { userId } = useAuth();
  const [walletAddress, setWalletAddress] = useState(null);// for storing connected wallet addresss
    const [contract, setContract] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]); // Updated: use for shipment data
  const [showTracker, setShowTracker] = useState([]);
  const [animating, setAnimating] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
   const [startLocation, setStartLocation] = useState(null);
    const [checkpointLocation, setCheckpointLocation] = useState(null);
    const [destinationLocation, setDestinationLocation] = useState(null);
    const [selectedShipmentLocations, setSelectedShipmentLocations] = useState(null);
    const [isGeolocationMapOpen, setIsGeolocationMapOpen] = useState(false);
    const [selectedCartId, setSelectedCartId] = useState(null);
const contractAddress = contractConfig.registryAddress;

  useEffect(() => {
    const init = async () => {
      await loadContract();
    };
    init();
  }, []);

  useEffect(() => {
    if (contract && walletAddress) {
      fetchAllTransactions(); // Call this only after the contract and wallet address are set
    }
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
      setContract(cardTransactionRegistry);
    }
  };
   

  const fetchAllTransactions = async () => {
    if (contract) {
      try {
        const [cardIds, strhash, statuses] = await contract.getAllTransactions();
        const formattedTransactions = [];

        for (let i = 0; i < cardIds.length; i++) {
           if (strhash[i].slice(84, 126) === walletAddress) { // Match the address properly
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

        setAllTransactions(formattedTransactions); // Update local state
        setShowTracker(Array(formattedTransactions.length).fill(false)); // Set tracking visibility state
        setAnimating(Array(formattedTransactions.length).fill(false)); // Set animation state
      } catch (error) {
        console.error(
          "Error fetching all transactions:",
          error.message || JSON.stringify(error)
        );
        setErrorMessage("Error fetching all transactions.");
      }
    }
  };
  const addNotification = (message, type = 'info') => {
    // You can integrate this with your existing notification system
    // For now, we'll use alert as a fallback
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
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
      }, 100);
    }
  };

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


  const handleAddCart = async (cartId, manufacturerAddress, wholesalerAddress) => {
    try {
        // Helper function to check if address is empty (42 spaces)
        const isAddressEmpty = (address) => !address || address.trim() === "                                          ";
        
        // Check addresses
        const isWholesalerPresent = !isAddressEmpty(wholesalerAddress);
        const isManufacturerPresent = !isAddressEmpty(manufacturerAddress);
        
        let apiUrl;
        
        if (isWholesalerPresent) {
            // If wholesaler address is present, use whole inventory API
            apiUrl = 'http://localhost:5000/addCartToProductsWholeInventory';
            console.log("Calling whole inventory API - Wholesaler present");
        } else if (isManufacturerPresent) {
            // If manufacturer address is present, use regular add products API
            apiUrl = 'http://localhost:5000/addCartToProducts';
            console.log("Calling regular add products API - Manufacturer present");
        } else {
            addNotification('Error: Neither manufacturer nor wholesaler address found', 'error');
            return;
        }

        console.log(`Using API: ${apiUrl}`);
        console.log('Wholesaler Address:', wholesalerAddress);
        console.log('Manufacturer Address:', manufacturerAddress);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cart_id: cartId,
                user_id: userId,
            }),
        });

        const data = await response.json();

        if (response.ok && data.inserted_product_ids) {
            const productCount = data.inserted_product_ids.length;
            const apiType = isWholesalerPresent ? "Whole Inventory" : "Regular";
            
            addNotification(
                `Successfully added ${productCount} products from cart ${cartId} (${apiType} API).\n` +
                `Product IDs: ${data.inserted_product_ids.join(', ')}`,
                'success'
            );
        } else {
            addNotification(
                'Failed to add products to cart: No products were inserted', 
                'error'
            );
        }
    } catch (error) {
        addNotification(
            `Error adding products to cart: ${error.message}`, 
            'error'
        );
    }
};

return(
    <>
    <div className="dash-board">
        <Sidebar/>
   
    <div className='dashboard-container'>
            <Nav/>
          

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
            {allTransactions.map((shipment, index) => (
              <tr key={shipment.cardId}>
                <td>{shipment.cardId}</td>
                <td>{shipment.receiverAddressW}</td>
                <td>{shipment.receiverAddressR}</td>
                <td>{shipment.date}</td>
                <td>{shipment.receiverAddressM}</td>
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
                    {showTracker[index] ? "Hide Tracking" : "Show Tracking"}
                  </button>
                  <button
                      className="location-button"
                      onClick={() => handleSetLocation(shipment)}
                    >
                      Live Tracking
                    </button>
                    <button
    className="location-button"
    onClick={() => handleAddCart(
        shipment.cardId, 
        shipment.receiverAddressM,
        shipment.receiverAddressW
    )}
    disabled={shipment.status !== "DELIVERED"}
    style={{
        backgroundColor: shipment.status === "DELIVERED" ? '#4CAF50' : '#cccccc',
        cursor: shipment.status === "DELIVERED" ? 'pointer' : 'not-allowed',
        opacity: shipment.status === "DELIVERED" ? 1 : 0.6,
        transition: 'all 0.3s ease'
    }}
    title={shipment.status !== "DELIVERED" ? 
        "Available after delivery" : 
        "Add cart products"}
>
    Add Cart
</button>
                </td>
              </tr>
            ))}
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
  Connected as: Retailer
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
            userRole="wholesaler"
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





    </div>
    </div>
    </>
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
    backgroundColor: '#FFF',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
};
