
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../user_login/AuthContext";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';
import SideWhole from "../SideWhole";
import "./carts.css";
import "./cartmanagement.css";
Modal.setAppElement('#root');

const CartWhole = () => {
  const { userId } = useAuth();
  const [products, setProducts] = useState([
    { 
      product_id: "", 
      cartSelections: [],
    }
  ]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [cartData, setCartData] = useState([]);
  const [selectedCart, setSelectedCart] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [cartId, setCartId] = useState("");
  const [cartList, setCartList] = useState([]);
  const [scannedCartIds, setScannedCartIds] = useState(new Set());
  const [scanningSingleCart, setScanningSingleCart] = useState(null);
  const [error, setError] = useState("");
  const [usedCartIds, setUsedCartIds] = useState(new Set());
  const [activeSection, setActiveSection] = useState('create');
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orderId, setOrderId] = useState(null);
  // New states for QR code generation
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    cart_id: '',
    // receivers_addressM: '',
    receivers_addressW: '',
    receivers_addressR: '',
    date: '',
  });

  // Add this to the existing useEffect in CartWhole
// Modified useEffect
// Modified useEffect
// First, update the useEffect

// Modified useEffect
useEffect(() => {
  const loadInitialData = async () => {
    if (userId) {
      try {
        setIsLoading(true);
        console.log("Starting initial data load");
        
        // Fetch available products
        const response = await axios.post('http://localhost:5000/getProductsWhole', {
          user_id: userId
        });
        setAvailableProducts(response.data);

        // Check for pending products and order_id
        const pendingProducts = localStorage.getItem('pendingCartProducts');
        const pendingOrderId = localStorage.getItem('pendingOrderId');
        
        console.log("Pending order ID:", pendingOrderId);
        
        if (pendingOrderId) {
          setOrderId(parseInt(pendingOrderId));
        }

        if (pendingProducts && response.data.length > 0) {
          const parsedProducts = JSON.parse(pendingProducts);
          console.log("Parsed pending products:", parsedProducts);
          setActiveSection('create');
          
          // Initialize products array with parsed quantities
          const initialProducts = parsedProducts.map(product => ({
            product_id: product.product_id.toString(),
            cartSelections: [],
            quantity: parseInt(product.quantity),
            originalQuantity: parseInt(product.quantity)
          }));
          
          setProducts(initialProducts);
          
          // Process each product to set up cart selections
          const updatedProducts = [...initialProducts];
          initialProducts.forEach((product, index) => {
            const selectedProduct = response.data.find(
              p => p.product_id.toString() === product.product_id.toString()
            );
            
            if (selectedProduct) {
              console.log("Processing product:", selectedProduct.name, "with quantity:", product.quantity);
              const processedProduct = processProductSelection(
                index, 
                product.product_id.toString(), 
                product.quantity, 
                selectedProduct
              );
              updatedProducts[index] = processedProduct;
            }
          });
          
          // Update products state with processed products
          setProducts(updatedProducts);
          
          // Update cart list after processing all products
          const allCartIds = new Set();
          updatedProducts.forEach(product => {
            product.cartSelections?.forEach(selection => {
              if (selection.quantity > 0) {
                allCartIds.add(selection.cart_id);
              }
            });
          });
          setCartList(Array.from(allCartIds));

          // Clean up localStorage
          localStorage.removeItem('pendingCartProducts');
          localStorage.removeItem('pendingOrderId');
        }
      } catch (error) {
        console.error('Error in loadInitialData:', error);
        toast.error('Failed to load products. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  loadInitialData();
}, [userId]);
const processProductSelection = (index, productId, requiredQuantity, selectedProduct) => {
  console.log("Processing selection for product:", selectedProduct.name);
  let cartSelections = [];
  
  // Parse reference cart data
  if (selectedProduct.reference_cart && selectedProduct.reference_cart !== '{}') {
    try {
      const parsedReference = JSON.parse(selectedProduct.reference_cart);
      const carts = Object.values(parsedReference);
      
      if (!carts[0]?.cart_id) {
        // Handle stock item case
        cartSelections = [{
          cart_id: `stock_${productId}`,
          exp_date: selectedProduct.exp_date,
          quantity: requiredQuantity,
          max_quantity: selectedProduct.quantity_of_uom,
          visible: true,
          requires_scanning: false
        }];
      } else {
        // Handle reference carts
        let remainingQuantity = requiredQuantity;
        cartSelections = carts.map(cart => {
          const cartQuantity = Math.min(remainingQuantity, cart.quantity);
          remainingQuantity -= cartQuantity;
          
          return {
            cart_id: cart.cart_id,
            exp_date: cart.exp_date || selectedProduct.exp_date,
            quantity: cartQuantity,
            max_quantity: cart.quantity,
            visible: true,
            requires_scanning: true
          };
        });
      }
    } catch (error) {
      console.error('Error processing reference cart:', error);
      cartSelections = [{
        cart_id: `stock_${productId}`,
        exp_date: selectedProduct.exp_date,
        quantity: requiredQuantity,
        max_quantity: selectedProduct.quantity_of_uom,
        visible: true,
        requires_scanning: false
      }];
    }
  }

  // Return processed product
  const processedProduct = {
    product_id: productId,
    cartSelections: cartSelections,
    quantity: requiredQuantity,
    originalQuantity: requiredQuantity,
    productDetails: {
      name: selectedProduct.name,
      category: selectedProduct.category,
      description: selectedProduct.description,
      uom_name: selectedProduct.uom_name,
      shelf_num: selectedProduct.shelf_num,
      price_per_unit: selectedProduct.price_per_unit
    }
  };

  console.log("Processed product result:", {
    name: selectedProduct.name,
    quantity: requiredQuantity,
    cartSelections: cartSelections
  });

  return processedProduct;
};
 // Modified fetchProducts function
 const fetchProducts = async () => {
  try {
    const response = await axios.post('http://localhost:5000/getProductsWhole', {
      user_id: userId
    });
    
    if (response.data) {
      setAvailableProducts(response.data);
      return response.data;
    } else {
      throw new Error('No products data received');
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    toast.error("Failed to fetch products. Please try again.");
    throw error;
  }
};
const fetchCartData = async () => {
  try {
    const response = await axios.post('http://localhost:5000/getCartsWhole', {
      user_id: userId
    });
    console.log("Cart data", response)
    setCartData(response.data);
  } catch (error) {
    console.error("Error fetching cart data:", error);
    toast.error("Failed to fetch cart data");
  }
};

// Add useEffect to fetch cart data when component mounts and when activeSection changes to 'list'
useEffect(() => {
  if (userId && activeSection === 'list') {
    fetchCartData();
  }
}, [userId, activeSection]);

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`http://localhost:5000/deleteCartWhole/${id}`, {
        params: { user_id: userId }
      });
      if (response.status === 200 && response.data.success) {
        const newCarts = cartData.filter((cart) => cart.cart_id !== id);
        setCartData(newCarts);
        toast.success(`Cart ${id} deleted successfully`);
      } else {
        toast.error('Failed to delete Cart');
      }
    } catch (err) {
      console.error("Error deleting cart:", err);
      toast.error(`Failed to delete Cart ${id}`);
    }
  };

  const handleViewCart = (id) => {
    const selectedCartData = cartData.find(cart => cart.cart_id === id);
    if (selectedCartData) {
      setSelectedCart(selectedCartData);
      setModalVisible(true);
    } else {
      toast.error("Cart not found");
    }
  };

  // QR Code Generation Functions
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleQrSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const addresses = [
      // formData.receivers_addressM,
      formData.receivers_addressW,
      formData.receivers_addressR
    ];

    const hasDuplicates = addresses.some((addr, index) => 
      addresses.slice(0, index).concat(addresses.slice(index + 1)).includes(addr)
    );

    if (hasDuplicates) {
      setError('Error: All addresses must be unique.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/generate_qr', formData, {
        responseType: 'blob'
      });

      if (response.status === 200) {
        const imageUrl = URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));
        setQrImage(imageUrl);
        setQrModalVisible(false);
      } else {
        setError('Unexpected server response');
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const openQrModal = async (cartId) => {
    const selectedCartData = cartData.find(cart => cart.cart_id === cartId);
    if (selectedCartData) {
      const totalPrice = selectedCartData.products?.reduce(
        (sum, p) => sum + (p.price_per_unit * p.quantity), 
        0
      );
  
      // Initialize form data with cart ID and price
      setFormData(prevState => ({
        ...prevState,
        cart_id: cartId,
        price_per_unit: totalPrice.toString()
      }));
  
      // Fetch addresses from the API
      try {
        const response = await axios.post('http://localhost:5000/get_meta_add_for_qr_whole', {
          cart_id: cartId
        });
  
        // Update form data with fetched addresses
        setFormData(prevState => ({
          ...prevState,
          receivers_addressW: response.data.wholesaler || '',
          receivers_addressR: response.data.retailer || ''
        }));
  
      } catch (error) {
        console.error('Error fetching addresses:', error);
        toast.error('Failed to fetch wallet addresses');
      }
    }
    setQrModalVisible(true);
  };

  const downloadQrCode = () => {
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = 'QRCode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Original Cart Management Functions
  const handleAddProduct = () => {
    setProducts([...products, { product_id: "", cartSelections: [] }]);
  };

  const handleRemoveProduct = (index) => {
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
    
    const newCartList = new Set();
    newProducts.forEach(product => {
      product.cartSelections?.forEach(selection => {
        if (selection.quantity > 0) {
          newCartList.add(selection.cart_id);
        }
      });
    });
    setCartList(Array.from(newCartList));
  };

  // 1. Add this helper function at the top level of your component
const isStockItem = (cartId) => cartId.startsWith('stock_');

// Modify handleProductChange to better handle errors
const handleProductChange = (index, field, value) => {
  if (isLoading) return; // Don't process if still loading

  const newProducts = [...products];
  
  if (field === "product_id") {
    const selectedProduct = availableProducts.find(p => p.product_id.toString() === value);
    
    if (!selectedProduct) {
      toast.error('Product not found in available products');
      return;
    }
    
    try {
      let cartSelections = [];
      let hasValidReferenceCart = false;

      // Handle reference cart if it exists
      if (selectedProduct.reference_cart && selectedProduct.reference_cart !== '{}') {
        try {
          const parsedReference = JSON.parse(selectedProduct.reference_cart);
          const firstCartHasNullId = parsedReference["0"]?.cart_id === null;
          
          if (!firstCartHasNullId) {
            hasValidReferenceCart = true;
            cartSelections = Object.entries(parsedReference)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([_, cart]) => cart)
              .filter(cart => cart.quantity > 0)
              .map((cart, idx) => ({
                cart_id: cart.cart_id,
                exp_date: cart.exp_date || selectedProduct.exp_date,
                quantity: 0,
                max_quantity: cart.quantity,
                visible: true, // Make all carts visible initially
                requires_scanning: true
              }));
          }
        } catch (e) {
          console.error('Error parsing reference cart:', e);
          hasValidReferenceCart = false;
        }
      }

      // Create stock entry if no valid reference carts
      if (!hasValidReferenceCart || cartSelections.length === 0) {
        cartSelections = [{
          cart_id: `stock_${selectedProduct.product_id}`,
          exp_date: selectedProduct.exp_date,
          quantity: 0,
          max_quantity: selectedProduct.quantity_of_uom > 0 ? selectedProduct.quantity_of_uom : 0,
          visible: true,
          requires_scanning: false
        }];
      }

      // Get original quantity to distribute
      const originalQuantity = newProducts[index].originalQuantity || newProducts[index].quantity || 0;
      let remainingQuantity = originalQuantity;

      // Distribute quantity across carts
      cartSelections.forEach((selection) => {
        if (remainingQuantity > 0) {
          const quantityForThisCart = Math.min(remainingQuantity, selection.max_quantity);
          selection.quantity = quantityForThisCart;
          remainingQuantity -= quantityForThisCart;

          // Add to cartList if quantity is assigned
          if (quantityForThisCart > 0) {
            setCartList(prev => Array.from(new Set([...prev, selection.cart_id])));
          }
        }
      });

      // Update the product with all information
      newProducts[index] = {
        ...newProducts[index],
        product_id: value,
        cartSelections: cartSelections,
        productDetails: {
          name: selectedProduct.name,
          category: selectedProduct.category,
          description: selectedProduct.description,
          uom_name: selectedProduct.uom_name,
          shelf_num: selectedProduct.shelf_num,
          price_per_unit: selectedProduct.price_per_unit
        }
      };
    } catch (error) {
      console.error("Error in product selection:", error);
      toast.error("Error selecting product. Please try again.");
      return;
    }
  } else if (field === "cart_quantity") {
    const [cartId, cartQuantity] = value.split('|');
    const cartIndex = newProducts[index].cartSelections.findIndex(c => c.cart_id === cartId);
    
    if (cartIndex !== -1) {
      const newQuantity = parseInt(cartQuantity);
      const currentCart = newProducts[index].cartSelections[cartIndex];
      
      // Update quantity with validation
      currentCart.quantity = Math.min(Math.max(0, newQuantity), currentCart.max_quantity);
      
      // Show next cart if current is maxed out
      if (currentCart.quantity >= currentCart.max_quantity) {
        if (cartIndex < newProducts[index].cartSelections.length - 1) {
          newProducts[index].cartSelections[cartIndex + 1].visible = true;
        }
      } else {
        // Hide subsequent carts if current is not maxed
        for (let i = cartIndex + 1; i < newProducts[index].cartSelections.length; i++) {
          newProducts[index].cartSelections[i].visible = false;
          newProducts[index].cartSelections[i].quantity = 0;
        }
      }
      
      // Update cart list
      const allSelectedCarts = new Set();
      newProducts.forEach(product => {
        product.cartSelections?.forEach(selection => {
          if (selection.quantity > 0) {
            allSelectedCarts.add(selection.cart_id);
          }
        });
      });
      setCartList(Array.from(allSelectedCarts));
    }
  }
  
  setProducts(newProducts);
};
const handleAddCart = async () => {
  const physicalCarts = cartList.filter(cartId => !isStockItem(cartId));
  
  if (physicalCarts.length > 0 && scannedCartIds.size !== physicalCarts.length) {
    toast.error("Please validate all physical cart IDs before creating the cart");
    return;
  }

  const flattenedProducts = [];
  products.forEach(product => {
    product.cartSelections.forEach(selection => {
      if (selection.quantity > 0) {
        flattenedProducts.push({
          product_id: parseInt(product.product_id),
          quantity: selection.quantity
        });
      }
    });
  });

  const cartData = {
    cart_id: cartId,
    user_id: userId,
    cart_list: cartList,
    products: flattenedProducts,
    order_id: orderId // Include the order_id in the request
  };

  try {
    await axios.post("http://localhost:5000/add_to_cart_whole", cartData);
    toast.success(`Cart ${cartId} created successfully!`);
    fetchCartData();
    // Reset form
    setProducts([{ product_id: "", cartSelections: [] }]);
    setCartList([]);
    setScannedCartIds(new Set());
    setCartId("");
    setOrderId(null); // Reset the order_id
  } catch (error) {
    console.error("Error creating cart:", error);
    toast.error("Failed to create cart");
  }
};

  const generateRandomCartId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setCartId(result);
  };
  
  const startScanningIndividual = async (cartId) => {
    setScanningSingleCart(cartId);
    try {
      const response = await axios.get('http://localhost:5000/scan_qr');
      const scannedId = response.data.qr_data.cart_id;
      
      if (scannedId === cartId) {
        setScannedCartIds(prev => new Set([...prev, scannedId]));
        toast.success(`Validated cart ID: ${scannedId}`);
      } else {
        toast.error(`Scanned QR code (${scannedId}) does not match expected cart ID (${cartId})`);
      }
    } catch (error) {
      console.error("Error scanning QR code:", error);
      toast.error("Failed to scan QR code");
    } finally {
      setScanningSingleCart(null);
    }
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedCart(null);
  };
  return (
    <>
    <div className="dash-board">
    <SideWhole />
    <ToastContainer />
    <div className="cart-management-container">
      {/* Header Section */}
      <div className="cart-header">
        <h1 className="cart-title-cart">Cart Management</h1>
        <p className="cart-subtitle">Streamline your inventory workflow</p>
      </div>

      {/* Navigation Tabs */}
      <div className="cart-nav">
        <button
          className={`cart-nav-btn ${activeSection === 'create' ? 'active' : ''}`}
          onClick={() => setActiveSection('create')}
        >
          <i className="fas fa-cart-plus"></i>
          Create Cart
        </button>
        <button
          className={`cart-nav-btn ${activeSection === 'list' ? 'active' : ''}`}
          onClick={() => setActiveSection('list')}
        >
          <i className="fas fa-list"></i>
          View Carts
        </button>
      </div>

      {/* Create Cart Section */}
      {activeSection === 'create' && (
        <div className="create-cart-section">
          <div className="cart-id-container">
            <div className="cart-id-input-group">
              <input
                type="text"
                value={cartId}
                onChange={(e) => setCartId(e.target.value)}
                className="cart-input"
                placeholder="Enter cart ID"
              />
              <button 
                onClick={generateRandomCartId}
                className="generate-btn"
              >
                <i className="fas fa-random"></i>
                Generate ID
              </button>
            </div>
          </div>

          <div className="product-grid">
            {products.map((product, index) => (
              <div key={index} className="product-card">
                <div className="product-header">
                  <select
                    value={product.product_id}
                    onChange={(e) => handleProductChange(index, "product_id", e.target.value)}
                    className="product-select"
                    disabled 
                  >
                    <option value="">Select Product</option>
                    {availableProducts.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} - ₹{p.price_per_unit}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveProduct(index)}
                    className="delete-btn"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>

                {/* Cart Selections */}
                {product.cartSelections?.length > 0 && (
                  <div className="cart-selections">
                    <h4 className="selections-title">Available Carts</h4>
                    {product.cartSelections
                      .filter(selection => selection.visible)
                      .map((selection, selIndex) => (
                        <div key={selIndex} className="selection-card">
                          <div className="selection-info">
                            <span className="info-label">
                              <i className="fas fa-shopping-cart"></i>
                              {selection.cart_id}
                              </span>
                              <span className="info-label">
                                <i className="fas fa-calendar"></i>
                                {selection.exp_date}
                              </span>
                              <span className="info-label">
                                <i className="fas fa-box"></i>
                                {selection.max_quantity} available
                              </span>
                            </div>
                            <input
                              type="number"
                              value={selection.quantity}
                              onChange={(e) => handleProductChange(
                                index,
                                "cart_quantity",
                                `${selection.cart_id}|${e.target.value}`
                              )}
                              min="0"
                              max={selection.max_quantity}
                              className="quantity-input"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={handleAddProduct}
              className="add-product-btn"
            >
              <i className="fas fa-plus"></i>
              Add Product
            </button>

            {/* Cart Validation Section */}
            <div className="cart-validation-section">
  <h3 className="validation-title">Validate Cart IDs</h3>
  <div className="cart-validation-list">
    {cartList.map((id, index) => (
      <div key={index} className="validation-item">
        <div className="validation-status">
          <i 
            className={`fas ${isStockItem(id) || scannedCartIds.has(id) ? 'fa-check-circle' : 'fa-circle'}`}
            style={{
              color: isStockItem(id) || scannedCartIds.has(id) ? 'var(--success-color)' : 'var(--danger-color)'
            }}
          ></i>
          <span className="cart-id-text">
            {isStockItem(id) ? `${id} (Stock Item)` : id}
          </span>
        </div>
        {!isStockItem(id) && (
          <button
            onClick={() => startScanningIndividual(id)}
            disabled={scannedCartIds.has(id)}
            className={`scan-btn ${scannedCartIds.has(id) ? 'disabled' : ''}`}
          >
            <i className="fas fa-qrcode"></i>
            Scan QR
          </button>
        )}
      </div>
    ))}
  </div>
</div>
<div className="create_cart">
  <button 
    onClick={handleAddCart}
    className="generate-btn"
    disabled={
      !cartId || 
      products[0].product_id === "" || 
      (cartList.some(id => !isStockItem(id)) && 
       scannedCartIds.size !== cartList.filter(id => !isStockItem(id)).length)
    }
  >
    Create Cart
  </button>
</div>
          </div>
        )}

        {/* Cart List Section */}
        {activeSection === 'list' && (
          <div className="cart-list-section">
            {cartData.map((cart) => (
              <div key={cart.cart_id} className="cart-item-card">
                <div className="cart-item-header">
                  <h3 className="cart-item-title">Cart {cart.cart_id}</h3>
                  <div className="cart-actions" style={{display:"flex" , marginTop:"15px"}}>
                    <button
                      onClick={() => handleViewCart(cart.cart_id)}
                      className="action-btn view-btn"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(cart.cart_id)}
                      className="action-btn delete-btn"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                    <button
                      onClick={() => openQrModal(cart.cart_id)}
                      className="action-btn qr-btn"
                    >
                      <i className="fas fa-qrcode"></i>
                    </button>
                  </div>
                </div>
                <div className="cart-item-content">
                  <div className="cart-item-stat">
                    <span className="cart-item-label">Total Items</span>
                    <span className="cart-item-value">
                      {cart.products?.reduce((sum, p) => sum + p.quantity, 0) || 0}
                    </span>
                  </div>
                  <div className="cart-item-stat">
                    <span className="cart-item-label">Total Amount</span>
                    <span className="cart-item-value">
                      ₹{cart.products?.reduce((sum, p) => 
                        sum + (p.price_per_unit * p.quantity), 0
                      ).toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Cart Modal */}
        <Modal
          isOpen={modalVisible}
          onRequestClose={closeModal}
          className="cart-modal"
          overlayClassName="modal-overlay"
        >
          {selectedCart && (
            <div className="modal-content">
              <h2 className="modal-title">Cart Details</h2>
              <div className="modal-body">
                <p className="cart-id">Cart ID: {selectedCart.cart_id}</p>
                <div className="product_details">
                {selectedCart.products?.map((product, index) => (
                  
                    <div key={index} className="modal-product">
                    <h4 className="product-name">{product.name}</h4>
                    <span>Quantity: {product.quantity}</span>
                        <span>Price: ₹{product.price_per_unit}</span>
                        <span>Total: ₹{(product.quantity * product.price_per_unit).toFixed(2)}</span>

                  </div>
                  
                ))}
                </div>
                <div className="modal-summary">
                  <div className="summary-item">
                    <span>Total Items:</span>
                    <span>{selectedCart.products?.reduce((sum, p) => sum + p.quantity, 0) || 0}</span>
                  </div>
                  <div className="summary-item">
                    <span>Total Amount:</span>
                    <span>₹{selectedCart.products?.reduce((sum, p) => 
                      sum + (p.price_per_unit * p.quantity), 0
                    ).toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
              <button onClick={closeModal} className="modal-close">
                Close
              </button>
            </div>
          )}
        </Modal>

        {/* QR Code Modal */}
        <Modal
  isOpen={qrModalVisible}
  onRequestClose={() => setQrModalVisible(false)}
  className="cart-modal"
  overlayClassName="modal-overlay"
>
  <div className="modal-content">
    <h2 className="modal-title">Generate QR Code</h2>
    {error && <div className="error-message">{error}</div>}
    
    <form onSubmit={handleQrSubmit} className="qr-form">
      <div className="form-group">
        <label>Cart ID:</label>
        <input
          type="text"
          name="cart_id"
          value={formData.cart_id}
          readOnly
          className="form-input readonly"
        />
      </div>

      <div className="form-group">
        <label>Wholesaler Address:</label>
        <input
          type="text"
          name="receivers_addressW"
          value={formData.receivers_addressW}
          onChange={handleFormChange}
          required
          className="form-input"
          placeholder="Enter wholesaler's address"
        />
      </div>

      <div className="form-group">
        <label>Retailer Address:</label>
        <input
          type="text"
          name="receivers_addressR"
          value={formData.receivers_addressR}
          onChange={handleFormChange}
          required
          className="form-input"
          placeholder="Enter retailer's address"
        />
      </div>

      <div className="form-group">
        <label>Date:</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleFormChange}
          required
          className="form-input"
        />
      </div>

      <div className="modal-actions">
        <button type="submit" className="submit-btn">
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>
        <button 
          type="button" 
          onClick={() => setQrModalVisible(false)}
          className="cancel-btn"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</Modal>

        {/* QR Code Display */}
        {qrImage && (
          <div className="qr-display">
          <h3
  className="qr-title"
  style={{
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: '30px',
    padding: '15px 30px',
    background: 'linear-gradient(45deg, #6a11cb, #2575fc)', // Gradient background
    borderRadius: '12px',
    boxShadow: '0 8px 15px rgba(0, 0, 0, 0.2)',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)', // Adding text shadow for a glowing effect
    transition: 'transform 0.3s ease, background 0.3s ease', // Smooth transformation on hover
  }}
  onMouseEnter={(e) => {
    e.target.style.transform = 'scale(1.05)'; // Slightly enlarge on hover
    e.target.style.background = 'linear-gradient(45deg, #2575fc, #6a11cb)'; // Reverse gradient on hover
  }}
  onMouseLeave={(e) => {
    e.target.style.transform = 'scale(1)';
    e.target.style.background = 'linear-gradient(45deg, #6a11cb, #2575fc)'; // Reset gradient
  }}
>
  Generated QR Code
</h3>


            <div className="qr-image-container">
              <img 
                src={qrImage} 
                alt="QR Code" 
                className="qr-image"
              />
            </div>
            <button 
              onClick={downloadQrCode}
              className="download-btn"
            >
              <i className="fas fa-download"></i>
              Download QR Code
            </button>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

  export default CartWhole;