import React, { useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import Sidebar from '../Sidebar';
import { useLocation } from 'react-router-dom';
import SideWhole from '../SideWhole';

const AddTransactionWhole = () => {
  const { userId } = useAuth();
  const location = useLocation();
  const { cart, preSelectedManufacturer, preSelectedProduct } = location.state || {};

  const [order, setOrder] = useState({
    customerName: '',
    customerAddress: '',
    customerPhoneNumber: '',
    dateTime: new Date().toISOString().slice(0, 16),
    products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0 }],
    status: 'unpaid',
    manufacturerId: '',
    manufacturerName: '',
  });

  const [productsData, setProductsData] = useState([]);
  const [manufacturersList, setManufacturersList] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch manufacturer users on component mount
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/get_manufacturer_users');
        const data = await response.json();
        console.log("ManuData", data);
        setManufacturersList(data);
        if (preSelectedManufacturer) {
          setOrder(prevOrder => ({
            ...prevOrder,
            manufacturerName: preSelectedManufacturer.name,
            manufacturerId: preSelectedManufacturer.id,
          }));
        }
      } catch (error) {
        console.error('Error fetching manufacturers:', error);
      }
    };
    fetchManufacturers();
  }, [preSelectedManufacturer]);

  // Fetch retailer name automatically
  useEffect(() => {
    const fetchRetailerName = async () => {
      if (!userId) return;
      try {
        const response = await fetch('http://127.0.0.1:5000/get_name_of_wholesaler_by_user_id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
        const data = await response.json();
        setOrder(prevOrder => ({ ...prevOrder, customerName: data.user_id || '' }));
      } catch (error) {
        console.error('Error fetching retailer name:', error);
      }
    };
    fetchRetailerName();
  }, [userId]);

  // Fetch products based on selected manufacturer
  useEffect(() => {
    const fetchProducts = async () => {
      if (!order.manufacturerId) return;
      try {
        const response = await fetch('http://127.0.0.1:5000/getProductsManu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: order.manufacturerId }),
        });
        const data = await response.json();
        setProductsData(data);
        if (preSelectedProduct) {
          const selectedProduct = data.find(p => p.name === preSelectedProduct.name);
          if (selectedProduct) {
            setOrder(prevOrder => ({
              ...prevOrder,
              products: [{
                product: selectedProduct.name,
                quantity: 1,
                rate: selectedProduct.price_per_unit,
                totalPrice: selectedProduct.price_per_unit,
                product_id: selectedProduct.product_id,
              }],
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, [order.manufacturerId, preSelectedProduct]);

  useEffect(() => {
    if (cart && cart.length > 0) {
      setOrder(prevOrder => ({
        ...prevOrder,
        products: cart.map(item => ({
          product: item.name,
          quantity: item.quantity,
          rate: item.price_per_unit,
          totalPrice: item.price_per_unit * item.quantity,
          product_id: item.product_id,
        })),
      }));
    }
  }, [cart]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrder({ ...order, [name]: value });
  };

  const handleManufacturerChange = (e) => {
    const selectedManufacturerName = e.target.value;
    const manufacturerEntry = Object.entries(manufacturersList).find(
      ([manufacturerName]) => manufacturerName === selectedManufacturerName
    );
    if (manufacturerEntry) {
      const [name, userId] = manufacturerEntry;
      setOrder(prevOrder => ({
        ...prevOrder,
        manufacturerName: name,
        manufacturerId: userId,
        products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0 }],
      }));
    }
  };

  const handleProductChange = (e, index) => {
    const selectedProductName = e.target.value;
    const selectedProduct = productsData.find((product) => product.name === selectedProductName);
    const updatedProducts = [...order.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      product: selectedProduct ? selectedProduct.name : '',
      rate: selectedProduct ? selectedProduct.price_per_unit : 0,
      product_id: selectedProduct ? selectedProduct.product_id : null,
      totalPrice: selectedProduct ? selectedProduct.price_per_unit * updatedProducts[index].quantity : 0,
    };
    setOrder({ ...order, products: updatedProducts });
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

    const newOrder = {
      user_id: userId,
      customer_name: order.customerName,
      phone_num: order.customerPhoneNumber,
      date_time: order.dateTime,
      status: order.status,
      manu_id: order.manufacturerId,
      order_details: order.products
        .map((product) => ({ product_id: product.product_id, quantity: product.quantity }))
        .filter(item => item.product_id !== null),
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/insert_transaction_whole_to_manu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Error creating order. Please try again.');
        console.error('Error creating order:', errorData.error);
      } else {
        setErrorMessage('');
        const data = await response.json();
        console.log('Order created successfully:', data);
        setOrder({
          customerName: '',
          customerAddress: '',
          customerPhoneNumber: '',
          dateTime: new Date().toISOString().slice(0, 16),
          products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0 }],
          status: 'unpaid',
          manufacturerId: '',
          manufacturerName: '',
        });
      }
    } catch (error) {
      setErrorMessage('Error submitting order. Please try again.');
      console.error('Error submitting order:', error);
    }
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
      theme: 'striped',
    });
    doc.setFontSize(14);
    doc.text(`Total Bill: Rs. ${overallTotalPrice.toFixed(2)}`, 20, doc.autoTable.previous.finalY + 10);
    doc.text(`Status: ${order.status}`, 20, doc.autoTable.previous.finalY + 20);
    doc.save('order-details.pdf');
  };

  return (
    <>
      <SideWhole />
      <div className="dashboard-cont">

        {/* Error Toast */}
        {errorMessage && <div className="error-toast">{errorMessage}</div>}

        {/* Page Title */}
        <div className="page-title-bar">
          <div className="page-title-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 8h14M5 8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2M5 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="page-title-text">Order Your Shipment</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="order-form-grid">

            {/* ── Left Column: Order Details ── */}
            <div className="order-form-card">
              <div className="card-header">
                <h2 className="card-title">Order Details</h2>
                <div className="shimmer-effect"></div>
              </div>
              <div className="form-content">

                <div className="form-group">
                  <label>Select Manufacturer</label>
                  <select
                    className="form-input form-select"
                    name="manufacturerName"
                    value={order.manufacturerName}
                    onChange={handleManufacturerChange}
                    required
                  >
                    <option value="">Select Manufacturer</option>
                    {Object.keys(manufacturersList).map((manufacturerName) => (
                      <option key={manufacturerName} value={manufacturerName}>
                        {manufacturerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    className="form-input"
                    type="text"
                    name="customerName"
                    value={order.customerName}
                    onChange={handleChange}
                    readOnly
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Your Phone Number</label>
                  <input
                    className="form-input"
                    type="text"
                    name="customerPhoneNumber"
                    value={order.customerPhoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date &amp; Time</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    name="dateTime"
                    value={order.dateTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    className="form-input form-select"
                    name="status"
                    value={order.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

              </div>
            </div>

            {/* ── Right Column: Products & Summary ── */}
            <div className="order-form-card">
              <div className="card-header">
                <h2 className="card-title">Products &amp; Summary</h2>
                <span className="cart-count-badge">
                  {order.products.length} item{order.products.length !== 1 ? 's' : ''}
                </span>
                <div className="shimmer-effect"></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

                {/* Products Table */}
                <div className="cart-table-wrapper">
                  <table className="cart-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Rate</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.products.map((productOrder, index) => (
                        <tr key={index} className="cart-row">
                          <td style={{ minWidth: 170 }}>
                            <select
                              className="table-select"
                              value={productOrder.product}
                              onChange={(e) => handleProductChange(e, index)}
                              disabled={!order.manufacturerId}
                              required
                            >
                              <option value="">
                                {!order.manufacturerId ? 'Select a Manufacturer First' : 'Select Product'}
                              </option>
                              {productsData.map(product => (
                                <option key={product.product_id} value={product.name}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="rate-cell">₹ {productOrder.rate}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={productOrder.quantity}
                              onChange={(e) => handleQuantityChange(e, index)}
                              className="qty-input"
                              required
                            />
                          </td>
                          <td className="price-cell">₹ {productOrder.totalPrice}</td>
                          <td>
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => handleRemoveProduct(index)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14 }}>
                                <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Product Button */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                  <button type="button" className="add-product-btn" onClick={handleAddProduct}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }}>
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Add Product
                  </button>
                </div>

                {/* Total */}
                <div className="bill-breakdown">
                  <div className="bill-row bill-total-row">
                    <span className="bill-total-label">Total</span>
                    <span className="bill-total-amount">₹ {calculateOverallTotal()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="btn-area" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button type="submit" className="proceed-btn submit-btn">
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
                      <path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16L21 8V19C21 20.1 20.1 21 19 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Submit Order</span>
                  </button>
                  <button type="button" className="proceed-btn print-btn" onClick={handlePrint}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
                      <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Print Order</span>
                  </button>
                </div>

              </div>
            </div>

          </div>
        </form>
      </div>

      <style>{`
        .dashboard-cont {
          display: flex; flex-direction: column; align-items: flex-start;
          padding: 210px 24px 40px 110px;
          min-height: 100vh; font-family: 'Poppins', sans-serif;
          background-color: #f8f9fa; box-sizing: border-box; width: 100%;
        }

        /* Page Title */
        .page-title-bar { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
        .page-title-icon {
          width: 40px; height: 40px; background: linear-gradient(135deg, #4F46E5, #6366F1);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          color: white; padding: 8px; box-sizing: border-box; flex-shrink: 0;
        }
        .page-title-icon svg { width: 100%; height: 100%; }
        .page-title-text { font-size: 1.6rem; font-weight: 700; color: #1e1b4b; margin: 0; }

        /* Error Toast */
        .error-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px;
          font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 2000;
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards;
        }
        @keyframes slideDown {
          from { transform: translate(-50%,-20px); opacity:0; }
          to   { transform: translate(-50%,0); opacity:1; }
        }
        @keyframes fadeOut { from { opacity:1; } to { opacity:0; visibility:hidden; } }

        /* Grid */
        .order-form-grid {
          display: grid; grid-template-columns: 1fr 1.45fr;
          gap: 20px; width: 100%; align-items: start;
        }

        /* Cards */
        .order-form-card {
          background: white; border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          overflow: hidden; display: flex; flex-direction: column;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .order-form-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.12); }

        .card-header {
          padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(90deg, #4F46E5, #6366F1);
          position: relative; overflow: hidden; flex-shrink: 0;
        }
        .card-title {
          font-size: 1.05rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; margin: 0; color: white; position: relative; z-index: 2;
        }
        .cart-count-badge {
          background: rgba(255,255,255,0.25); color: white; padding: 4px 12px;
          border-radius: 50px; font-size: 0.8rem; font-weight: 600; position: relative; z-index: 2;
        }
        .shimmer-effect {
          position: absolute; top:0; left:-100%; width:100%; height:100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 3s infinite; z-index: 1;
        }
        @keyframes shimmer { 0%{ left:-100%; } 100%{ left:100%; } }

        /* Form */
        .form-content { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label {
          font-weight: 600; color: #4b5563; font-size: 0.82rem;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .form-input {
          padding: 11px 14px; border-radius: 8px; border: 1px solid #d1d5db;
          font-size: 0.95rem; font-family: 'Poppins', sans-serif;
          background: #f9fafb; color: #111827; box-sizing: border-box;
          transition: all 0.25s ease; width: 100%;
        }
        .form-input:focus {
          outline: none; border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.12); background: white;
        }
        .form-input[readonly] { background: #f1f5f9; color: #64748b; cursor: default; }
        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9L12 15L18 9' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
          background-size: 18px; padding-right: 38px; cursor: pointer;
        }

        /* Cart Table */
        .cart-table-wrapper { overflow-x: auto; }
        .cart-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .cart-table th {
          background: #f1f5f9; color: #475569; font-weight: 700; text-align: left;
          padding: 13px 18px; font-size: 0.8rem; border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .cart-table td {
          padding: 10px 14px; border-bottom: 1px solid #f1f5f9;
          color: #334155; font-size: 0.9rem; vertical-align: middle;
        }
        .cart-row:hover { background: #f8fafc; }
        .rate-cell { color: #64748b; font-size: 0.88rem; white-space: nowrap; }
        .price-cell { font-weight: 700; color: #059669; white-space: nowrap; }

        /* Inline table product select */
        .table-select {
          padding: 7px 28px 7px 10px; border-radius: 6px; border: 1px solid #d1d5db;
          font-size: 0.85rem; font-family: 'Poppins', sans-serif; background: #f9fafb;
          color: #111827; box-sizing: border-box; width: 100%; cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9L12 15L18 9' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center; background-size: 14px;
          transition: all 0.2s;
        }
        .table-select:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background-color: white; }
        .table-select:disabled { opacity: 0.6; cursor: not-allowed; }

        .qty-input {
          width: 68px; padding: 7px 8px; border-radius: 6px; border: 1px solid #d1d5db;
          font-size: 0.88rem; font-family: 'Poppins', sans-serif; background: #f9fafb;
          text-align: center; transition: all 0.2s; box-sizing: border-box;
        }
        .qty-input:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); background: white; }

        .remove-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 7px; border: none;
          background: #fef2f2; color: #ef4444; cursor: pointer; transition: all 0.2s;
        }
        .remove-btn:hover { background: #ef4444; color: white; }

        /* Add Product Button */
        .add-product-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 11px 20px;
          border-radius: 8px; border: 2px dashed #c7d2fe; font-weight: 700; font-size: 0.9rem;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.25s ease;
          background: #f5f3ff; color: #4F46E5;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .add-product-btn:hover { background: #4F46E5; color: white; border-color: #4F46E5; }

        /* Bill */
        .bill-breakdown {
          padding: 18px 24px; display: flex; flex-direction: column; gap: 10px;
          border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
        }
        .bill-row { display: flex; justify-content: space-between; align-items: center; }
        .bill-total-row { padding-top: 4px; }
        .bill-total-label { font-size: 1rem; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.05em; }
        .bill-total-amount { font-size: 1.5rem; font-weight: 800; color: #059669; }

        /* Action Buttons */
        .btn-area { padding: 20px 24px; }
        .proceed-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px 24px; border-radius: 8px; border: none; font-weight: 700; font-size: 1rem;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.3s ease;
          color: white; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .submit-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 4px 14px rgba(16,185,129,0.35);
        }
        .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
        .print-btn {
          background: linear-gradient(135deg, #6366F1, #4F46E5);
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
        }
        .print-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }

        /* Responsive */
        @media (max-width: 1100px) { .order-form-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px)  { .dashboard-cont { padding-left: 24px; } }
      `}</style>
    </>
  );
};

export default AddTransactionWhole;