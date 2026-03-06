import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../user_login/AuthContext';
import axios from 'axios';
import SideWhole from '../SideWhole';

function WarehouseWhole() {
  const { userId } = useAuth();
  const [products, setProducts] = useState([]);
  const [cartProducts, setCartProducts] = useState({});
  const [expandedCart, setExpandedCart] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const itemsPerPage = 7;

  // ── image helper: always returns a renderable src or null ─────────────────
  const getImageSrc = (raw) => {
    if (!raw) return null;
    if (raw instanceof File) return URL.createObjectURL(raw);
    if (typeof raw === 'string') {
      if (raw.startsWith('data:')) return raw;
      if (raw.startsWith('http')) return raw;
      // bare base64 string from backend
      return `data:image/jpeg;base64,${raw}`;
    }
    return null;
  };

  // ── date helper: always returns YYYY-MM-DD for <input type="date"> ────────
  const toInputDate = (raw) => {
    if (!raw) return '';
    // already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // ISO string like "2025-06-01T00:00:00.000Z"
    const d = new Date(raw);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return '';
  };

  // ── display date: DD/MM/YYYY ──────────────────────────────────────────────
  const toDisplayDate = (raw) => {
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString('en-IN');
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const parseReferenceCart = (referenceCartStr) => {
    if (!referenceCartStr) return null;
    try { return JSON.parse(referenceCartStr); }
    catch (e) { console.error('Error parsing reference_cart:', e); return null; }
  };

  const getExpiryStatus = (expDate) => {
    const today = new Date();
    const expiryDate = new Date(expDate);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    const yearsUntilExpiry = daysUntilExpiry / 365;
    if (daysUntilExpiry < 0)   return { status: 'Expired',         color: '#dc3545', bgColor: '#ffebee', textColor: 'white' };
    if (daysUntilExpiry <= 30) return { status: 'Expiring Soon',   color: '#fd7e14', bgColor: '#fff3e0', textColor: 'white' };
    if (yearsUntilExpiry >= 2) return { status: 'Long Shelf Life', color: '#28a745', bgColor: '#e8f5e9', textColor: 'white' };
    return { status: 'Good', color: '#4caf50', bgColor: '#f1f8e9', textColor: 'white' };
  };

  // ── data ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (userId) fetchProducts(); }, [userId]);

  const fetchProducts = async () => {
    try {
      const result = await axios.post('http://127.0.0.1:5000/getProductsWhole', { user_id: userId });
      const allProducts = result.data;
      setProducts(allProducts);

      const cartMap = new Map();
      allProducts.forEach(product => {
        const referenceCart = parseReferenceCart(product.reference_cart);
        if (referenceCart) {
          Object.values(referenceCart).forEach(cartInfo => {
            const cartId = cartInfo.cart_id;
            if (!cartMap.has(cartId)) cartMap.set(cartId, []);
            cartMap.get(cartId).push({ ...product, cart_quantity: cartInfo.quantity, cart_exp_date: cartInfo.exp_date });
          });
        } else {
          if (!cartMap.has('unassigned')) cartMap.set('unassigned', []);
          cartMap.get('unassigned').push({ ...product, cart_quantity: product.quantity_of_uom, cart_exp_date: product.exp_date });
        }
      });

      const groupedByCart = {};
      cartMap.forEach((prods, cartId) => {
        groupedByCart[cartId] = prods.sort((a, b) => new Date(a.cart_exp_date) - new Date(b.cart_exp_date));
      });
      setCartProducts(groupedByCart);
    } catch (err) {
      setErrorMessage('Error fetching products');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`http://127.0.0.1:5000/deleteProductWhole/${id}`);
      if (response.status === 200 && response.data.success) {
        setSuccessMessage('Product deleted successfully.');
        fetchProducts();
      }
    } catch (err) { setErrorMessage('Error deleting product.'); }
  };

  const handleSave = async () => {
    try {
      const updatedProduct = {
        product_id: selectedProduct.product_id,
        name: selectedProduct.name,
        category: selectedProduct.category,
        exp_date: toInputDate(selectedProduct.exp_date),
        price_per_unit: selectedProduct.price_per_unit,
        quantity_of_uom: selectedProduct.quantity_of_uom,
        shelf_num: selectedProduct.shelf_num,
        description: selectedProduct.description,
      };

      // Only include existing image URL in JSON if it's a string (not a File)
      // so the backend knows to keep it when no new file is uploaded
      const existingImageSrc = selectedProduct.picture_of_the_prod;
      if (existingImageSrc && !(existingImageSrc instanceof File)) {
        updatedProduct.picture_of_the_prod = existingImageSrc;
      }

      const formData = new FormData();
      formData.append('data', JSON.stringify(updatedProduct));

      // Only append image file if user actually picked a new one
      if (selectedProduct.picture_of_the_prod instanceof File) {
        formData.append('image', selectedProduct.picture_of_the_prod);
      }

      const response = await axios.post('http://127.0.0.1:5000/editProductWhole', formData);
      if (response.data.success) {
        fetchProducts();
        setIsEditing(false);
        setSuccessMessage('Product updated successfully.');
      }
    } catch (error) { setErrorMessage('Error updating product.'); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedProduct((prev) => ({
      ...prev,
      [name]: name === 'price_per_unit' || name === 'quantity_of_uom' ? parseFloat(value) : value,
    }));
  };

  const handleCloseModal = () => { setIsEditing(false); setIsShowing(false); setSelectedProduct(null); };

  const handlePrint = () => {
    const printContents = document.getElementById('main-product-table').outerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const toggleCart = (cartId) => setExpandedCart(expandedCart === cartId ? null : cartId);

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const pages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    return new Array(Math.min(5, pages - start)).fill(null).map((_, idx) => start + idx + 1);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <SideWhole />
      <div className="dashboard-cont">

        {/* Toasts */}
        {errorMessage && <div className="error-toast">{errorMessage}</div>}
        {successMessage && <div className="success-toast-bar">{successMessage}</div>}

        {/* ── Stats Row ── */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon stat-icon-indigo">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{products.length}</div>
              <div className="stat-label">Total Products</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{products.filter((p) => p.quantity_of_uom > 0).length}</div>
              <div className="stat-label">In Stock</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{products.filter((p) => p.quantity_of_uom === 0).length}</div>
              <div className="stat-label">Out of Stock</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{Object.keys(cartProducts).length}</div>
              <div className="stat-label">Active Carts</div>
            </div>
          </div>
        </div>

        {/* ── Main Inventory Table Card ── */}
        <div className="wh-table-card">
          <div className="card-header">
            <h2 className="card-title">Wholesale Inventory</h2>
            <div className="header-right">
              <span className="transaction-count">{filteredProducts.length} products</span>
            </div>
            <div className="shimmer-effect"></div>
          </div>

          {/* Toolbar */}
          <div className="wh-toolbar">
            <div className="search-wrapper">
              <svg className="search-icon-svg" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                className="wh-search-input"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="toolbar-actions">
              <button className="btn-add toolbar-btn" onClick={() => navigate('/addproductwhole')}>
                <svg viewBox="0 0 24 24" fill="none" className="btn-icon-sm">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Product
              </button>
              <button className="btn-print toolbar-btn" onClick={handlePrint}>
                <svg viewBox="0 0 24 24" fill="none" className="btn-icon-sm">
                  <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Print Table
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="transactions-table" id="main-product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Expiry Date</th>
                  <th>Price (₹)</th>
                  <th>Availability</th>
                  <th>Quantity</th>
                  <th>Shelf No.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.length === 0 ? (
                  <tr><td colSpan="10" className="empty-table-msg">No products found.</td></tr>
                ) : currentProducts.map((product) => (
                  <tr key={product.product_id} className="transaction-row">
                    <td><span className="id-chip">#{product.product_id}</span></td>
                    <td>
                      {getImageSrc(product.picture_of_the_prod) ? (
                        <img
                          src={getImageSrc(product.picture_of_the_prod)}
                          alt={product.name}
                          className="table-product-image"
                        />
                      ) : (
                        <div className="no-image-placeholder">No Image</div>
                      )}
                    </td>
                    <td className="product-name-cell">{product.name}</td>
                    <td>{product.category}</td>
                    <td>{toDisplayDate(product.exp_date)}</td>
                    <td className="price-cell">₹{Number(product.price_per_unit).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${product.quantity_of_uom === 0 ? 'status-failed' : 'status-completed'}`}>
                        {product.quantity_of_uom === 0 ? 'Out of Stock' : 'Available'}
                      </span>
                    </td>
                    <td>{product.quantity_of_uom}</td>
                    <td>{product.shelf_num}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit-btn" onClick={() => { setSelectedProduct(product); setIsEditing(true); }}>
                          <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Edit
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(product.product_id)}>
                          <svg viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Delete
                        </button>
                        <button className="action-btn view-btn" onClick={() => { setSelectedProduct(product); setIsShowing(true); }}>
                          <svg viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button className="pagination-button" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {getPaginationGroup().map((num) => (
              <button key={num} className={`pagination-number ${currentPage === num ? 'active' : ''}`} onClick={() => setCurrentPage(num)}>{num}</button>
            ))}
            <button className="pagination-button" onClick={() => setCurrentPage((p) => Math.min(p + 1, pages))} disabled={currentPage === pages || pages === 0}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* ── Products By Cart Section ── */}
        <div className="section-heading-bar">
          <div className="section-heading-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="section-heading-text">Products By Cart</h2>
          <span className="section-heading-badge">{Object.keys(cartProducts).length} carts</span>
        </div>

        <div className="cart-container">
          {Object.keys(cartProducts).length === 0 ? (
            <div className="empty-carts-msg">No cart data available.</div>
          ) : Object.entries(cartProducts).map(([cartId, cartProds]) => {
            const expiredCount      = cartProds.filter(p => getExpiryStatus(p.cart_exp_date).status === 'Expired').length;
            const expiringSoonCount = cartProds.filter(p => getExpiryStatus(p.cart_exp_date).status === 'Expiring Soon').length;
            const totalValue        = cartProds.reduce((sum, p) => sum + (p.price_per_unit * p.cart_quantity), 0);
            const isExpanded        = expandedCart === cartId;

            return (
              <div key={cartId} className="cart-card">
                {/* Cart Header */}
                <div className="cart-card-header" onClick={() => toggleCart(cartId)}>
                  <div className="cart-card-left">
                    <div className="cart-icon-wrap">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="cart-card-title">
                      Cart {cartId === 'unassigned' ? '(Unassigned)' : `#${cartId}`}
                    </span>
                  </div>
                  <div className="cart-card-stats">
                    <span className="cart-stat-pill cart-stat-items">{cartProds.length} items</span>
                    <span className="cart-stat-pill cart-stat-value">₹{totalValue.toFixed(2)}</span>
                    {expiredCount > 0 && <span className="cart-stat-pill cart-stat-expired">{expiredCount} Expired</span>}
                    {expiringSoonCount > 0 && <span className="cart-stat-pill cart-stat-expiring">{expiringSoonCount} Expiring Soon</span>}
                    <div className={`cart-chevron ${isExpanded ? 'cart-chevron-up' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Cart Body */}
                {isExpanded && (
                  <div className="cart-card-body">
                    <div className="cart-table-wrapper">
                      <table className="cart-inner-table">
                        <thead>
                          <tr>
                            <th>Image</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Expiry Status</th>
                            <th>Price (₹)</th>
                            <th>Total (₹)</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartProds.map((product) => {
                            const expiryStatus = getExpiryStatus(product.cart_exp_date);
                            const imgSrc = getImageSrc(product.picture_of_the_prod);
                            return (
                              <tr key={`${product.product_id}-${cartId}`} className="cart-inner-row">
                                <td>
                                  {imgSrc ? (
                                    <img src={imgSrc} alt={product.name} className="cart-product-thumb" />
                                  ) : (
                                    <div className="cart-no-image">–</div>
                                  )}
                                </td>
                                <td className="cart-product-name">{product.name}</td>
                                <td>{product.category}</td>
                                <td><strong>{product.cart_quantity}</strong></td>
                                <td>
                                  <span className="expiry-pill" style={{ backgroundColor: expiryStatus.color, color: expiryStatus.textColor }}>
                                    {expiryStatus.status}
                                  </span>
                                </td>
                                <td>{Number(product.price_per_unit).toFixed(2)}</td>
                                <td><strong>{(product.price_per_unit * product.cart_quantity).toFixed(2)}</strong></td>
                                <td>
                                  <div className="action-buttons">
                                    <button className="action-btn edit-btn" onClick={() => { setSelectedProduct(product); setIsEditing(true); }}>
                                      <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      Edit
                                    </button>
                                    <button className="action-btn view-btn" onClick={() => { setSelectedProduct(product); setIsShowing(true); }}>
                                      <svg viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Edit Modal ── */}
        {isEditing && selectedProduct && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-card-header">
                <h2 className="modal-card-title">Edit Product</h2>
                <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
              </div>
              <div className="modal-card-body">

                {/* Image Preview at top of edit modal */}
                {getImageSrc(selectedProduct.picture_of_the_prod) && (
                  <div className="edit-image-preview-wrap">
                    <img
                      src={getImageSrc(selectedProduct.picture_of_the_prod)}
                      alt="Product"
                      className="edit-image-preview"
                    />
                  </div>
                )}

                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Name</label>
                    <input className="form-input" type="text" name="name" value={selectedProduct.name || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input className="form-input" type="text" name="category" value={selectedProduct.category || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    {/* toInputDate ensures we always get YYYY-MM-DD regardless of backend format */}
                    <input
                      className="form-input"
                      type="date"
                      name="exp_date"
                      value={toInputDate(selectedProduct.exp_date)}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input className="form-input" type="number" name="price_per_unit" value={selectedProduct.price_per_unit || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input className="form-input" type="number" name="quantity_of_uom" value={selectedProduct.quantity_of_uom || ''} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Shelf No.</label>
                    <input className="form-input" type="text" name="shelf_num" value={selectedProduct.shelf_num || ''} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Description</label>
                  <textarea className="form-input form-textarea" name="description" value={selectedProduct.description || ''} onChange={handleInputChange} />
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Replace Image</label>
                  <div className="file-upload-row">
                    <label htmlFor="edit-file-upload" className="file-upload-btn">
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <path d="M21 15V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Choose File
                    </label>
                    <span className="file-upload-hint">
                      {selectedProduct.picture_of_the_prod instanceof File
                        ? selectedProduct.picture_of_the_prod.name
                        : 'No new file chosen'}
                    </span>
                    <input
                      id="edit-file-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setSelectedProduct((prev) => ({ ...prev, picture_of_the_prod: file }));
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-card-footer">
                <button className="payment-button modal-action-btn" onClick={handleSave}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}>
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Save Changes
                </button>
                <button className="cancel-modal-btn modal-action-btn" onClick={handleCloseModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── View Modal ── */}
        {isShowing && selectedProduct && (
          <div className="modal-backdrop">
            <div className="modal-card modal-card-sm">
              <div className="modal-card-header">
                <h2 className="modal-card-title">Product Details</h2>
                <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
              </div>
              <div className="modal-card-body">
                {/* Large centered image in view modal */}
                <div className="view-image-wrap">
                  {getImageSrc(selectedProduct.picture_of_the_prod) ? (
                    <img
                      src={getImageSrc(selectedProduct.picture_of_the_prod)}
                      alt={selectedProduct.name}
                      className="view-image"
                    />
                  ) : (
                    <div className="view-no-image">No Image Available</div>
                  )}
                </div>

                <div className="detail-grid">
                  <div className="detail-item"><span className="detail-label">Name</span><span className="detail-value">{selectedProduct.name}</span></div>
                  <div className="detail-item"><span className="detail-label">Category</span><span className="detail-value">{selectedProduct.category}</span></div>
                  <div className="detail-item"><span className="detail-label">Expiry Date</span><span className="detail-value">{toDisplayDate(selectedProduct.exp_date)}</span></div>
                  <div className="detail-item"><span className="detail-label">Price</span><span className="detail-value price-cell">₹{Number(selectedProduct.price_per_unit).toFixed(2)}</span></div>
                  <div className="detail-item"><span className="detail-label">Quantity</span><span className="detail-value">{selectedProduct.quantity_of_uom}</span></div>
                  <div className="detail-item"><span className="detail-label">Shelf No.</span><span className="detail-value">{selectedProduct.shelf_num}</span></div>
                  <div className="detail-item" style={{ gridColumn: '1/-1' }}>
                    <span className="detail-label">Status</span>
                    <span className={`status-badge ${selectedProduct.quantity_of_uom === 0 ? 'status-failed' : 'status-completed'}`}>
                      {selectedProduct.quantity_of_uom === 0 ? 'Out of Stock' : 'Available'}
                    </span>
                  </div>
                  <div className="detail-item" style={{ gridColumn: '1/-1' }}>
                    <span className="detail-label">Description</span>
                    <span className="detail-value desc-value">{selectedProduct.description}</span>
                  </div>
                </div>
              </div>
              <div className="modal-card-footer">
                <button className="cancel-modal-btn modal-action-btn" onClick={handleCloseModal}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ─────────────────────────────────────────────
           Layout
        ───────────────────────────────────────────── */
        .dashboard-cont {
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 120px 28px 60px 110px;
          min-height: 100vh; font-family: 'Poppins', sans-serif;
          background-color: #f8f9fa; box-sizing: border-box; width: 100%;
        }

        /* ─────────────────────────────────────────────
           Toasts
        ───────────────────────────────────────────── */
        .error-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px;
          font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1100;
        }
        .success-toast-bar {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background: #10b981; color: white; padding: 12px 24px; border-radius: 8px;
          font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1100;
        }
        @keyframes slideDown { from { transform: translate(-50%,-20px); opacity:0; } to { transform: translate(-50%,0); opacity:1; } }
        @keyframes fadeOut   { from { opacity:1; } to { opacity:0; visibility:hidden; } }

        /* ─────────────────────────────────────────────
           Stats
        ───────────────────────────────────────────── */
        .stats-row { display: flex; gap: 16px; margin-bottom: 20px; width: 100%; }
        .stat-card {
          display: flex; align-items: center; gap: 16px;
          background: white; border-radius: 12px; padding: 20px 28px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.07); flex: 1;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
        .stat-icon { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 12px; flex-shrink: 0; }
        .stat-icon svg { width: 100%; height: 100%; }
        .stat-icon-indigo { background: linear-gradient(135deg, #4F46E5, #6366F1); color: white; }
        .stat-icon-green  { background: linear-gradient(135deg, #10b981, #34d399); color: white; }
        .stat-icon-red    { background: linear-gradient(135deg, #ef4444, #f87171); color: white; }
        .stat-icon-orange { background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; }
        .stat-value { font-size: 2.2rem; font-weight: 700; color: #111827; line-height: 1; }
        .stat-label { font-size: 0.9rem; color: #6b7280; margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

        /* ─────────────────────────────────────────────
           Main Table Card
        ───────────────────────────────────────────── */
        .wh-table-card {
          background: white; border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          overflow: hidden; display: flex; flex-direction: column;
          width: 100%; margin-bottom: 32px;
        }
        .card-header {
          padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          color: white; position: relative; overflow: hidden;
        }
        .card-title { font-size: 1.25rem; font-weight: 700; position: relative; z-index: 2; text-transform: uppercase; letter-spacing: 0.07em; margin: 0; }
        .header-right { display: flex; align-items: center; gap: 12px; position: relative; z-index: 2; }
        .shimmer-effect {
          position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 3s infinite; z-index: 1;
        }
        @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
        .transaction-count { background: rgba(255,255,255,0.25); color: white; padding: 4px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: 600; }

        /* ─────────────────────────────────────────────
           Toolbar
        ───────────────────────────────────────────── */
        .wh-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #f1f5f9; gap: 16px; flex-wrap: wrap; }
        .search-wrapper { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
        .search-icon-svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: #9ca3af; }
        .wh-search-input { width: 100%; padding: 12px 16px 12px 44px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.95rem; font-family: 'Poppins', sans-serif; background: #f9fafb; transition: all 0.3s; box-sizing: border-box; }
        .wh-search-input:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background: white; }
        .toolbar-actions { display: flex; gap: 10px; }
        .toolbar-btn { display: flex; align-items: center; gap: 10px; padding: 13px 26px; border-radius: 8px; border: none; font-weight: 700; font-size: 0.95rem; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.3s; text-transform: uppercase; letter-spacing: 0.05em; }
        .btn-add   { background: #f59e0b; color: white; }
        .btn-add:hover { background: #d97706; transform: translateY(-2px); }
        .btn-print { background: #8b5cf6; color: white; }
        .btn-print:hover { background: #7c3aed; transform: translateY(-2px); }
        .btn-icon-sm { width: 18px; height: 18px; }

        /* ─────────────────────────────────────────────
           Table
        ───────────────────────────────────────────── */
        .table-container { padding: 0 24px; overflow-x: auto; flex-grow: 1; }
        .transactions-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .transactions-table th {
          background: #4F46E5;
          color: white; font-weight: 700; text-align: left;
          padding: 14px 18px; font-size: 0.85rem;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .transactions-table th:first-child { border-radius: 0; }
        .transactions-table td { padding: 14px 18px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.93rem; vertical-align: middle; }
        .transaction-row { transition: background-color 0.2s; }
        .transaction-row:hover { background: #f5f3ff; }

        .table-product-image { width: 70px; height: 62px; object-fit: contain; border-radius: 8px; display: block; border: 1px solid #e5e7eb; }
        .no-image-placeholder { width: 70px; height: 62px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; color: #9ca3af; text-align: center; border: 1px dashed #d1d5db; }

        .id-chip { background: #ede9fe; color: #4F46E5; padding: 4px 10px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; }
        .product-name-cell { font-weight: 700; color: #1e1b4b; font-size: 0.95rem; }
        .price-cell { font-weight: 700; color: #059669; font-size: 0.95rem; }

        .status-badge { padding: 5px 14px; border-radius: 50px; font-size: 0.82rem; font-weight: 700; display: inline-block; text-transform: uppercase; letter-spacing: 0.04em; }
        .status-completed { background: #ecfdf5; color: #10b981; }
        .status-failed    { background: #fee2e2; color: #ef4444; }
        .empty-table-msg  { text-align: center; color: #9ca3af; font-style: italic; padding: 40px 0 !important; }

        /* ─────────────────────────────────────────────
           Action Buttons
        ───────────────────────────────────────────── */
        .action-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
        .action-btn { display: flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 7px; border: none; font-size: 0.79rem; font-weight: 700; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.04em; }
        .action-btn svg { width: 13px; height: 13px; }
        .edit-btn   { background: #eff6ff; color: #3b82f6; }
        .edit-btn:hover { background: #3b82f6; color: white; }
        .delete-btn { background: #fef2f2; color: #ef4444; }
        .delete-btn:hover { background: #ef4444; color: white; }
        .view-btn   { background: #f0fdf4; color: #10b981; }
        .view-btn:hover { background: #10b981; color: white; }

        /* ─────────────────────────────────────────────
           Pagination
        ───────────────────────────────────────────── */
        .pagination { display: flex; justify-content: center; align-items: center; padding: 16px 24px; gap: 8px; border-top: 1px solid #f1f5f9; }
        .pagination-button { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; border: 1px solid #d1d5db; background: white; cursor: pointer; transition: all 0.2s; }
        .pagination-button:hover:not(:disabled) { background: #f3f4f6; }
        .pagination-button:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination-number { width: 36px; height: 36px; display: flex; justify-content: center; align-items: center; border-radius: 8px; border: 1px solid #d1d5db; background: white; cursor: pointer; font-weight: 500; font-size: 0.875rem; font-family: 'Poppins', sans-serif; transition: all 0.2s; }
        .pagination-number:hover { background: #f3f4f6; }
        .pagination-number.active { background: linear-gradient(135deg, #4F46E5, #6366F1); color: white; border-color: #4F46E5; }

        /* ─────────────────────────────────────────────
           Cart Section Heading
        ───────────────────────────────────────────── */
        .section-heading-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; width: 100%; }
        .section-heading-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #4F46E5, #6366F1); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; padding: 7px; flex-shrink: 0; }
        .section-heading-text { font-size: 1.35rem; font-weight: 700; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
        .section-heading-badge { background: #ede9fe; color: #4F46E5; padding: 4px 14px; border-radius: 50px; font-size: 0.85rem; font-weight: 700; }

        /* ─────────────────────────────────────────────
           Cart Cards
        ───────────────────────────────────────────── */
        .cart-container { display: flex; flex-direction: column; gap: 16px; width: 100%; margin-bottom: 40px; }
        .empty-carts-msg { text-align: center; color: #9ca3af; font-style: italic; padding: 32px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); width: 100%; }

        .cart-card { background: white; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden; transition: box-shadow 0.3s; width: 100%; }
        .cart-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.13); }

        .cart-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px;
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          cursor: pointer; gap: 16px; flex-wrap: wrap;
        }
        .cart-card-left { display: flex; align-items: center; gap: 14px; }
        .cart-icon-wrap { width: 40px; height: 40px; background: rgba(0,0,0,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; padding: 9px; flex-shrink: 0; }
        .cart-card-title { font-size: 0.95rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.08em; }

        .cart-card-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .cart-stat-pill { padding: 5px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: 700; }
        .cart-stat-items    { background: rgba(255,255,255,0.2); color: white; }
        .cart-stat-value    { background: rgba(16,185,129,0.85); color: white; }
        .cart-stat-expired  { background: #dc3545; color: white; }
        .cart-stat-expiring { background: #fd7e14; color: white; }

        .cart-chevron { color: white; transition: transform 0.3s; display: flex; align-items: center; }
        .cart-chevron-up { transform: rotate(180deg); }

        /* ─────────────────────────────────────────────
           Cart Inner Table
        ───────────────────────────────────────────── */
        .cart-card-body { padding: 20px 24px; }
        .cart-table-wrapper { overflow-x: auto; }
        .cart-inner-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .cart-inner-table th {
          background: #4F46E5;
          color: white; font-weight: 700; text-align: left;
          padding: 12px 16px; font-size: 0.82rem;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .cart-inner-table td { padding: 13px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 0.91rem; vertical-align: middle; }
        .cart-inner-row { transition: background-color 0.2s; }
        .cart-inner-row:hover { background: #f5f3ff; }
        .cart-inner-row:last-child td { border-bottom: none; }

        .cart-product-thumb { width: 72px; height: 64px; object-fit: contain; border-radius: 8px; display: block; border: 1px solid #e5e7eb; }
        .cart-no-image { width: 72px; height: 64px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 1.3rem; border: 1px dashed #d1d5db; }
        .cart-product-name { font-weight: 700; color: #1e1b4b; }
        .expiry-pill { padding: 5px 12px; border-radius: 50px; font-size: 0.79rem; font-weight: 700; display: inline-block; }

        /* ─────────────────────────────────────────────
           Modals
        ───────────────────────────────────────────── */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
        .modal-card { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); width: 100%; max-width: 640px; display: flex; flex-direction: column; animation: modalIn 0.3s ease; max-height: 90vh; overflow: hidden; }
        .modal-card-sm { max-width: 500px; }
        @keyframes modalIn { from { transform: scale(0.95) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

        .modal-card-header {
          padding: 18px 24px;
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          color: white; display: flex; justify-content: space-between; align-items: center;
          border-radius: 16px 16px 0 0;
        }
        .modal-card-title { font-size: 1.1rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.07em; margin: 0; }
        .modal-close-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; transition: background 0.2s; font-family: 'Poppins', sans-serif; }
        .modal-close-btn:hover { background: rgba(255,255,255,0.35); }
        .modal-card-body { padding: 24px; overflow-y: auto; flex-grow: 1; }

        /* ── Edit modal image preview ── */
        .edit-image-preview-wrap { text-align: center; margin-bottom: 20px; padding: 12px; background: #f8f9ff; border-radius: 10px; border: 1px solid #e0e7ff; }
        .edit-image-preview { max-width: 180px; max-height: 160px; object-fit: contain; border-radius: 10px; box-shadow: 0 4px 14px rgba(79,70,229,0.15); }

        /* ── View modal image ── */
        .view-image-wrap { text-align: center; margin-bottom: 20px; padding: 16px; background: #f8f9ff; border-radius: 12px; border: 1px solid #e0e7ff; }
        .view-image { max-width: 220px; max-height: 200px; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 24px rgba(79,70,229,0.18); }
        .view-no-image { width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-style: italic; font-size: 0.9rem; }

        /* ── File upload row ── */
        .file-upload-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .file-upload-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; background: linear-gradient(135deg, #4F46E5, #6366F1); color: white !important; border-radius: 7px; cursor: pointer; font-size: 0.85rem; font-weight: 600; font-family: 'Poppins', sans-serif; transition: opacity 0.2s; }
        .file-upload-btn:hover { opacity: 0.88; }
        .file-upload-hint { font-size: 0.82rem; color: #6b7280; font-style: italic; }

        .modal-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-weight: 600; color: #4b5563; font-size: 0.88rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-input { padding: 11px 14px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.93rem; font-family: 'Poppins', sans-serif; background: #f9fafb; color: #111827; width: 100%; box-sizing: border-box; transition: all 0.3s; }
        .form-input:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background: white; }
        .form-textarea { resize: vertical; min-height: 90px; }

        .modal-card-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; justify-content: flex-end; }
        .modal-action-btn { display: flex; align-items: center; gap: 8px; padding: 12px 26px; border-radius: 8px; border: none; font-weight: 700; font-size: 0.93rem; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.3s; text-transform: uppercase; letter-spacing: 0.05em; }
        .payment-button { background: #10b981; color: white; }
        .payment-button:hover { background: #059669; transform: translateY(-1px); }
        .cancel-modal-btn { background: #f1f5f9; color: #475569; }
        .cancel-modal-btn:hover { background: #e2e8f0; }

        /* ─────────────────────────────────────────────
           Detail Grid (View Modal)
        ───────────────────────────────────────────── */
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .detail-item { background: #f8fafc; border: 1px solid #e0e7ff; border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 5px; animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        .detail-label { font-size: 0.78rem; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .detail-value { font-size: 0.97rem; font-weight: 600; color: #111827; }
        .desc-value { font-weight: 400; color: #374151; line-height: 1.6; font-size: 0.875rem; }

        /* ─────────────────────────────────────────────
           Responsive
        ───────────────────────────────────────────── */
        @media (max-width: 1024px) {
          .dashboard-cont { padding-left: 24px; }
          .stats-row { flex-wrap: wrap; }
          .modal-form-grid { grid-template-columns: 1fr; }
          .detail-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .wh-toolbar { flex-direction: column; align-items: flex-start; }
          .search-wrapper { max-width: 100%; }
          .toolbar-actions { width: 100%; flex-direction: column; }
          .toolbar-btn { width: 100%; justify-content: center; }
          .cart-card-header { flex-direction: column; align-items: flex-start; }
          .cart-card-stats { flex-wrap: wrap; }
        }
      `}</style>
    </>
  );
}

export default WarehouseWhole;