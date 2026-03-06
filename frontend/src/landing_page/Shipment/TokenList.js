import React, { useState, useEffect } from 'react';
import './TokenList.css';

// Data URI for a simple placeholder
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='8' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";

// Store the correct CIDs as constants
const LOGO_CID = "bafybeigbsspj5dc73hzywe5gwk3rcoj6ubtgdi4ku3k5wff4guibj22gdq";
const TOKENLIST_CID = "bafkreifg2tpjw5euzzjubtcuh2uo3of7etyi2jith3x4f3znulutytqfei";

const TokenList = () => {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchTokenList = async () => {
      try {
        setIsLoading(true);
        // Use the correct CID for the token list with IPFS.io gateway
        const tokenListUrl = `https://ipfs.io/ipfs/${TOKENLIST_CID}`;
        
        try {
          const response = await fetch(tokenListUrl);
          if (!response.ok) {
            throw new Error(`Token list fetch returned ${response.status}`);
          }
          
          const data = await response.json();
          
          // Process the tokens to ensure proper logo URLs
          const processedTokens = (data.tokens || []).map(token => {
            // Set the correct logo URL using the logo CID
            return {
              ...token,
              logoURI: `https://ipfs.io/ipfs/${LOGO_CID}`
            };
          });
          
          setTokens(processedTokens);
        } catch (error) {
          console.error('Error fetching token list:', error);
          
          // Fallback to hard-coded tokens
          setTokens([
            {
              name: "Nirvana Smart Coin",
              symbol: "NSC",
              address: "0xc905e61E2a5DD4CEE5a62b8b2ef16F910D7CCC64",
              decimals: 18,
              logoURI: `https://ipfs.io/ipfs/${LOGO_CID}`
            },
            // Add more fallback tokens if needed
          ]);
        }
      } catch (error) {
        console.error('Error in token list processing:', error);
        setErrorMessage(`Failed to load token list: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenList();
  }, []);

  // Function to handle logo loading issues
  const handleLogoError = (e) => {
    console.error("Image failed to load:", e.target.src);
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE; // Use the data URI fallback
  };

  if (isLoading) {
    return (
      <div className="nsc-loading-container">
        <div className="nsc-loading-spinner"></div>
        <p>Loading token information...</p>
      </div>
    );
  }

  return (
    <div className="nsc-token-list-container">
      <div className="nsc-panel-section">
        <div className="nsc-section-header">
          <h1>Nirvana Token List</h1>
          <span className="nsc-token-count">{tokens.length} tokens available</span>
        </div>

        {errorMessage && (
          <div className="nsc-notification nsc-error-notification">
            <i className="fas fa-exclamation-circle"></i>
            <p>{errorMessage}</p>
            <button onClick={() => setErrorMessage("")} className="nsc-close-notification">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {tokens.length > 0 ? (
          <div className="nsc-token-grid">
            {tokens.map((token, index) => (
              <div className="nsc-token-card" key={index}>
                <div className="nsc-token-header">
                  <div className="nsc-token-logo">
                    <img 
                      src={token.logoURI || FALLBACK_IMAGE} 
                      alt={`${token.name} logo`} 
                      onError={handleLogoError}
                    />
                  </div>
                  <div className="nsc-token-title">
                    <h2>{token.name}</h2>
                    <span className="nsc-token-symbol">{token.symbol}</span>
                  </div>
                </div>
                
                <div className="nsc-token-details">
                  <div className="nsc-info-item">
                    <div className="nsc-info-label">Address</div>
                    <div className="nsc-info-value nsc-address-value">
                      {token.address.substring(0, 8)}...{token.address.substring(36)}
                      <button 
                        className="nsc-copy-btn" 
                        onClick={() => {
                          navigator.clipboard.writeText(token.address);
                          alert('Address copied to clipboard!');
                        }}
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div className="nsc-info-item">
                    <div className="nsc-info-label">Decimals</div>
                    <div className="nsc-info-value">{token.decimals}</div>
                  </div>
                  
                  {token.chainId && (
                    <div className="nsc-info-item">
                      <div className="nsc-info-label">Chain ID</div>
                      <div className="nsc-info-value">{token.chainId}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !errorMessage && (
          <div className="nsc-no-data">
            <i className="fas fa-info-circle"></i>
            <p>No tokens found in the list</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenList;