import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../user_login/AuthContext';
import Sidebar from '../Sidebar';

const AddOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();

  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    dateTime: new Date().toISOString().slice(0, 16),
    paymentMethod: 'online',
    status: 'unpaid',
  });

  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderSummary, setOrderSummary] = useState({
    subTotal: 0,
    convenienceFee: 50,
    deliveryCharge: 100,
    total: 0,
  });

  // Handle cart items from warehouse
  useEffect(() => {
    if (location.state?.cartItems) {
      const formattedCartItems = location.state.cartItems.map(item => ({
        product_id: item.product_id,
        name: item.name,
        price_per_unit: item.price_per_unit,
        quantity: item.quantity,
        totalPrice: item.price_per_unit * item.quantity,
      }));
      setCartItems(formattedCartItems);
    }
    if (location.state?.orderSummary) {
      setOrderSummary(location.state.orderSummary);
    }
  }, [location.state]);

  useEffect(() => {
    const loadRazorpayScript = () => new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
    loadRazorpayScript();
    fetchProducts();
  }, []);

  useEffect(() => {
    const subTotal = cartItems.reduce((total, item) => total + item.price_per_unit * item.quantity, 0);
    setOrderSummary({ subTotal, convenienceFee: 50, deliveryCharge: 100, total: subTotal + 150 });
  }, [cartItems]);

  // Auto-set status to 'paid' when COD is selected
  const handlePaymentMethodChange = (method) => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: method,
      status: method === 'cod' ? 'paid' : 'unpaid',
    }));
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/getProducts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch {
      setError('Failed to load products. Please try again.');
    }
  };

  const checkStockAvailability = async () => {
    const response = await fetch('http://127.0.0.1:5000/getProducts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!response.ok) throw new Error('Failed to check stock');
    const currentProducts = await response.json();
    const outOfStockItems = cartItems.filter(cartItem => {
      const product = currentProducts.find(p => p.product_id === cartItem.product_id);
      return !product || product.quantity_of_uom < cartItem.quantity_of_uom;
    });
    if (outOfStockItems.length > 0) {
      throw new Error(`Out of stock: ${outOfStockItems.map(i => i.name).join(', ')}`);
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuantityChange = (productId, newQuantity) => {
    setCartItems(prev => prev.map(item => {
      if (item.product_id === productId) {
        const quantity = Math.max(1, parseInt(newQuantity) || 1);
        return { ...item, quantity, totalPrice: item.price_per_unit * quantity };
      }
      return item;
    }));
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    const selected = products.find(p => p.product_id === parseInt(productId));
    setSelectedProduct(selected || '');
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const existingItem = cartItems.find(item => item.product_id === selectedProduct.product_id);
    if (existingItem) {
      setCartItems(prev => prev.map(item =>
        item.product_id === selectedProduct.product_id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.price_per_unit }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, {
        product_id: selectedProduct.product_id,
        name: selectedProduct.name,
        price_per_unit: selectedProduct.price_per_unit,
        quantity: 1,
        totalPrice: selectedProduct.price_per_unit,
      }]);
    }
    setSelectedProduct('');
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateOrderStatus = async (orderId) => {
    const response = await fetch('http://127.0.0.1:5000/update_order_status_website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
    return response.json();
  };

  const handleCODOrder = async () => {
    if (cartItems.length === 0) { setError('Please add items to cart before proceeding.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await checkStockAvailability();
      const orderResponse = await fetch('http://127.0.0.1:5000/insertOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customerName,
          phone_num: formData.phoneNumber,
          date_time: formData.dateTime,
          payment_method: 'cod',
          status: 'paid',
          user_id: userId,
          order_details: cartItems.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        }),
      });
      if (!orderResponse.ok) throw new Error('Failed to create COD order');
      alert('COD Order placed successfully! Status set to Paid.');
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Failed to place COD order.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (cartItems.length === 0) { setError('Please add items to cart before proceeding.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await checkStockAvailability();
      const orderResponse = await fetch('http://127.0.0.1:5000/create_razorpay_order_website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            customer_name: formData.customerName,
            phone_num: formData.phoneNumber,
            date_time: formData.dateTime,
            payment_method: formData.paymentMethod,
            status: 'unpaid',
            order_details: cartItems.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
          },
          user_id: userId,
        }),
      });
      if (!orderResponse.ok) throw new Error('Failed to create order');
      const orderData = await orderResponse.json();

      const options = {
        key: 'rzp_test_2EpPSCTb8XHFCk',
        amount: orderData.total_amount * 100,
        currency: 'INR',
        name: 'Maa Tara Store',
        description: 'Medicine Order Payment',
        order_id: orderData.razorpay_order_id,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch('http://127.0.0.1:5000/confirm_order_payment_website', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                temp_order_data: orderData.temp_order_data,
              }),
            });
            if (!verifyResponse.ok) throw new Error('Payment verification failed');
            const verifyResult = await verifyResponse.json();
            await updateOrderStatus(verifyResult.order_id);
            alert('Order placed successfully!');
            navigate('/orders');
          } catch {
            setError('Payment verification failed. Please try again.');
          }
        },
        prefill: { name: formData.customerName, contact: formData.phoneNumber },
        theme: { color: '#4F46E5' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isCOD = formData.paymentMethod === 'cod';

  return (
    <>
      <Sidebar />
      <div className="dashboard-cont">

        {error && <div className="error-toast">{error}</div>}

        {/* Page Title */}
        <div className="page-title-bar">
          <div className="page-title-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6 2L3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10C16 11.06 15.58 12.08 14.83 12.83C14.08 13.58 13.06 14 12 14C10.94 14 9.92 13.58 9.17 12.83C8.42 12.08 8 11.06 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="page-title-text">Place New Order</h1>
        </div>

        <div className="order-form-grid">

          {/* ── Left: Customer Details ── */}
          <div className="order-form-card">
            <div className="card-header">
              <h2 className="card-title">Customer Details</h2>
              <div className="shimmer-effect"></div>
            </div>
            <div className="form-content">

              <div className="form-group">
                <label>Customer Name</label>
                <input className="form-input" type="text" name="customerName"
                  placeholder="Enter customer name" value={formData.customerName}
                  onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input className="form-input" type="tel" name="phoneNumber"
                  placeholder="Enter phone number" value={formData.phoneNumber}
                  onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>Date &amp; Time</label>
                <input className="form-input" type="datetime-local" name="dateTime"
                  value={formData.dateTime} onChange={handleInputChange} required />
              </div>

              {/* Payment Method Toggle */}
              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-toggle">
                  <button type="button"
                    className={`toggle-btn${!isCOD ? ' toggle-online-active' : ''}`}
                    onClick={() => handlePaymentMethodChange('online')}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 10H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Online / Razorpay
                  </button>
                  <button type="button"
                    className={`toggle-btn${isCOD ? ' toggle-cod-active' : ''}`}
                    onClick={() => handlePaymentMethodChange('cod')}>
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
                      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Cash on Delivery
                  </button>
                </div>
                {isCOD && (
                  <div className="cod-notice">
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}>
                      <path d="M22 11.08V12A10 10 0 1 1 11 2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    COD orders are automatically marked as <strong>&nbsp;Paid</strong>
                  </div>
                )}
              </div>

              {/* Product Selector — select full width, Add button below */}
              <div className="form-group">
                <label>Add Products</label>
                <select
                  className="form-input form-select"
                  value={selectedProduct ? selectedProduct.product_id : ''}
                  onChange={handleProductChange}
                >
                  <option value="">— Choose a product —</option>
                  {products.map(product => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name} — ₹{product.price_per_unit}
                    </option>
                  ))}
                </select>
                <button type="button" className="add-product-btn"
                  onClick={handleAddProduct} disabled={!selectedProduct}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }}>
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add to Order
                </button>
              </div>

            </div>
          </div>

          {/* ── Right: Cart & Summary ── */}
          <div className="order-form-card">
            <div className="card-header">
              <h2 className="card-title">Order Summary</h2>
              <span className="cart-count-badge">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
              </span>
              <div className="shimmer-effect"></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

              {/* Cart Table */}
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
                    {cartItems.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-cart-msg">
                          <div className="empty-cart-inner">
                            <svg viewBox="0 0 24 24" fill="none" style={{ width: 38, height: 38, color: '#cbd5e1' }}>
                              <path d="M6 2L3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>No items added yet</span>
                          </div>
                        </td>
                      </tr>
                    ) : cartItems.map(item => (
                      <tr key={item.product_id} className="cart-row">
                        <td className="product-name-cell">{item.name}</td>
                        <td className="rate-cell">₹{item.price_per_unit}</td>
                        <td>
                          <input type="number" min="1" value={item.quantity} className="qty-input"
                            onChange={(e) => handleQuantityChange(item.product_id, e.target.value)} />
                        </td>
                        <td className="price-cell">₹{item.totalPrice.toFixed(2)}</td>
                        <td>
                          <button type="button" className="remove-btn"
                            onClick={() => handleRemoveFromCart(item.product_id)}>
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

              {/* Bill Breakdown */}
              <div className="bill-breakdown">
                <div className="bill-row">
                  <span className="bill-label">Subtotal</span>
                  <span className="bill-value">₹{orderSummary.subTotal.toFixed(2)}</span>
                </div>
                <div className="bill-row">
                  <span className="bill-label">Convenience Fee</span>
                  <span className="bill-value">₹{orderSummary.convenienceFee.toFixed(2)}</span>
                </div>
                <div className="bill-row">
                  <span className="bill-label">Delivery Charge</span>
                  <span className="bill-value">₹{orderSummary.deliveryCharge.toFixed(2)}</span>
                </div>
                <div className="bill-row bill-total-row">
                  <span className="bill-total-label">Total</span>
                  <span className="bill-total-amount">₹{orderSummary.total.toFixed(2)}</span>
                </div>
              </div>

              {/* CTA Button */}
              <div className="btn-area">
                {isCOD ? (
                  <button type="button" className="proceed-btn cod-btn"
                    onClick={handleCODOrder} disabled={isLoading || cartItems.length === 0}>
                    {isLoading
                      ? <><div className="btn-spinner"></div><span>Placing Order...</span></>
                      : <>
                          <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
                            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Place COD Order — Mark as Paid</span>
                        </>
                    }
                  </button>
                ) : (
                  <button type="button" className="proceed-btn online-btn"
                    onClick={handleOnlinePayment} disabled={isLoading || cartItems.length === 0}>
                    {isLoading
                      ? <><div className="btn-spinner"></div><span>Processing...</span></>
                      : <>
                          <svg viewBox="0 0 24 24" fill="none" style={{ width: 20, height: 20 }}>
                            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 10H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Proceed to Payment</span>
                        </>
                    }
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
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
          to   { transform: translate(-50%,0);     opacity:1; }
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
        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9L12 15L18 9' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
          background-size: 18px; padding-right: 38px; cursor: pointer;
        }

        /* Payment Toggle */
        .payment-toggle {
          display: flex; border: 1.5px solid #e2e8f0; border-radius: 8px;
          overflow: hidden; background: #f9fafb;
        }
        .toggle-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 11px 10px; border: none; background: transparent; color: #64748b;
          font-family: 'Poppins', sans-serif; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.25s ease;
          border-right: 1.5px solid #e2e8f0;
        }
        .toggle-btn:last-child { border-right: none; }
        .toggle-online-active { background: #4F46E5 !important; color: white !important; }
        .toggle-cod-active { background: #10b981 !important; color: white !important; }

        .cod-notice {
          display: flex; align-items: center; gap: 7px;
          background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px;
          padding: 9px 12px; font-size: 0.82rem; color: #065f46; font-weight: 500;
        }

        /* Product Selector */
        .add-product-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 11px 20px; margin-top: 2px;
          border-radius: 8px; border: none; font-weight: 700; font-size: 0.9rem;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.25s ease;
          background: #4F46E5; color: white;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .add-product-btn:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }
        .add-product-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        /* Cart Table */
        .cart-table-wrapper { overflow-x: auto; }
        .cart-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .cart-table th {
          background: #f1f5f9; color: #475569; font-weight: 700; text-align: left;
          padding: 13px 18px; font-size: 0.8rem; border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .cart-table td {
          padding: 13px 18px; border-bottom: 1px solid #f1f5f9;
          color: #334155; font-size: 0.9rem; vertical-align: middle;
        }
        .cart-row:hover { background: #f8fafc; }
        .product-name-cell { font-weight: 700; color: #1e1b4b; }
        .rate-cell { color: #64748b; font-size: 0.88rem; }
        .price-cell { font-weight: 700; color: #059669; }

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

        .empty-cart-msg { text-align: center; padding: 36px 0 !important; }
        .empty-cart-inner {
          display: flex; flex-direction: column; align-items: center;
          gap: 10px; color: #94a3b8; font-size: 0.88rem; font-style: italic;
        }

        /* Bill */
        .bill-breakdown {
          padding: 18px 24px; display: flex; flex-direction: column; gap: 10px;
          border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
        }
        .bill-row { display: flex; justify-content: space-between; align-items: center; }
        .bill-label { font-size: 0.88rem; color: #64748b; font-weight: 500; }
        .bill-value { font-size: 0.9rem; color: #334155; font-weight: 600; }
        .bill-total-row { margin-top: 4px; padding-top: 12px; border-top: 2px dashed #e2e8f0; }
        .bill-total-label { font-size: 1rem; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.05em; }
        .bill-total-amount { font-size: 1.5rem; font-weight: 800; color: #059669; }

        /* Buttons */
        .btn-area { padding: 20px 24px; }
        .proceed-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 14px 24px; border-radius: 8px; border: none; font-weight: 700; font-size: 1rem;
          font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.3s ease;
          color: white; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .online-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 4px 14px rgba(16,185,129,0.35);
        }
        .online-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }
        .cod-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          box-shadow: 0 4px 14px rgba(245,158,11,0.35);
        }
        .cod-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245,158,11,0.45); }
        .proceed-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

        .btn-spinner {
          width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.4);
          border-radius: 50%; border-top-color: white; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Responsive */
        @media (max-width: 1100px) { .order-form-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px)  { .dashboard-cont { padding-left: 24px; } }
      `}</style>
    </>
  );
};

export default AddOrder;