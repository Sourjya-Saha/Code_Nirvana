import React, { useState } from 'react';
import axios from 'axios';

const AddPro = () => {
  const [productId, setProductId] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productId) {
      setErrorMessage('Product ID is required.');
      return;
    }

    try {
      // Call the Flask backend endpoint to add the product
      const response = await axios.post('http://127.0.0.1:5000/add_product', {  // Update URL if necessary
        product_id: productId,
      });

      // If successful, set the response message
      setResponseMessage(response.data.message);
      setErrorMessage(''); // Clear any existing error message
      setProductId(''); // Clear the input field

    } catch (error) {
      // Handle error responses from the server
      if (error.response) {
        setErrorMessage(error.response.data.error || 'Failed to add product.');
      } else {
        setErrorMessage('Error: Unable to connect to the server.');
      }
    }
  };

  return (
    <div className="container">
      <h2>Add Product</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="productId">Product ID:</label>
          <input
            type="text"
            id="productId"
            className="form-control"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Add Product
        </button>
      </form>

      {responseMessage && <div className="alert alert-success mt-3">{responseMessage}</div>}
      {errorMessage && <div className="alert alert-danger mt-3">{errorMessage}</div>}
    </div>
  );
};

export default AddPro;
