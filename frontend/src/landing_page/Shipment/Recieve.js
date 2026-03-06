import React, { useState, useEffect } from "react";
import { ethers } from 'ethers';
import axios from 'axios';
import CardTransactionRegistry from "./CardTransactionRegistry.json";
import NirvanaTokenABI from "./NirvanaToken.json";
import SideWhole from "../SideWhole";
import './Shipment.css';
import contractConfig from './contractAddress.json';
import TokenInfoSection from "./TokenInfoSection";

export default function Receive() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isAddressWhitelisted, setIsAddressWhitelisted] = useState(false);
  const [transactionFee, setTransactionFee] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [formInput, setFormInput] = useState({
    cardId: "", receiverAddressW: "", receiverAddressR: "", date: "", receiverAddressM: "",
  });
  const [hashMismatchError, setHashMismatchError] = useState("");
  const [allTransactions, setAllTransactions] = useState([]);
  const [sentTransactions, setSentTransactions] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [isQrScanned, setIsQrScanned] = useState(false);
  const [isTransactionSuccess, setIsTransactionSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isPaymentValidated, setIsPaymentValidated] = useState(false);

  const [errorMessage,   setErrorMessage]   = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(''), 4300);
    return () => clearTimeout(t);
  }, [errorMessage]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 4300);
    return () => clearTimeout(t);
  }, [successMessage]);

  const showLoading = (msg) => { setLoadingMessage(msg); setErrorMessage(''); setSuccessMessage(''); };
  const showSuccess = (msg) => { setSuccessMessage(msg); setLoadingMessage(''); setErrorMessage(''); };
  const showError   = (msg) => { setErrorMessage(msg);   setLoadingMessage(''); setSuccessMessage(''); };
  const clearAll    = ()    => { setLoadingMessage(''); setErrorMessage(''); setSuccessMessage(''); };

  // FIX 1: read both addresses directly from JSON
const contractAddress = contractConfig.registryAddress;
  const tokenAddress    = contractConfig.tokenAddress;

  const indexOfLastItem  = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = allTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const pages = Math.ceil(allTransactions.length / itemsPerPage);

  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    return new Array(Math.min(5, pages - start)).fill(null).map((_, idx) => start + idx + 1);
  };

  const getLegacyOverrides = async (c, gasLimit = 300000) => {
    const provider = c?.runner?.provider;
    const fallback = ethers.parseUnits("30", "gwei");
    let gasPrice = fallback;
    try {
      if (provider?.getFeeData) {
        const fd = await provider.getFeeData();
        if (fd?.gasPrice) gasPrice = fd.gasPrice;
      }
    } catch (e) { console.warn("getFeeData failed, using fallback gas price", e); }
    return { gasLimit, gasPrice };
  };

  useEffect(() => {
    const init = async () => { await loadContract(); clearAll(); setHashMismatchError(""); };
    init();
  }, []);

  useEffect(() => {
    if (contract && walletAddress) {
      fetchAllTransactions(); fetchSentTransactions(); fetchTokenDetails();
      clearAll(); setHashMismatchError("");
    }
  }, [contract, walletAddress, tokenContract]);

  // FIX 2: use tokenAddress from JSON, guard both addresses
  const loadContract = async () => {
    if (!contractAddress || !tokenAddress) {
      showError('Configuration error — address or tokenAddress missing from contractAddress.json.');
      return;
    }
    if (typeof window.ethereum !== "undefined") {
      showLoading('Connecting to wallet — please approve in MetaMask…');
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const addr = ethers.getAddress(accounts[0]);
        setWalletAddress(addr);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner(addr);
        const registry = new ethers.Contract(contractAddress, CardTransactionRegistry.abi, signer);
        setContract(registry);
        const token = new ethers.Contract(tokenAddress, NirvanaTokenABI.abi, signer);
        setTokenContract(token);
        showSuccess(`Wallet connected: ${addr.substring(0,6)}…${addr.slice(-4)}`);
      } catch (error) {
        console.error("Error loading contracts:", error);
        showError("Failed to load contracts: " + (error.message || "Unknown error"));
      }
    } else {
      showError("MetaMask is not installed or not accessible");
    }
  };

  // FIX 3: use contract.isAddressWhitelisted() instead of tokenContract.isWhitelisted()
  const fetchTokenDetails = async () => {
    if (tokenContract && walletAddress && contract) {
      try {
        const balance = await tokenContract.balanceOf(walletAddress);
        setTokenBalance(ethers.formatEther(balance));
        const isWhitelisted = await contract.isAddressWhitelisted(walletAddress);
        setIsAddressWhitelisted(isWhitelisted);
        const fee = await contract.transactionFee();
        setTransactionFee(ethers.formatEther(fee));
        const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        setAllowance(ethers.formatEther(currentAllowance));
      } catch (error) {
        console.error("Error fetching token details:", error);
        showError("Failed to fetch token details: " + (error.message || "Unknown error"));
      }
    }
  };

  const approveTokenSpending = async () => {
    if (!tokenContract) return;
    try {
      const decimals = await tokenContract.decimals();
      const approvalAmount = ethers.parseUnits("1000", decimals);
      showLoading('Simulating approval — running pre-flight check on blockchain…');
      try {
        await tokenContract.approve.staticCall(contractAddress, approvalAmount);
      } catch (simError) {
        showError(simError?.reason || simError?.shortMessage || simError?.message || 'Approval simulation rejected by contract.');
        return;
      }
      showLoading('Awaiting MetaMask — please confirm the approval in your wallet…');
      const overrides = await getLegacyOverrides(tokenContract, 100000);
      let transaction;
      try {
        transaction = await tokenContract.approve(contractAddress, approvalAmount, overrides);
      } catch (submitError) { handleTransactionError(submitError); return; }
      showLoading(`Mining approval — TX: ${transaction.hash.substring(0,16)}… waiting for confirmation.`);
      await transaction.wait();
      const newAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      setAllowance(ethers.formatEther(newAllowance));
      showSuccess('Approval confirmed! 1,000 tokens approved for the registry contract.');
    } catch (error) {
      console.error("Approval error:", error);
      handleTransactionError(error);
    }
  };

  const handleTransactionError = (error) => {
    setHashMismatchError("");
    setFormInput({
      cardId: formInput.cardId || "", receiverAddressW: formInput.receiverAddressW || "",
      receiverAddressR: formInput.receiverAddressR || "                                          ",
      date: formInput.date || "", receiverAddressM: formInput.receiverAddressM || "                                          ",
    });
    if (error.message && error.message.includes("Hash mismatch")) {
      const hashData = error.reason ? error.reason.slice(15) : "";
      if (hashData.slice(0, 42) !== formInput.receiverAddressM)  showError("Manufacturer wallet address mismatch");
      else if (hashData.slice(42, 84) !== walletAddress)         showError("Wholesaler wallet address mismatch");
      else if (hashData.slice(84, 126) !== formInput.receiverAddressR) showError("Retailer wallet address mismatch");
      else if (hashData.slice(126, 136) !== formInput.date)      showError("Date mismatch");
      setHashMismatchError(hashData);
    } else if (error.message && error.message.includes("ERC20: transfer to non-whitelisted address")) {
      showError("Cannot transfer to a non-whitelisted address!");
    } else if (error.message && error.message.includes("Fee payment failed")) {
      showError("Transaction fee payment failed. Please check your token balance and allowance.");
    } else if (error.message && (error.message.toLowerCase().includes("user rejected") || error.message.toLowerCase().includes("user denied"))) {
      showError("Transaction Rejected: you declined the transaction in MetaMask.");
    } else {
      showError(error.reason || error.message || "An unknown error occurred");
    }
  };

  const fetchAllTransactions = async () => {
    if (contract) {
      try {
        const [cardIds, strhash, statuses] = await contract.getAllTransactions();
        const formatted = [];
        for (let i = 0; i < cardIds.length; i++) {
          if (strhash[i].slice(42, 84) === walletAddress) {
            formatted.push({
              cardId: cardIds[i],
              receiverAddressW: strhash[i].slice(42, 84),
              receiverAddressR: strhash[i].slice(84, 126),
              date: strhash[i].slice(126, 136),
              receiverAddressM: strhash[i].slice(0, 42),
              status: statuses[i]
            });
          }
        }
        setAllTransactions(formatted);
        clearAll(); setHashMismatchError("");
      } catch (error) { handleTransactionError(error); }
    }
  };

  const fetchSentTransactions = async () => {
    if (contract) {
      try {
        const [cardIds, strhash, statuses] = await contract.getAllTransactions();
        const formatted = [];
        for (let i = 0; i < cardIds.length; i++) {
          if (strhash[i].slice(0, 42) === "                                          " &&
              strhash[i].slice(42, 84) === walletAddress) {
            formatted.push({
              cardId: cardIds[i],
              wholesalerAddress: strhash[i].slice(42, 84),
              retailerAddress:   strhash[i].slice(84, 126),
              date:              strhash[i].slice(126, 136),
              status:            statuses[i]
            });
          }
        }
        setSentTransactions(formatted);
      } catch (error) { console.error("Error fetching sent transactions:", error); }
    }
  };

  const fetchCardTransactionWR = async () => {
    if (!contract || !tokenContract) return;
    try {
      const fee = await contract.transactionFee();
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      if (currentAllowance < fee) { showError("Insufficient token allowance. Please approve tokens first."); return; }
      const { cardId, date, receiverAddressM } = formInput;
      const mergedM = (receiverAddressM && receiverAddressM.length === 42) ? receiverAddressM : "                                          ";
      const merged  = mergedM + walletAddress + "                                          " + date + cardId;
      showLoading('Validating QR on blockchain…');
      try {
        await contract.searchCardTransactionWR.staticCall(merged);
      } catch (simError) {
        showError(simError?.reason || simError?.shortMessage || simError?.message || 'Contract simulation rejected — transaction would fail on-chain.');
        return;
      }
      const overrides = await getLegacyOverrides(contract, 300000);
      let transactionData;
      try {
        transactionData = await contract.searchCardTransactionWR(merged, overrides);
      } catch (submitError) { handleTransactionError(submitError); return; }
      showLoading(`Transaction mining — TX: ${transactionData.hash.substring(0,16)}… waiting for confirmation.`);
      await transactionData.wait();
      await fetchAllTransactions(); await fetchTokenDetails();
      clearAll(); setHashMismatchError("");
      setIsPaymentValidated(true); setPaymentStatus("validated");
      showSuccess("QR validated successfully!");
    } catch (error) {
      console.error("Validation error:", error); handleTransactionError(error);
    }
  };

  const registerCardTransactionW = async () => {
    if (!contract || !tokenContract) return;
    try {
      const { cardId, receiverAddressR, date } = formInput;
      if (receiverAddressR && receiverAddressR.length === 42) {
        showLoading('Verifying retailer address — checking whitelist status on-chain…');
        // FIX: use registry's isAddressWhitelisted for consistency
        const isRetailerWhitelisted = await contract.isAddressWhitelisted(receiverAddressR);
        if (!isRetailerWhitelisted) { showError("Retailer address is not whitelisted!"); return; }
      }
      showLoading('Checking allowance — verifying token fee balance…');
      const fee = await contract.transactionFee();
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      if (currentAllowance < fee) { showError("Insufficient token allowance. Please approve tokens first."); return; }
      const merged = "                                          " + walletAddress + receiverAddressR + date + cardId;
      showLoading('Simulating shipment transaction — running pre-flight check…');
      try {
        await contract.registerCardTransactionW.staticCall(merged);
      } catch (simError) {
        showError(simError?.reason || simError?.shortMessage || simError?.message || 'Contract simulation rejected — transaction would fail on-chain.');
        return;
      }
      showLoading('Awaiting MetaMask — please confirm the shipment transaction in your wallet…');
      const overrides = await getLegacyOverrides(contract, 500000);
      let transaction;
      try {
        transaction = await contract.registerCardTransactionW(merged, overrides);
      } catch (submitError) { handleTransactionError(submitError); return; }
      showLoading(`Transaction mining — TX: ${transaction.hash.substring(0,16)}… waiting for confirmation.`);
      await transaction.wait();
      showLoading('Saving to database — recording shipment in the backend…');
      try {
        const apiResponse = await axios.post("http://127.0.0.1:5000/add_transaction", {
          cart_id: cardId, manu_add: "                                          ",
          whole_add: walletAddress, ret_add: receiverAddressR
        });
        if (apiResponse.status !== 200) throw new Error("Failed to add transaction to database");
      } catch (backendError) {
        showError('On-chain confirmed, but database save failed. Please contact support.');
        fetchAllTransactions(); fetchSentTransactions(); fetchTokenDetails(); return;
      }
      setFormInput({ cardId: "", receiverAddressW: "", receiverAddressR: "                                          ", date: "", receiverAddressM: "                                          " });
      await fetchAllTransactions(); await fetchSentTransactions(); await fetchTokenDetails();
      clearAll(); setHashMismatchError(""); setIsTransactionSuccess(true);
      showSuccess(`Shipment registered! Cart ID "${cardId}" confirmed on-chain and saved.`);
      setTimeout(() => setIsTransactionSuccess(false), 3000);
    } catch (error) {
      console.error("Register shipment error:", error); handleTransactionError(error); setIsTransactionSuccess(false);
    }
  };

  const loadRazorpayScript = () => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const createRazorpayOrder = async () => {
    if (!formInput.cardId) { showError("No cart ID found. Please scan QR first."); return; }
    try {
      showLoading('Loading payment system…');
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) { showError("Failed to load payment system. Please try again."); return; }
      const response = await axios.post('http://127.0.0.1:5000/create_razorpay_order_transactions_whole_to_manu', { cart_id: formInput.cardId });
      if (response.data.error) { showError(response.data.error); return; }
      setRazorpayOrderData(response.data); clearAll();
      const options = {
        key: 'rzp_test_2EpPSCTb8XHFCk',
        amount: response.data.total_amount * 100, currency: "INR",
        name: 'Cart Transaction', description: 'Payment for cart validation',
        order_id: response.data.razorpay_order_id,
        handler: function (paymentResponse) { handlePaymentVerification(paymentResponse, response.data.temp_order_data); },
        modal: { ondismiss: function () { showError("Payment cancelled"); setPaymentStatus('pending'); } },
        prefill: { email: 'user@example.com', contact: '9999999999' },
        theme: { color: '#F37254' }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) { showError(`Payment failed: ${resp.error.description}`); setPaymentStatus('failed'); });
      rzp.open();
    } catch (error) {
      console.error("Error in payment process:", error);
      showError(error.response?.data?.error || error.message);
    }
  };

  const handlePaymentVerification = async (paymentResponse, tempOrderData) => {
    try {
      showLoading('Verifying payment — confirming with payment gateway…');
      const verifyResponse = await axios.post(
        'http://127.0.0.1:5000/confirm_order_payment_transactions_whole_to_manu',
        {
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id:   paymentResponse.razorpay_order_id,
          razorpay_signature:  paymentResponse.razorpay_signature,
          temp_order_data:     tempOrderData
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (verifyResponse.data.status === 'success') {
        setPaymentStatus('completed');
        showSuccess("Payment successful! You can now validate the QR.");
      } else {
        throw new Error(verifyResponse.data.message || "Payment verification failed");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      showError(error.response?.data?.error || "Payment verification failed");
      setPaymentStatus('failed');
    }
  };

  const scanQrCode = async () => {
    showLoading('Scanning QR code — opening camera feed…');
    try {
      const response = await axios.get("http://127.0.0.1:5000/scan_qr");
      const qrData = response.data.qr_data;
      setFormInput({
        cardId: qrData.cart_id || "", receiverAddressM: qrData.receivers_addressM || "",
        receiverAddressW: qrData.receivers_addressW || "", receiverAddressR: qrData.receivers_addressR || "",
        date: qrData.date || ""
      });
      setPaymentStatus('pending'); setIsQrScanned(false);
      const verifyTransaction = async () => {
        let isValid = true;
        const matchingTransaction = allTransactions.find(t => t.cardId === qrData.cart_id);
        const addressm = qrData.receivers_addressM || "                                          ";
        const addressw = qrData.receivers_addressW || "                                          ";
        const addressr = qrData.receivers_addressR || "                                          ";
        if (!matchingTransaction) { showError(`Card ID ${qrData.cart_id} is not registered yet`); return; }
        if (matchingTransaction.receiverAddressW !== walletAddress) {
          showError(`Wallet ~ ${walletAddress} is not associated to Card ID ${qrData.cart_id}`); return;
        }
        if (matchingTransaction.receiverAddressR !== addressr) { showError(`For Card-Id ${qrData.cart_id} => incorrect retailer address`); isValid = false; }
        if (matchingTransaction.date !== qrData.date)          { showError(`For Card-Id ${qrData.cart_id} => incorrect date`); isValid = false; }
        if (matchingTransaction.receiverAddressM !== addressm) { showError(`For Card-Id ${qrData.cart_id} => incorrect manufacture address`); isValid = false; }
        if (isValid) { setIsQrScanned(true); showSuccess(`QR code verified — Cart ID "${qrData.cart_id}" loaded. Please proceed with payment.`); }
      };
      await verifyTransaction();
    } catch (error) {
      console.error("Error scanning QR code:", error.message || JSON.stringify(error));
      showError(error.response?.data?.error || error.message || "Error scanning QR code. Please try again.");
      setIsQrScanned(false);
    }
  };

  return (
    <>
      <SideWhole />
      {errorMessage   && <div className="error-toast">{errorMessage}</div>}
      {successMessage && <div className="success-toast-bar">{successMessage}</div>}
      {loadingMessage && (
        <div className="loading-toast">
          <span className="loading-spinner" />
          {loadingMessage}
        </div>
      )}

      <div className="dashboard-cont">
        <div className="connect-wallet-button" onClick={loadContract}>
          <div className="wallet-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 14C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12C15.4477 12 15 12.4477 15 13C15 13.5523 15.4477 14 16 14Z" fill="currentColor"/>
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="wallet-text">
            {walletAddress ? `${walletAddress.substring(0,6)}...${walletAddress.substring(walletAddress.length-4)}` : "Connect Wallet"}
          </span>
          {walletAddress && <div className="connected-indicator" />}
        </div>

        {/* Token Info — always visible */}
        <TokenInfoSection
          tokenBalance={tokenBalance}
          isAddressWhitelisted={isAddressWhitelisted}
          transactionFee={transactionFee}
          allowance={allowance}
          approveTokenSpending={approveTokenSpending}
        />

        {/* FIX 4: Whitelist gate wraps everything below TokenInfoSection */}
        <div className={`whitelist-gate-wrapper${!isAddressWhitelisted ? ' is-locked' : ''}`}>

          {!isAddressWhitelisted && (
            <div className="whitelist-lock-overlay">
              <div className="lock-card">
                <div className="lock-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" className="lock-svg">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="lock-title">Access Restricted</h3>
                <p className="lock-description">
                  Your wallet address is not whitelisted on the NirvanaToken contract.
                  Please contact the contract owner to get your address approved before
                  you can register or manage transactions.
                </p>
                <div className="lock-address-pill">
                  {walletAddress ? `${walletAddress.substring(0,10)}…${walletAddress.slice(-8)}` : 'No wallet connected'}
                </div>
              </div>
            </div>
          )}

          <div className="parent-grid">
            {/* Cart Details */}
            <div className="div1 grid-card">
              <div className="card-header">
                <h2 className="card-title">Cart Details</h2>
                <div className="shimmer-effect" />
              </div>
              <div className="form-content">
                <div className="form-group">
                  <label>Cart ID</label>
                  <input className="form-input" placeholder="Cart ID" value={formInput.cardId}
                    onChange={(e) => setFormInput({...formInput, cardId: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Wholesaler Address</label>
                  <input className="form-input" disabled placeholder="Wholesaler Address" value={walletAddress || ""} />
                </div>
                <div className="form-group">
                  <label>Retailer Address</label>
                  <input className="form-input" placeholder="Retailer Address" value={formInput.receiverAddressR}
                    onChange={(e) => setFormInput({...formInput, receiverAddressR: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="form-input" value={formInput.date}
                    onChange={(e) => setFormInput({...formInput, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Manufacturer Address</label>
                  <input className="form-input" placeholder="Manufacturer Address" value={formInput.receiverAddressM}
                    onChange={(e) => setFormInput({...formInput, receiverAddressM: e.target.value})} />
                </div>
                <button className="register-shipment-button" onClick={registerCardTransactionW}>
                  Register New Shipment
                </button>
                {isTransactionSuccess && (
                  <div className="success-message">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Transaction registered successfully!</span>
                  </div>
                )}
              </div>
            </div>

            {/* QR Data */}
            <div className="div2 grid-card">
              <div className="card-header">
                <h2 className="card-title">QR Data</h2>
                <span className="qr-badge">Scan Status: {isQrScanned ? "Verified" : "Not Scanned"}</span>
              </div>
              <div className="qr-content">
                <div className="qr-data-display">
                  {[
                    { label: 'Cart ID',      value: formInput.cardId },
                    { label: 'Manufacturer', value: formInput.receiverAddressM && formInput.receiverAddressM.trim() && formInput.receiverAddressM !== "                                          " ? `${formInput.receiverAddressM.substring(0,6)}...${formInput.receiverAddressM.slice(-4)}` : null },
                    { label: 'Wholesaler',   value: walletAddress ? `${walletAddress.substring(0,6)}...${walletAddress.slice(-4)}` : null },
                    { label: 'Retailer',     value: formInput.receiverAddressR && formInput.receiverAddressR.trim() && formInput.receiverAddressR !== "                                          " ? `${formInput.receiverAddressR.substring(0,6)}...${formInput.receiverAddressR.slice(-4)}` : null },
                    { label: 'Date',         value: formInput.date },
                  ].map(({ label, value }) => (
                    <div className="qr-data-item" key={label}>
                      <div className="qr-data-label">{label}</div>
                      <div className="qr-data-value">{value || 'Not Available'}</div>
                    </div>
                  ))}
                </div>

                <div className="qr-action-buttons">
                  <button className="qr-scan-button" onClick={scanQrCode}>
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M3 7V5C3 3.89543 3.89543 3 5 3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 3H19C20.1046 3 21 3.89543 21 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 17V19C21 20.1046 20.1046 21 19 21H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 21H5C3.89543 21 3 20.1046 3 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Scan QR
                  </button>

                  {isQrScanned && paymentStatus === 'pending' && (
                    <button className="payment-button" onClick={createRazorpayOrder}>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Proceed to Payment
                    </button>
                  )}

                  <button
                    className={`validate-button ${paymentStatus !== 'completed' ? 'disabled' : ''}`}
                    onClick={fetchCardTransactionWR}
                    disabled={paymentStatus !== 'completed'}
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Validate QR as Wholesaler
                  </button>
                </div>
              </div>
            </div>

            {/* All Transactions */}
            <div className="div3 grid-card">
              <div className="card-header">
                <h2 className="card-title">All Transactions</h2>
                <div className="shimmer-effect" />
              </div>
              <div className="transactions-content">
                {!walletAddress ? (
                  <div className="no-data-message">Please connect your wallet to view transactions.</div>
                ) : allTransactions.length > 0 ? (
                  <>
                    <div className="table-container">
                      <table className="transactions-table">
                        <thead>
                          <tr>
                            <th>Cart ID</th><th>Wholesaler Address</th><th>Retailer Address</th>
                            <th>Date</th><th>Manufacturer Address</th><th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTransactions.map((tx, index) => (
                            <tr key={index}>
                              <td>{tx.cardId}</td>
                              <td title={tx.receiverAddressW}>{`${tx.receiverAddressW.substring(0,6)}...${tx.receiverAddressW.slice(-4)}`}</td>
                              <td title={tx.receiverAddressR}>{`${tx.receiverAddressR.substring(0,6)}...${tx.receiverAddressR.slice(-4)}`}</td>
                              <td>{tx.date}</td>
                              <td title={tx.receiverAddressM}>{`${tx.receiverAddressM.substring(0,6)}...${tx.receiverAddressM.slice(-4)}`}</td>
                              <td><span className="status-badge">{tx.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {pages > 1 && (
                      <div className="pagination-controls">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage===1} className="pagination-button">&laquo;</button>
                        <button onClick={() => setCurrentPage(p => p-1)} disabled={currentPage===1} className="pagination-button">&lt;</button>
                        {getPaginationGroup().map(item => (
                          <button key={item} onClick={() => setCurrentPage(item)} className={`pagination-button ${currentPage===item?'active':''}`}>{item}</button>
                        ))}
                        <button onClick={() => setCurrentPage(p => p+1)} disabled={currentPage===pages} className="pagination-button">&gt;</button>
                        <button onClick={() => setCurrentPage(pages)} disabled={currentPage===pages} className="pagination-button">&raquo;</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-data-message">No transactions found.</div>
                )}
              </div>
            </div>

            {/* Sent Transactions */}
            <div className="div4 grid-card">
              <div className="card-header">
                <h2 className="card-title">Sent Transactions to Retailer</h2>
                <div className="shimmer-effect" />
              </div>
              <div className="transactions-content">
                {!walletAddress ? (
                  <div className="no-data-message">Please connect your wallet to view sent transactions.</div>
                ) : sentTransactions.length > 0 ? (
                  <div className="table-container">
                    <table className="transactions-table">
                      <thead>
                        <tr>
                          <th>Cart ID</th><th>Wholesaler Address</th><th>Retailer Address</th>
                          <th>Date</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sentTransactions.map((tx, index) => (
                          <tr key={index}>
                            <td>{tx.cardId}</td>
                            <td title={tx.wholesalerAddress}>{`${tx.wholesalerAddress.substring(0,6)}...${tx.wholesalerAddress.slice(-4)}`}</td>
                            <td title={tx.retailerAddress}>{`${tx.retailerAddress.substring(0,6)}...${tx.retailerAddress.slice(-4)}`}</td>
                            <td>{tx.date}</td>
                            <td><span className="status-badge">{tx.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data-message">No sent transactions found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* end whitelist-gate-wrapper */}
      </div>

      <style>{`
        .whitelist-gate-wrapper { position: relative; }
        /* Gate wrapper must be full width */
.whitelist-gate-wrapper {
  position: relative;
  width: 100%;
}

/* Parent grid full width */
.parent-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;   /* or whatever column layout you want */
  grid-template-rows: auto auto;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
}

/* div3 (All Transactions) spans full width */
.div3 {
  grid-column: 1 / -1;
}
        .whitelist-gate-wrapper.is-locked .parent-grid {
          filter: blur(4px); pointer-events: none; user-select: none;
          opacity: 0.4; transition: filter 0.3s ease, opacity 0.3s ease;
        }
        .whitelist-lock-overlay {
          position: absolute; inset: 0; z-index: 10;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.15); backdrop-filter: blur(2px); border-radius: 12px;
        }
        .lock-card {
          background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px;
          padding: 40px 36px; max-width: 420px; width: 90%; text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
          animation: lockCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes lockCardIn {
          from { transform: scale(0.85) translateY(12px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .lock-icon-wrap {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .lock-svg { width: 30px; height: 30px; color: #dc2626; stroke: #dc2626; }
        .lock-title { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0 0 12px; letter-spacing: -0.01em; }
        .lock-description { font-size: 0.875rem; color: #6b7280; line-height: 1.6; margin: 0 0 20px; }
        .lock-address-pill {
          display: inline-block; background: #f3f4f6; border: 1px solid #e5e7eb;
          border-radius: 999px; padding: 6px 16px; font-size: 0.78rem;
          font-family: 'Courier New', monospace; color: #374151; letter-spacing: 0.03em;
        }
        .error-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 8px;
          font-weight: 400; font-family: sans-serif; letter-spacing: 0.02em;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1000;
        }
        .success-toast-bar {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background-color: #10b981; color: white; padding: 12px 24px; border-radius: 8px;
          font-family: sans-serif; font-weight: 400; letter-spacing: 0.02em;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1000;
        }
        .loading-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(90deg, #4F46E5, #6366F1); color: white;
          padding: 12px 24px; border-radius: 8px; font-family: sans-serif; font-weight: 400;
          letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease; z-index: 1000;
          display: flex; align-items: center; gap: 12px; white-space: nowrap; max-width: 90vw;
        }
        .loading-spinner {
          display: inline-block; width: 16px; height: 16px;
          border: 2.5px solid rgba(255,255,255,0.35); border-top-color: white;
          border-radius: 50%; animation: toastSpin 0.75s linear infinite; flex-shrink: 0;
        }
        @keyframes toastSpin { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to   { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }
      `}</style>
    </>
  );
}