import React, { useState, useEffect } from "react";
import axios from "axios";
import "./carts.css";
import SideManu from "../SideManu";
import Modal from 'react-modal';
import { useAuth } from "../user_login/AuthContext";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

Modal.setAppElement('#root');

// ─── Highlight utility ────────────────────────────────────────────────────────
const Highlight = ({ text, query }) => {
  if (!query || !text) return <span>{text}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = String(text).split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="highlight-mark">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
};

// ─── SearchBar ────────────────────────────────────────────────────────────────
const SearchBar = ({ query, onChange, total, resultCount }) => {
  const [focused, setFocused] = useState(false);
  const noResults = query && resultCount === 0;
  let subtitle = `${total} carts total`;
  if (query && resultCount > 0) subtitle = `${resultCount} result${resultCount !== 1 ? 's' : ''} for "${query}"`;
  if (noResults) subtitle = `No carts match "${query}"`;

  return (
    <div className="searchbar-wrap">
      <div className={`searchbar-row${focused ? ' focused' : ''}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="searchbar-input"
          type="text"
          value={query}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by Cart ID…"
        />
        {query && (
          <span className={`result-badge${noResults ? ' no-results' : ''}`}>{resultCount}/{total}</span>
        )}
        {query && (
          <button className="clear-btn" onClick={() => onChange('')} aria-label="Clear">×</button>
        )}
      </div>
      <p className={`search-subtitle${noResults ? ' subtitle-empty' : ''}`}>{subtitle}</p>
    </div>
  );
};

// ─── ITEMS_PER_PAGE const ─────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 5;

// ─── EmptyState ───────────────────────────────────────────────────────────────
const EmptyState = ({ query }) => (
  <div className="no-data-message">
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <p>{query ? `No results for "${query}"` : 'No carts available'}</p>
    <p style={{ fontSize: '0.85rem', color: '#c4c9d4', marginTop: '4px' }}>
      {query ? 'Try a different search term' : 'Carts will appear here once added'}
    </p>
  </div>
);

// ─── Main Cart Component ──────────────────────────────────────────────────────
const Cart = () => {
  const { userId } = useAuth();
  const [products, setProducts] = useState([{ product_id: "", quantity: 1, price_per_unit: 0 }]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [cartData, setCartData] = useState([]);
  const [selectedCart, setSelectedCart] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cartId, setCartId] = useState("");
  const [usedCartIds, setUsedCartIds] = useState(new Set());
  const [formData, setFormData] = useState({
    cart_id: '', receivers_addressM: '', receivers_addressW: '', receivers_addressR: '', date: '',
  });
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [cartError, setCartError] = useState('');

  // Search + Pagination — independent per section
  const [cardsQuery, setCardsQuery] = useState('');
  const [tableQuery, setTableQuery] = useState('');
  const [cardsPage, setCardsPage] = useState(1);
  const [tablePage, setTablePage] = useState(1);

  useEffect(() => { setCardsPage(1); }, [cardsQuery]);
  useEffect(() => { setTablePage(1); }, [tableQuery]);

  const reversedCartData = [...cartData].reverse();
  const filteredCards = reversedCartData.filter(c => c.cart_id.toLowerCase().includes(cardsQuery.toLowerCase()));
  const filteredTable = reversedCartData.filter(c => c.cart_id.toLowerCase().includes(tableQuery.toLowerCase()));
  const paginatedCards = filteredCards.slice((cardsPage - 1) * ITEMS_PER_PAGE, cardsPage * ITEMS_PER_PAGE);
  const paginatedTable = filteredTable.slice((tablePage - 1) * ITEMS_PER_PAGE, tablePage * ITEMS_PER_PAGE);

  const cardsTotalPages = Math.max(1, Math.ceil(filteredCards.length / ITEMS_PER_PAGE));
  const tableTotalPages = Math.max(1, Math.ceil(filteredTable.length / ITEMS_PER_PAGE));

  const getPageGroup = (current, total) => {
    const start = Math.floor((current - 1) / 5) * 5;
    return new Array(Math.min(5, total - start)).fill(null).map((_, i) => start + i + 1);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const addresses = [formData.receivers_addressM, formData.receivers_addressW, formData.receivers_addressR].filter(a => a && a.trim());
    const hasDuplicates = addresses.some((a, i) => addresses.slice(0, i).concat(addresses.slice(i + 1)).includes(a));
    if (hasDuplicates) { setError('Each provided address must be unique.'); return; }
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/generate_qr', {
        ...formData,
        receivers_addressM: formData.receivers_addressM?.trim() || null,
        receivers_addressW: formData.receivers_addressW?.trim() || null,
        receivers_addressR: formData.receivers_addressR?.trim() || null,
      }, { responseType: 'blob' });
      if (res.status === 200) {
        setQrImage(URL.createObjectURL(new Blob([res.data], { type: 'image/png' })));
        setModalIsOpen(false);
      } else setError('Unexpected server response.');
    } catch { setError('Failed to generate QR code. Please try again.'); }
    finally { setLoading(false); }
  };

  const openModal = async (id) => {
    const cart = cartData.find(c => c.cart_id === id);
    if (cart) {
      const total = cart.products.reduce((t, p) => t + p.price_per_unit * p.quantity, 0);
      setFormData(prev => ({ ...prev, cart_id: id, price_per_unit: String(total) }));
      try {
        const res = await axios.post('http://localhost:5000/get_meta_add_for_qr', { cart_id: id });
        setFormData(prev => ({
          ...prev,
          receivers_addressM: res.data.manufacturer || '',
          receivers_addressW: res.data.wholesaler || '',
          receivers_addressR: res.data.retailer || '',
        }));
      } catch { toast.error('Failed to fetch addresses'); }
    }
    setModalIsOpen(true);
  };

  const closeModal = () => setModalIsOpen(false);

  useEffect(() => {
    if (userId) {
      axios.post('http://localhost:5000/getProductsManu', { user_id: userId }).then(r => setAvailableProducts(r.data)).catch(() => {});
      fetchCartData();
    }
  }, [userId]);

  const fetchCartData = async () => {
    try {
      const r = await axios.post('http://localhost:5000/getCartsManu', { user_id: userId });
      setCartData(r.data);
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      const r = await axios.delete(`http://localhost:5000/deleteCartManu/${id}`, { params: { user_id: userId } });
      if (r.status === 200 && r.data.success) {
        setCartData(cartData.filter(c => c.cart_id !== id));
        toast.success(`Cart ${id} deleted`);
      } else toast.error('Failed to delete cart');
    } catch { toast.error(`Failed to delete cart ${id}`); }
  };

  const handleViewCart = async (id) => {
    try {
      const r = await axios.post(`http://localhost:5000/get_cart/${id}`, { user_id: userId });
      setSelectedCart(r.data); setModalVisible(true);
    } catch {}
  };

  const closeModl = () => { setModalVisible(false); setSelectedCart(null); };

  const calculateTotals = (cart) => ({
    totalQuantity: cart.products.reduce((s, p) => s + p.quantity, 0),
    totalPrice: cart.products.reduce((s, p) => s + p.quantity * p.price_per_unit, 0),
  });

  const downloadQrCode = () => {
    const a = document.createElement('a');
    a.href = qrImage; a.download = 'QRCode.png';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Reusable inline Pagination ────────────────────────────────────────────
  const PaginationBar = ({ page, totalPages, pages, onPrev, onNext, onPage }) => (
    <div className="pagination">
      <button className="pagination-button" onClick={onPrev} disabled={page === 1}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18L9 12L15 6"/></svg>
      </button>
      {pages.map(num => (
        <button key={num} className={`pagination-number${page === num ? ' active' : ''}`} onClick={() => onPage(num)}>{num}</button>
      ))}
      <button className="pagination-button" onClick={onNext} disabled={page === totalPages}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6L15 12L9 18"/></svg>
      </button>
    </div>
  );

  return (
    <>
      <SideManu />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false}
        newestOnTop={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="light" />

      {/* ── Generate QR Modal ─────────────────────────────────────────── */}
      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} className="qr-modal" overlayClassName="modal-overlay">
        <div className="modal-header">
          <h3 className="modal-title">Generate QR Code</h3>
          <button className="modal-close-x" onClick={closeModal}>×</button>
        </div>
        {error && <div className="form-error-banner">{error}</div>}
        <form onSubmit={handleSubmit} className="qr-form">
          <div className="form-group">
            <label>Cart ID</label>
            <input className="form-input" type="text" name="cart_id" value={formData.cart_id} onChange={handleChange} required readOnly />
          </div>
          <div className="form-group">
            <label>Manufacturer Address <span className="field-optional">(Optional)</span></label>
            <input className="form-input" type="text" name="receivers_addressM" value={formData.receivers_addressM} onChange={handleChange} placeholder="0x…" readOnly />
          </div>
          <div className="form-group">
            <label>Wholesaler Address <span className="field-optional">(Optional)</span></label>
            <input className="form-input" type="text" name="receivers_addressW" value={formData.receivers_addressW} onChange={handleChange} placeholder="0x…" readOnly />
          </div>
          <div className="form-group">
            <label>Retailer Address <span className="field-optional">(Optional)</span></label>
            <input className="form-input" type="text" name="receivers_addressR" value={formData.receivers_addressR} onChange={handleChange} placeholder="0x…" readOnly />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input className="form-input" type="date" name="date" value={formData.date} onChange={handleChange} required />
          </div>
          <div className="button-container">
            <button className="validate-button" type="submit" disabled={loading}>
              <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="17" y="17" width="3" height="3"/>
              </svg>
              {loading ? 'Generating…' : 'Generate QR Code'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Cart Modal ─────────────────────────────────────────────── */}
      {modalVisible && selectedCart && (
        <div className="view-overlay">
          <div className="view-modal">
            <div className="modal-header">
              <h3 className="modal-title">Cart Details</h3>
              <button className="modal-close-x" onClick={closeModl}>×</button>
            </div>
            <div className="product-cards-scroll">
              {selectedCart.products && selectedCart.products.length > 0
                ? selectedCart.products.map((p, i) => (
                  <div key={i} className="product-card">
                    <p className="product-name">{p[1] || 'N/A'}</p>
                    <div className="product-row">
                      <span className="qr-data-label">Quantity</span>
                      <span className="qr-data-value">{p[3] || 0}</span>
                    </div>
                    <div className="product-row">
                      <span className="qr-data-label">Price / Unit</span>
                      <span className="qr-data-value">₹{p[2] || 0}</span>
                    </div>
                    <div className="product-row product-total">
                      <span className="qr-data-label">Total</span>
                      <span className="qr-data-value">₹{(p[2] * p[3]).toFixed(2)}</span>
                    </div>
                  </div>
                ))
                : <div className="no-data-message"><p>No products in this cart.</p></div>
              }
            </div>
            {selectedCart.products && selectedCart.products.length > 0 && (
              <div className="view-summary">
                <div className="summary-row">
                  <span>Total Quantity</span>
                  <span>{selectedCart.products.reduce((s, p) => s + p[3], 0)}</span>
                </div>
                <div className="summary-row summary-grand">
                  <span>Total Price</span>
                  <span>₹{selectedCart.products.reduce((s, p) => s + p[2] * p[3], 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Dashboard ───────────────────────────────────────────────── */}
      <div className="dashboard-cont">
        <div className="parent-grid">

          {/* ══ DIV1 — Cart QR Management ══ */}
          <div className="div1 grid-card">
            <div className="card-header">
              <h2 className="card-title">Cart Management</h2>
              <span className="transaction-count">{reversedCartData.length} carts</span>
              <div className="shimmer-effect"></div>
            </div>

            <div className="qr-content">
              <SearchBar query={cardsQuery} onChange={setCardsQuery}
                total={reversedCartData.length} resultCount={filteredCards.length} />

              {paginatedCards.length === 0
                ? <EmptyState query={cardsQuery} />
                : paginatedCards.map(cart => (
                  <div key={cart.cart_id} className="qr-data-item cart-row-item">
                    <div>
                      <div className="qr-data-label">CART ID</div>
                      <div className="qr-data-value">
                        <Highlight text={cart.cart_id} query={cardsQuery} />
                      </div>
                    </div>
                    <button className="scan-button" onClick={() => openModal(cart.cart_id)}>
                      <svg className="scan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9V5H7"/><path d="M3 15V19H7"/><path d="M17 5H21V9"/>
                        <path d="M17 19H21V15"/><rect x="7" y="7" width="3" height="3" fill="currentColor"/>
                        <rect x="14" y="7" width="3" height="3" fill="currentColor"/>
                        <rect x="7" y="14" width="3" height="3" fill="currentColor"/>
                        <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
                      </svg>
                      Generate QR
                    </button>
                  </div>
                ))
              }
            </div>

            {filteredCards.length > ITEMS_PER_PAGE && (
              <PaginationBar
                page={cardsPage} totalPages={cardsTotalPages}
                pages={getPageGroup(cardsPage, cardsTotalPages)}
                onPrev={() => setCardsPage(p => Math.max(p - 1, 1))}
                onNext={() => setCardsPage(p => Math.min(p + 1, cardsTotalPages))}
                onPage={setCardsPage}
              />
            )}
          </div>

          {/* ══ DIV2 — QR Preview ══ */}
          <div className="div2 grid-card">
            <div className="card-header">
              <h2 className="card-title">QR Preview</h2>
              <span className="qr-badge">{qrImage ? 'Ready' : 'Awaiting'}</span>
              <div className="shimmer-effect"></div>
            </div>

            <div className="qr-content qr-preview-body">
              {qrImage ? (
                <>
                  <img src={qrImage} alt="Generated QR Code" className="qr-preview-img" />
                  <p className="qr-preview-hint">QR CODE READY — DOWNLOAD TO SAVE</p>
                  <button className="payment-button" onClick={downloadQrCode}>
                    <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download QR Code
                  </button>
                </>
              ) : (
                <div className="qr-scan-placeholder">
                  <svg className="qr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <path d="M14 14h3v3"/><path d="M14 20h6"/><path d="M20 14v6"/>
                  </svg>
                  <p>No QR code generated yet</p>
                  <p style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>Select a cart and click "Generate QR"</p>
                </div>
              )}
            </div>
          </div>

          {/* ══ DIV3 — All Carts Table ══ */}
          <div className="div3 grid-card">
            <div className="card-header">
              <h2 className="card-title">All Carts</h2>
              <span className="transaction-count">{filteredTable.length} carts found</span>
              <div className="shimmer-effect"></div>
            </div>

            <div className="transactions-content">
              <SearchBar query={tableQuery} onChange={setTableQuery}
                total={reversedCartData.length} resultCount={filteredTable.length} />
            </div>

            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th style={{ width: '52px' }}>#</th>
                    <th>Cart ID</th>
                    <th>Total Qty</th>
                    <th>Total Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTable.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                        <EmptyState query={tableQuery} />
                      </td>
                    </tr>
                  ) : (
                    paginatedTable.map((cart, idx) => {
                      const { totalQuantity, totalPrice } = calculateTotals(cart);
                      const num = (tablePage - 1) * ITEMS_PER_PAGE + idx + 1;
                      return (
                        <tr key={cart.cart_id} className="transaction-row">
                          <td className="td-num">{num}</td>
                          <td className="td-id">
                            <Highlight text={cart.cart_id} query={tableQuery} />
                          </td>
                          <td>{totalQuantity}</td>
                          <td>₹{totalPrice.toFixed(2)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="act-view" onClick={() => handleViewCart(cart.cart_id)} title="View">
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            <button className="act-delete" onClick={() => handleDelete(cart.cart_id)} title="Delete">
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredTable.length > ITEMS_PER_PAGE && (
              <PaginationBar
                page={tablePage} totalPages={tableTotalPages}
                pages={getPageGroup(tablePage, tableTotalPages)}
                onPrev={() => setTablePage(p => Math.max(p - 1, 1))}
                onNext={() => setTablePage(p => Math.min(p + 1, tableTotalPages))}
                onPage={setTablePage}
              />
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default Cart;