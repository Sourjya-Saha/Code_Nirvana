import React, { useState } from 'react';
import './ShipmentDialog.css';

const ShipmentOrderDialog = ({ product, isOpen, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOrderType = async (orderType) => {
    setLoading(true);
    setError(null);

    try {
      if (orderType === 'manufacturer') {
        const manufacturersResponse = await fetch('http://127.0.0.1:5000/get_manufacturer_users');
        if (!manufacturersResponse.ok) throw new Error('Failed to fetch manufacturers');
        const manufacturersList = await manufacturersResponse.json();

        const allProducts = [];
        for (let [manufacturerName, manufacturerId] of Object.entries(manufacturersList)) {
          const response = await fetch('http://127.0.0.1:5000/getProductsManu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: manufacturerId }),
          });
          if (response.ok) {
            const products = await response.json();
            allProducts.push(...products.map(p => ({ ...p, manufacturerId, manufacturerName })));
          }
        }

        const matchedProduct = allProducts.find(p =>
          p.name.toLowerCase().trim() === product.name.toLowerCase().trim()
        );

        if (matchedProduct) {
          onConfirm({
            orderType: 'manufacturer',
            preSelectedManufacturer: { id: matchedProduct.manufacturerId, name: matchedProduct.manufacturerName },
            preSelectedProduct: { name: matchedProduct.name, price: matchedProduct.price_per_unit, product_id: matchedProduct.product_id }
          });
          onClose();
        } else {
          throw new Error('Product not found with any manufacturer');
        }

      } else {
        const wholesalersResponse = await fetch('http://127.0.0.1:5000/get_wholesaler_users');
        if (!wholesalersResponse.ok) throw new Error('Failed to fetch wholesalers');
        const wholesalersList = await wholesalersResponse.json();

        const allProducts = [];
        for (let [wholesalerName, wholesalerId] of Object.entries(wholesalersList)) {
          const response = await fetch('http://127.0.0.1:5000/getProductsWhole', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: wholesalerId }),
          });
          if (response.ok) {
            const products = await response.json();
            allProducts.push(...products.map(p => ({ ...p, wholesalerId, wholesalerName })));
          }
        }

        const matchedProduct = allProducts.find(p =>
          p.name.toLowerCase().trim() === product.name.toLowerCase().trim()
        );

        if (matchedProduct) {
          onConfirm({
            orderType: 'wholesaler',
            preSelectedWholesaler: { id: matchedProduct.wholesalerId, name: matchedProduct.wholesalerName },
            preSelectedProduct: { name: matchedProduct.name, price: matchedProduct.price_per_unit, product_id: matchedProduct.product_id }
          });
          onClose();
        } else {
          throw new Error('Product not found with any wholesaler');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sd-overlay" onClick={onClose}>
      <div className="sd-dialog" onClick={(e) => e.stopPropagation()}>

        <div className="sd-header">
          <div className="sd-header-info">
            <span className="sd-tag">Restock Order</span>
            <p className="sd-product-name">{product?.name || 'Unknown Product'}</p>
          </div>
          <button className="sd-close-btn" onClick={onClose} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 12 12" fill="none">
  <path d="M10 2L2 10M2 2l8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
</svg>
          </button>
        </div>

        <div className="sd-sep" />

        <p className="sd-instruction">Choose a source to place your restock order</p>

        {error && (
          <div className="sd-error-bar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke="#b91c1c" strokeWidth="1.3"/>
              <path d="M7 4.5v3M7 9.2v.3" stroke="#b91c1c" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            {error}. Please try again.
          </div>
        )}

        <div className="sd-actions">
          <button className="sd-source-btn sd-source-manu" onClick={() => handleOrderType('manufacturer')} disabled={loading}>
            <div className="sd-source-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M12 11v4M10 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="sd-source-label">
              <span className="sd-source-title">Order from Manufacturer</span>
              <span className="sd-source-hint">Source directly from production</span>
            </div>
            <svg className="sd-source-chevron" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 13l4-4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="sd-source-btn sd-source-whole" onClick={() => handleOrderType('wholesaler')} disabled={loading}>
            <div className="sd-source-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.6"/>
                <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            </div>
            <div className="sd-source-label">
              <span className="sd-source-title">Order from Wholesaler</span>
              <span className="sd-source-hint">Source via bulk distributor</span>
            </div>
            <svg className="sd-source-chevron" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 13l4-4-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="sd-footer">
          {loading ? (
            <div className="sd-loading-row">
              <div className="sd-spinner" />
              <span>Searching for suppliers…</span>
            </div>
          ) : (
            <button className="sd-cancel-btn" onClick={onClose}>Cancel</button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ShipmentOrderDialog;