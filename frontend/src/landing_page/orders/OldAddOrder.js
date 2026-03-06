import React, { useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext'; // Import useAuth hook for getting user context
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import QRCode from 'qrcode';
import './AddOrder.css'; // Import the CSS file
import Sidebar from '../Sidebar';
import { useLocation } from 'react-router-dom';

const AddOrder = () => {
  const { userId } = useAuth();  // Get the logged-in user's data
  const location = useLocation();
  const { cart } = location.state || {};
  const [order, setOrder] = useState({
    customerName: '',
    customerAddress: '',
    customerPhoneNumber: '',
    dateTime: new Date().toISOString().slice(0, 16),
    products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0 }],
    status: 'unpaid',
  });

  useEffect(() => {
    if (cart && cart.length > 0) {
      setOrder(prevOrder => ({
        ...prevOrder,
        products: cart.map(item => ({
          product: item.name,
          quantity: item.quantity,
          rate: item.price_per_unit,
          totalPrice: item.price_per_unit * item.quantity,
          product_id: item.product_id
        })),
      }));
    }
  }, [cart]);
  const [productsData, setProductsData] = useState([]); // State to hold products data
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch products from the API on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      if (!userId) return; // Check if userId is defined

      try {
        const response = await fetch('http://127.0.0.1:5000/getProducts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }), // Pass user ID if needed
        });
        const data = await response.json();
        setProductsData(data); // Update products data
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [userId]); // Only re-run if userId changes

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrder({ ...order, [name]: value });
  };

  const handleProductChange = (e, index) => {
    const selectedProductName = e.target.value; // Get the selected product name
    const selectedProduct = productsData.find((product) => product.name === selectedProductName); // Find the selected product
    
    const updatedProducts = [...order.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      product: selectedProduct ? selectedProduct.name : '', // Update with selected product name
      rate: selectedProduct ? selectedProduct.price_per_unit : 0, // Update with selected product price
      product_id: selectedProduct ? selectedProduct.product_id : null, // Store the product ID
      totalPrice: selectedProduct ? selectedProduct.price_per_unit * updatedProducts[index].quantity : 0, // Calculate total price
    };
    
    setOrder({ ...order, products: updatedProducts }); // Update the order state
  };
  
  
  
  

  const handleQuantityChange = (e, index) => {
    const quantity = parseInt(e.target.value, 10);
    const updatedProducts = [...order.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      quantity,
      totalPrice: updatedProducts[index].rate * quantity,
    };
    setOrder({ ...order, products: updatedProducts });
  };

  const handleAddProduct = () => {
    setOrder({
      ...order,
      products: [...order.products, { product: '', quantity: 1, rate: 0, totalPrice: 0 }],
    });
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = [...order.products];
    updatedProducts.splice(index, 1);
    setOrder({ ...order, products: updatedProducts });
  };

  const calculateOverallTotal = () => {
    return order.products.reduce((sum, product) => sum + product.totalPrice, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const overallTotalPrice = calculateOverallTotal();

    const newOrder = {
      user_id: userId, // Include the user ID here
      customer_name: order.customerName,
      phone_num: order.customerPhoneNumber,
      date_time:order.dateTime,
      status: order.status,
      order_details: order.products.map((product) => ({
        product_id: product.product_id, // Use product.product_id to find the correct product ID
        quantity: product.quantity,
      })).filter(item => item.product_id !== null), // Filter out products that don't match
    };
    

    console.log(newOrder);// Log to check the order structure

    try {
      const response = await fetch('http://127.0.0.1:5000/insertOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Error creating order. Please try again.');
        console.error('Error creating order:', errorData.error);
      } else {
        setErrorMessage(''); // Clear errors on success
        const data = await response.json();
        console.log('Order created successfully:', data);
      }
    } catch (error) {
      setErrorMessage('Error submitting order. Please try again.');
      console.error('Error submitting order:', error);
    }

    // Reset form after submission
    setOrder({
      customerName: '',
      customerAddress: '',
      customerPhoneNumber: '',
      dateTime: new Date().toISOString().slice(0, 16),
      products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0 }],
      status: 'unpaid',
    });
  };

  const handlePrint = async () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Customer Details", 20, 20);
    doc.setFontSize(12);
    doc.text(`Name: ${order.customerName}`, 20, 30);
    doc.text(`Address: ${order.customerAddress}`, 20, 40);
    doc.text(`Phone Number: ${order.customerPhoneNumber}`, 20, 50);
    doc.text(`Date and Time: ${new Date(order.dateTime).toLocaleString()}`, 20, 60);

    doc.setFontSize(16);
    doc.text("Scan your QR", 140, 20);
    const qrCodeData = `Order Details:\nName: ${order.customerName}\nAddress: ${order.customerAddress}\nPhone: ${order.customerPhoneNumber}\nStatus: ${order.status}`;
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, { width: 40, height: 40 });
      doc.addImage(qrCodeUrl, 'PNG', 138, 22, 40, 40);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }

    const overallTotalPrice = calculateOverallTotal();

    doc.text("Ordered Products", 20, 80);
    doc.autoTable({
      startY: 86,
      head: [['Product', 'Rate', 'Quantity', 'Total Price']],
      body: order.products.map(product => [
        product.product,
        `Rs. ${product.rate.toFixed(2)}`,
        product.quantity,
        `Rs. ${product.totalPrice.toFixed(2)}`,
      ]),
      theme: 'striped'
    });

    doc.setFontSize(14);
    doc.text(`Total Bill: Rs. ${overallTotalPrice.toFixed(2)}`, 20, doc.autoTable.previous.finalY + 10);
    doc.text(`Status: ${order.status}`, 20, doc.autoTable.previous.finalY + 20);
    doc.save('order-details.pdf');
  };

  return (
    <div className='dash-board'>
      <Sidebar />
      <div className="add-order-container">
      <h2 style={{
    fontSize: '30px', // Adjust font size
    color: '#333', // Dark gray color
    textAlign: 'center', // Center align text
    margin: '20px 0', // Add space above and below
    fontWeight: 'bold', // Make the text bold
    textTransform: 'uppercase', // Make text uppercase
    letterSpacing: '1.5px', // Add spacing between letters
    borderBottom: '2px solid #FF6384', // Add an underline effect
    paddingBottom: '10px', // Space between text and underline
    width: 'fit-content', // Fit content width
    marginInline: 'auto' ,
    // Center horizontally
  }}>Place your order</h2>
     {/* Error Message Display */}
     {errorMessage && (
          <div style={{
            color: 'red',
            fontWeight: 'bold',
            margin: '10px 0',
            padding: '10px',
            border: '1px solid red',
            borderRadius: '5px',
            backgroundColor: '#ffe6e6'
          }}>
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="add-order-form">
          <div className="form-group">
            <label htmlFor="customerName">Customer Name:</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={order.customerName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="customerAddress">Customer Address:</label>
            <input
              type="text"
              id="customerAddress"
              name="customerAddress"
              value={order.customerAddress}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="customerPhoneNumber">Customer Phone Number:</label>
            <input
              type="text"
              id="customerPhoneNumber"
              name="customerPhoneNumber"
              value={order.customerPhoneNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="dateTime">Date and Time:</label>
            <input
              type="datetime-local"
              id="dateTime"
              name="dateTime"
              value={order.dateTime}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="status">Payment Status:</label>
            <select
              id="status"
              name="status"
              value={order.status}
              onChange={handleChange}
              required
            >
              <option value="unpaid">unpaid</option>
              <option value="paid">paid</option>
            </select>
          </div>

          <div className="products-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Rate</th>
                  <th>Quantity</th>
                  <th>Total Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((productOrder, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={productOrder.product}
                        onChange={(e) => handleProductChange(e, index)}
                      >
                        <option value="">Select Product</option>
                        {productsData.map(product => (
                          <option key={product.id} value={product.name}>{product.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>₹ {productOrder.rate}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={productOrder.quantity}
                        onChange={(e) => handleQuantityChange(e, index)}
                      />
                    </td>
                    <td>₹ {productOrder.totalPrice}</td>
                    <td>
                      <button type="button" className='close-button' style={{padding:"8px"  , marginTop:"0px"}}  onClick={() => handleRemoveProduct(index)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="overall-total">
            <h3 className='total-price' style={{
    color: "#28a745", 
    fontWeight: "600", // Extra bold for emphasis
    marginLeft: "8px",
  }}><span style={{ fontSize: "1.3rem",
    fontWeight: "bold",   color: "#333",   fontWeight: 'bold', // Make the text bold
    textTransform: 'uppercase', // Make text uppercase
    letterSpacing: '1.5px',}}>Total:</span> ₹ {calculateOverallTotal()}</h3>
          </div>
            
          </div>

          
          <div 
  className="form-actions" 
  style={{
    display: "flex",
    justifyContent: "center", 
    gap: "20px", // Space between buttons
    marginTop: "20px"
  }}
>
<button 
  type="button" 
  className="button-add-product" 
  onClick={handleAddProduct} 
  style={{
    backgroundColor: "#007bff", // Blue background
    color: "#fff", // White text
    padding: "10px 20px",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "5px",
    border: "none", // Removes the default border
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
    transition: "background-color 0.3s ease" // Smooth hover effect
  }}

>
  Add Product
</button>

  <button 
    type="submit" 
    className="" 
    style={{
      padding: "10px 20px",
      fontSize: "16px",
      fontWeight: "bold",
      borderRadius: "5px",
      border: "1px solid #28a745",
      backgroundColor: "#28a745",
      color: "#fff",
      cursor: "pointer",
      minWidth: "150px" // Ensures both buttons are the same size
    }}
    
  >
    Submit Order
  </button>
  
  <button 
    type="button" 
    onClick={handlePrint} 
    className="" 
    style={{
      padding: "10px 20px",
      fontSize: "16px",
      fontWeight: "bold",
      borderRadius: "5px",
      border: "1px solid #28a745",
      backgroundColor: "#fff",
      color: "#28a745",
      cursor: "pointer",
      minWidth: "150px", // Ensures both buttons are the same size
    }}
  >
    Print Order
  </button>
</div>

        </form>
      </div>
    </div>
  );
};

export default AddOrder;