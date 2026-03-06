import React, { useContext, useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import { useNavigate } from 'react-router-dom'; 
import jsPDF from 'jspdf';
import { MdDelete, MdOutlinePrint } from "react-icons/md";
import { FaEye, FaShoppingCart } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SideWhole from '../SideWhole';
import axios from 'axios';
import './shipment.css'

const ShipmentOrdersWhole = () => {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [originalTransactions, setOriginalTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  const fetchRetailerName = async (user_id) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_name_of_retailer_by_user_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user_id }),
      });
      const data = await response.json();
      return data.user_id;
    } catch (error) {
      console.error('Error fetching retailer name:', error);
      return 'Unknown';
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_all_transactions_for_wholesaler_to_retailer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ whole_id: userId }),
      });
      const data = await response.json();
      console.log(data)
      const transactionsWithNames = await Promise.all(
        data.map(async (transaction) => {
          const retailerName = await fetchRetailerName(transaction.user_id);
          return { ...transaction, retailerName };
        })
      );
      
      setTransactions(transactionsWithNames);
      setOriginalTransactions(transactionsWithNames);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleSearch = (searchQuery) => {
    const filteredTransactions = originalTransactions.filter(transaction =>
      transaction.retailerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setTransactions(filteredTransactions);
  };

  const calculateTotalQuantity = (orderDetails) => {
    return orderDetails.reduce((total, item) => total + item.quantity, 0);
  };

  const handleShowDetails = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
  };

  const handleAddToCart = (transaction) => {
    try {
      console.log('Transaction data:', transaction);
      
      // Convert transaction data to the format needed for CartWhole
      const cartProducts = transaction.order_details.map(product => {
        console.log('Processing product:', product);
        return {
          product_id: product.product_id,
          quantity: parseInt(product.quantity),
          product_name: product.product_name,
          price_per_unit: product.price_per_unit
        };
      });
  
      console.log('Processed cart products:', cartProducts);
  
      // Store both the products and order_id in localStorage
      localStorage.setItem('pendingCartProducts', JSON.stringify(cartProducts));
      localStorage.setItem('pendingOrderId', transaction.order_id.toString());
      
      // Navigate to CartWhole component
      navigate('/cartswhole');
    } catch (error) {
      console.error('Error in handleAddToCart:', error);
      toast.error('Error processing cart data. Please try again.');
    }
  };
  const handlePrint = async () => {
    if (!selectedTransaction) return;
  
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 128);
    doc.text("Shipment Details", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Retailer Name: ${selectedTransaction.retailerName}`, 20, 30);
    doc.text(`Order ID: ORDER#${selectedTransaction.order_id}`, 20, 40);
    doc.text(`Date & Time: ${selectedTransaction.datetime}`, 20, 50);
    doc.text(`Customer Name: ${selectedTransaction.customer_name}`, 20, 60);
    doc.text(`Customer Phone: ${selectedTransaction.phone_num}`, 20, 70);
  
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
  
    doc.save('shipment-details.pdf');
  };

  const renderTransactions = () => {
    return (
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Retailer Name</th>
            <th>Customer Phone</th>
            <th>Date & Time</th>
            <th>Total Price</th>
            <th>Product Qty</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.order_id}>
              <td>ORDER#{transaction.order_id}</td>
              <td>{transaction.retailerName}</td>
              <td>{transaction.phone_num}</td>
              <td>{transaction.datetime}</td>
              <td>₹{transaction.total}</td>
              <td>{calculateTotalQuantity(transaction.order_details)}</td>
              <td>
                <span className={`status ${transaction.status}`}>
                  {transaction.status}
                </span>
              </td>
              <td style={{display: "flex", justifyContent: "center"}}>
                <button 
                  className="view-btn action-btn" 
                  onClick={() => handleShowDetails(transaction)}
                >
                  <FaEye />
                </button>
                <button 
                  className="cart-btn action-btn"
                  onClick={() => handleAddToCart(transaction)}
                >
                  <FaShoppingCart />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <>
      <div className='dash-board'>
        <SideWhole />
        <ToastContainer />
        <div className="shipment-container">
   
          
          <input
            type="text"
            className="search-bar"
            placeholder="Search by Retailer Name"
            onChange={(e) => handleSearch(e.target.value)}
          />
          
          {renderTransactions()}

          {selectedTransaction && (
            <div className='modal-overlay'>
              <div className="transaction-details-modal">
                <h2 className="modal-title">Shipment Details</h2>

                <div className="modal-info-grid">
                  <div>
                    <strong>Order ID:</strong> ORDER#{selectedTransaction.order_id}
                  </div>
                  <div>
                    <strong>Retailer Name:</strong> {selectedTransaction.retailerName}
                  </div>
                  <div>
                    <strong>Customer Phone:</strong> {selectedTransaction.phone_num}
                  </div>
                  <div>
                    <strong>Date & Time:</strong> {selectedTransaction.datetime}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedTransaction.status}
                  </div>
                  <div>
                    <strong>Total Price:</strong> ₹{selectedTransaction.total}
                  </div>
                  <div>
                    <strong>Product Quantity:</strong> {calculateTotalQuantity(selectedTransaction.order_details)}
                  </div>
                </div>

                <div className="modal-products">
                  <strong>Order Details:</strong>
                  {selectedTransaction.order_details.map((product, index) => (
                    <div key={index} className="modal-product">
                      <h4>{product.product_name}</h4>
                      <span>Quantity: {product.quantity}</span>
                      <span>Price: ₹{product.price_per_unit}</span>
                      <span>Total: ₹{product.total_price}</span>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button onClick={handlePrint} className="print-btn">
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
    </>
  );
};

export default ShipmentOrdersWhole;