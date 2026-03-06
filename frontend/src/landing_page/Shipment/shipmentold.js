
import React, { useState, useEffect,useContext,createContext } from "react";
import { ethers } from 'ethers'; // ethers v6
import axios from 'axios';
import CardTransactionRegistry from "./CardTransactionRegistry.json"; // Import your ABI JSON
import SideWhole from "../SideWhole";
import SideManu from "../SideManu";
import DashManu from "../home/DashboardManu";
import './Shipment.css'; // Import the CSS file


import contractConfig from './contractAddress.json';
import { Link, useLocation } from 'react-router-dom';


export default function Dashboard() {
  
  const [walletAddress, setWalletAddress] = useState(null);// for storing connected wallet addresss
  const [contract, setContract] = useState(null);
  const [formInput, setFormInput] = useState({
    cardId: "",
    receiverAddressW: "",
    receiverAddressR: "",
    date: "",
    receiverAddressM: "",
   
    
  });
  const [errorMessage, setErrorMessage] = useState(""); // For showing errors related to transactions
  
   const [allTransactions, setAllTransactions] = useState([]); // State to store all transactions
   const [isTransactionSuccess, setIsTransactionSuccess] = useState(false); 
  

const contractAddress = contractConfig.registryAddress; /// your contract address


  
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
  useEffect(() => {
    // Block common developer tools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeydown = (e) => {
      if (
        e.key === 'F12' ||  // F12 key for developer tools
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||  // Ctrl+Shift+I for dev tools
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||  // Ctrl+Shift+J for console
        (e.ctrlKey && e.key === 'U')  // Ctrl+U for viewing page source
      ) {
        e.preventDefault();  // Prevent default behavior
        alert('Developer Tools are disabled');
      }
    };

    // Disable right-click context menu
    const disableRightClick = (e) => {
      e.preventDefault();  // Prevent right-click menu from appearing
    };

    // Add event listeners for keydown and right-click events
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('contextmenu', disableRightClick);



    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('contextmenu', disableRightClick);
    };
  }, []); 

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
  
  
  

   // Function to register a new card transaction
   const registerCardTransaction = async () => {
    if (contract) {
      const { cardId, receiverAddressW, receiverAddressR, date, receiverAddressM } = formInput;
      try {
        setErrorMessage(""); // Clear any previous error messages
        const transaction = await contract.registerCardTransaction(
          cardId,
          receiverAddressW,
          receiverAddressR,
          date,
          receiverAddressM
        );
        await transaction.wait(); // Wait for the transaction to be mined
        
        // If blockchain transaction is successful, call the backend API
        const apiResponse = await axios.post('http://127.0.0.1:5000/add_transaction', {
          cart_id: cardId,
          manu_add: receiverAddressM,
          whole_add: receiverAddressW,
          ret_add: receiverAddressR
        });
  
        // Check if API call was successful
        if (apiResponse.status === 200) {
          setFormInput({ cardId: "", receiverAddressW: "", receiverAddressR: "", date: "", receiverAddressM: "" });
          fetchAllTransactions(); // Refresh the all transactions list after registering
          setIsTransactionSuccess(true);
          console.log("Transaction registered successfully in both blockchain and database");
        } else {
          throw new Error("Failed to add transaction to database");
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.reason || error.message || "An unknown error occurred";
        setErrorMessage(
          error.message.includes("Transaction with this card ID already exists")
            ? "Transaction with this card ID already exists!"
            : errorMsg
        );
        setIsTransactionSuccess(false);
        console.error("Error registering transaction:", errorMsg);
      }
    }
  };
  
   
    
  const fetchAllTransactions = async () => {
    if (contract) {
        try {
            const [
                cardIds,
                receiverAddressesW,
                receiverAddressesR,
                dates,
                receiverAddressM,
                
                statuses
            ] = await contract.getAllTransactions();

            // Filter and directly format the transactions for the matching wallet address
            const formattedTransactions = [];
            for (let i = 0; i < cardIds.length; i++) {
                if (receiverAddressM[i] === walletAddress) {
                    formattedTransactions.push({
                        cardId: cardIds[i],
                        receiverAddressW: receiverAddressesW[i],
                        receiverAddressR: receiverAddressesR[i],
                        date: dates[i],
                        receiverAddressM: receiverAddressM[i],
                        
                        status: statuses[i] // This will now be a string
                    });
                }
            }

            // Set the state
            setAllTransactions(formattedTransactions);
            setErrorMessage(""); // Clear any error messages
        } catch (error) {
            console.error("Error fetching all transactions:", error.message || JSON.stringify(error));
            setErrorMessage("Error fetching all transactions.");
        }
    }
};



  // Function to fetch transactions by multiple fields for wholesaler
  const fetchCardTransactionW = async () => {
    if (contract) {
      const { cardId, receiverAddressW,receiverAddressR, date } = formInput;
      try {
        const transactionData = await contract.searchCardTransactionW(
          cardId,
          date,
          
          walletAddress,
          receiverAddressR,
          
          
        );
        await transactionData.wait(); // Wait for the transaction to be mined
       
        fetchAllTransactions(); // Refresh the all transactions list after registering
        setErrorMessage(""); // Clear any previous error messages
      } catch (error) {
        const errorMsg = error.reason || error.message || "An unknown error occurred";
        console.error("Error fetching card transaction:", errorMsg);
        setErrorMessage(errorMsg);
      }
    }
  };

// Function to fetch transactions by multiple fields for wholesaler
const fetchCardTransactionWR = async () => {
  if (contract) {
    // const { cardId, receiverAddress, date, distance, pricePerUnit, status } = formInput;
    const { cardId, receiverAddressW,receiverAddressR, date} = formInput;
    try {
      const transactionData = await contract.searchCardTransactionWR(
        cardId,
        date,
        
         walletAddress,
        receiverAddressR,
       
        
      );
      await transactionData.wait(); // Wait for the transaction to be mined
     
      fetchAllTransactions(); // Refresh the all transactions list after registering
      setErrorMessage(""); // Clear any previous error messages
    } catch (error) {
      const errorMsg = error.reason || error.message || "An unknown error occurred";
      console.error("Error fetching card transaction:", errorMsg);
      setErrorMessage(errorMsg);
    }
  }
};


// Function to fetch transactions by multiple fields for retail
const fetchCardTransactionR = async () => {
  if (contract) {
    // const { cardId, receiverAddress, date, distance, pricePerUnit, status } = formInput;
    const { cardId, receiverAddressW,receiverAddressR, date,  } = formInput;
    try {
      const transactionData = await contract.searchCardTransactionR(
        cardId,
        date,
       
        receiverAddressW,
        walletAddress,
        
        
      );
      await transactionData.wait(); // Wait for the transaction to be mined
     
      fetchAllTransactions(); // Refresh the all transactions list after registering
      setErrorMessage(""); // Clear any previous error messages
    } catch (error) {
      const errorMsg = error.reason || error.message || "An unknown error occurred";
      console.error("Error fetching card transaction:", errorMsg);
      setErrorMessage(errorMsg);
    }
  }
};


  const scanQrCode = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:5000/scan_qr");
      const qrData = response.data.qr_data; // Get the string response
      console.log("Raw QR DATA" ,qrData)

    

      setFormInput({
        cardId: qrData.cart_id || "",
        receiverAddressM: qrData.recivers_addressM || "",
        receiverAddressW: qrData.recivers_addressW || "",
        receiverAddressR: qrData.recivers_addressR || "",
        date: qrData.Date || ""
      });
      console.log("Form input" , formInput)
    } catch (error) {
      console.error("Error scanning QR code:", error.message || JSON.stringify(error));
      setErrorMessage(   error.response?.data?.error || 
        error.message || 
        "Error scanning QR code. Please try again.");
    }
  };


  const lockMetaMask = async () => {
    try {
      // Revoke permissions for eth_accounts
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      setWalletAddress(null);
      setContract(null);
      setErrorMessage("Wallet permissions revoked. Reconnect to continue.");
    } catch (error) {
      console.error("Failed to revoke MetaMask permissions:", error);
      setErrorMessage("Failed to revoke MetaMask permissions.");
    }
  };
  
  const [activeLink, setActiveLink] = useState('');
  // Set active link
   const handleLinkClick = (link) => {
    setActiveLink(link);
    lockMetaMask();
};


  return (
    <>
    

      <SideManu />
     
      <div className="dash-board">
      <div className="dashboard-cont">

      <div className="connect-button"  onClick={loadContract}>
  Connected Wallet: {walletAddress ? walletAddress : "No wallet connected"}
</div>    

 
   



            
{errorMessage && <p className="dashboard-error-message">{errorMessage}</p>}
{/* <p style={{fontWeight:"700"}}>Cart ID:</p>
          <input
            className="dashboard-input"
            placeholder="Card ID"
            value={formInput.cardId}
            onChange={(e) => setFormInput({ ...formInput, cardId: e.target.value })}
          />
           <p style={{fontWeight:"700"}}>Wholesaler Address</p>
          <input
            
            className="dashboard-input"
            placeholder="Receiver Addressw"
            value={formInput.receiverAddressW}
            onChange={(e) => setFormInput({ ...formInput, receiverAddressW: e.target.value })}
          />
          <p style={{fontWeight:"700"}}>Retailer Address</p> 
          <input
            className="dashboard-input"
            placeholder="Receiver AddressR"
            value={formInput.receiverAddressR}
            onChange={(e) => setFormInput({ ...formInput, receiverAddressR: e.target.value })}
          />
          <p style={{fontWeight:"700"}}>Date</p>
          <input
            type="date"
            className="dashboard-input"
            placeholder="Date"
            value={formInput.date}
            onChange={(e) => setFormInput({ ...formInput, date: e.target.value })}
          />
          <p style={{fontWeight:"700"}}>ManuFactureAddress</p>
          <input
            className="dashboard-input"
            placeholder="ManuFcatureAddress"
            value={formInput.receiverAddressM}
            onChange={(e) => setFormInput({ ...formInput, receiverAddressM: e.target.value })}
          /> */}
          




        
{/* New table to display all transactions */}
<div className="dashboard-content">
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
  }}>All transactions</h2>
            <table className="shipment-tracking-table">
              <thead>
                <tr>
                <th>Cart ID</th>
          <th>Wholesaler Address</th>
          <th>Retailer Address</th>
          <th>Date</th>
          <th>ManuFactureAddress</th>
          
          <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((tx, index) => (
                  <tr key={index}>
                   <td>{tx.cardId}</td>
            <td>{tx.receiverAddressW}</td>
            <td>{tx.receiverAddressR}</td>
            <td>{tx.date}</td>
            <td>{tx.receiverAddressM}</td>
            
            <td>{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
         


             
          <div className="dashboard-content dashboard-qr-data">
          <h2 style={{
    fontSize: '26px', // Adjust font size
    marginTop:'0px',
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
  }}>qr contents</h2>
             {formInput && Object.keys(formInput).length > 0 ? (
          <div>
            <p>Cart ID: {formInput.cardId}</p>
            <p>Manufacturer Address: {formInput.receiverAddressM}</p>
            <p>Wholesaler Address: {formInput.receiverAddressW}</p>
            <p>Retailer Address: {formInput.receiverAddressR}</p>
            <p>Date: {formInput.date}</p>
          </div>
        ) : (
          <p>No QR data available. Please scan a QR code.</p>
        )}
      </div>

        {isTransactionSuccess && (
            <p className="dashboard-success-message">Transaction registered successfully!</p>
          )}
<div className="button-qr-scan">
        <button className="dashboard-scan-button" onClick={scanQrCode}>Scan QR</button>
        <button className="dashboard-register-button" onClick={registerCardTransaction}>Register QR</button> 
        </div>
        
          

        
      </div>
      </div>
    </>
  );
}