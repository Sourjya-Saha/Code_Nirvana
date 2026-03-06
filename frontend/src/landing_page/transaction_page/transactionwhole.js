import React, { useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import jsPDF from 'jspdf';
import { MdDelete } from "react-icons/md";
import { MdOutlinePrint } from "react-icons/md";
import { FaEye } from 'react-icons/fa';
import SideWhole from '../SideWhole';

const TransactionsWhole = () => {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [originalTransactions, setOriginalTransactions] = useState([]);
  const [manufacturerUsers, setManufacturerUsers] = useState({});
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchManufacturerUsers();
    if (userId) fetchTransactions();
  }, [userId]);

  const fetchManufacturerUsers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_manufacturer_users');
      const data = await response.json();
      setManufacturerUsers(data);
    } catch (error) {
      console.error('Error fetching manufacturer users:', error);
    }
  };

  const getManufacturerName = (manuId) => {
    for (const [username, id] of Object.entries(manufacturerUsers)) {
      if (id === manuId) return username;
    }
    return 'Unknown';
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_all_transactions_wholesaler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      setTransactions(data);
      setOriginalTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleDelete = async (order_id) => {
    try {
      await fetch(`http://127.0.0.1:5000/delete_transaction_whole/${order_id}`, { method: 'DELETE' });
      const updated = transactions.filter(t => t.order_id !== order_id);
      setTransactions(updated);
      setOriginalTransactions(prev => prev.filter(t => t.order_id !== order_id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleSearch = (searchQuery) => {
    setSearchTerm(searchQuery);
    setCurrentPage(1);
    const filtered = originalTransactions.filter(t =>
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setTransactions(filtered);
  };

  const handleShowDetails = (transaction) => setSelectedTransaction(transaction);
  const handleCloseDetails = () => setSelectedTransaction(null);

  const calculateTotalQuantity = (orderDetails) =>
    orderDetails.reduce((total, item) => total + item.quantity, 0);

  const handlePrint = async () => {
    if (!selectedTransaction) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("Transaction Details", 20, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Customer Name: ${selectedTransaction.customer_name}`, 20, 30);
    doc.text(`Phone Number: ${selectedTransaction.phone_num}`, 20, 40);
    doc.text(`Order ID: ORDER#${selectedTransaction.order_id}`, 20, 50);
    doc.text(`Date & Time: ${selectedTransaction.datetime}`, 20, 60);
    doc.text(`Manufacturer: ${getManufacturerName(selectedTransaction.manu_id)}`, 20, 70);
    let yPosition = 90;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 128);
    doc.text("Transaction Details:", 20, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Status", 20, yPosition);
    doc.text("Total Price", 80, yPosition);
    doc.text("Product Quantity", 140, yPosition);
    doc.line(20, yPosition + 2, 180, yPosition + 2);
    yPosition += 10;
    doc.setFont("helvetica", "normal");
    doc.text(selectedTransaction.status, 20, yPosition);
    doc.text(`₹${selectedTransaction.total}`, 80, yPosition);
    doc.text(String(calculateTotalQuantity(selectedTransaction.order_details)), 140, yPosition);
    yPosition += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Products:", 20, yPosition);
    yPosition += 10;
    selectedTransaction.order_details.forEach(product => {
      doc.setFont("helvetica", "normal");
      doc.text(`${product.product_name} - Qty: ${product.quantity} @ ₹${product.price_per_unit} each`, 20, yPosition);
      yPosition += 10;
    });
    doc.save('transaction-details.pdf');
  };

  // Pagination
  const pages = Math.ceil(transactions.length / itemsPerPage);
  const paginated = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const getPaginationGroup = () => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(pages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const totalTransactions = transactions.length;
  const paidCount = transactions.filter(t => t.status?.toLowerCase() === 'paid').length;
  const unpaidCount = transactions.filter(t => t.status?.toLowerCase() === 'unpaid').length;

  return (
    <>
      <SideWhole />
      <div className="dashboard-cont">

        {/* Page Title */}
        <div className="page-title-bar">
          <div className="page-title-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12H15M9 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="page-title-text">Transactions Management</h1>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-blue">
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{totalTransactions}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-green">
              <svg viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12A10 10 0 1 1 11 2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="stat-label">Paid</div>
              <div className="stat-value" style={{ color: '#10b981' }}>{paidCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-red">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="stat-label">Unpaid</div>
              <div className="stat-value" style={{ color: '#ef4444' }}>{unpaidCount}</div>
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="table-card">
          <div className="card-header">
            <h2 className="card-title">All Transactions</h2>
            <div className="shimmer-effect"></div>
          </div>

          {/* Toolbar */}
          <div className="wh-toolbar">
            <div className="search-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search by customer name…"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Your Name</th>
                  <th>Phone Number</th>
                  <th>Date &amp; Time</th>
                  <th>Total Price</th>
                  <th>Product Qty</th>
                  <th>Manufacturer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan="9" className="empty-table-msg">No transactions found.</td></tr>
                ) : paginated.map((transaction) => (
                  <tr key={transaction.order_id} className="transaction-row">
                    <td><span className="id-chip">ORDER#{transaction.order_id}</span></td>
                    <td className="product-name-cell">{transaction.customer_name}</td>
                    <td>{transaction.phone_num}</td>
                    <td style={{ color: '#64748b', fontSize: '0.88rem' }}>{transaction.datetime}</td>
                    <td className="price-cell">₹{transaction.total}</td>
                    <td><span className="qty-badge">{calculateTotalQuantity(transaction.order_details)}</span></td>
                    <td style={{ fontWeight: 600, color: '#334155' }}>{getManufacturerName(transaction.manu_id)}</td>
                    <td>
                      <span className={`status-badge ${
                        transaction.status?.toLowerCase() === 'paid' ? 'status-completed' :
                        transaction.status?.toLowerCase() === 'unpaid' ? 'status-pending' : 'status-failed'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn view-btn" onClick={() => handleShowDetails(transaction)}>
                          <FaEye style={{ width: 14, height: 14 }} /> View
                        </button>
                        <button className="action-btn delete-btn" onClick={() => handleDelete(transaction.order_id)}>
                          <MdDelete style={{ width: 15, height: 15 }} /> Delete
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
            <button className="pagination-button" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1 || pages === 0}>
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

        {/* Details Modal */}
        {selectedTransaction && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-card-header">
                <h2 className="modal-card-title">Transaction Details</h2>
                <button className="modal-close-btn" onClick={handleCloseDetails}>✕</button>
              </div>
              <div className="modal-card-body">

                {/* Info Grid */}
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="modal-info-label">Order ID</span>
                    <span className="id-chip">ORDER#{selectedTransaction.order_id}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Customer Name</span>
                    <span className="modal-info-value">{selectedTransaction.customer_name}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Phone Number</span>
                    <span className="modal-info-value">{selectedTransaction.phone_num}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Date &amp; Time</span>
                    <span className="modal-info-value">{selectedTransaction.datetime}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Manufacturer</span>
                    <span className="modal-info-value">{getManufacturerName(selectedTransaction.manu_id)}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Status</span>
                    <span className={`status-badge ${
                      selectedTransaction.status?.toLowerCase() === 'paid' ? 'status-completed' :
                      selectedTransaction.status?.toLowerCase() === 'unpaid' ? 'status-pending' : 'status-failed'
                    }`}>{selectedTransaction.status}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Total Price</span>
                    <span className="price-cell" style={{ fontSize: '1.1rem' }}>₹{selectedTransaction.total}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Product Quantity</span>
                    <span className="qty-badge">{calculateTotalQuantity(selectedTransaction.order_details)}</span>
                  </div>
                </div>

                {/* Products sub-table */}
                <div style={{ marginTop: 24 }}>
                  <div className="section-divider-label">Products</div>
                  <div className="table-container" style={{ padding: 0, marginTop: 12 }}>
                    <table className="transactions-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Qty</th>
                          <th>Price / Unit</th>
                          <th>Total Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransaction.order_details.map((product, index) => (
                          <tr key={index} className="transaction-row">
                            <td className="product-name-cell">{product.product_name}</td>
                            <td><span className="qty-badge">{product.quantity}</span></td>
                            <td style={{ color: '#64748b' }}>₹{product.price_per_unit}</td>
                            <td className="price-cell">₹{product.total_price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="order-total-bar">
                    <span className="total-label">Total Amount</span>
                    <span className="total-amount">₹{selectedTransaction.total}</span>
                  </div>
                </div>

              </div>
              <div className="modal-card-footer">
                <button className="modal-action-btn print-btn" onClick={handlePrint}>
                  <MdOutlinePrint style={{ width: 18, height: 18 }} /> Print
                </button>
                <button className="modal-action-btn cancel-modal-btn" onClick={handleCloseDetails}>
                  Close
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

        /* Page Title */
        .page-title-bar { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .page-title-icon {
          width: 40px; height: 40px; background: linear-gradient(135deg, #4F46E5, #6366F1);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          color: white; padding: 8px; box-sizing: border-box; flex-shrink: 0;
        }
        .page-title-icon svg { width: 100%; height: 100%; }
        .page-title-text { font-size: 1.6rem; font-weight: 700; color: #1e1b4b; margin: 0; }

        /* Stats */
        .stats-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .stat-card {
          background: white; border-radius: 12px; padding: 18px 24px;
          display: flex; align-items: center; gap: 16px; flex: 1; min-width: 180px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
        .stat-icon-wrap {
          width: 46px; height: 46px; border-radius: 12px; display: flex;
          align-items: center; justify-content: center; color: white; padding: 10px;
          box-sizing: border-box; flex-shrink: 0;
        }
        .stat-icon-wrap svg { width: 100%; height: 100%; }
        .stat-icon-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
        .stat-icon-green { background: linear-gradient(135deg, #10b981, #059669); }
        .stat-icon-red { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .stat-label { font-size: 0.78rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-value { font-size: 1.6rem; font-weight: 800; color: #1e1b4b; line-height: 1.2; }

        /* Table Card */
        .table-card {
          background: white; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          overflow: hidden; width: 100%;
        }
        .card-header {
          padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(90deg, #4F46E5, #6366F1); position: relative; overflow: hidden;
        }
        .card-title {
          font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
          margin: 0; color: white; position: relative; z-index: 2;
        }
        .shimmer-effect {
          position: absolute; top:0; left:-100%; width:100%; height:100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 3s infinite; z-index: 1;
        }
        @keyframes shimmer { 0%{ left:-100%; } 100%{ left:100%; } }

        /* Toolbar */
        .wh-toolbar {
          padding: 16px 24px; display: flex; align-items: center; gap: 12px;
          border-bottom: 1px solid #f1f5f9; flex-wrap: wrap;
        }
        .search-wrapper { position: relative; flex: 1; max-width: 360px; }
        .search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          width: 18px; height: 18px; color: #9ca3af; pointer-events: none;
        }
        .search-input {
          width: 100%; padding: 10px 14px 10px 40px; border-radius: 8px; border: 1px solid #d1d5db;
          font-size: 0.9rem; font-family: 'Poppins', sans-serif; background: #f9fafb;
          color: #111827; box-sizing: border-box; transition: all 0.25s ease;
        }
        .search-input:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background: white; }

        /* Table */
        .table-container { overflow-x: auto; }
        .transactions-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .transactions-table th {
          background-color: #f1f5f9; color: #475569; font-weight: 700; text-align: left;
          padding: 16px 18px; font-size: 0.88rem; border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .transactions-table td {
          padding: 15px 18px; border-bottom: 1px solid #f1f5f9;
          color: #334155; font-size: 0.93rem; vertical-align: middle;
        }
        .transaction-row { transition: background-color 0.2s ease; }
        .transaction-row:hover { background-color: #f8fafc; }
        .id-chip { background: #ede9fe; color: #7c3aed; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; white-space: nowrap; }
        .product-name-cell { font-weight: 700; color: #1e1b4b; }
        .price-cell { font-weight: 700; color: #059669; }
        .qty-badge { background: #f0f9ff; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; }
        .status-badge {
          padding: 5px 14px; border-radius: 50px; font-size: 0.82rem; font-weight: 700;
          display: inline-block; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .status-completed { background-color: #ecfdf5; color: #10b981; }
        .status-pending { background-color: #fef9c3; color: #ca8a04; }
        .status-failed { background-color: #fee2e2; color: #ef4444; }
        .empty-table-msg { text-align: center; color: #9ca3af; font-style: italic; padding: 40px 0 !important; }

        /* Action Buttons */
        .action-buttons { display: flex; gap: 6px; }
        .action-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px;
          border-radius: 7px; border: none; font-size: 0.82rem; font-weight: 700;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s ease;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .view-btn { background: #eff6ff; color: #3b82f6; }
        .view-btn:hover { background: #3b82f6; color: white; }
        .delete-btn { background: #fef2f2; color: #ef4444; }
        .delete-btn:hover { background: #ef4444; color: white; }

        /* Pagination */
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

        /* Modal */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px;
        }
        .modal-card {
          background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          width: 100%; max-width: 720px; display: flex; flex-direction: column;
          animation: modalIn 0.3s ease; max-height: 90vh; overflow: hidden;
        }
        @keyframes modalIn {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .modal-card-header {
          padding: 18px 24px; background: linear-gradient(90deg, #4F46E5, #6366F1); color: white;
          display: flex; justify-content: space-between; align-items: center;
          border-radius: 16px 16px 0 0; flex-shrink: 0;
        }
        .modal-card-title { font-size: 1.1rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.07em; margin: 0; }
        .modal-close-btn {
          background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px;
          border-radius: 50%; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center;
          justify-content: center; transition: background 0.2s; font-family: 'Poppins', sans-serif;
        }
        .modal-close-btn:hover { background: rgba(255,255,255,0.35); }
        .modal-card-body { padding: 24px; overflow-y: auto; flex-grow: 1; }
        .modal-card-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; justify-content: flex-end; flex-shrink: 0; }

        /* Modal Info Grid */
        .modal-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 4px; }
        .modal-info-item {
          display: flex; flex-direction: column; gap: 5px;
          background: #f8fafc; border-radius: 8px; padding: 12px 14px;
          border: 1px solid #f1f5f9;
        }
        .modal-info-label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .modal-info-value { font-size: 0.95rem; font-weight: 600; color: #1e1b4b; }

        .section-divider-label {
          font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
          color: #4F46E5; padding-bottom: 8px; border-bottom: 2px solid #ede9fe;
        }
        .order-total-bar {
          display: flex; justify-content: flex-end; align-items: center; gap: 16px;
          margin-top: 16px; padding: 14px 20px; background: #f0fdf4;
          border: 1px solid #bbf7d0; border-radius: 8px;
        }
        .total-label { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; }
        .total-amount { font-size: 1.4rem; font-weight: 800; color: #059669; }

        /* Modal Buttons */
        .modal-action-btn {
          display: flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 8px; border: none;
          font-weight: 700; font-size: 0.9rem; font-family: 'Poppins', sans-serif; cursor: pointer;
          transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .print-btn { background-color: #6366F1; color: white; }
        .print-btn:hover { background-color: #4F46E5; transform: translateY(-1px); }
        .cancel-modal-btn { background: #f1f5f9; color: #475569; }
        .cancel-modal-btn:hover { background: #e2e8f0; }

        /* Responsive */
        @media (max-width: 1024px) { .dashboard-cont { padding-left: 24px; } .stats-row { flex-wrap: wrap; } }
        @media (max-width: 768px) { .wh-toolbar { flex-direction: column; align-items: flex-start; } .modal-info-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
};

export default TransactionsWhole;