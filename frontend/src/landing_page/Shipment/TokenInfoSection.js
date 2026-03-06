import React, { useState, useEffect } from "react";
import './TokenInfo.css';
import { ethers } from 'ethers';

// Import just what we need from TokenList
const LOGO_CID = "bafybeigbsspj5dc73hzywe5gwk3rcoj6ubtgdi4ku3k5wff4guibj22gdq";
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f6f5ff'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='8' text-anchor='middle' dominant-baseline='middle' fill='%23a19bf7'%3ENSC%3C/text%3E%3C/svg%3E";

const TokenInfoSection = ({ tokenBalance, isAddressWhitelisted, transactionFee, allowance, approveTokenSpending }) => {
  const [logoUrl, setLogoUrl] = useState(`https://ipfs.io/ipfs/${LOGO_CID}`);
  const [showTooltip, setShowTooltip] = useState(false);

  // Handle logo loading issues
  const handleLogoError = (e) => {
    console.error("Image failed to load:", e.target.src);
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE;
  };

  // Format large numbers for better readability
  const formatNumber = (value) => {
    if (!value) return "0";
    const numValue = parseFloat(value);
    if (numValue < 0.001) return "<0.001";
    return numValue.toLocaleString(undefined, { maximumFractionDigits: 3 });
  };

  // Handle approve button click with whitelisting check
  const handleApproveClick = () => {
    if (isAddressWhitelisted) {
      approveTokenSpending();
    } else {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  // Calculate allowance percentage
  const calculateAllowancePercentage = () => {
    if (!allowance || !transactionFee || parseFloat(transactionFee) === 0) return 0;
    return Math.min(100, (parseFloat(allowance) / parseFloat(transactionFee)) * 100);
  };

  return (
    <div className="token-info-container">
      <div className="token-info-header">
        <div className="token-logo">
          <img 
            src={logoUrl} 
            alt="NSC Token" 
            onError={handleLogoError} 
          />
        </div>
        <div className="token-title">
          <h3>Nirvana Smart Coin</h3>
          <span className="token-network">Ethereum Network</span>
        </div>
      </div>
      
      <div className="token-stats-container">
        <div className="token-stat-card">
          <div className="stat-icon balance-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
              <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Your Balance</div>
            <div className="stat-value">{formatNumber(tokenBalance)} NSC</div>
          </div>
        </div>
        
        <div className="token-stat-card">
          <div className="stat-icon whitelist-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Whitelist Status</div>
            <div className="stat-value">
              <span className={`status-pill ${isAddressWhitelisted ? 'status-active' : 'status-inactive'}`}>
                {isAddressWhitelisted ? "Verified" : "Unverified"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="token-stat-card">
          <div className="stat-icon fee-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12.88 17.76V19H11.12V17.73C10.14 17.5 9.31 16.96 8.77 16.07L10.24 15.15C10.59 15.68 11.13 16 11.75 16C12.3 16 12.62 15.75 12.62 15.37C12.62 14.93 12.26 14.73 11.38 14.33C10.2 13.82 9.43 13.24 9.43 12.09C9.43 11.08 10.23 10.25 11.12 10.04V9H12.88V10.03C13.74 10.25 14.34 10.87 14.66 11.6L13.24 12.42C13.05 11.97 12.7 11.72 12.19 11.72C11.69 11.72 11.46 11.97 11.46 12.32C11.46 12.69 11.71 12.87 12.57 13.29C13.87 13.85 14.65 14.45 14.65 15.59C14.65 16.74 13.89 17.54 12.88 17.76Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Transaction Fee</div>
            <div className="stat-value">{formatNumber(transactionFee)} NSC</div>
          </div>
        </div>
        
        <div className="token-stat-card">
          <div className="stat-icon allowance-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 9V7C21 5.35 19.65 4 18 4H14.82C14.4 2.84 13.3 2 12 2C10.7 2 9.6 2.84 9.18 4H6C4.35 4 3 5.35 3 7V19C3 20.65 4.35 22 6 22H18C19.65 22 21 20.65 21 19V17" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M12 7C13.1 7 14 6.1 14 5C14 3.9 13.1 3 12 3C10.9 3 10 3.9 10 5C10 6.1 10.9 7 12 7Z" fill="currentColor"/>
              <path d="M16 15L18 17L22 13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Current Allowance</div>
            <div className="stat-value">
              {formatNumber(allowance)} NSC
              <div className="allowance-indicator-bar">
                <div 
                  className="allowance-progress" 
                  style={{ width: `${calculateAllowancePercentage()}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="token-actions">
        <button 
          className={`approve-button ${!isAddressWhitelisted ? 'button-disabled' : ''}`} 
          onClick={handleApproveClick}
          disabled={!isAddressWhitelisted}
        >
          <svg className="approve-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
          </svg>
          {isAddressWhitelisted ? "Approve Token Spending" : "Whitelisting Required"}
        </button>
        
        {showTooltip && (
          <div className="approval-tooltip">
            Your address needs to be whitelisted before approving tokens
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenInfoSection;