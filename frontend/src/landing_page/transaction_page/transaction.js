import React, { useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import Sidebar from '../Sidebar';
import jsPDF from 'jspdf';
import { MdDelete } from "react-icons/md";
import { MdOutlinePrint } from "react-icons/md";
import { FaEye } from 'react-icons/fa';
import './transaction.css';

const Transactions = () => {
  const { userId } = useAuth();
  const [activeSection, setActiveSection] = useState('manufacturer');
  const [manufacturerTransactions, setManufacturerTransactions] = useState([]);
  const [wholesalerTransactions, setWholesalerTransactions] = useState([]);
  const [manufacturerUsers, setManufacturerUsers] = useState({});
  const [wholesalerUsers, setWholesalerUsers] = useState({});
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [originalManufacturerTransactions, setOriginalManufacturerTransactions] = useState([]);
  const [originalWholesalerTransactions, setOriginalWholesalerTransactions] = useState([]);

  // Fetch all necessary data on component mount
  useEffect(() => {
    if (userId) {
      fetchManufacturerUsers();
      fetchWholesalerUsers();
      fetchManufacturerTransactions();
      fetchWholesalerTransactions();
    }
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

  const fetchWholesalerUsers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_wholesaler_users');
      const data = await response.json();
      setWholesalerUsers(data);
    } catch (error) {
      console.error('Error fetching wholesaler users:', error);
    }
  };

  const fetchManufacturerTransactions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_all_transactions_retailer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      setManufacturerTransactions(data);
      setOriginalManufacturerTransactions(data);
    } catch (error) {
      console.error('Error fetching manufacturer transactions:', error);
    }
  };

  const fetchWholesalerTransactions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_all_transactions_for_retailer_to_wholesaler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      setWholesalerTransactions(data);
      setOriginalWholesalerTransactions(data);
    } catch (error) {
      console.error('Error fetching wholesaler transactions:', error);
    }
  };

  const handleDelete = async (order_id, transactionType) => {
    const url = transactionType === 'manufacturer' 
      ? `http://127.0.0.1:5000/delete_transaction/${order_id}`
      : `http://127.0.0.1:5000/delete_transaction_retailer_to_wholesaler/${order_id}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        if (transactionType === 'manufacturer') {
          setManufacturerTransactions(prev => prev.filter(t => t.order_id !== order_id));
          setOriginalManufacturerTransactions(prev => prev.filter(t => t.order_id !== order_id));
        } else {
          setWholesalerTransactions(prev => prev.filter(t => t.order_id !== order_id));
          setOriginalWholesalerTransactions(prev => prev.filter(t => t.order_id !== order_id));
        }
        console.log(`Successfully deleted Transaction ID: ${order_id}`);
      } else {
        console.error('Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleSearch = (searchQuery) => {
    if (activeSection === 'manufacturer') {
      const filtered = originalManufacturerTransactions.filter(transaction =>
        transaction.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setManufacturerTransactions(filtered);
    } else {
      const filtered = originalWholesalerTransactions.filter(transaction =>
        transaction.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setWholesalerTransactions(filtered);
    }
  };

  const handleShowDetails = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
  };

  const calculateTotalQuantity = (orderDetails) => {
    return orderDetails.reduce((total, item) => total + item.quantity, 0);
  };

  const getUserName = (transaction) => {
    // If no transaction is provided, return Unknown
    if (!transaction) return 'Unknown';
  
    try {
      // For manufacturer transactions
      if (activeSection === 'manufacturer') {
        if (transaction.manu_id && manufacturerUsers) {
          const manufacturerEntry = Object.entries(manufacturerUsers)
          .find(([_, id]) => id === transaction.manu_id);
        
        // If found, return the username (first element of the entry)
        return manufacturerEntry ? manufacturerEntry[0] : 'Unknown';
        }
      } 
      // For wholesaler transactions
      else if (activeSection === 'wholesaler') {
        if (transaction.whole_id && wholesalerUsers) {
          // Find the wholesaler username by matching the ID
          const wholesalerEntry = Object.entries(wholesalerUsers)
            .find(([_, id]) => id === transaction.whole_id);
          
          // If found, return the username (first element of the entry)
          return wholesalerEntry ? wholesalerEntry[0] : 'Unknown';
        }
      }
      
      return 'Unknown';
    } catch (error) {
      console.error('Error in getUserName:', error);
      return 'Unknown';
    }
  };

  const handlePrint = async () => {
    if (!selectedTransaction) return;
  
    const doc = new jsPDF();
    
    // Title Section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("Transaction Details", 20, 20);
    
    // Transaction Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Customer Name: ${selectedTransaction.customer_name}`, 20, 30);
    doc.text(`Phone Number: ${selectedTransaction.phone_num}`, 20, 40);
    doc.text(`Order ID: ORDER#${selectedTransaction.order_id}`, 20, 50);
    doc.text(`Date & Time: ${selectedTransaction.datetime}`, 20, 60);
    
    // Add stakeholder info based on transaction type
    const stakeholderName = activeSection === 'manufacturer'
      ? `Manufacturer: ${manufacturerUsers[selectedTransaction.manu_id] || 'Unknown'}`
      : `Wholesaler: ${wholesalerUsers[selectedTransaction.whole_id] || 'Unknown'}`;
    doc.text(stakeholderName, 20, 70);

    // Products Section
    let yPosition = 90;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 128);
    doc.text("Products:", 20, yPosition);
    
    // Table Header
    yPosition += 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Product Name", 20, yPosition);
    doc.text("Quantity", 90, yPosition);
    doc.text("Price per Unit", 130, yPosition);
    doc.text("Total", 170, yPosition);

    // Table Content
    yPosition += 10;
    doc.setFont("helvetica", "normal");
    selectedTransaction.order_details.forEach(product => {
      doc.text(product.product_name, 20, yPosition);
      doc.text(product.quantity.toString(), 90, yPosition);
      doc.text(`₹${product.price_per_unit}`, 130, yPosition);
      doc.text(`₹${product.total_price}`, 170, yPosition);
      yPosition += 10;
    });

    // Total
    yPosition += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: ₹${selectedTransaction.total}`, 130, yPosition);
  
    doc.save('transaction-details.pdf');
  };

  const getCurrentTransactions = () => {
    return activeSection === 'manufacturer' ? manufacturerTransactions : wholesalerTransactions;
  };

  return (
    <div className='dash-board'>
      <Sidebar />
      <div className="transaction-container">
        <div className="transaction-header">
          <h1 className="transaction-title">Transactions Management</h1>
          <p className="transaction-subtitle">Track and manage your shipments efficiently</p>
        </div>

        {/* Navigation Tabs */}
        <div className="transaction-nav">
          <button
            className={`transaction-nav-btn ${activeSection === 'manufacturer' ? 'active' : ''}`}
            onClick={() => setActiveSection('manufacturer')}
          >
            <i className="fas fa-industry"></i>
            Shipment Placed to Manufacturer
          </button>
          <button
            className={`transaction-nav-btn ${activeSection === 'wholesaler' ? 'active' : ''}`}
            onClick={() => setActiveSection('wholesaler')}
          >
            <i className="fas fa-warehouse"></i>
            Shipment Placed to Wholesaler
          </button>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          className="search-bar"
          placeholder="Search by Customer Name"
          onChange={(e) => handleSearch(e.target.value)}
        />

        {/* Transactions Table */}
        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Date & Time</th>
                <th>Total Price</th>
                <th>Product Qty</th>
                <th>{activeSection === 'manufacturer' ? 'Manufacturer' : 'Wholesaler'}</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentTransactions().map((transaction) => (
                <tr key={transaction.order_id}>
                  <td>ORDER#{transaction.order_id}</td>
                  <td>{transaction.customer_name}</td>
                  <td>{transaction.phone_num}</td>
                  <td>{transaction.datetime}</td>
                  <td>₹{transaction.total}</td>
                  <td>{calculateTotalQuantity(transaction.order_details)}</td>
                  <td>{getUserName(transaction)}</td>
                  <td>
                    <span className={`status ${transaction.status.toLowerCase()}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button 
                      className="view-button" 
                      onClick={() => handleShowDetails(transaction)}
                    >
                      <FaEye />
                    </button>
                    <button 
                      className="delete-button" 
                      onClick={() => handleDelete(transaction.order_id, activeSection)}
                    >
                      <MdDelete />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div className="modal-overlay">
            <div className="transaction-details-modal">
              <h2 className="modal-title">Transaction Details</h2>
              
              <div className="modal-grid">
                <div className="grid-item">
                  <strong>Order ID:</strong> 
                  <span>ORDER#{selectedTransaction.order_id}</span>
                </div>
                <div className="grid-item">
                  <strong>Customer Name:</strong>
                  <span>{selectedTransaction.customer_name}</span>
                </div>
                <div className="grid-item">
                  <strong>Phone Number:</strong>
                  <span>{selectedTransaction.phone_num}</span>
                </div>
                <div className="grid-item">
                  <strong>Date & Time:</strong>
                  <span>{selectedTransaction.datetime}</span>
                </div>
                <div className="grid-item">
                  <strong>{activeSection === 'manufacturer' ? 'Manufacturer' : 'Wholesaler'}:</strong>
                  <span>{getUserName(selectedTransaction)}</span>
                </div>
               
              </div>

              <div className="tranasction-table">
                <h3 className='modal-title'>Products</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Quantity</th>
                      <th>Price per Unit</th>
                      <th>Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransaction.order_details.map((product, index) => (
                      <tr key={index}>
                        <td>{product.product_name}</td>
                        <td>{product.quantity}</td>
                        <td>₹{product.price_per_unit}</td>
                        <td>₹{product.total_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-amount" style={{marginTop:"20px"}}>
                  <strong>Total Amount:</strong>
                  <span>  ₹{selectedTransaction.total}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={handlePrint} className="submit-btn">
                  <MdOutlinePrint /> Print
                </button>
                <button onClick={handleCloseDetails} className="close-btn">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;