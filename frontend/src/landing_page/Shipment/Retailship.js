import React, { useState, useEffect } from "react";
import { ethers } from 'ethers';
import axios from 'axios';
import CardTransactionRegistry from "./CardTransactionRegistry.json";
import NirvanaTokenABI from "./NirvanaToken.json";
import Sidebar from "../Sidebar";
import './Shipment.css';
import TokenInfoSection from './TokenInfoSection';
import contractConfig from './contractAddress.json';

export default function RetailShip() {
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
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [isQrScanned, setIsQrScanned] = useState(false);
  const [isTransactionSuccess, setIsTransactionSuccess] = useState(false);
  const [isPaymentValidated, setIsPaymentValidated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

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

  const pages = Math.ceil(allTransactions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = allTransactions.slice(indexOfFirstItem, indexOfLastItem);

  // FIX 1: read both addresses directly from JSON — no RPC call needed
const contractAddress = contractConfig.registryAddress;
const tokenAddress    = contractConfig.tokenAddress;

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

  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    return new Array(Math.min(5, pages - start)).fill(null).map((_, idx) => start + idx + 1);
  };

  useEffect(() => {
    const init = async () => { await loadContract(); clearAll(); setHashMismatchError(""); };
    init();
  }, []);

  useEffect(() => {
    if (contract && walletAddress) {
      fetchAllTransactions(); fetchTokenDetails(); clearAll(); setHashMismatchError("");
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
      const overrides = await getLegacyOverrides(tokenContract, 300000);
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
    if (error.message && error.message.includes("Hash mismatch")) {
      const hashData = error.reason ? error.reason.slice(15) : "";
      if (hashData.slice(0, 42) !== formInput.receiverAddressM)   showError("Manufacturer wallet address mismatch");
      else if (hashData.slice(42, 84) !== formInput.receiverAddressW) showError("Wholesaler wallet address mismatch");
      else if (hashData.slice(84, 126) !== walletAddress)          showError("Retailer wallet address mismatch");
      else if (hashData.slice(126, 136) !== formInput.date)        showError("Date mismatch");
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
    if (!contract || !walletAddress) return;
    try {
      const [cardIds, strhash, statuses] = await contract.getAllTransactions();
      const formatted = [];
      for (let i = 0; i < cardIds.length; i++) {
        const hash = strhash[i];
        if (!hash || hash.length < 136) continue;
        if (hash.slice(84, 126).toLowerCase() === walletAddress.toLowerCase()) {
          formatted.push({
            cardId: cardIds[i],
            receiverAddressW: hash.slice(42, 84).trim(),
            receiverAddressR: hash.slice(84, 126).trim(),
            date: hash.slice(126, 136),
            receiverAddressM: hash.slice(0, 42),
            status: statuses[i]
          });
        }
      }
      setAllTransactions(formatted);
    } catch (error) {
      console.error("Fetch tx error:", error);
      showError(error?.shortMessage || error?.reason || error?.message || "Failed to fetch transactions");
    }
  };

  const fetchCardTransactionR = async () => {
    if (!contract) return;
    const { cardId, receiverAddressW, receiverAddressR, date, receiverAddressM } = formInput;
    const mergedW = (receiverAddressW && receiverAddressW.length === 42) ? receiverAddressW : "                                          ";
    const mergedM = (receiverAddressM && receiverAddressM.length === 42) ? receiverAddressM : "                                          ";
    const merged  = mergedM + mergedW + walletAddress + date + cardId;
    try {
      showLoading('Checking allowance — verifying token fee balance…');
      const fee = await contract.transactionFee();
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      if (currentAllowance < fee) { showError("Insufficient token allowance. Please approve tokens first."); return; }
      showLoading('Simulating transaction — running pre-flight check on blockchain…');
      try {
        await contract.searchCardTransactionR.staticCall(merged);
      } catch (simError) {
        showError(simError?.reason || simError?.shortMessage || simError?.message || 'Contract simulation rejected — transaction would fail on-chain.');
        return;
      }
      showLoading('Awaiting MetaMask — please confirm the validation in your wallet…');
      const overrides = await getLegacyOverrides(contract, 300000);
      let transactionData;
      try {
        transactionData = await contract.searchCardTransactionR(merged, overrides);
      } catch (submitError) { handleTransactionError(submitError); return; }
      showLoading(`Transaction mining — TX: ${transactionData.hash.substring(0,16)}… waiting for confirmation.`);
      await transactionData.wait();
      await fetchAllTransactions();
      await fetchTokenDetails();
      clearAll(); setHashMismatchError("");
      setIsTransactionSuccess(true); setIsPaymentValidated(true);
      showSuccess("Transaction validated successfully on blockchain!");
      if (paymentStatus === "completed") setPaymentStatus("validated");
    } catch (error) {
      console.error("Validation error:", error);
      handleTransactionError(error);
      setIsTransactionSuccess(false); setIsPaymentValidated(false);
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
      const isManufacturerEmpty = !formInput.receiverAddressM || formInput.receiverAddressM === "                                          ";
      const isWholesalerEmpty   = !formInput.receiverAddressW || formInput.receiverAddressW === "                                          ";
      const endpoint = isWholesalerEmpty
        ? '/create_razorpay_order_transactions_ret_to_manu'
        : '/create_razorpay_order_transactions_ret_to_whole';
      const response = await axios.post(`http://127.0.0.1:5000${endpoint}`, { cart_id: formInput.cardId });
      if (response.data.error) { showError(response.data.error); return; }
      setRazorpayOrderData(response.data); clearAll();
      const options = {
        key: 'rzp_test_2EpPSCTb8XHFCk',
        amount: response.data.total_amount * 100, currency: "INR",
        name: 'Cart Transaction',
        description: `Payment for cart validation to ${isWholesalerEmpty ? 'Manufacturer' : 'Wholesaler'}`,
        order_id: response.data.razorpay_order_id,
        handler: function (paymentResponse) {
          const verifyEndpoint = isWholesalerEmpty
            ? '/confirm_order_payment_transactions_ret_to_manu'
            : '/confirm_order_payment_transactions_ret_to_whole';
          showLoading('Verifying payment — confirming with payment gateway…');
          axios.post(`http://127.0.0.1:5000${verifyEndpoint}`, {
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_order_id:   paymentResponse.razorpay_order_id,
            razorpay_signature:  paymentResponse.razorpay_signature,
            temp_order_data:     response.data.temp_order_data
          }, { headers: { 'Content-Type': 'application/json' } })
          .then(verifyResponse => {
            if (verifyResponse.data.status === 'success') {
              setPaymentStatus('completed'); setIsPaymentValidated(false);
              showSuccess("Payment successful! Please click 'Validate After Payment' to complete the transaction on blockchain.");
            } else {
              showError("Payment verification failed: " + verifyResponse.data.message);
              setPaymentStatus('failed');
            }
          })
          .catch(error => { showError(error.response?.data?.error || "Payment verification failed"); setPaymentStatus('failed'); });
        },
        prefill: { email: 'user@example.com', contact: '9999999999' },
        theme: { color: '#F37254' },
        modal: { ondismiss: function () { console.log("Payment modal dismissed"); } }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (failureResponse) {
        showError("Payment failed: " + failureResponse.error.description); setPaymentStatus('failed');
      });
      rzp.open();
    } catch (error) {
      showError(error.response?.data?.error || error.message || "Failed to create payment order");
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
        if (!qrData.receivers_addressM || qrData.receivers_addressM === "") {
          if (!qrData.receivers_addressW) { showError("No wholesaler address found in QR"); return; }
          setIsQrScanned(true);
          showSuccess(`QR code verified — Cart ID "${qrData.cart_id}" loaded. Please proceed with payment to wholesaler.`);
          return;
        }
        if (qrData.receivers_addressM && !qrData.receivers_addressW) {
          setIsQrScanned(true);
          showSuccess(`QR code verified — Cart ID "${qrData.cart_id}" loaded. Please proceed with payment to manufacturer.`);
          return;
        }
        if (matchingTransaction) {
          const addressm = qrData.receivers_addressM || "                                          ";
          const addressw = qrData.receivers_addressW || "                                          ";
          if (matchingTransaction.receiverAddressW !== addressw)  { showError(`For Cart-Id ${qrData.cart_id} => incorrect wholesaler address`); isValid = false; }
          if (matchingTransaction.receiverAddressR !== walletAddress) { showError(`For Cart-Id ${qrData.cart_id} => incorrect retailer address`); isValid = false; }
          if (matchingTransaction.date !== qrData.date)           { showError(`For Cart-Id ${qrData.cart_id} => incorrect date`); isValid = false; }
          if (matchingTransaction.receiverAddressM !== addressm)  { showError(`For Cart-Id ${qrData.cart_id} => incorrect manufacturer address`); isValid = false; }
          if (isValid) { setIsQrScanned(true); showSuccess(`QR code verified — Cart ID "${qrData.cart_id}" loaded. Please proceed with payment.`); }
        } else {
          setIsQrScanned(true);
          if (!qrData.receivers_addressW) {
            showSuccess(`QR code verified — Cart ID "${qrData.cart_id}" loaded. Please proceed with payment to manufacturer.`);
          } else {
            showSuccess(`QR code verified — Cart ID "${qrData.cart_id}" loaded. Please proceed with payment to wholesaler.`);
          }
        }
      };
      await verifyTransaction();
    } catch (error) {
      showError(error.response?.data?.error || error.message || "Error scanning QR code. Please try again.");
      setIsQrScanned(false);
    }
  };

  const lockMetaMask = async () => {
    try {
      await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      setWalletAddress(null); setContract(null); setTokenContract(null);
      showSuccess('Wallet disconnected — permissions revoked successfully.');
    } catch (error) {
      showError("Failed to revoke MetaMask permissions.");
    }
  };

  return (
    <>
      <Sidebar />
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
                    onChange={(e) => setFormInput({...formInput, cardId: e.target.value})} readOnly />
                </div>
                <div className="form-group">
                  <label>Wholesaler Address</label>
                  <input className="form-input" placeholder="Wholesaler Address" value={formInput.receiverAddressW}
                    onChange={(e) => setFormInput({...formInput, receiverAddressW: e.target.value})} readOnly />
                </div>
                <div className="form-group">
                  <label>Retailer Address</label>
                  <input className="form-input" disabled placeholder="Retailer Address" value={walletAddress || ""} readOnly />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="form-input" value={formInput.date}
                    onChange={(e) => setFormInput({...formInput, date: e.target.value})} readOnly />
                </div>
                <div className="form-group">
                  <label>Manufacturer Address</label>
                  <input className="form-input" placeholder="Manufacturer Address" value={formInput.receiverAddressM}
                    onChange={(e) => setFormInput({...formInput, receiverAddressM: e.target.value})} readOnly />
                </div>
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
                    { label: 'Wholesaler',   value: formInput.receiverAddressW && formInput.receiverAddressW.trim() && formInput.receiverAddressW !== "                                          " ? `${formInput.receiverAddressW.substring(0,6)}...${formInput.receiverAddressW.slice(-4)}` : null },
                    { label: 'Retailer',     value: walletAddress ? `${walletAddress.substring(0,6)}...${walletAddress.slice(-4)}` : null },
                    { label: 'Date',         value: formInput.date },
                    { label: 'Manufacturer', value: formInput.receiverAddressM && formInput.receiverAddressM.trim() && formInput.receiverAddressM !== "                                          " ? `${formInput.receiverAddressM.substring(0,6)}...${formInput.receiverAddressM.slice(-4)}` : null },
                  ].map(({ label, value }) => (
                    <div className="qr-data-item" key={label}>
                      <div className="qr-data-label">{label}</div>
                      <div className="qr-data-value">{value || 'Not Available'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="qr-actions">
                <button className="scan-button" onClick={scanQrCode}>
                  <div className="scan-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M3 9V5H7"   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 15V19H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 5H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 19H21V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="7"  y="7"  width="3" height="3" fill="currentColor"/>
                      <rect x="14" y="7"  width="3" height="3" fill="currentColor"/>
                      <rect x="7"  y="14" width="3" height="3" fill="currentColor"/>
                      <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
                    </svg>
                  </div>
                  <span>Scan QR Code</span>
                </button>

                {isQrScanned && paymentStatus === 'pending' && (
                  <button className="payment-button" onClick={createRazorpayOrder}>
                    <div className="payment-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M19 14V6C19 4.89543 18.1046 4 17 4H3C1.89543 4 1 4.89543 1 6V14C1 15.1046 1.89543 16 3 16H17C18.1046 16 19 15.1046 19 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 9H23V17C23 18.1046 22.1046 19 21 19H7C5.89543 19 5 18.1046 5 17V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="11" cy="10" r="2" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <span>
                      {!formInput.receiverAddressW || formInput.receiverAddressW === "                                          "
                        ? "Pay Manufacturer" : "Pay Wholesaler"}
                    </span>
                  </button>
                )}

                {paymentStatus === 'completed' && !isPaymentValidated && (
                  <button className="validate-after-payment" onClick={fetchCardTransactionR}>
                    <div className="validate-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span>Validate After Payment</span>
                  </button>
                )}

                {paymentStatus === 'validated' && (
                  <div className="validation-success">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="green" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="green" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Transaction Successfully Validated!</span>
                  </div>
                )}
              </div>
            </div>

            {/* All Transactions */}
            <div className="div3 grid-card">
              <div className="card-header">
                <h2 className="card-title">All Transactions</h2>
                <div className="transaction-count">{allTransactions.length} transactions found</div>
              </div>
              <div className="table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Cart ID</th><th>Wholesaler</th><th>Retailer</th>
                      <th>Date</th><th>Manufacturer</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransactions.map((tx, index) => (
                      <tr key={index} className="transaction-row">
                        <td>{tx.cardId}</td>
                        <td>{tx.receiverAddressW.substring(0,6)}...{tx.receiverAddressW.slice(-4)}</td>
                        <td>{tx.receiverAddressR.substring(0,6)}...{tx.receiverAddressR.slice(-4)}</td>
                        <td>{tx.date}</td>
                        <td>{tx.receiverAddressM.substring(0,6)}...{tx.receiverAddressM.slice(-4)}</td>
                        <td><span className={`status-badge status-${tx.status.toLowerCase()}`}>{tx.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button className="pagination-button" onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage===1}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {getPaginationGroup().map(num => (
                  <button key={num} className={`pagination-number ${currentPage===num?'active':''}`} onClick={() => setCurrentPage(num)}>{num}</button>
                ))}
                <button className="pagination-button" onClick={() => setCurrentPage(p => Math.min(p+1,pages))} disabled={currentPage===pages}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* end whitelist-gate-wrapper */}
      </div>

      <style>{`
        .whitelist-gate-wrapper { position: relative; }
        .whitelist-gate-wrapper.is-locked .parent-grid {
          filter: blur(4px); pointer-events: none; user-select: none;
          opacity: 0.4; transition: filter 0.3s ease, opacity 0.3s ease;
        }
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