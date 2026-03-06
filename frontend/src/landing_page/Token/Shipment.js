//New Shipment.js code
import React, { useState, useEffect } from "react";
import { ethers } from 'ethers'; // ethers v6
import axios from 'axios';
import CardTransactionRegistry from "./CardTransactionRegistry.json"; // Import your ABI JSON
import NirvanaTokenABI from "./NirvanaToken.json"; // Import the token ABI
import SideManu from "../SideManu";
import './Shipment.css'; // Import the CSS file

import contractConfig from './contractAddress.json';

export default function Dashboard() {
  
  const [walletAddress, setWalletAddress] = useState(null);// for storing connected wallet addresss
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isAddressWhitelisted, setIsAddressWhitelisted] = useState(false);
  const [transactionFee, setTransactionFee] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [formInput, setFormInput] = useState({
    cardId: "",
    receiverAddressW: "",
    receiverAddressR: "",
    date: "",
    receiverAddressM: "",
  });
  const [errorMessage, setErrorMessage] = useState(""); // For showing errors related to transactions
  const [hashMismatchError, setHashMismatchError] = useState(""); // For hash mismatch
  const [allTransactions, setAllTransactions] = useState([]); // State to store all transactions
  const [isTransactionSuccess, setIsTransactionSuccess] = useState(false); 
  
const contractAddress = contractConfig.registryAddress; // Your registry contract address
  const tokenAddress = contractConfig.tokenAddress; // Your token contract address

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

  useEffect(() => {
    const init = async () => {
      await loadContract();
      setErrorMessage("");
      setHashMismatchError("");
    };
    init();
  }, []);

  useEffect(() => {
    if (contract && walletAddress) {
      fetchAllTransactions();
      fetchTokenDetails();
      setErrorMessage(""); // Call this only after the contract and wallet address are set
      setHashMismatchError("");  
    }
  }, [contract, walletAddress, tokenContract]);

  const loadContract = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const checksummedAddress = ethers.getAddress(accounts[0]);
        setWalletAddress(checksummedAddress); 
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(checksummedAddress);
        
        // Initialize the registry contract
        const cardTransactionRegistry = new ethers.Contract(
          contractAddress,
          CardTransactionRegistry.abi,
          signer
        );
        setContract(cardTransactionRegistry);
        
        // Get token address from the registry contract
        const tokenContractAddress = await cardTransactionRegistry.getTokenAddress();
        
        // Initialize the token contract
        const nirvanaToken = new ethers.Contract(
          tokenContractAddress,
          NirvanaTokenABI.abi,
          signer
        );
        setTokenContract(nirvanaToken);
        
        setErrorMessage("");
        setHashMismatchError("");
      } catch (error) {
        console.error("Error loading contracts:", error);
        setErrorMessage("Failed to load contracts: " + (error.message || "Unknown error"));
      }
    } else {
      setErrorMessage("MetaMask is not installed or not accessible");
    }
  };

  const fetchTokenDetails = async () => {
    if (tokenContract && walletAddress && contract) {
      try {
        // Get token balance
        const balance = await tokenContract.balanceOf(walletAddress);
        setTokenBalance(ethers.formatEther(balance));
        
        // Check if address is whitelisted
        const isWhitelisted = await tokenContract.isWhitelisted(walletAddress);
        setIsAddressWhitelisted(isWhitelisted);
        
        // Get transaction fee
        const fee = await contract.transactionFee();
        setTransactionFee(ethers.formatEther(fee));
        
        // Get token allowance for the contract
        const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        setAllowance(ethers.formatEther(currentAllowance));
      } catch (error) {
        console.error("Error fetching token details:", error);
        setErrorMessage("Failed to fetch token details: " + (error.message || "Unknown error"));
      }
    }
  };

  const approveTokenSpending = async () => {
    if (tokenContract) {
      try {
        const decimals = await tokenContract.decimals();
        const approvalAmount = ethers.parseUnits("1000", decimals); // Approve 1000 tokens
        
        const transaction = await tokenContract.approve(contractAddress, approvalAmount);
        await transaction.wait();
        
        // Update allowance after approval
        const newAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        setAllowance(ethers.formatEther(newAllowance));
        
        setErrorMessage("");
        setHashMismatchError("");
        alert("Token spending approved successfully!");
      } catch (error) {
        console.error("Error approving token spending:", error);
        setErrorMessage("Failed to approve token spending: " + (error.message || "Unknown error"));
      }
    }
  };

  const handleTransactionError = (error) => {
    // Reset both errors first
    setHashMismatchError("");
    setErrorMessage("");
  
    if (error.message && error.message.includes("Hash mismatch")) {
      const hashData = error.reason.slice(15);
      
      // Immediately check conditions and set appropriate error message
      if (hashData.slice(0, 42) !== walletAddress) {
        setErrorMessage("manufacture wallet address mismatch");
      } 
       if (hashData.slice(42, 84) !== formInput.receiverAddressW) {
        setErrorMessage("Wholesaler wallet address mismatch");
      }
       if (hashData.slice(84, 126) !== formInput.receiverAddressR) {
        setErrorMessage("Retailer wallet address mismatch");
      } 
       if (hashData.slice(126, 136) !== formInput.date) {
        setErrorMessage("Date mismatch");
      }
      
      setHashMismatchError(hashData);
      console.log(errorMessage);
    } else if (error.message && error.message.includes("ERC20: transfer to non-whitelisted address")) {
      setErrorMessage("Cannot transfer to a non-whitelisted address!");
    } else if (error.message && error.message.includes("Fee payment failed")) {
      setErrorMessage("Transaction fee payment failed. Please check your token balance and allowance.");
    } else {
      setErrorMessage(error.reason || error.message || "An unknown error occurred");
      console.log(errorMessage);
    }
  };

  const registerCardTransaction = async () => {
    if (contract && tokenContract) {
      const { cardId, receiverAddressW, receiverAddressR, date, receiverAddressM } = formInput;

      // Check retailer address is whitelisted if it's provided
      if (receiverAddressR && receiverAddressR.length === 42) {
        try {
          const isRetailerWhitelisted = await tokenContract.isWhitelisted(receiverAddressR);
          if (!isRetailerWhitelisted) {
            setErrorMessage("Retailer address is not whitelisted!");
            return;
          }
        } catch (error) {
          setErrorMessage("Failed to verify retailer whitelist status");
          return;
        }
      }

      // Check wholesaler address is whitelisted if it's provided
      if (receiverAddressW && receiverAddressW.length === 42) {
        try {
          const isWholesalerWhitelisted = await tokenContract.isWhitelisted(receiverAddressW);
          if (!isWholesalerWhitelisted) {
            setErrorMessage("Wholesaler address is not whitelisted!");
            return;
          }
        } catch (error) {
          setErrorMessage("Failed to verify wholesaler whitelist status");
          return;
        }
      }

      const mergedReceiverAddressW = receiverAddressW || "                                          ";
      const mergedReceiverAddressR = receiverAddressR || "                                          ";
      
      const merged = walletAddress + mergedReceiverAddressW + mergedReceiverAddressR + date + cardId;
      try {
        // Check if we have enough allowance
        const fee = await contract.transactionFee();
        const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        
        if (currentAllowance.lt(fee)) {
          setErrorMessage("Insufficient token allowance. Please approve tokens first.");
          return;
        }
        
        const transaction = await contract.registerCardTransaction(merged);
        await transaction.wait();
        
        // Add API call after blockchain transaction is successful
        const apiResponse = await axios.post('http://127.0.0.1:5000/add_transaction', {
          cart_id: cardId,
          manu_add: receiverAddressM,
          whole_add: receiverAddressW,
          ret_add: receiverAddressR
        });

        // Check if API call was successful
        if (apiResponse.status === 200) {
          setFormInput({ cardId: "", receiverAddressW: "", receiverAddressR: "", date: "", receiverAddressM: "" });
          fetchAllTransactions();
          fetchTokenDetails(); // Update token details after transaction
          setErrorMessage(""); // Clear any previous error messages
          setHashMismatchError("");
          setIsTransactionSuccess(true);
          console.log("Transaction registered successfully in both blockchain and database");
        } else {
          throw new Error("Failed to add transaction to database");
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.reason || error.message || "An unknown error occurred";
        handleTransactionError(error);
        setIsTransactionSuccess(false);
        console.error("Error registering transaction:", errorMsg);
      }
    }
  };

  // Function to fetch transactions by multiple fields for wholesaler
  const fetchCardTransactionWR = async () => {
    if (contract) {
      const { cardId, receiverAddressW, receiverAddressR, date, receiverAddressM } = formInput;
      const merged = walletAddress + receiverAddressW + "                                          " + date + cardId;
      
      try {
        // Check if we have enough allowance
        const fee = await contract.transactionFee();
        const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        
        if (currentAllowance.lt(fee)) {
          setErrorMessage("Insufficient token allowance. Please approve tokens first.");
          return;
        }
        
        const transactionData = await contract.searchCardTransactionWR(merged);
        await transactionData.wait(); // Wait for the transaction to be mined
        console.log(transactionData);
        fetchAllTransactions(); // Refresh the all transactions list after registering
        fetchTokenDetails(); // Update token details after transaction
        setErrorMessage(""); // Clear any previous error messages
        setHashMismatchError("");
      } catch (error) {
        handleTransactionError(error);
      }
    }
  };

  const registerCardTransactionW = async () => {
    if (contract) {
      const { cardId, receiverAddressW, receiverAddressR, date, receiverAddressM } = formInput;
      
      // Check retailer address is whitelisted if it's provided
      if (receiverAddressR && receiverAddressR.length === 42) {
        try {
          const isRetailerWhitelisted = await tokenContract.isWhitelisted(receiverAddressR);
          if (!isRetailerWhitelisted) {
            setErrorMessage("Retailer address is not whitelisted!");
            return;
          }
        } catch (error) {
          setErrorMessage("Failed to verify retailer whitelist status");
          return;
        }
      }
      
      try {
        // Check if we have enough allowance
        const fee = await contract.transactionFee();
        const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        
        if (currentAllowance.lt(fee)) {
          setErrorMessage("Insufficient token allowance. Please approve tokens first.");
          return;
        }
        
        const merged = "                                          " + receiverAddressW + receiverAddressR + date + cardId;
      
        const transaction = await contract.registerCardTransactionW(merged);
        await transaction.wait(); 
        setFormInput({ cardId: "", receiverAddressW: "", receiverAddressR: "", date: "", receiverAddressM: "" });
        fetchAllTransactions(); 
        fetchTokenDetails(); // Update token details after transaction
        setErrorMessage(""); // Clear any previous error messages
        setHashMismatchError("");
      } catch (error) {
        handleTransactionError(error);
      }
    }
  };
  
  // Function to fetch transactions by multiple fields for wholesaler
  const fetchCardTransactionR = async () => {
    if (contract) {
      const { cardId, receiverAddressW, receiverAddressR, date, receiverAddressM } = formInput;
      const mergedReceiverAddressW = receiverAddressW || "                                          ";
      const mergedReceiverAddressM = receiverAddressM || "                                          ";
      
      const merged = mergedReceiverAddressM + mergedReceiverAddressW + receiverAddressR + date + cardId;
      
      try {
        // Check if we have enough allowance
        const fee = await contract.transactionFee();
        const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        
        if (currentAllowance.lt(fee)) {
          setErrorMessage("Insufficient token allowance. Please approve tokens first.");
          return;
        }
        
        const transactionData = await contract.searchCardTransactionR(merged);
        await transactionData.wait(); // Wait for the transaction to be mined
        console.log(transactionData);
        fetchAllTransactions(); // Refresh the all transactions list after registering
        fetchTokenDetails(); // Update token details after transaction
        setErrorMessage(""); // Clear any previous error messages
        setHashMismatchError("");
      } catch (error) {
        handleTransactionError(error);
      }
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

  const scanQrCode = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/scan_qr");
      const qrData = response.data.qr_data; // Get the string response
      console.log("Raw QR DATA", qrData)
  
      setFormInput({
        cardId: qrData.cart_id || "",
        receiverAddressM: qrData.receivers_addressM || "",
        receiverAddressW: qrData.receivers_addressW || "",
        receiverAddressR: qrData.receivers_addressR || "",
        date: qrData.date || ""
      });
      console.log("Form input", formInput)
    } catch (error) {
      console.error("Error scanning QR code:", error.message || JSON.stringify(error));
      setErrorMessage(
        error.response?.data?.error || 
        error.message || 
        "Error scanning QR code. Please try again."
      );
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
      setTokenContract(null);
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

      <div className="connect-button" onClick={loadContract}>
          Connected Wallet: {walletAddress ? walletAddress : "No wallet connected"}
        </div>

        {/* Token Information Section */}
        <div className="token-info-section">
          <h3>Nirvana Token (NSC) Information</h3>
          <div className="token-info-grid">
            <div className="token-info-item">
              <span className="token-info-label">Balance:</span>
              <span className="token-info-value">{tokenBalance} NSC</span>
            </div>
            <div className="token-info-item">
              <span className="token-info-label">Whitelisted:</span>
              <span className="token-info-value">{isAddressWhitelisted ? "Yes" : "No"}</span>
            </div>
            <div className="token-info-item">
              <span className="token-info-label">Transaction Fee:</span>
              <span className="token-info-value">{transactionFee} NSC</span>
            </div>
            <div className="token-info-item">
              <span className="token-info-label">Allowance:</span>
              <span className="token-info-value">{allowance} NSC</span>
              <button className="approve-button" onClick={approveTokenSpending}>
                Approve Token Spending
              </button>
            </div>
          </div>
        </div>

        {errorMessage && <p className="dashboard-error-message">{errorMessage}</p>}
        
        <div className="dashboard-content">
          <h2 className="dashboard-heading">Register Card Transaction</h2>
          {/* Form to input transaction details */}
          <p style={{fontWeight:"700"}}>Cart ID</p>
          <input className="dashboard-input" placeholder="Card ID" value={formInput.cardId} onChange={(e) => setFormInput({ ...formInput, cardId: e.target.value })} />
          <p style={{fontWeight:"700"}}>Wholesaler Address</p>
          <input className="dashboard-input" placeholder="Receiver AddressW" value={formInput.receiverAddressW} onChange={(e) => setFormInput({ ...formInput, receiverAddressW: e.target.value })} />
          <p style={{fontWeight:"700"}}>Retailer Address</p>
          <input className="dashboard-input" placeholder="Receiver AddressR" value={formInput.receiverAddressR} onChange={(e) => setFormInput({ ...formInput, receiverAddressR: e.target.value })} />
          <p style={{fontWeight:"700"}}>Date</p>
          <input type="date" className="dashboard-input" placeholder="Date" value={formInput.date} onChange={(e) => setFormInput({ ...formInput, date: e.target.value })} />
          <p style={{fontWeight:"700"}}>Manufacturer Address</p>
          <input disabled value={walletAddress} className="dashboard-input" placeholder="Manufacture Address" onChange={(e) => setFormInput({ ...formInput, receiverAddressM: e.target.value })} />
        </div>

        <div className="dashboard-content">
          <h1 className="dashboard-subheading">All Transactions</h1>
          <table className="shipment-tracking-table">
            <thead>
              <tr>
                <th>Card ID</th>
                <th>Wholesaler Address</th>
                <th>Retailer Address</th>
                <th>Date</th>
                <th>Manufacture Address</th>
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
            fontSize: '26px',
            marginTop:'0px',
            color: '#333',
            textAlign: 'center',
            margin: '20px 0',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            borderBottom: '2px solid #FF6384',
            paddingBottom: '10px',
            width: 'fit-content',
            marginInline: 'auto'
          }}>QR Contents</h2>
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









              I have already deployed a smart contract and I am using MetaMask as my wallet. The contract is deployed on the mainnet, and I am using the Polygon Amoy network for transactions. I have provided the smart contract and the associated JavaScript code. I am creating my own custom token, and all transactions must be conducted only using my token, not using the native Amoy MATIC. I want to implement a whitelist system, but I do not require any database or admin panel at this stage. The list of allowed wallet addresses should be stored directly on-chain inside the smart contract. Only addresses manually added to the smart contract whitelist should be allowed to receive token transfers. Any attempt to transfer tokens to an unregistered (non-whitelisted) address should fail automatically. Please ensure the smart contract and frontend code are designed accordingly

You dont need to show any users the other whitelisted members , you dont need to show any thing like that to any users just make sure we want to transact through our token name NSC full name Nirvana Token make sure the gas fee will be as low as rupees 0.01