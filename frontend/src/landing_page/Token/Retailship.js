import React, { useState, useEffect } from "react";
import { ethers } from 'ethers'; // ethers v6
import axios from 'axios';
import CardTransactionRegistry from "./CardTransactionRegistry.json"; // Import your ABI JSON
import NirvanaTokenABI from "./NirvanaToken.json"; // Import the token ABI
import Sidebar from "../Sidebar";
import './Shipment.css'; // Import the CSS file

import contractConfig from './contractAddress.json';

export default function RetailShip() {
  // State variables
  const [walletAddress, setWalletAddress] = useState(null);
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
  const [errorMessage, setErrorMessage] = useState("");
  const [hashMismatchError, setHashMismatchError] = useState("");
  const [allTransactions, setAllTransactions] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [isQrScanned, setIsQrScanned] = useState(false);
  const [isTransactionSuccess, setIsTransactionSuccess] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Calculate pagination values
  const pages = Math.ceil(allTransactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = allTransactions.slice(indexOfFirstItem, indexOfLastItem);

  // Contract addresses from config
const contractAddress = contractConfig.registryAddress; // Registry contract address
  const tokenAddress = contractConfig.tokenAddress; // Token contract address

  // Security measures to prevent developer tools
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

  // Initialize contract connection
  useEffect(() => {
    const init = async () => {
      await loadContract();
      setErrorMessage("");
      setHashMismatchError("");
    };
    init();
  }, []);

  // Fetch transactions when contract and wallet are ready
  useEffect(() => {
    if (contract && walletAddress) {
      fetchAllTransactions();
      fetchTokenDetails();
      setErrorMessage("");
      setHashMismatchError("");
    }
  }, [contract, walletAddress, tokenContract]);

  // Get pagination group for display
  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    return new Array(Math.min(5, pages - start)).fill().map((_, idx) => start + idx + 1);
  };

  // Load contract and connect to wallet
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

  // Fetch token details (balance, whitelist status, fees)
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

  // Approve token spending by the contract
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

  // Handle transaction errors with custom error messages
  const handleTransactionError = (error) => {
    // Reset both errors first
    setHashMismatchError("");
    setErrorMessage("");
    
    if (error.message && error.message.includes("Hash mismatch")) {
      const hashData = error.reason ? error.reason.slice(15) : "";
      
      // Check specific field mismatches
      if (hashData.slice(0, 42) !== formInput.receiverAddressM) {
        setErrorMessage("Manufacturer wallet address mismatch");
      } 
      else if (hashData.slice(42, 84) !== formInput.receiverAddressW) {
        setErrorMessage("Wholesaler wallet address mismatch");
      }
      else if (hashData.slice(84, 126) !== walletAddress) {
        setErrorMessage("Retailer wallet address mismatch");
      } 
      else if (hashData.slice(126, 136) !== formInput.date) {
        setErrorMessage("Date mismatch");
      }
      
      setHashMismatchError(hashData);
    } else if (error.message && error.message.includes("ERC20: transfer to non-whitelisted address")) {
      setErrorMessage("Cannot transfer to a non-whitelisted address!");
    } else if (error.message && error.message.includes("Fee payment failed")) {
      setErrorMessage("Transaction fee payment failed. Please check your token balance and allowance.");
    } else {
      setErrorMessage(error.reason || error.message || "An unknown error occurred");
    }
  };

  // Fetch all transactions for the connected retailer
  const fetchAllTransactions = async () => {
    if (contract) {
      try {
        const [cardIds, strhash, statuses] = await contract.getAllTransactions();
        const formattedTransactions = [];

        for (let i = 0; i < cardIds.length; i++) {
          // Only include transactions where this retailer is the receiver
          if (strhash[i].slice(84, 126) === walletAddress) {
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

  // Validate card transaction data on the blockchain
  const fetchCardTransactionR = async () => {
    if (contract) {
      const { cardId, receiverAddressW, receiverAddressR, date, receiverAddressM } = formInput;
      
      // Handle empty addresses with proper spacing (42 characters)
      const mergedReceiverAddressW = (receiverAddressW && receiverAddressW.length === 42) ? 
        receiverAddressW : "                                          ";
      const mergedReceiverAddressM = (receiverAddressM && receiverAddressM.length === 42) ? 
        receiverAddressM : "                                          ";
      
      const merged = mergedReceiverAddressM + mergedReceiverAddressW + walletAddress + date + cardId;
      
      try {
        // Check if we have enough allowance
        if (tokenContract) {
          const fee = await contract.transactionFee();
          const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
          
          if (currentAllowance.lt(fee)) {
            setErrorMessage("Insufficient token allowance. Please approve tokens first.");
            return;
          }
        }
        
        const transactionData = await contract.searchCardTransactionR(merged);
        await transactionData.wait();
        
        fetchAllTransactions(); // Refresh transactions
        fetchTokenDetails(); // Update token details
        setErrorMessage("");
        setHashMismatchError("");
        setIsTransactionSuccess(true);
        alert("Transaction validated successfully!");
      } catch (error) {
        handleTransactionError(error);
        setIsTransactionSuccess(false);
      }
    }
  };

  // Load Razorpay script for payment handling
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  // Create Razorpay order for payment
  const createRazorpayOrder = async () => {
    if (!formInput.cardId) {
      setErrorMessage("No cart ID found. Please scan QR first.");
      return;
    }
  
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setErrorMessage("Failed to load payment system. Please try again.");
        return;
      }
  
      const isManufacturerEmpty = !formInput.receiverAddressM || 
        formInput.receiverAddressM === "                                          ";
      const isWholesalerEmpty = !formInput.receiverAddressW || 
        formInput.receiverAddressW === "                                          ";
  
      let endpoint = '';
      if (isWholesalerEmpty) {
        endpoint = '/create_razorpay_order_transactions_ret_to_manu';
      } else if (isManufacturerEmpty) {
        endpoint = '/create_razorpay_order_transactions_ret_to_whole';
      } else {
        // Both addresses present - default to payment to wholesaler
        endpoint = '/create_razorpay_order_transactions_ret_to_whole';
      }
  
      const response = await axios.post(`http://127.0.0.1:5000${endpoint}`, {
        cart_id: formInput.cardId
      });
  
      if (response.data.error) {
        setErrorMessage(response.data.error);
        return;
      }
  
      setRazorpayOrderData(response.data);
  
      const options = {
        key: 'rzp_test_2EpPSCTb8XHFCk',
        amount: response.data.total_amount * 100,
        currency: "INR",
        name: 'Cart Transaction',
        description: `Payment for cart validation to ${isWholesalerEmpty ? 'Manufacturer' : 'Wholesaler'}`,
        order_id: response.data.razorpay_order_id,
        handler: function (paymentResponse) {
          // Store verification endpoint
          const verifyEndpoint = isWholesalerEmpty ? 
            '/confirm_order_payment_transactions_ret_to_manu' : 
            '/confirm_order_payment_transactions_ret_to_whole';
          
          // Make the verification call
          axios.post(
            `http://127.0.0.1:5000${verifyEndpoint}`,
            {
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              temp_order_data: response.data.temp_order_data
            },
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )
          .then(verifyResponse => {
            if (verifyResponse.data.status === 'success') {
              setPaymentStatus('completed');
              setErrorMessage("Payment successful! You can now validate the QR.");
            } else {
              setErrorMessage("Payment verification failed: " + verifyResponse.data.message);
              setPaymentStatus('failed');
            }
          })
          .catch(error => {
            setErrorMessage(error.response?.data?.error || "Payment verification failed");
            setPaymentStatus('failed');
          });
        },
        prefill: {
          email: 'user@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#F37254'
        },
        modal: {
          ondismiss: function() {
            console.log("Payment modal dismissed");
          }
        }
      };
  
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (failureResponse){
        setErrorMessage("Payment failed: " + failureResponse.error.description);
        setPaymentStatus('failed');
      });
  
      rzp.open();
  
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || 
        error.message || 
        "Failed to create payment order"
      );
    }
  };

  // Scan QR code and validate contents
  const scanQrCode = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/scan_qr");
      const qrData = response.data.qr_data;
  
      setFormInput({
        cardId: qrData.cart_id || "",
        receiverAddressM: qrData.receivers_addressM || "",
        receiverAddressW: qrData.receivers_addressW || "",
        receiverAddressR: qrData.receivers_addressR || "",
        date: qrData.date || ""
      });
  
      setPaymentStatus('pending');
      setIsQrScanned(false);
  
      const verifyTransaction = async () => {
        let isValid = true;
  
        // Check if we have a matching transaction
        const matchingTransaction = allTransactions.find(
          transaction => transaction.cardId === qrData.cart_id
        );
  
        // If manufacturer address is empty, we need to pay the wholesaler
        if (!qrData.receivers_addressM || qrData.receivers_addressM === "") {
          if (!qrData.receivers_addressW) {
            setErrorMessage("No wholesaler address found in QR");
            isValid = false;
            return;
          }
          // Set QR as valid for wholesaler payment when no manufacturer
          setIsQrScanned(true);
          setErrorMessage("QR code verified. Please proceed with payment to wholesaler.");
          return;
        }
  
        // If we have a manufacturer address but no wholesaler, pay the manufacturer
        if (qrData.receivers_addressM && !qrData.receivers_addressW) {
          // Set QR as valid for manufacturer payment when no wholesaler
          setIsQrScanned(true);
          setErrorMessage("QR code verified. Please proceed with payment to manufacturer.");
          return;
        }
  
        // If transaction exists in our records, verify all details match
        if (matchingTransaction) {
          // Verify each field
          const addressm = qrData.receivers_addressM || "                                          ";
          const addressw = qrData.receivers_addressW || "                                          ";
  
          if (matchingTransaction.receiverAddressW !== addressw) {
            setErrorMessage(`For Cart-Id ${qrData.cart_id} => incorrect wholesaler address`);
            isValid = false;
          }
  
          if (matchingTransaction.receiverAddressR !== walletAddress) {
            setErrorMessage(`For Cart-Id ${qrData.cart_id} => incorrect retailer address`);
            isValid = false;
          }
  
          if (matchingTransaction.date !== qrData.date) {
            setErrorMessage(`For Cart-Id ${qrData.cart_id} => incorrect date`);
            isValid = false;
          }
  
          if (matchingTransaction.receiverAddressM !== addressm) {
            setErrorMessage(`For Cart-Id ${qrData.cart_id} => incorrect manufacturer address`);
            isValid = false;
          }
  
          if (isValid) {
            setIsQrScanned(true);
            setErrorMessage("QR code verified successfully. Please proceed with payment.");
          }
        } else {
          // No transaction exists yet, but we have addresses in QR - allow payment
          setIsQrScanned(true);
          if (!qrData.receivers_addressW) {
            setErrorMessage("QR code verified. Please proceed with payment to manufacturer.");
          } else {
            setErrorMessage("QR code verified. Please proceed with payment to wholesaler.");
          }
        }
      };
  
      // Execute verification after setting form input
      await verifyTransaction();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || 
        error.message || 
        "Error scanning QR code. Please try again."
      );
      setIsQrScanned(false);
    }
  };

  // Disconnect wallet and reset state
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

  return (
    <>
      <Sidebar />
      <div className="dashboard-cont">
        {/* Wallet Connection Button */}
        <div className="connect-wallet-button" onClick={loadContract}>
          <div className="wallet-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 14C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12C15.4477 12 15 12.4477 15 13C15 13.5523 15.4477 14 16 14Z" fill="currentColor"/>
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="wallet-text">
            {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : "Connect Wallet"}
          </span>
          {walletAddress && <div className="connected-indicator"></div>}
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

        {/* Error Message Display */}
        {errorMessage && <div className="error-toast">{errorMessage}</div>}
  
        <div className="parent-grid">
          {/* Cart Details Section */}
          <div className="div1 grid-card">
            <div className="card-header">
              <h2 className="card-title">Cart Details</h2>
              <div className="shimmer-effect"></div>
            </div>
            <div className="form-content">
              <div className="form-group">
                <label>Cart ID</label>
                <input
                  className="form-input"
                  placeholder="Cart ID"
                  value={formInput.cardId}
                  onChange={(e) => setFormInput({ ...formInput, cardId: e.target.value })}
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>Wholesaler Address</label>
                <input
                  className="form-input"
                  placeholder="Wholesaler Address"
                  value={formInput.receiverAddressW}
                  onChange={(e) => setFormInput({ ...formInput, receiverAddressW: e.target.value })}
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>Retailer Address</label>
                <input
                  className="form-input"
                  disabled={true}
                  placeholder="Retailer Address"
                  value={walletAddress}
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  className="form-input"
                  placeholder="Select Date"
                  value={formInput.date}
                  onChange={(e) => setFormInput({ ...formInput, date: e.target.value })}
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>Manufacturer Address</label>
                <input
                  className="form-input"
                  placeholder="Manufacturer Address"
                  value={formInput.receiverAddressM}
                  onChange={(e) => setFormInput({ ...formInput, receiverAddressM: e.target.value })}
                  readOnly
                />
              </div>
              
              <div className="button-container">
                <button className="validate-button" onClick={fetchCardTransactionR}>
                  <span>Validate QR</span>
                  <div className="button-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          {/* QR Data Section */}
          <div className="div2 grid-card">
            <div className="card-header">
              <h2 className="card-title">QR Data</h2>
              <span className="qr-badge">Scan Status: {isQrScanned ? "Verified" : "Not Scanned"}</span>
            </div>
            <div className="qr-content">
              {formInput ? (
                <div className="qr-data-display">
                  <div className="qr-data-item">
                    <div className="qr-data-label">Cart ID</div>
                    <div className="qr-data-value">{formInput.cardId || "Not Available"}</div>
                  </div>
                  <div className="qr-data-item">
                    <div className="qr-data-label">Wholesaler</div>
                    <div className="qr-data-value">
                      {formInput.receiverAddressW && formInput.receiverAddressW.trim() !== "" && 
                       formInput.receiverAddressW !== "                                          " 
                       ? `${formInput.receiverAddressW.substring(0, 6)}...${formInput.receiverAddressW.substring(formInput.receiverAddressW.length - 4)}` 
                       : "Not Available"}
                    </div>
                  </div>
                  <div className="qr-data-item">
                    <div className="qr-data-label">Retailer</div>
                    <div className="qr-data-value">
                      {walletAddress 
                        ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` 
                        : "Not Available"}
                    </div>
                  </div>
                  <div className="qr-data-item">
                    <div className="qr-data-label">Date</div>
                    <div className="qr-data-value">{formInput.date || "Not Available"}</div>
                  </div>
                  <div className="qr-data-item">
                    <div className="qr-data-label">Manufacturer</div>
                    <div className="qr-data-value">
                      {formInput.receiverAddressM && formInput.receiverAddressM.trim() !== "" && 
                       formInput.receiverAddressM !== "                                          " 
                       ? `${formInput.receiverAddressM.substring(0, 6)}...${formInput.receiverAddressM.substring(formInput.receiverAddressM.length - 4)}` 
                       : "Not Available"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading data...</p>
                </div>
              )}
            </div>
            <div className="qr-actions">
              <button className="scan-button" onClick={scanQrCode}>
                <div className="scan-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9V5H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 15V19H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 5H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 19H21V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="7" y="7" width="3" height="3" fill="currentColor"/>
                    <rect x="14" y="7" width="3" height="3" fill="currentColor"/>
                    <rect x="7" y="14" width="3" height="3" fill="currentColor"/>
                    <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
                  </svg>
                </div>
                <span>Scan QR Code</span>
              </button>
              
              {isQrScanned && paymentStatus === 'pending' && (
                <button className="payment-button" onClick={createRazorpayOrder}>
                  <div className="payment-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 14V6C19 4.89543 18.1046 4 17 4H3C1.89543 4 1 4.89543 1 6V14C1 15.1046 1.89543 16 3 16H17C18.1046 16 19 15.1046 19 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 9H23V17C23 18.1046 22.1046 19 21 19H7C5.89543 19 5 18.1046 5 17V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="11" cy="10" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>
                    {!formInput.receiverAddressW || formInput.receiverAddressW === "                                          " 
                      ? "Pay Manufacturer"
                      : "Pay Wholesaler"}
                  </span>
                </button>
              )}
              
              {paymentStatus === 'completed' && (
                <button className="validate-after-payment" onClick={fetchCardTransactionR}>
                  <div className="validate-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Validate After Payment</span>
                </button>
              )}
            </div>
          </div>
          
          {/* All Transactions - DIV3 */}
          <div className="div3 grid-card">
            <div className="card-header">
              <h2 className="card-title">All Transactions</h2>
              <div className="transaction-count">{allTransactions.length} transactions found</div>
            </div>
            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Cart ID</th>
                    <th>Wholesaler</th>
                    <th>Retailer</th>
                    <th>Date</th>
                    <th>Manufacturer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map((tx, index) => (
                    <tr key={index} className="transaction-row">
                      <td>{tx.cardId}</td>
                      <td>{tx.receiverAddressW.substring(0, 6)}...{tx.receiverAddressW.substring(tx.receiverAddressW.length - 4)}</td>
                      <td>{tx.receiverAddressR.substring(0, 6)}...{tx.receiverAddressR.substring(tx.receiverAddressR.length - 4)}</td>
                      <td>{tx.date}</td>
                      <td>{tx.receiverAddressM.substring(0, 6)}...{tx.receiverAddressM.substring(tx.receiverAddressM.length - 4)}</td>
                      <td>
                        <span className={`status-badge status-${tx.status.toLowerCase()}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button 
                className="pagination-button" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {getPaginationGroup().map(num => (
                <button
                  key={num}
                  className={`pagination-number ${currentPage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
              
              <button 
                className="pagination-button" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pages))}
                disabled={currentPage === pages}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}