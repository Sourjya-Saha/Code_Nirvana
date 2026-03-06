import React, { useState, useEffect ,useNavigate} from 'react';
import { useAuth } from '../user_login/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import Sidebar from '../Sidebar';
import { useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './addTransaction.css';

const AddTransaction = () => {
  const { userId } = useAuth();
  const location = useLocation();
  
  // Extract all navigation state with detailed logging
  const navigationState = location.state || {};
  console.log('AddTransaction: Full navigation state:', navigationState);
  
  const { 
    orderType,
    preSelectedManufacturer, 
    preSelectedWholesaler, 
    preSelectedProduct,
    cart
  } = navigationState;
  
  console.log('AddTransaction: Extracted state values:', {
    orderType,
    preSelectedManufacturer,
    preSelectedWholesaler,
    preSelectedProduct,
    cart
  });

  // Set initial active section based on navigation
  const [activeSection, setActiveSection] = useState(() => {
    const initialSection = orderType || 'manufacturer';
    console.log('AddTransaction: Setting initial section to:', initialSection);
    return initialSection;
  });

  // Initialize order state with pre-selected values
  const [order, setOrder] = useState(() => {
    const initialOrder = {
      customerName: '',
      customerPhoneNumber: '',
      dateTime: new Date().toISOString().slice(0, 16),
      products: [{ 
        product: preSelectedProduct?.name || '', 
        quantity: 1, 
        rate: preSelectedProduct?.price || 0, 
        totalPrice: preSelectedProduct?.price || 0,
        product_id: preSelectedProduct?.product_id || null 
      }],
      status: 'unpaid',
      manufacturerId: preSelectedManufacturer?.id || '',
      manufacturerName: preSelectedManufacturer?.name || '',
      wholesalerId: preSelectedWholesaler?.id || '',
      wholesalerName: preSelectedWholesaler?.name || ''
    };
    
    console.log('AddTransaction: Initial order state:', initialOrder);
    return initialOrder;
  });
  const [productsData, setProductsData] = useState([]);
  const [manufacturersList, setManufacturersList] = useState({});
  const [wholesalersList, setWholesalersList] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    console.log('AddTransaction: Section change effect triggered', {
      orderType,
      activeSection,
      preSelectedManufacturer,
      preSelectedWholesaler
    });

    if (orderType) {
      setActiveSection(orderType);
      
      if (orderType === 'manufacturer' && preSelectedManufacturer) {
        setOrder(prev => ({
          ...prev,
          manufacturerId: preSelectedManufacturer.id,
          manufacturerName: preSelectedManufacturer.name,
          wholesalerId: '',
          wholesalerName: ''
        }));
      } else if (orderType === 'wholesaler' && preSelectedWholesaler) {
        setOrder(prev => ({
          ...prev,
          wholesalerId: preSelectedWholesaler.id,
          wholesalerName: preSelectedWholesaler.name,
          manufacturerId: '',
          manufacturerName: ''
        }));
      }
    }
  }, [orderType, preSelectedManufacturer, preSelectedWholesaler]);
  // Fetch manufacturer users
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/get_manufacturer_users');
        const data = await response.json();
        setManufacturersList(data);
        
        if (preSelectedManufacturer && activeSection === 'manufacturer') {
          setOrder(prevOrder => ({
            ...prevOrder,
            manufacturerName: preSelectedManufacturer.name,
            manufacturerId: preSelectedManufacturer.id,
          }));
        }
      } catch (error) {
        console.error('Error fetching manufacturers:', error);
        toast.error('Failed to fetch manufacturers');
      }
    };

    if (activeSection === 'manufacturer') {
      fetchManufacturers();
    }
  }, [preSelectedManufacturer, activeSection]);

  // Fetch wholesaler users
  useEffect(() => {
    const fetchWholesalers = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/get_wholesaler_users');
        const data = await response.json();
        setWholesalersList(data);
      } catch (error) {
        console.error('Error fetching wholesalers:', error);
        toast.error('Failed to fetch wholesalers');
      }
    };

    if (activeSection === 'wholesaler') {
      fetchWholesalers();
    }
  }, [activeSection]);

  // Fetch retailer name
  useEffect(() => {
    const fetchRetailerName = async () => {
      if (!userId) return;

      try {
        const response = await fetch('http://127.0.0.1:5000/get_name_of_retailer_by_user_id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        });
        const data = await response.json();
        setOrder(prevOrder => ({
          ...prevOrder,
          customerName: data.user_id || '',
        }));
      } catch (error) {
        console.error('Error fetching retailer name:', error);
      }
    };

    fetchRetailerName();
  }, [userId]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      const supplierId = activeSection === 'manufacturer' ? order.manufacturerId : order.wholesalerId;
      if (!supplierId) return;

      try {
        const endpoint = activeSection === 'manufacturer'
          ? 'http://127.0.0.1:5000/getProductsManu'
          : 'http://127.0.0.1:5000/getProductsWhole';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: supplierId }),
        });
        const data = await response.json();
        setProductsData(data);

        if (activeSection === 'manufacturer' && preSelectedProduct) {
          const selectedProduct = data.find(p => p.name === preSelectedProduct.name);
          if (selectedProduct) {
            setOrder(prevOrder => ({
              ...prevOrder,
              products: [{
                product: selectedProduct.name,
                quantity: 1,
                rate: selectedProduct.price_per_unit,
                totalPrice: selectedProduct.price_per_unit,
                product_id: selectedProduct.product_id
              }]
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, [order.manufacturerId, order.wholesalerId, activeSection, preSelectedProduct]);

  // Handle cart data
  useEffect(() => {
    console.log('Cart effect triggered with cart:', cart);
    
    if (cart && cart.length > 0) {
      console.log('Processing cart items:', cart);
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
        products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0, product_id: null }]
      }));
    }
  };

  const handleWholesalerChange = (e) => {
    const selectedWholesalerName = e.target.value;
    
    const wholesalerEntry = Object.entries(wholesalersList).find(
      ([wholesalerName]) => wholesalerName === selectedWholesalerName
    );

    if (wholesalerEntry) {
      const [name, userId] = wholesalerEntry;
      setOrder(prevOrder => ({
        ...prevOrder,
        wholesalerName: name,
        wholesalerId: userId,
        products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0, product_id: null }]
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
      totalPrice: selectedProduct ? selectedProduct.price_per_unit * updatedProducts[index].quantity : 0
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
      products: [...order.products, { product: '', quantity: 1, rate: 0, totalPrice: 0, product_id: null }],
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

    const orderDetails = order.products
      .filter(item => item.product_id !== null)
      .map((product) => ({
        product_id: product.product_id,
        quantity: product.quantity,
        price: product.rate
      }));

    const baseOrder = {
      user_id: userId,
      customer_name: order.customerName,
      phone_num: order.customerPhoneNumber,
      status: order.status,
      order_details: orderDetails,
    };

    const endpoint = activeSection === 'manufacturer'
      ? 'http://127.0.0.1:5000/insert_transaction'
      : 'http://127.0.0.1:5000/insert_transaction_retailer_to_wholesaler';

    const orderData = activeSection === 'manufacturer'
      ? { ...baseOrder, manu_id: order.manufacturerId }
      : { ...baseOrder, whole_id: order.wholesalerId };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Error creating order. Please try again.');
        toast.error(errorData.error || 'Error creating order');
      } else {
        const data = await response.json();
        console.log('Order created successfully:', data);
        toast.success('Order created successfully!');
        
        // Reset form
        setOrder({
          ...order,
          customerPhoneNumber: '',
          dateTime: new Date().toISOString().slice(0, 16),
          products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0, product_id: null }],
          status: 'unpaid',
          manufacturerId: '',
          manufacturerName: '',
          wholesalerId: '',
          wholesalerName: '',
        });
      }
    } catch (error) {
      setErrorMessage('Error submitting order. Please try again.');
      toast.error('Error submitting order');
      console.error('Error submitting order:', error);
    }
  };

  const handlePrint = async () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Order Details", 20, 20);
    doc.setFontSize(12);
    doc.text(`Customer Name: ${order.customerName}`, 20, 30);
    doc.text(`Phone Number: ${order.customerPhoneNumber}`, 20, 40);
    doc.text(`Date and Time: ${new Date(order.dateTime).toLocaleString()}`, 20, 50);

    const qrCodeData = `Order Details:\nName: ${order.customerName}\nPhone: ${order.customerPhoneNumber}\nStatus: ${order.status}`;
    try {
      const qrCodeUrl = await QRCode.toDataURL(qrCodeData);
      doc.addImage(qrCodeUrl, 'PNG', 138, 22, 40, 40);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }

    doc.text("Ordered Products", 20, 70);
    doc.autoTable({
      startY: 76,
      head: [['Product', 'Rate', 'Quantity', 'Total Price']],
      body: order.products.map(product => [
        product.product,
        `₹ ${product.rate.toFixed(2)}`,
        product.quantity,
        `₹ ${product.totalPrice.toFixed(2)}`,
      ]),
      theme: 'striped'
    });

    doc.text(`Total Bill: ₹ ${calculateOverallTotal().toFixed(2)}`, 20, doc.autoTable.previous.finalY + 10);
    doc.text(`Status: ${order.status}`, 20, doc.autoTable.previous.finalY + 20);
    doc.save('order-details.pdf');
  };

  return (
    <div className='dash-board'>
      <Sidebar />
      <ToastContainer />
      <div className="shipment-management-container">
        <div className="shipment-header">
          <h1 className="transaction-title">Order Management</h1>
          <p className="shipment-subtitle">Create and manage your orders efficiently</p>
        </div>

        <div className="shipment-nav">
          <button
            className={`shipment-nav-btn ${activeSection === 'manufacturer' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('manufacturer');
              setOrder(prev => ({
                ...prev,
                wholesalerId: '',
                wholesalerName: '',
                products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0, product_id: null }]
              }));
            }}
          >
            <i className="fas fa-industry"></i>
            Order from Manufacturer
          </button>
          <button
            className={`shipment-nav-btn ${activeSection === 'wholesaler' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('wholesaler');
              setOrder(prev => ({
                ...prev,
                manufacturerId: '',
                manufacturerName: '',
                products: [{ product: '', quantity: 1, rate: 0, totalPrice: 0, product_id: null }]
              }));
            }}
          >
            <i className="fas fa-warehouse"></i>
            Order from Wholesaler
          </button>
        </div>

        <div className="create-shipment-section">
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="shipment-form">
            <div className="form-group">
              <label>{activeSection === 'manufacturer' ? 'Select Manufacturer:' : 'Select Wholesaler:'}</label>
              {activeSection === 'manufacturer' ? (
                <select
                  value={order.manufacturerName}
                  onChange={handleManufacturerChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Manufacturer</option>
                  {Object.keys(manufacturersList).map((manufacturerName) => (
                    <option key={manufacturerName} value={manufacturerName}>
                      {manufacturerName}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={order.wholesalerName}
                  onChange={handleWholesalerChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Wholesaler</option>
                  {Object.keys(wholesalersList).map((wholesalerName) => (
                    <option key={wholesalerName} value={wholesalerName}>
                      {wholesalerName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Your Name:</label>
              <input
                type="text"
                value={order.customerName}
                onChange={handleChange}
                name="customerName"
                required
                readOnly
                className="form-input readonly"
              />
            </div>

            <div className="form-group">
              <label>Your Phone Number:</label>
              <input
                type="text"
                value={order.customerPhoneNumber}
                onChange={handleChange}
                name="customerPhoneNumber"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Date and Time:</label>
              <input
                type="datetime-local"
                value={order.dateTime}
                onChange={handleChange}
                name="dateTime"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Payment Status:</label>
              <select
                value={order.status}
                onChange={handleChange}
                name="status"
                required
                className="form-select"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="products-section">
            <div className="transactions-table" style={{ marginTop: '20px', overflowX: 'auto' }}>
            <table >
              <thead>
                <tr>
                  <th >Product</th>
                  <th >Rate</th>
                  <th >Quantity</th>
                  <th >Total Price</th>
                  <th >Action</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((productOrder, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                      <select
                        value={productOrder.product}
                        onChange={(e) => handleProductChange(e, index)}
                        required
                        disabled={activeSection === 'manufacturer' ? !order.manufacturerId : !order.wholesalerId}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="">
                          {activeSection === 'manufacturer'
                            ? (!order.manufacturerId ? "Select a Manufacturer First" : "Select Product")
                            : (!order.wholesalerId ? "Select a Wholesaler First" : "Select Product")
                          }
                        </option>
                        {productsData.map(product => (
                          <option key={product.product_id} value={product.name}>
                            {product.name} - ₹{product.price_per_unit}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '12px' }}>₹ {productOrder.rate}</td>
                    <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                      <input
                        type="number"
                        min="1"
                        value={productOrder.quantity}
                        onChange={(e) => handleQuantityChange(e, index)}
                        required
                        style={{ width: '80px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '12px' }}>₹ {productOrder.totalPrice}</td>
                    <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveProduct(index)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

              <button 
                type="button"
                onClick={handleAddProduct}
                className="add-product-btn"
              >
                <i className="fas fa-plus"></i>
                Add Product
              </button>

              <div className="order-summary">
                <h3 className="total-amount">
                  Total Amount: ₹ {calculateOverallTotal()}
                </h3>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  <i className="fas fa-check"></i>
                  Submit Order
                </button>
                <button type="button" onClick={handlePrint} className="submit-btn">
                  <i className="fas fa-print"></i>
                  Print Order
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTransaction;