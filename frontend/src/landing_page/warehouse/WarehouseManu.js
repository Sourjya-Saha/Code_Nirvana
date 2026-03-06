import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../user_login/AuthContext';
import axios from 'axios';
import SideManu from '../SideManu';

function WarehouseManu() {
  const { userId } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const itemsPerPage = 7;

  useEffect(() => {
    if (userId) fetchProducts();
  }, [userId]);

  const fetchProducts = async () => {
    try {
      const result = await axios.post('http://127.0.0.1:5000/getProductsManu', { user_id: userId });
      setProducts(result.data);
    } catch (err) {
      setErrorMessage('Error fetching products');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`http://127.0.0.1:5000/deleteProductManu/${id}`);
      if (response.status === 200 && response.data.success) {
        setProducts(products.filter((p) => p.product_id !== id));
        setSuccessMessage('Product deleted successfully.');
      }
    } catch (err) {
      setErrorMessage('Error deleting product.');
    }
  };

const handleSave = async () => {
  try {
    const updatedProduct = {
      product_id: selectedProduct.product_id,
      name: selectedProduct.name,
      category: selectedProduct.category,
      expiry_date: selectedProduct.exp_date,
      price_per_unit: selectedProduct.price_per_unit,
      quantity_of_uom: selectedProduct.quantity_of_uom,
      shelf_num: selectedProduct.shelf_num,
      description: selectedProduct.description,
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(updatedProduct));

    // Only send image if user selected new file
    if (selectedProduct.picture_of_the_prod instanceof File) {
      formData.append('image', selectedProduct.picture_of_the_prod);
    }

    const response = await axios.post(
      'http://127.0.0.1:5000/editProductManu',
      formData
    );

    if (response.data.success) {
      fetchProducts(); // refresh from backend
      setIsEditing(false);
      setSuccessMessage('Product updated successfully.');
    }

  } catch (error) {
    setErrorMessage('Error updating product.');
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedProduct((prev) => ({
      ...prev,
      [name]: name === 'price_per_unit' || name === 'quantity_of_uom' ? parseFloat(value) : value,
    }));
  };

  const handleCloseModal = () => {
    setIsEditing(false);
    setIsShowing(false);
    setSelectedProduct(null);
  };

  const handlePrint = () => {
    const printContents = document.getElementById('product-table').outerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    return new Array(Math.min(5, pages - start)).fill(null).map((_, idx) => start + idx + 1);
  };

  return (
    <>
      <SideManu />
      <div className="dashboard-cont">

        {/* Toasts */}
        {errorMessage && <div className="error-toast">{errorMessage}</div>}
        {successMessage && <div className="success-toast-bar">{successMessage}</div>}

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              <svg viewBox="0 0 24 24" fill="none"><path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 21V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="stat-value">{products.length}</div>
              <div className="stat-label">Total Products</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <svg viewBox="0 0 24 24" fill="none"><path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="stat-value">{products.filter((p) => p.quantity_of_uom > 0).length}</div>
              <div className="stat-label">In Stock</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-red">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div className="stat-value">{products.filter((p) => p.quantity_of_uom === 0).length}</div>
              <div className="stat-label">Out of Stock</div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="grid-card wh-table-card">
          <div className="card-header">
            <h2 className="card-title">Warehouse Inventory</h2>
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
              <button className="scan-button toolbar-btn" onClick={() => navigate('/productsmanu')}>
                <svg viewBox="0 0 24 24" fill="none" className="btn-icon-sm">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Product
              </button>
              <button className="validate-after-payment toolbar-btn" onClick={handlePrint}>
                <svg viewBox="0 0 24 24" fill="none" className="btn-icon-sm">
                  <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Print Table
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="transactions-table" id="product-table">
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
                  <tr>
                    <td colSpan="9" className="empty-table-msg">No products found.</td>
                  </tr>
                ) : currentProducts.map((product) => (
                  <tr key={product.product_id} className="transaction-row">
                    <td><span className="id-chip">#{product.product_id}</span></td>
                   <td>
  {product.picture_of_the_prod ? (
    <img
      src={`data:image/jpeg;base64,${product.picture_of_the_prod}`}
      alt="Product"
      className="table-product-image"
    />
  ) : (
    <span style={{ color: '#9ca3af' }}>No Image</span>
  )}
</td>

<td className="product-name-cell">{product.name}</td>
                    <td>{product.category}</td>
                    <td>{product.exp_date}</td>
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
                          <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Edit
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(product.product_id)}>
                          <svg viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Delete
                        </button>
                        <button className="action-btn view-btn" onClick={() => { setSelectedProduct(product); setIsShowing(true); }}>
                          <svg viewBox="0 0 24 24" fill="none"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
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
              <button key={num} className={`pagination-number ${currentPage === num ? 'active' : ''}`} onClick={() => setCurrentPage(num)}>
                {num}
              </button>
            ))}
            <button className="pagination-button" onClick={() => setCurrentPage((p) => Math.min(p + 1, pages))} disabled={currentPage === pages || pages === 0}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditing && selectedProduct && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-card-header">
                <h2 className="modal-card-title">Edit Product</h2>
                <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
              </div>
              <div className="modal-card-body">
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Name</label>
                    <input className="form-input" type="text" name="name" value={selectedProduct.name} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input className="form-input" type="text" name="category" value={selectedProduct.category} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input className="form-input" type="date" name="exp_date" value={
  selectedProduct.exp_date
    ? selectedProduct.exp_date.split('T')[0]
    : ''
} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input className="form-input" type="number" name="price_per_unit" value={selectedProduct.price_per_unit} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input className="form-input" type="number" name="quantity_of_uom" value={selectedProduct.quantity_of_uom} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Shelf No.</label>
                    <input className="form-input" type="text" name="shelf_num" value={selectedProduct.shelf_num} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Description</label>
                  <textarea className="form-input form-textarea" name="description" value={selectedProduct.description} onChange={handleInputChange} />
                </div>
                <div className="form-group" style={{ marginTop: '16px' }}>
  <label>Product Image</label>

  {selectedProduct.picture_of_the_prod && (
    <div style={{ marginBottom: '10px', textAlign: 'center' }}>
      <img
        src={
          selectedProduct.picture_of_the_prod instanceof File
            ? URL.createObjectURL(selectedProduct.picture_of_the_prod)
            : `data:image/jpeg;base64,${selectedProduct.picture_of_the_prod}`
        }
        alt="Preview"
        style={{
          width: "140px",
          borderRadius: "10px",
          objectFit: "cover"
        }}
      />
    </div>
  )}

  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files[0];
      setSelectedProduct((prev) => ({
        ...prev,
        picture_of_the_prod: file
      }));
    }}
  />
</div>
              </div>
              <div className="modal-card-footer">
                <button className="payment-button modal-action-btn" onClick={handleSave}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}><path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16L21 8V19C21 20.1 20.1 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Save Changes
                </button>
                <button className="cancel-modal-btn modal-action-btn" onClick={handleCloseModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Show/View Modal */}
        {isShowing && selectedProduct && (
          <div className="modal-backdrop">
            <div className="modal-card modal-card-sm">
              <div className="modal-card-header">
                <h2 className="modal-card-title">Product Details</h2>
                <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
              </div>
              <div className="modal-card-body">
                {selectedProduct.picture_of_the_prod && (
  <div style={{ textAlign: 'center', marginBottom: '18px' }}>
    <img
      src={`data:image/jpeg;base64,${selectedProduct.picture_of_the_prod}`}
      alt="Product"
      style={{
        width: "180px",
        borderRadius: "12px",
        objectFit: "cover",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
      }}
    />
  </div>
)}
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">{selectedProduct.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Category</span>
                    <span className="detail-value">{selectedProduct.category}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Expiry Date</span>
                    <span className="detail-value">{selectedProduct.exp_date}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Price</span>
                    <span className="detail-value">₹{Number(selectedProduct.price_per_unit).toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Quantity</span>
                    <span className="detail-value">{selectedProduct.quantity_of_uom}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Shelf No.</span>
                    <span className="detail-value">{selectedProduct.shelf_num}</span>
                  </div>
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
        .dashboard-cont {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-left: 110px;
          padding-top: 120px;
          padding-right: 28px;
          padding-bottom: 40px;
          min-height: 100vh;
          font-family: 'Poppins', sans-serif;
          background-color: #f8f9fa;
          box-sizing: border-box;
          width: 100%;
        }

        /* Toasts */
        .error-toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #ef4444;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards;
          z-index: 1000;
        }
        .success-toast-bar {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #10b981;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards;
          z-index: 1000;
        }
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; visibility: hidden; }
        }

        /* Stats Row */
        .stats-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          width: 100%;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          border-radius: 12px;
          padding: 20px 28px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.07);
          flex: 1;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.12);
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          flex-shrink: 0;
        }

        .stat-icon svg { width: 100%; height: 100%; }

        .stat-icon-blue { background: linear-gradient(135deg, #4F46E5, #6366F1); color: white; }
        .stat-icon-green { background: linear-gradient(135deg, #10b981, #34d399); color: white; }
        .stat-icon-red { background: linear-gradient(135deg, #ef4444, #f87171); color: white; }

        .stat-value {
          font-size: 2.2rem;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-top: 5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Main Card */
        .wh-table-card {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .card-header {
          padding: 18px 24px;
          border-bottom: 1px solid #eaeaea;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(90deg, #4F46E5, #6366F1);
          color: white;
          position: relative;
          overflow: hidden;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          position: relative;
          z-index: 2;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 2;
        }

        .shimmer-effect {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 3s infinite;
          z-index: 1;
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .transaction-count {
          background-color: rgba(255,255,255,0.25);
          color: white;
          padding: 4px 12px;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        /* Toolbar */
        .wh-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          gap: 16px;
          flex-wrap: wrap;
        }
.table-product-image {
  max-width: 90px;
  max-height: 80px;
  object-fit: contain;
  border-radius: 8px;
}
        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 200px;
          max-width: 360px;
        }

        .search-icon-svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #9ca3af;
        }

        .wh-search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 0.95rem;
          font-family: 'Poppins', sans-serif;
          background-color: #f9fafb;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .wh-search-input:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
          background: white;
        }

        .toolbar-actions {
          display: flex;
          gap: 10px;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 26px;
          border-radius: 8px;
          border: none;
          font-weight: 700;
          font-size: 0.95rem;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .scan-button {
          background-color: #f59e0b;
          color: white;
        }

        .scan-button:hover {
          background-color: #d97706;
          transform: translateY(-2px);
        }

        .validate-after-payment {
          background-color: #8b5cf6;
          color: white;
        }

        .validate-after-payment:hover {
          background-color: #7c3aed;
          transform: translateY(-2px);
        }

        .btn-icon-sm { width: 18px; height: 18px; }

        /* Table */
        .table-container {
          padding: 0 24px;
          overflow-x: auto;
          flex-grow: 1;
        }

        .transactions-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }

        .transactions-table th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          text-align: left;
          padding: 16px 18px;
          font-size: 0.88rem;
          border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .transactions-table td {
          padding: 16px 18px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 0.95rem;
          vertical-align: middle;
        }

        .transaction-row { transition: background-color 0.2s ease; }
        .transaction-row:hover { background-color: #f8fafc; }

        .id-chip {
          background: #ede9fe;
          color: #7c3aed;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .product-name-cell { font-weight: 700; color: #1e1b4b; font-size: 0.95rem; }
        .price-cell { font-weight: 700; color: #059669; font-size: 0.95rem; }

        .status-badge {
          padding: 5px 14px;
          border-radius: 50px;
          font-size: 0.82rem;
          font-weight: 700;
          display: inline-block;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .status-completed { background-color: #ecfdf5; color: #10b981; }
        .status-failed { background-color: #fee2e2; color: #ef4444; }
        .status-pending { background-color: #fef3c7; color: #d97706; }

        .empty-table-msg {
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          padding: 40px 0 !important;
        }

        /* Action Buttons */
        .action-buttons { display: flex; gap: 6px; }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 7px;
          border: none;
          font-size: 0.82rem;
          font-weight: 700;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
         

        .action-btn svg { width: 14px; height: 14px; }

        .edit-btn { background: #eff6ff; color: #3b82f6; }
        .edit-btn:hover { background: #3b82f6; color: white; }

        .delete-btn { background: #fef2f2; color: #ef4444; }
        .delete-btn:hover { background: #ef4444; color: white; }

        .view-btn { background: #f0fdf4; color: #10b981; }
        .view-btn:hover { background: #10b981; color: white; }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px 24px;
          gap: 8px;
          border-top: 1px solid #f1f5f9;
        }

        .pagination-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background-color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-button:hover:not(:disabled) { background-color: #f3f4f6; }
        .pagination-button:disabled { opacity: 0.4; cursor: not-allowed; }

        .pagination-number {
          width: 36px;
          height: 36px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          background-color: white;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          font-family: 'Poppins', sans-serif;
          transition: all 0.2s ease;
        }

        .pagination-number:hover { background-color: #f3f4f6; }
        .pagination-number.active { background-color: #4F46E5; color: white; border-color: #4F46E5; }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          animation: modalIn 0.3s ease;
          max-height: 90vh;
          overflow: hidden;
        }

        .modal-card-sm { max-width: 480px; }

        @keyframes modalIn {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .modal-card-header {
          padding: 18px 24px;
          background: linear-gradient(90deg, #4F46E5, #6366F1);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 16px 16px 0 0;
        }

        .modal-card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin: 0;
        }

        .modal-close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          font-family: 'Poppins', sans-serif;
        }

        .modal-close-btn:hover { background: rgba(255,255,255,0.35); }

        .modal-card-body {
          padding: 24px;
          overflow-y: auto;
          flex-grow: 1;
        }

        .modal-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #4b5563;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-input {
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 0.95rem;
          font-family: 'Poppins', sans-serif;
          background-color: #f9fafb;
          color: #111827;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
          background: white;
        }

        .form-textarea {
          resize: vertical;
          min-height: 90px;
        }

        .modal-card-footer {
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .modal-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          border-radius: 8px;
          border: none;
          font-weight: 700;
          font-size: 0.95rem;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .payment-button {
          background-color: #10b981;
          color: white;
        }

        .payment-button:hover { background-color: #059669; transform: translateY(-1px); }

        .cancel-modal-btn {
          background: #f1f5f9;
          color: #475569;
        }

        .cancel-modal-btn:hover { background: #e2e8f0; }

        /* Detail View Grid */
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .detail-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .detail-label {
          font-size: 0.8rem;
          color: #6b7280;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .detail-value {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .desc-value {
          font-weight: 400;
          color: #374151;
          line-height: 1.6;
          font-size: 0.875rem;
        }

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
        }
      `}</style>
    </>
  );
}

export default WarehouseManu;