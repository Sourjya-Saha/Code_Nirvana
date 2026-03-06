import React, { useState, useEffect } from 'react';

import './Dashboards.css';


function Dash() {
  const [productsData, setProductsData] = useState([]);
  const [cartData, setCartData] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsResponse = await fetch('http://127.0.0.1:5000/getProductsManu');
        const products = await productsResponse.json();
        setProductsData(products);

        // Fetch cart data
        const cartsResponse = await fetch('http://127.0.0.1:5000/getCartsManu');
        const carts = await cartsResponse.json();
        setCartData(carts);

   
      } catch (error) {
        console.error('Error fetching data:', error);
       
      }
    };

    fetchData();
  }, []);

 

  // Calculate metrics
  const totalProducts = productsData.length;
  const totalCarts = cartData.length;
  const totalInventoryValue = productsData.reduce((acc, product) => {
    return acc + (product.price_per_unit * product.quantity_of_uom);
  }, 0);

  return (
    <>
        <div className="dashboard-metrics">
          <div className="metric-card">
            <h2>{totalProducts}</h2>
            <p>Number of Products</p>
          </div>
          <div className="metric-card">
            <h2>{totalCarts}</h2>
            <p>Number of Carts</p>
          </div>
          <div className="metric-card">
            <h2>&#x20b9;{totalInventoryValue.toFixed(2)}</h2>
            <p>Total Value of Inventory</p>
          </div>
        </div>
       
    </>
  );
}

export default Dash;
