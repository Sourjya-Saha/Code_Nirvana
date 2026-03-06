import React, { useContext, useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import Sidebar from '../Sidebar';
import jsPDF from 'jspdf';
import { MdDelete } from "react-icons/md";
import { MdOutlinePrint } from "react-icons/md";
import { FaPen } from 'react-icons/fa6';
import QRCode from 'qrcode';

const Orders = () => {
  const { userId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [originalOrders, setOriginalOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const itemsPerPage = 7;

  useEffect(() => {
    if (userId) {
      fetchOrders();
      fetchProducts();
    }
  }, [userId]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4500);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4500);
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/getAllOrders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      setOrders(data);
      setOriginalOrders(data);
    } catch (error) {
      showError('Error fetching orders.');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/getProducts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      showError('Error fetching products.');
    }
  };

  const handleEdit = (order) => {
    const productsWithDetails = order.order_details.map(product => ({
      ...product,
      product_name: product.product_name || '',
      price: product.price_per_unit || 0,
      quantity: product.quantity || 1,
    }));
    setEditingOrder({ ...order, products: productsWithDetails });
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`http://127.0.0.1:5000/delete_order/${id}`, { method: 'DELETE' });
      setOrders(orders.filter(order => order.order_id !== id));
      setOriginalOrders(originalOrders.filter(order => order.order_id !== id));
      showSuccess('Order deleted successfully.');
    } catch (error) {
      showError('Error deleting order.');
    }
  };

  const handleProductQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 0) { showError('Quantity cannot be negative.'); return; }
    setEditingOrder(prevOrder => ({
      ...prevOrder,
      products: prevOrder.products.map(product => {
        if (product.product_id === productId) {
          const maxQuantity = product.availableStock;
          if (maxQuantity && newQuantity > maxQuantity) {
            showError(`Quantity cannot exceed available stock of ${maxQuantity}.`);
            return product;
          }
          return { ...product, quantity: newQuantity };
        }
        return product;
      }),
    }));
  };

  const handlePay = async () => {
    if (!editingOrder?.products) return;
    const total_price = editingOrder.products.reduce((sum, p) => sum + (p.price_per_unit * p.quantity), 0);
    const updatedOrder = {
      order_id: editingOrder.order_id,
      customer_name: editingOrder.customer_name,
      phone_num: editingOrder.phone_num,
      datetime: editingOrder.datetime,
      total: total_price,
      status: 'paid',
      order_details: editingOrder.products.map(p => ({ product_id: p.product_id, quantity: p.quantity })),
    };
    try {
      const response = await fetch('http://127.0.0.1:5000/updateOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder),
      });
      if (response.ok) {
        const updatedOrderData = await response.json();
        setOrders(orders.map(o => o.order_id === updatedOrderData.order_id ? { ...editingOrder, status: 'paid' } : o));
        setEditingOrder(null);
        showSuccess('Order marked as paid.');
      } else {
        showError('Error updating order status.');
      }
    } catch (error) {
      showError('Error updating order status.');
    }
  };

  const handleSave = async () => {
    if (!editingOrder) return;
    const total_price = editingOrder.products.reduce((sum, p) => sum + (p.price_per_unit * p.quantity), 0);
    const updatedOrder = {
      order_id: editingOrder.order_id,
      customer_name: editingOrder.customer_name,
      phone_num: editingOrder.phone_num,
      datetime: editingOrder.datetime,
      status: editingOrder.status,
      total: total_price,
      order_details: editingOrder.products.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        price_per_unit: p.price_per_unit,
        quantity: p.quantity,
      })),
    };
    try {
      const response = await fetch('http://127.0.0.1:5000/updateOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrder),
      });
      if (response.ok) {
        const updatedOrderData = await response.json();
        setOrders(orders.map(o => o.order_id === updatedOrderData.order_id ? updatedOrder : o));
        setEditingOrder(null);
        showSuccess('Order updated successfully.');
      } else {
        showError('Error saving order.');
      }
    } catch (error) {
      showError('Error saving order.');
    }
  };

  const handleCancel = () => setEditingOrder(null);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchTerm(query);
    setOrders(originalOrders.filter(o => o.customer_name.toLowerCase().includes(query)));
    setCurrentPage(1);
  };

  const handlePrint = async () => {
    if (!editingOrder) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("Customer Details", 20, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${editingOrder.customer_name}`, 20, 30);
    doc.text(`Phone: ${editingOrder.phone_num}`, 20, 40);
    doc.text(`Order ID: ORDER#${editingOrder.order_id}`, 20, 50);
    doc.text(`Date & Time: ${new Date(editingOrder.datetime).toLocaleString()}`, 20, 60);
    let yPosition = 80;
    doc.setFontSize(14); doc.setTextColor(0, 0, 128);
    doc.text("Product Details:", 20, yPosition);
    yPosition += 10;
    doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold");
    doc.text("Product Name", 20, yPosition);
    doc.text("Quantity", 80, yPosition);
    doc.text("Price per Unit", 110, yPosition);
    doc.text("Total Price", 150, yPosition);
    doc.line(20, yPosition + 2, 180, yPosition + 2);
    yPosition += 10;
    doc.setFont("helvetica", "normal");
    editingOrder.products.forEach((product, index) => {
      if (yPosition > 270) { doc.addPage(); yPosition = 20; }
      const totalPrice = product.quantity * (product.price_per_unit || 0);
      if (index % 2 === 0) { doc.setFillColor(240, 240, 240); doc.rect(20, yPosition - 5, 160, 10, "F"); }
      doc.text(product.product_name || "N/A", 20, yPosition);
      doc.text(String(product.quantity), 80, yPosition);
      doc.text(`Rs. ${(product.price_per_unit || 0).toFixed(2)}`, 110, yPosition);
      doc.text(`Rs. ${totalPrice.toFixed(2)}`, 150, yPosition);
      yPosition += 10;
    });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 0);
    doc.text(`Total Order Price: Rs. ${editingOrder.total.toFixed(2)}`, 20, yPosition + 10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Status: ${editingOrder.status}`, 20, yPosition + 20);
    const qrCodeData = `Order Details:\nName: ${editingOrder.customer_name}\nPhone: ${editingOrder.phone_num}\nTotal Price: ₹${editingOrder.total.toFixed(2)}`;
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, { width: 40, height: 40 });
      doc.addImage(qrCodeUrl, 'PNG', 140, 20, 40, 40);
    } catch (err) {}
    doc.save('order-details.pdf');
  };

  const filteredOrders = orders;
  const pages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    return new Array(Math.min(5, pages - start)).fill(null).map((_, idx) => start + idx + 1);
  };

  const paidCount = orders.filter(o => o.status === 'paid').length;
  const unpaidCount = orders.filter(o => o.status === 'unpaid').length;

  const editingTotal = editingOrder
    ? editingOrder.products.reduce((sum, p) => sum + (p.price_per_unit * p.quantity), 0)
    : 0;

  return (
    <>
      <Sidebar />
      <div className="dashboard-cont">

        {/* Toasts */}
        {errorMessage && <div className="error-toast">{errorMessage}</div>}
        {successMessage && (
          <div className="success-toast">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M22 11.08V12A10 10 0 1 1 11 2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {successMessage}
          </div>
        )}

        {/* Page Title */}
        <div className="page-title-bar">
          <div className="page-title-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12H15M9 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="page-title-text">Orders Management</h1>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Total Orders</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12A10 10 0 1 1 11 2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{paidCount}</div>
              <div className="stat-label">Paid</div>
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
              <div className="stat-value">{unpaidCount}</div>
              <div className="stat-label">Unpaid</div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="grid-card wh-table-card">
          <div className="card-header">
            <h2 className="card-title">Order Records</h2>
            <div className="header-right">
              <span className="transaction-count">{filteredOrders.length} orders</span>
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
                placeholder="Search by customer name..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Date &amp; Time</th>
                  <th>Items</th>
                  <th>Total Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table-msg">No orders found.</td>
                  </tr>
                ) : currentOrders.map((order) => (
                  <tr key={order.order_id} className="transaction-row">
                    <td><span className="id-chip">ORDER#{order.order_id}</span></td>
                    <td className="product-name-cell">{order.customer_name}</td>
                    <td>{order.phone_num}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.datetime}</td>
                    <td>
                      <span className="qty-badge">{order.order_details.length} item{order.order_details.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="price-cell">₹{Number(order.total).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${order.status === 'paid' ? 'status-completed' : 'status-pending'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit-btn" onClick={() => handleEdit(order)}>
                          <FaPen style={{ width: 13, height: 13 }} />
                          Edit
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(order.order_id)}>
                          <MdDelete style={{ width: 16, height: 16 }} />
                          Delete
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
            <button className="pagination-button" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {getPaginationGroup().map(num => (
              <button key={num} className={`pagination-number ${currentPage === num ? 'active' : ''}`} onClick={() => setCurrentPage(num)}>
                {num}
              </button>
            ))}
            <button className="pagination-button" onClick={() => setCurrentPage(p => Math.min(p + 1, pages))} disabled={currentPage === pages || pages === 0}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Edit Modal */}
        {editingOrder && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-card-header">
                <h2 className="modal-card-title">Edit Order</h2>
                <button className="modal-close-btn" onClick={handleCancel}>✕</button>
              </div>
              <div className="modal-card-body">
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      className="form-input"
                      type="text"
                      value={editingOrder.customer_name || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      className="form-input"
                      type="text"
                      value={editingOrder.phone_num || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, phone_num: e.target.value })}
                    />
                  </div>
                </div>

                {/* Products sub-section */}
                <div style={{ marginTop: 24 }}>
                  <div className="section-divider-label">Products</div>
                  {editingOrder.products.length > 0 && (
                    <div className="table-container" style={{ padding: 0, marginTop: 12 }}>
                      <table className="transactions-table">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Quantity</th>
                            <th>Price / Unit</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingOrder.products.map(product => (
                            <tr key={product.product_id} className="transaction-row">
                              <td className="product-name-cell">{product.product_name}</td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={product.quantity}
                                  onChange={(e) => handleProductQuantityChange(product.product_id, parseInt(e.target.value))}
                                  className="qty-input"
                                />
                              </td>
                              <td>₹{product.price_per_unit}</td>
                              <td className="price-cell">₹{(product.price_per_unit * product.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="order-total-bar">
                    <span className="total-label">Order Total</span>
                    <span className="total-amount">₹{editingTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-card-footer">
                <button className="modal-action-btn pay-btn" onClick={handlePay}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}>
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 10H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Pay
                </button>
                <button className="modal-action-btn save-btn" onClick={handleSave}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 18, height: 18 }}>
                    <path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16L21 8V19C21 20.1 20.1 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Save
                </button>
                <button className="modal-action-btn print-btn" onClick={handlePrint}>
                  <MdOutlinePrint style={{ width: 20, height: 20 }} />
                  Print
                </button>
                <button className="modal-action-btn cancel-modal-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-cont {
          display: flex; flex-direction: column; align-items: flex-start;
          padding-left: 110px; padding-top: 120px; padding-right: 28px; padding-bottom: 40px;
          min-height: 100vh; font-family: 'Poppins', sans-serif; background-color: #f8f9fa;
          box-sizing: border-box; width: 100%;
        }

        /* ---- Page Title ---- */
        .page-title-bar { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .page-title-icon {
          width: 40px; height: 40px; background: linear-gradient(135deg, #4F46E5, #6366F1);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          color: white; padding: 8px; box-sizing: border-box;
        }
        .page-title-icon svg { width: 100%; height: 100%; }
        .page-title-text { font-size: 1.6rem; font-weight: 700; color: #1e1b4b; letter-spacing: 0.02em; margin: 0; }

        /* ---- Toasts ---- */
        .error-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 8px;
          font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 2000;
        }
        .success-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background-color: #10b981; color: white; padding: 12px 24px; border-radius: 8px;
          font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex; align-items: center; gap: 10px;
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 2000;
        }
        .success-toast svg { width: 20px; height: 20px; flex-shrink: 0; }
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }

        /* ---- Stats ---- */
        .stats-row { display: flex; gap: 16px; margin-bottom: 20px; width: 100%; }
        .stat-card {
          display: flex; align-items: center; gap: 16px; background: white;
          border-radius: 12px; padding: 20px 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.07);
          flex: 1; transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
        .stat-icon {
          width: 52px; height: 52px; border-radius: 12px; display: flex;
          align-items: center; justify-content: center; padding: 12px; flex-shrink: 0;
        }
        .stat-icon svg { width: 100%; height: 100%; }
        .stat-icon-blue { background: linear-gradient(135deg, #4F46E5, #6366F1); color: white; }
        .stat-icon-green { background: linear-gradient(135deg, #10b981, #34d399); color: white; }
        .stat-icon-red { background: linear-gradient(135deg, #ef4444, #f87171); color: white; }
        .stat-value { font-size: 2.2rem; font-weight: 700; color: #111827; line-height: 1; }
        .stat-label { font-size: 0.9rem; color: #6b7280; margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

        /* ---- Table Card ---- */
        .wh-table-card {
          background-color: white; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          overflow: hidden; display: flex; flex-direction: column; width: 100%;
        }
        .card-header {
          padding: 18px 24px; border-bottom: 1px solid #eaeaea; display: flex;
          justify-content: space-between; align-items: center;
          background: linear-gradient(90deg, #4F46E5, #6366F1); color: white;
          position: relative; overflow: hidden;
        }
        .card-title {
          font-size: 1.25rem; font-weight: 700; position: relative; z-index: 2;
          text-transform: uppercase; letter-spacing: 0.07em; margin: 0; color: white;
        }
        .header-right { display: flex; align-items: center; gap: 12px; position: relative; z-index: 2; }
        .transaction-count {
          background-color: rgba(255,255,255,0.25); color: white;
          padding: 4px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: 600;
        }
        .shimmer-effect {
          position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 3s infinite; z-index: 1;
        }
        @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }

        /* ---- Toolbar ---- */
        .wh-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px; border-bottom: 1px solid #f1f5f9; gap: 16px; flex-wrap: wrap;
        }
        .search-wrapper { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
        .search-icon-svg {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          width: 18px; height: 18px; color: #9ca3af;
        }
        .wh-search-input {
          width: 100%; padding: 12px 16px 12px 44px; border-radius: 8px;
          border: 1px solid #d1d5db; font-size: 0.95rem; font-family: 'Poppins', sans-serif;
          background-color: #f9fafb; transition: all 0.3s ease; box-sizing: border-box;
        }
        .wh-search-input:focus {
          outline: none; border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background: white;
        }

        /* ---- Table ---- */
        .table-container { padding: 0 24px; overflow-x: auto; flex-grow: 1; }
        .transactions-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .transactions-table th {
          background-color: #f1f5f9; color: #475569; font-weight: 700; text-align: left;
          padding: 16px 18px; font-size: 0.88rem; border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .transactions-table td {
          padding: 16px 18px; border-bottom: 1px solid #f1f5f9;
          color: #334155; font-size: 0.95rem; vertical-align: middle;
        }
        .transaction-row { transition: background-color 0.2s ease; }
        .transaction-row:hover { background-color: #f8fafc; }
        .id-chip { background: #ede9fe; color: #7c3aed; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; white-space: nowrap; }
        .product-name-cell { font-weight: 700; color: #1e1b4b; font-size: 0.95rem; }
        .price-cell { font-weight: 700; color: #059669; font-size: 0.95rem; }
        .qty-badge { background: #f0f9ff; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; }
        .status-badge {
          padding: 5px 14px; border-radius: 50px; font-size: 0.82rem; font-weight: 700;
          display: inline-block; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .status-completed { background-color: #ecfdf5; color: #10b981; }
        .status-pending { background-color: #fef9c3; color: #ca8a04; }
        .status-failed { background-color: #fee2e2; color: #ef4444; }
        .empty-table-msg { text-align: center; color: #9ca3af; font-style: italic; padding: 40px 0 !important; }

        /* ---- Action Buttons ---- */
        .action-buttons { display: flex; gap: 6px; }
        .action-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px;
          border-radius: 7px; border: none; font-size: 0.82rem; font-weight: 700;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s ease;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .edit-btn { background: #eff6ff; color: #3b82f6; }
        .edit-btn:hover { background: #3b82f6; color: white; }
        .delete-btn { background: #fef2f2; color: #ef4444; }
        .delete-btn:hover { background: #ef4444; color: white; }

        /* ---- Pagination ---- */
        .pagination {
          display: flex; justify-content: center; align-items: center;
          padding: 16px 24px; gap: 8px; border-top: 1px solid #f1f5f9;
        }
        .pagination-button {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px; border: 1px solid #d1d5db;
          background-color: white; cursor: pointer; transition: all 0.2s ease;
        }
        .pagination-button:hover:not(:disabled) { background-color: #f3f4f6; }
        .pagination-button:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination-number {
          width: 36px; height: 36px; display: flex; justify-content: center; align-items: center;
          border-radius: 8px; border: 1px solid #d1d5db; background-color: white; cursor: pointer;
          font-weight: 500; font-size: 0.875rem; font-family: 'Poppins', sans-serif; transition: all 0.2s ease;
        }
        .pagination-number:hover { background-color: #f3f4f6; }
        .pagination-number.active { background-color: #4F46E5; color: white; border-color: #4F46E5; }

        /* ---- Modal ---- */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px;
        }
        .modal-card {
          background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          width: 100%; max-width: 680px; display: flex; flex-direction: column;
          animation: modalIn 0.3s ease; max-height: 90vh; overflow: hidden;
        }
        @keyframes modalIn {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .modal-card-header {
          padding: 18px 24px; background: linear-gradient(90deg, #4F46E5, #6366F1); color: white;
          display: flex; justify-content: space-between; align-items: center; border-radius: 16px 16px 0 0; flex-shrink: 0;
        }
        .modal-card-title { font-size: 1.1rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.07em; margin: 0; }
        .modal-close-btn {
          background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px;
          border-radius: 50%; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center;
          justify-content: center; transition: background 0.2s; font-family: 'Poppins', sans-serif;
        }
        .modal-close-btn:hover { background: rgba(255,255,255,0.35); }
        .modal-card-body { padding: 24px; overflow-y: auto; flex-grow: 1; }
        .modal-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-weight: 600; color: #4b5563; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-input {
          padding: 11px 14px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.95rem;
          font-family: 'Poppins', sans-serif; background-color: #f9fafb; color: #111827;
          width: 100%; box-sizing: border-box; transition: all 0.3s ease;
        }
        .form-input:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background: white; }

        .section-divider-label {
          font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
          color: #4F46E5; padding-bottom: 8px; border-bottom: 2px solid #ede9fe;
        }
        .qty-input {
          width: 80px; padding: 7px 10px; border-radius: 6px; border: 1px solid #d1d5db;
          font-size: 0.9rem; font-family: 'Poppins', sans-serif; background: #f9fafb;
          text-align: center; transition: all 0.2s;
        }
        .qty-input:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background: white; }

        .order-total-bar {
          display: flex; justify-content: flex-end; align-items: center; gap: 16px;
          margin-top: 16px; padding: 14px 20px; background: #f0fdf4;
          border: 1px solid #bbf7d0; border-radius: 8px;
        }
        .total-label { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; }
        .total-amount { font-size: 1.4rem; font-weight: 800; color: #059669; }

        /* ---- Modal Footer Buttons ---- */
        .modal-card-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; justify-content: flex-end; flex-shrink: 0; }
        .modal-action-btn {
          display: flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 8px; border: none;
          font-weight: 700; font-size: 0.9rem; font-family: 'Poppins', sans-serif; cursor: pointer;
          transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .pay-btn { background-color: #f59e0b; color: white; }
        .pay-btn:hover { background-color: #d97706; transform: translateY(-1px); }
        .save-btn { background-color: #10b981; color: white; }
        .save-btn:hover { background-color: #059669; transform: translateY(-1px); }
        .print-btn { background-color: #6366F1; color: white; }
        .print-btn:hover { background-color: #4F46E5; transform: translateY(-1px); }
        .cancel-modal-btn { background: #f1f5f9; color: #475569; }
        .cancel-modal-btn:hover { background: #e2e8f0; }

        /* ---- Responsive ---- */
        @media (max-width: 1024px) {
          .dashboard-cont { padding-left: 24px; }
          .stats-row { flex-wrap: wrap; }
          .modal-form-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .wh-toolbar { flex-direction: column; align-items: flex-start; }
          .search-wrapper { max-width: 100%; }
          .modal-card-footer { flex-wrap: wrap; }
        }
      `}</style>
    </>
  );
};

export default Orders;