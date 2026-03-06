import React, { useState, useEffect } from "react";
import { ethers } from 'ethers';
import axios from 'axios';
import CardTransactionRegistry from "./CardTransactionRegistry.json";
import NirvanaTokenABI from "./NirvanaToken.json";
import SideManu from "../SideManu";
import contractConfig from './contractAddress.json';
import TokenInfoSection from "./TokenInfoSection";
import './Shipment.css';

export default function Dashboard() {
  const [walletAddress, setWalletAddress]           = useState(null);
  const [contract, setContract]                     = useState(null);
  const [tokenContract, setTokenContract]           = useState(null);
  const [tokenBalance, setTokenBalance]             = useState("0");
  const [isAddressWhitelisted, setIsAddressWhitelisted] = useState(false);
  const [transactionFee, setTransactionFee]         = useState("0");
  const [allowance, setAllowance]                   = useState("0");
  const [formInput, setFormInput]                   = useState({
    cardId: "", receiverAddressW: "", receiverAddressR: "", date: "", receiverAddressM: "",
  });
  const [allTransactions, setAllTransactions]       = useState([]);
  const [currentPage, setCurrentPage]               = useState(1);
  const [isQrScanned, setIsQrScanned]               = useState(false);

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

  const handleTransactionError = (error) => {
    const message = error?.reason || error?.shortMessage || error?.message || '';
    if      (message.includes("Hash mismatch"))        showError('Hash Mismatch: on-chain data does not match the transaction payload.');
    else if (message.includes("non-whitelisted"))      showError('Address Not Whitelisted: the target address is not authorised.');
    else if (message.includes("Fee payment failed"))   showError('Fee Payment Failed: insufficient token balance to cover the fee.');
    else if (message.toLowerCase().includes("user rejected") || message.toLowerCase().includes("user denied"))
                                                       showError('Transaction Rejected: you declined the transaction in MetaMask.');
    else                                               showError(message || 'An unknown error occurred. Please try again.');
  };

  const itemsPerPage = 5;
  const pages = Math.ceil(allTransactions.length / itemsPerPage);
  const currentTransactions = allTransactions.slice(
    (currentPage - 1) * itemsPerPage, currentPage * itemsPerPage
  );
  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    return new Array(Math.min(5, pages - start)).fill(null).map((_, idx) => start + idx + 1);
  };

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
    } catch (e) { console.warn("getFeeData failed", e); }
    return { gasLimit, gasPrice };
  };



  useEffect(() => { loadContract(); }, []);

  useEffect(() => {
    if (contract && walletAddress) { fetchAllTransactions(); fetchTokenDetails(); }
  }, [contract, walletAddress, tokenContract]);

  const loadContract = async () => {
    // Guard: both addresses must be present in contractAddress.json before touching ethers
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

        // Use addresses directly from JSON — no extra RPC call needed
        const registry = new ethers.Contract(contractAddress, CardTransactionRegistry.abi, signer);
        setContract(registry);

        const token = new ethers.Contract(tokenAddress, NirvanaTokenABI.abi, signer);
        setTokenContract(token);

        showSuccess(`Wallet connected: ${addr.substring(0,6)}…${addr.slice(-4)}`);
      } catch (error) {
        showError(error.message || 'Could not connect to wallet.');
      }
    } else {
      showError('MetaMask not found. Please install it to use this application.');
    }
  };

  // KEY CHANGE: use contract.isAddressWhitelisted() instead of tokenContract.isWhitelisted()
  const fetchTokenDetails = async () => {
    if (tokenContract && walletAddress && contract) {
      try {
        const balance        = await tokenContract.balanceOf(walletAddress);
        setTokenBalance(ethers.formatEther(balance));
        const isWhitelisted  = await contract.isAddressWhitelisted(walletAddress);
        setIsAddressWhitelisted(isWhitelisted);
        const fee            = await contract.transactionFee();
        setTransactionFee(ethers.formatEther(fee));
        const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
        setAllowance(ethers.formatEther(currentAllowance));
      } catch (error) {
        showError(error?.shortMessage || error?.message || 'Failed to fetch token details.');
      }
    }
  };

  const approveTokenSpending = async () => {
    if (!tokenContract) return;
    try {
      const decimals       = await tokenContract.decimals();
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
      } catch (submitError) {
        handleTransactionError(submitError);
        return;
      }
      showLoading(`Mining approval — TX: ${transaction.hash.substring(0,16)}… waiting for confirmation.`);
      await transaction.wait();
      const newAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      setAllowance(ethers.formatEther(newAllowance));
      showSuccess('Approval confirmed! 1,000 tokens approved for the registry contract.');
    } catch (error) {
      handleTransactionError(error);
    }
  };

  const registerCardTransaction = async () => {
    if (!contract || !tokenContract) return;
    const { cardId, receiverAddressW, receiverAddressR, date } = formInput;
    try {
      const mergedW = receiverAddressW || "                                          ";
      const mergedR = receiverAddressR || "                                          ";
      const merged  = walletAddress + mergedW + mergedR + date + cardId;
      showLoading('Validating inputs — checking allowance and fee requirements…');
      const fee              = await contract.transactionFee();
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      if (currentAllowance < fee) { showError('Insufficient allowance — please approve token spending before registering.'); return; }
      showLoading('Simulating transaction — running pre-flight check on blockchain…');
      try {
        await contract.registerCardTransaction.staticCall(merged);
      } catch (simError) {
        showError(simError?.reason || simError?.shortMessage || simError?.message || 'Contract simulation rejected — transaction would fail on-chain.');
        return;
      }
      showLoading('Awaiting MetaMask — please confirm the transaction in your wallet…');
      const overrides = await getLegacyOverrides(contract, 500000);
      let transaction;
      try {
        transaction = await contract.registerCardTransaction(merged, overrides);
      } catch (submitError) { handleTransactionError(submitError); return; }
      showLoading(`Transaction mining — TX: ${transaction.hash.substring(0,16)}… waiting for block confirmation.`);
      await transaction.wait();
      showLoading('Saving to database — recording transaction in the backend…');
      try {
        await axios.post("http://127.0.0.1:5000/add_transaction", {
          cart_id:   cardId, manu_add: formInput.receiverAddressM,
          whole_add: receiverAddressW, ret_add: receiverAddressR
        });
      } catch (backendError) {
        showError('On-chain confirmed, but database save failed. Please contact support.');
        fetchAllTransactions(); fetchTokenDetails(); return;
      }
      fetchAllTransactions(); fetchTokenDetails();
      showSuccess(`Transaction registered! Cart ID "${cardId}" confirmed on-chain and saved.`);
    } catch (error) { handleTransactionError(error); }
  };

  const fetchCardTransactionWR = async () => {
    if (!contract) return;
    const { cardId, receiverAddressW, date } = formInput;
    const merged = walletAddress + receiverAddressW + "                                          " + date + cardId;
    try {
      showLoading('Searching W→R transaction — looking up wholesaler-retailer record on chain…');
      const fee = await contract.transactionFee();
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      if (currentAllowance < fee) { showError('Insufficient allowance — please approve tokens first.'); return; }
      const transactionData = await contract.searchCardTransactionWR(merged);
      await transactionData.wait();
      fetchAllTransactions(); fetchTokenDetails();
      showSuccess('W→R search complete — transaction found and loaded.');
    } catch (error) { handleTransactionError(error); }
  };

  const registerCardTransactionW = async () => {
    if (!contract) return;
    const { cardId, receiverAddressW, receiverAddressR, date } = formInput;
    if (receiverAddressR && receiverAddressR.length === 42) {
      showLoading('Verifying retailer address — checking whitelist status on-chain…');
      try {
        // KEY CHANGE: use registry's isAddressWhitelisted for consistency
        const isRetailerWhitelisted = await contract.isAddressWhitelisted(receiverAddressR);
        if (!isRetailerWhitelisted) { showError('Retailer not whitelisted — the provided address is not authorised.'); return; }
        showSuccess('Retailer verified — address is whitelisted. Proceeding with transaction.');
        await new Promise(r => setTimeout(r, 1200));
      } catch (error) {
        showError('Verification failed — could not check retailer whitelist status.'); return;
      }
    }
    try {
      showLoading('Checking allowance — verifying token fee balance…');
      const fee = await contract.transactionFee();
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      if (currentAllowance < fee) { showError('Insufficient allowance — please approve tokens first.'); return; }
      showLoading('Awaiting MetaMask — please confirm the W-transaction in your wallet…');
      const merged = "                                          " + receiverAddressW + receiverAddressR + date + cardId;
      let transaction;
      try { transaction = await contract.registerCardTransactionW(merged); }
      catch (submitError) { handleTransactionError(submitError); return; }
      showLoading(`Transaction mining — TX: ${transaction.hash.substring(0,16)}… waiting for confirmation.`);
      await transaction.wait();
      setFormInput({ cardId: "", receiverAddressW: "", receiverAddressR: "", date: "", receiverAddressM: "" });
      fetchAllTransactions(); fetchTokenDetails();
      showSuccess('W-transaction confirmed — wholesaler transaction recorded on-chain.');
    } catch (error) { handleTransactionError(error); }
  };

  const fetchCardTransactionR = async () => {
    if (!contract) return;
    const { cardId, receiverAddressW, receiverAddressR, receiverAddressM } = formInput;
    const mergedW = receiverAddressW || "                                          ";
    const mergedM = receiverAddressM || "                                          ";
    const merged  = mergedM + mergedW + receiverAddressR + formInput.date + cardId;
    try {
      showLoading('Searching retailer transaction — looking up retailer record on chain…');
      const fee = await contract.transactionFee();
      const currentAllowance = await tokenContract.allowance(walletAddress, contractAddress);
      if (currentAllowance < fee) { showError('Insufficient allowance — please approve tokens first.'); return; }
      const transactionData = await contract.searchCardTransactionR(merged);
      await transactionData.wait();
      fetchAllTransactions(); fetchTokenDetails();
      showSuccess('Retailer search complete — transaction found and loaded.');
    } catch (error) { handleTransactionError(error); }
  };

  const fetchAllTransactions = async () => {
    if (contract) {
      try {
        const [cardIds, strhash, statuses] = await contract.getAllTransactions();
        const formatted = [];
        for (let i = 0; i < cardIds.length; i++) {
          if (strhash[i].slice(0, 42) === walletAddress) {
            formatted.push({
              cardId:           cardIds[i],
              receiverAddressW: strhash[i].slice(42, 84),
              receiverAddressR: strhash[i].slice(84, 126),
              date:             strhash[i].slice(126, 136),
              receiverAddressM: strhash[i].slice(0, 42),
              status:           statuses[i]
            });
          }
        }
        setAllTransactions(formatted);
      } catch (error) { handleTransactionError(error); }
    }
  };

  const scanQrCode = async () => {
    showLoading('Scanning QR code — opening camera feed…');
    try {
      const response = await axios.get("http://127.0.0.1:5000/scan_qr");
      const qrData   = response.data.qr_data;
      setFormInput({
        cardId: qrData.cart_id || "", receiverAddressM: qrData.receivers_addressM || "",
        receiverAddressW: qrData.receivers_addressW || "", receiverAddressR: qrData.receivers_addressR || "",
        date: qrData.date || ""
      });
      setIsQrScanned(true);
      showSuccess(`QR code scanned — Cart ID "${qrData.cart_id}" loaded into form.`);
    } catch (error) {
      showError(error.response?.data?.error || error.message || 'Could not read QR code. Please try again.');
    }
  };

  const lockMetaMask = async () => {
    try {
      await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      setWalletAddress(null); setContract(null); setTokenContract(null);
      showSuccess('Wallet disconnected — permissions revoked successfully.');
    } catch (error) {
      showError('Disconnect failed — could not revoke MetaMask permissions.');
    }
  };

  return (
    <>
      <SideManu />
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
            {walletAddress
              ? `${walletAddress.substring(0,6)}...${walletAddress.substring(walletAddress.length-4)}`
              : "Connect Wallet"}
          </span>
          {walletAddress && <div className="connected-indicator" />}
        </div>

        <TokenInfoSection
          tokenBalance={tokenBalance}
          isAddressWhitelisted={isAddressWhitelisted}
          transactionFee={transactionFee}
          allowance={allowance}
          approveTokenSpending={approveTokenSpending}
        />

        {/* ── Whitelist gate wraps everything below TokenInfoSection ── */}
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
                  {walletAddress
                    ? `${walletAddress.substring(0,10)}…${walletAddress.slice(-8)}`
                    : 'No wallet connected'}
                </div>
              </div>
            </div>
          )}

          <div className="parent-grid">

            <div className="div1 grid-card">
              <div className="card-header">
                <h2 className="card-title">Cart Details</h2>
                <div className="shimmer-effect" />
              </div>
              <div className="form-content">
                <div className="form-group">
                  <label>Cart ID</label>
                  <input className="form-input" placeholder="Card ID"
                    value={formInput.cardId}
                    onChange={(e) => setFormInput({...formInput, cardId: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Wholesaler Address</label>
                  <input className="form-input" placeholder="Wholesaler Address"
                    value={formInput.receiverAddressW}
                    onChange={(e) => setFormInput({...formInput, receiverAddressW: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Retailer Address</label>
                  <input className="form-input" placeholder="Retailer Address"
                    value={formInput.receiverAddressR}
                    onChange={(e) => setFormInput({...formInput, receiverAddressR: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="form-input"
                    value={formInput.date}
                    onChange={(e) => setFormInput({...formInput, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Manufacturer Address</label>
                  <input className="form-input" value={walletAddress || ""} disabled />
                </div>
              </div>
            </div>

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
                    { label: 'Retailer',     value: formInput.receiverAddressR && formInput.receiverAddressR.trim() && formInput.receiverAddressR !== "                                          " ? `${formInput.receiverAddressR.substring(0,6)}...${formInput.receiverAddressR.slice(-4)}` : null },
                    { label: 'Date',         value: formInput.date },
                    { label: 'Manufacturer', value: walletAddress ? `${walletAddress.substring(0,6)}...${walletAddress.slice(-4)}` : null },
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
                <button className="payment-button" onClick={registerCardTransaction}>
                  <div className="register-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Register Transaction</span>
                </button>
              </div>
            </div>

            <div className="div3 grid-card">
              <div className="card-header">
                <h2 className="card-title">All Transactions</h2>
                <div className="transaction-count">{allTransactions.length} transactions found</div>
                <div className="shimmer-effect" />
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
                        <td>{tx.receiverAddressW && tx.receiverAddressW !== "                                          " ? `${tx.receiverAddressW.substring(0,6)}...${tx.receiverAddressW.slice(-4)}` : "Not Available"}</td>
                        <td>{tx.receiverAddressR && tx.receiverAddressR !== "                                          " ? `${tx.receiverAddressR.substring(0,6)}...${tx.receiverAddressR.slice(-4)}` : "Not Available"}</td>
                        <td>{tx.date}</td>
                        <td>{tx.receiverAddressM && tx.receiverAddressM !== "                                          " ? `${tx.receiverAddressM.substring(0,6)}...${tx.receiverAddressM.slice(-4)}` : "Not Available"}</td>
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
      </div>

<style>{`
  .whitelist-gate-wrapper { position: relative; }

  .whitelist-gate-wrapper.is-locked .parent-grid {
    filter: blur(4px);
    pointer-events: none;
    user-select: none;
    opacity: 0.4;
    transition: filter 0.3s ease, opacity 0.3s ease;
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
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.15);
    backdrop-filter: blur(2px);
    border-radius: 12px;
  }

  .lock-card {
   
    border-radius: 16px;
   
    width: 100%;
    text-align: center;
   
    animation: lockCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
  }

  @keyframes lockCardIn {
    from { transform: scale(0.85) translateY(12px); opacity: 0; }
    to   { transform: scale(1) translateY(0); opacity: 1; }
  }

  .lock-icon-wrap {
    width: 64px; height: 64px;
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
  }

  .lock-svg { width: 30px; height: 30px; color: #dc2626; stroke: #dc2626; }

  .lock-title {
    font-size: 1.25rem; font-weight: 700; color: #111827;
    margin: 0 0 12px; letter-spacing: -0.01em;
  }

  .lock-description {
    font-size: 0.875rem; color: #6b7280;
    line-height: 1.6; margin: 0 0 20px;
  }

  .lock-address-pill {
    display: inline-block;
    background: #f3f4f6; border: 1px solid #e5e7eb;
    border-radius: 999px; padding: 6px 16px;
    font-size: 0.78rem; font-family: 'Courier New', monospace;
    color: #374151; letter-spacing: 0.03em;
  }

  .error-toast {
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    background-color: #ef4444; color: white; padding: 12px 24px;
    border-radius: 8px; font-weight: 400; font-family: sans-serif;
    letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1000;
  }
  .success-toast-bar {
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    background-color: #10b981; color: white; padding: 12px 24px;
    border-radius: 8px; font-family: sans-serif; font-weight: 400;
    letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1000;
  }
  .loading-toast {
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
    background: linear-gradient(90deg, #4F46E5, #6366F1); color: white;
    padding: 12px 24px; border-radius: 8px; font-family: sans-serif;
    font-weight: 400; letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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