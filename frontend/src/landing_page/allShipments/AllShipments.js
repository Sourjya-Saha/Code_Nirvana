import React, { useContext, useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import { useNavigate } from 'react-router-dom'; 
import jsPDF from 'jspdf';
import { MdDelete, MdOutlinePrint } from "react-icons/md";
import { FaEye, FaShoppingCart } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SideManu from '../SideManu';
import axios from 'axios';
import './shipment.css'
const AllShipment = () => {
  const { userId } = useAuth();
  const [activeSection, setActiveSection] = useState('retailer');
  const [retailerTransactions, setRetailerTransactions] = useState([]);
  const [wholesalerTransactions, setWholesalerTransactions] = useState([]);
  const [originalRetailerTransactions, setOriginalRetailerTransactions] = useState([]);
  const [originalWholesalerTransactions, setOriginalWholesalerTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchRetailerTransactions();
      fetchWholesalerTransactions();
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

  const fetchWholesalerName = async (user_id) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_name_of_wholesaler_by_user_id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user_id }),
      });
      const data = await response.json();
      return data.user_id;
    } catch (error) {
      console.error('Error fetching wholesaler name:', error);
      return 'Unknown';
    }
  };

  const fetchRetailerTransactions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_all_transactions_manu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manu_id: userId }),
      });
      const data = await response.json();
      
      const transactionsWithNames = await Promise.all(
        data.map(async (transaction) => {
          const retailerName = await fetchRetailerName(transaction.user_id);
          return { ...transaction, retailerName };
        })
      );
      
      setRetailerTransactions(transactionsWithNames);
      setOriginalRetailerTransactions(transactionsWithNames);
    } catch (error) {
      console.error('Error fetching retailer transactions:', error);
    }
  };

  const fetchWholesalerTransactions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/get_all_transactions_whole_for_manu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manu_id: userId }),
      });
      const data = await response.json();
      
      const transactionsWithNames = await Promise.all(
        data.map(async (transaction) => {
          const wholesalerName = await fetchWholesalerName(transaction.user_id);
          return { ...transaction, wholesalerName };
        })
      );
      
      setWholesalerTransactions(transactionsWithNames);
      setOriginalWholesalerTransactions(transactionsWithNames);
    } catch (error) {
      console.error('Error fetching wholesaler transactions:', error);
    }
  };

  const handleSearch = (searchQuery) => {
    if (activeSection === 'retailer') {
      const filteredTransactions = originalRetailerTransactions.filter(transaction =>
        transaction.retailerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setRetailerTransactions(filteredTransactions);
    } else {
      const filteredTransactions = originalWholesalerTransactions.filter(transaction =>
        transaction.wholesalerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setWholesalerTransactions(filteredTransactions);
    }
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

  const handleAddToCart = async (transaction) => {
    try {
      // Generate a random cart ID
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const generateCartId = () => {
        let result = '';
        for (let i = 0; i < 10; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };
  
      // Generate new cart ID
      const cartId = generateCartId();
      
      // Map the products from the transaction
      const productsToAdd = transaction.order_details.map(product => ({
        product_id: product.product_id,
        quantity: product.quantity,
      }));
  
      // Determine order type based on active section
      const order_type = activeSection === 'retailer' ? 'retailer' : 'wholesaler';
  
      // Make the API call to add to cart
      const response = await axios.post("http://localhost:5000/add_to_cart", {
        cart_id: cartId,
        products: productsToAdd,
        user_id: userId,
        order_id: transaction.order_id,
        order_type: order_type
      });
      
      // Show success message
      toast.success(`Cart ${cartId} created successfully!`);
    } catch (error) {
      // Handle any errors
      console.error("Error adding cart:", error);
      toast.error("Failed to create cart. Please try again.");
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
    const name = activeSection === 'retailer' ? selectedTransaction.retailerName : selectedTransaction.wholesalerName;
    doc.text(`${activeSection === 'retailer' ? 'Retailer' : 'Wholesaler'} Name: ${name}`, 20, 30);
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
    const transactions = activeSection === 'retailer' ? retailerTransactions : wholesalerTransactions;
    return (
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>{activeSection === 'retailer' ? 'Retailer Name' : 'Wholesaler Name'}</th>
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
              <td>{activeSection === 'retailer' ? transaction.retailerName : transaction.wholesalerName}</td>
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
        <SideManu />
        <ToastContainer />
        <div className="shipment-container">
          
          <div className="shipment-nav">
            <button
              className={`nav-btn ${activeSection === 'retailer' ? 'active' : ''}`}
              onClick={() => setActiveSection('retailer')}
            >
              Shipments from Retailer
            </button>
            <button
              className={`nav-btn ${activeSection === 'wholesaler' ? 'active' : ''}`}
              onClick={() => setActiveSection('wholesaler')}
            >
              Shipments from Wholesaler
            </button>
          </div>
          
          <input
            type="text"
            className="search-bar"
            placeholder={`Search by ${activeSection === 'retailer' ? 'Retailer' : 'Wholesaler'} Name`}
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
                    <strong>{activeSection === 'retailer' ? 'Retailer' : 'Wholesaler'} Name:</strong> 
                    {activeSection === 'retailer' ? selectedTransaction.retailerName : selectedTransaction.wholesalerName}
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

export default AllShipment;