import React, { useState, useEffect } from 'react';
import './warehouse.css'; // Import the CSS file for styling
import { Link, useLocation } from 'react-router-dom';  // Import useLocation to get query params
import Sidebar from '../Sidebar';
import { FaShoppingCart } from 'react-icons/fa';  // Import a cart icon from react-icons
import { AiOutlineClose } from 'react-icons/ai';  // Import a close icon
import { useAuth } from '../user_login/AuthContext';
import { useNavigate } from 'react-router-dom';

const Warehouse = () => {
  const { userId } = useAuth(); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);  // State to store products
  const [cart, setCart] = useState([]);  // New state for the cart
  const [isCartVisible, setIsCartVisible] = useState(false); // State to toggle cart visibility
  const location = useLocation();  // Get current location for query parameters
  const [currentPage, setCurrentPage] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const productsPerPage = 4;

  const handlePageChange = (shelf, pageNumber) => {
    setCurrentPage((prev) => ({ ...prev, [shelf]: pageNumber }));
  };

  // Extract search term from URL query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const term = params.get('search');
    if (term) {
      setSearchTerm(term);
    }
  }, [location.search]);

  // Fetch products from the backend when the component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:5000/getProducts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        });
  
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
  
        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    };
  
    if (userId) {
      fetchProducts();
    }
  }, [userId]);

  if (loading) {
    return (
      <div>
        <div className='load'>
          <div className='loader'>Loading...</div>
        </div>
        <p className='lding'>Loading Your Warehouse....</p>
      </div>
    );
  }

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
  };
  
  const closeModal = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = (product) => {
    const productExists = cart.find((item) => item.product_id === product.product_id);

    if (productExists) {
      setCart(
        cart.map((item) =>
          item.product_id === product.product_id
            ? { ...productExists, quantity: productExists.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (product_id) => {
    setCart(cart.filter((item) => item.product_id !== product_id));
  };

  const handleToggleCart = () => {
    setIsCartVisible(!isCartVisible);
  };

  const handleIncreaseQuantity = (product_id) => {
    setCart(
      cart.map((item) =>
        item.product_id === product_id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const handleDecreaseQuantity = (product_id) => {
    setCart(
      cart.map((item) =>
        item.product_id === product_id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((total, item) => total + item.price_per_unit * item.quantity, 0);

  const handleCheckout = () => {
    const cartData = cart.map(item => ({
      product_id: item.product_id,
      name: item.name,
      price_per_unit: item.price_per_unit,
      quantity: item.quantity,
      description: item.description,
      picture_of_the_prod: item.picture_of_the_prod
    }));

    navigate('/addorders', { 
      state: { 
        cartItems: cartData,
        orderSummary: {
          subTotal: cartTotal,
          convenienceFee: 50,
          deliveryCharge: 100,
          total: cartTotal + 150
        }
      } 
    });
  };

  return (
    <>
      <Sidebar />
      <div className="dash-board">
        <h2 style={{
          fontSize: '35px',
          color: '#333',
          textAlign: 'center',
          margin: '20px 0',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          borderBottom: '2px solid #FF6384',
          paddingBottom: '10px',
          width: 'fit-content',
          marginInline: 'auto',
          marginTop: "85px",
        }}>Warehouse</h2>

        <div className="warehouse">

          {/* Cart Icon and Search Bar */}
          <div className='ecom'>
            <input
              type="text"
              className="search-bar-ecom"
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div className="cart-icon-container">
              <FaShoppingCart className="cart-icon" onClick={handleToggleCart} />
              {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
            </div>
          </div>

          <div>
            <div className="shelf-container">
              {['1', '2', '3', '4', '5'].map((shelf) => {
                const shelfProducts = filteredProducts.filter((product) => product.shelf_num === shelf);
                const totalPages = Math.ceil(shelfProducts.length / productsPerPage);
                const currentShelfPage = currentPage[shelf] || 1;
                const paginatedProducts = shelfProducts.slice(
                  (currentShelfPage - 1) * productsPerPage,
                  currentShelfPage * productsPerPage
                );

                return (
                  <div key={shelf} className="shelf">
                    <h2 className="shelf-name">Shelf {shelf}</h2>
                    <div className="product-list-warehouse">
                      {paginatedProducts.map((product) => {
                        const discountPercentage = Math.floor(Math.random() * 21) + 10;
                        const discountedPrice = (product.price_per_unit * (100 - discountPercentage)) / 100;

                        return (
                          <div key={product.product_id} className="product-card">
                            <div className="discount-banner">{discountPercentage}% OFF</div>
                            <img
                              src={`data:image/jpeg;base64,${product.picture_of_the_prod}`}
                              alt={product.name}
                              className="product-image"
                            />
                            <h3 className="product-name">{product.name}</h3>
                            <p className="manufacturer">{product.description}</p>
                            <p className="price">
                              MRP ₹<span className="original-price">{product.price_per_unit.toFixed(2)}</span>
                            </p>
                            <p className="discounted-price">₹{discountedPrice.toFixed(2)}
                              <button
                                className="eye-button"
                                onClick={() => handleViewDetails(product)}
                              >
                                👁️
                              </button>
                            </p>
                            <div className="product-actions">
                              <button
                                className="add-to-cart-button"
                                onClick={() => handleAddToCart(product)}
                                disabled={product.quantity_of_uom === 0}
                              >
                                {product.quantity_of_uom === 0 ? "Out of Stock" : "Add"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalPages > 1 && (
                      <div className="pagination">
                        {Array.from({ length: totalPages }, (_, index) => (
                          <button
                            key={index}
                            className={`page-button ${currentShelfPage === index + 1 ? "active" : ""}`}
                            onClick={() => handlePageChange(shelf, index + 1)}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Rendering */}
            {selectedProduct && (
              <div className="modal-overlay" onClick={closeModal} style={{ backdropFilter: 'blur(5px)' }}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h2 style={{
                    fontSize: '25px',
                    fontFamily: 'Poppins',
                    color: '#333',
                    textAlign: 'center',
                    margin: '20px 0',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    paddingBottom: '10px',
                    width: 'fit-content',
                    marginInline: 'auto',
                  }}>{selectedProduct.name}</h2>
                  <p>{selectedProduct.description}</p>
                  <p><span style={{ fontWeight: "bold" }}>MRP : </span>₹{selectedProduct.price_per_unit.toFixed(2)}</p>
                  <p><span style={{ fontWeight: "bold" }}>Stock : </span>{selectedProduct.quantity_of_uom}</p>
                  <img
                    src={`data:image/jpeg;base64,${selectedProduct.picture_of_the_prod}`}
                    alt={selectedProduct.name}
                    style={{ width: "100%", borderRadius: "8px", marginTop: "16px" }}
                  />
                  <button className="close-button" style={{ marginRight: "0px" }} onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className={`cart-sidebar ${isCartVisible ? 'visible' : ''}`}>
            <div className="cart-header">
              <h2 style={{
                fontSize: '25px',
                color: '#4169E1',
                textAlign: 'center',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                marginTop: "10px",
                width: 'fit-content',
                marginInline: 'auto',
              }}>Your CART</h2>
              <AiOutlineClose className="close-cart-icon" onClick={handleToggleCart} />
            </div>

            {cart.length === 0 ? (
              <p className="empty-cart-message">Your cart is empty.</p>
            ) : (
              <div className="cart-items-container">
                {cart.map((item) => (
                  <div className="cart-item" key={item.product_id}>
                    <img
                      src={`data:image/jpeg;base64,${item.picture_of_the_prod}`}
                      alt={item.name}
                      className="cart-item-image"
                    />
                    <div className="cart-item-details">
                      <h4 style={{
                        fontSize: "1.3rem",
                        fontWeight: 600,
                        color: "#2d3748",
                        textTransform: "capitalize",
                        letterSpacing: "0.5px",
                        lineHeight: "1.5",
                      }}>
                        {item.name}
                      </h4>

                      <p style={{
                        fontSize: "0.9rem",
                        color: "#4a5568",
                        lineHeight: "1.6",
                        marginBottom: "1rem",
                        textAlign: "justify",
                        letterSpacing: "0.5px",
                        fontFamily: "'Roboto', sans-serif",
                      }}>
                        {item.description}
                      </p>

                      <p className="cart-item-quantity" style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: "1rem",
                        color: "#4a5568",
                        marginBottom: "1rem",
                      }}>
                        <span className="quantity-label" style={{
                          marginRight: "1rem",
                          fontWeight: "500",
                          color: "#2d3748",
                        }}>
                          Quantity
                        </span>
                        <button
                          className="quantity-btn"
                          onClick={() => handleDecreaseQuantity(item.product_id)}
                          style={{
                            backgroundColor: "#e5e7eb",
                            color: "#1f2937",
                            padding: "0.5rem",
                            border: "none",
                            borderRadius: "0.375rem",
                            fontSize: "1.25rem",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease-in-out",
                            margin: "0 0.5rem",
                          }}
                        >
                          -
                        </button>
                        <span className="quantity-value" style={{
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          color: "#2d3748",
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          className="quantity-btn"
                          onClick={() => handleIncreaseQuantity(item.product_id)}
                          style={{
                            backgroundColor: "#e5e7eb",
                            color: "#1f2937",
                            padding: "0.5rem",
                            border: "none",
                            borderRadius: "0.375rem",
                            fontSize: "1.25rem",
                            cursor: "pointer",
                            transition: "background-color 0.2s ease-in-out",
                            margin: "0 0.5rem",
                          }}
                        >
                          +
                        </button>
                      </p>

                      <p className="cart-item-price" style={{
                        fontSize: "1rem",
                        fontWeight: "500",
                        color: "#2d3748",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                      }}>
                        <span className="price-value" style={{
                          fontSize: "1.125rem",
                          fontWeight: "600",
                          color: "#38a169",
                        }}>
                          ₹{(item.price_per_unit * item.quantity).toFixed(2)}
                        </span>
                      </p>
                    </div>

                    <button className="remove-item-btn" aria-label="Remove Item" onClick={() => handleRemoveFromCart(item.product_id)}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="cart-footer">
              <h3 className="cart-total" style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: '20px',
                color: "#333",
                paddingBottom: "10px",
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                borderBottom: "2px solid #28a745",
                marginTop: "10px",
              }}>
                Total:
                <span style={{
                  color: "#28a745",
                  fontWeight: "600",
                  marginLeft: "8px",
                }}>
                  ₹{cartTotal.toFixed(2)}
                </span>
              </h3>
              <button className="checkout-btn" onClick={handleCheckout}>Checkout</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Warehouse;