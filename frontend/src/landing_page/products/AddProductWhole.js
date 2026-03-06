import React, { useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import SideWhole from '../SideWhole';

function AddProductWhole() {
  const { userId } = useAuth();
  const [product, setProduct] = useState({
    name: '',
    category: '',
    exp_date: '',
    price_per_unit: '',
    quantity_of_uom: '',
    shelf_num: '',
    uom_id: '',
    picture_of_the_prod: null,
    description: '',
    user_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (userId) {
      setProduct((prev) => ({ ...prev, user_id: userId }));
    }
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: name === 'quantity_of_uom' || name === 'price_per_unit' ? Number(value) : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setProduct((prev) => ({ ...prev, picture_of_the_prod: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('data', JSON.stringify(product));
    if (product.picture_of_the_prod) {
      formData.append('image', product.picture_of_the_prod);
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/insertProductWhole', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSuccessMessage('Product added to inventory successfully!');
        setProduct({
          name: '', category: '', exp_date: '', price_per_unit: '',
          quantity_of_uom: '', shelf_num: '', picture_of_the_prod: null,
          uom_id: '', description: '', user_id: userId,
        });
        setImagePreview(null);
      } else {
        setErrorMessage('Failed to add product. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Error submitting form: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SideWhole />
      <div className="dashboard-cont">

        {/* Page Header */}
        <div className="page-title-bar">
          <div className="page-title-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="page-title-text">Add to Wholesale Inventory</h1>
        </div>

        {/* Error / Success Toast */}
        {errorMessage && <div className="error-toast">{errorMessage}</div>}
        {successMessage && (
          <div className="success-toast">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {successMessage}
          </div>
        )}

        <div className="product-form-grid">

          {/* Left Column: Basic Info */}
          <div className="grid-card product-form-card">
            <div className="card-header">
              <h2 className="card-title">Basic Information</h2>
              <div className="shimmer-effect"></div>
            </div>
            <div className="form-content">
              <div className="form-group">
                <label>Product Name</label>
                <input className="form-input" type="text" name="name" placeholder="Enter product name" value={product.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input className="form-input" type="text" name="category" placeholder="Enter category" value={product.category} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input className="form-input" type="date" name="exp_date" value={product.exp_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input form-textarea" name="description" placeholder="Enter product description" value={product.description} onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Storage */}
          <div className="grid-card product-form-card">
            <div className="card-header">
              <h2 className="card-title">Pricing & Storage</h2>
              <div className="shimmer-effect"></div>
            </div>
            <div className="form-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Price per Unit (₹)</label>
                  <input className="form-input" type="number" name="price_per_unit" placeholder="0.00" value={product.price_per_unit} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input className="form-input" type="number" name="quantity_of_uom" placeholder="0" value={product.quantity_of_uom} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>UOM ID</label>
                  <input className="form-input" type="number" name="uom_id" placeholder="Unit ID" value={product.uom_id} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Shelf No.</label>
                  <input className="form-input" type="text" name="shelf_num" placeholder="e.g. A1" value={product.shelf_num} onChange={handleChange} required />
                </div>
              </div>

              {/* Image Upload */}
              <div className="form-group">
                <label>Product Image</label>
                <div className="image-upload-zone">
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => { setImagePreview(null); setProduct((p) => ({ ...p, picture_of_the_prod: null })); }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="file-upload" className="upload-label">
                      <div className="upload-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="upload-text">Click to upload image</span>
                      <span className="upload-subtext">PNG, JPG, WEBP up to 10MB</span>
                    </label>
                  )}
                  <input id="file-upload" type="file" name="picture_of_the_prod" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>
              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <button type="button" className="submit-product-btn" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="btn-spinner"></div>
                      <span>Adding Product...</span>
                    </>
                  ) : (
                    <>
                      <div className="register-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Add Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .dashboard-cont {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-left: 110px;
          padding-top: 230px;
          padding-right: 24px;
          min-height: 100vh;
          font-family: 'Poppins', sans-serif;
          background-color: #f8f9fa;
        }
        .page-title-bar { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .page-title-icon {
          width: 40px; height: 40px;
            background: linear-gradient(135deg, #4F46E5, #6366F1);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: white; padding: 8px;
        }
        .page-title-text { font-size: 1.6rem; font-weight: 700; color: #1a1a2e; letter-spacing: 0.02em; margin: 0; }

        .error-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background-color: #ef4444; color: white; padding: 12px 24px;
          border-radius: 8px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1000;
        }
        .success-toast {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          background-color: #10b981; color: white; padding: 12px 24px;
          border-radius: 8px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex; align-items: center; gap: 10px;
          animation: slideDown 0.3s ease, fadeOut 0.3s ease 4s forwards; z-index: 1000;
        }
        .success-toast svg { width: 20px; height: 20px; }
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to   { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; visibility: hidden; } }

        .product-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; }

        .product-form-card {
          background-color: white; border-radius: 12px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08); overflow: hidden;
          display: flex; flex-direction: column;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .product-form-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.12); }

        .card-header {
          padding: 18px 24px; border-bottom: 1px solid #eaeaea;
          display: flex; justify-content: space-between; align-items: center;
       
          color: white; position: relative; overflow: hidden;
        }
        .card-title { font-size: 1.1rem; font-weight: 600; position: relative; z-index: 2; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }

        .shimmer-effect {
          position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 3s infinite; z-index: 1;
        }
        @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }

        .form-content { padding: 24px; flex-grow: 1; display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-weight: 500; color: #4b5563; font-size: 0.875rem; }

        .form-input {
          padding: 11px 14px; border-radius: 8px; border: 1px solid #d1d5db;
          font-size: 0.95rem; font-family: 'Poppins', sans-serif;
          background-color: #f9fafb; transition: all 0.3s ease;
          color: #111827; width: 100%; box-sizing: border-box;
        }
        .form-input:focus {
          outline: none; border-color: #FF6384;
          box-shadow: 0 0 0 3px rgba(255,99,132,0.1); background-color: white;
        }
        .form-textarea { resize: vertical; min-height: 100px; }

        .image-upload-zone {
          border: 2px dashed #d1d5db; border-radius: 10px;
          background: #f9fafb; transition: border-color 0.3s; overflow: hidden;
        }
        .image-upload-zone:hover { border-color: #FF6384; }

        .upload-label {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; text-align: center;
          padding: 28px 16px; cursor: pointer; gap: 8px; width: 100%;
        }
        .upload-text, .upload-subtext { display: block; width: 100%; }
        .upload-text    { font-weight: 600; color: #6327ec; font-size: 0.95rem; }
        .upload-subtext { font-size: 0.78rem; color: #9ca3af; }

        .upload-icon {
          width: 44px; height: 44px;
         background: linear-gradient(135deg, #4F46E5, #6366F1);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          color: white; margin: 0 auto; margin-bottom: 10px;
        }
        .upload-icon svg { width: 20px; height: 20px; display: block; }

        .image-preview-container { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px; }
        .image-preview { width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px; }

        .remove-image-btn {
          background: #ef4444; color: white; border: none;
          padding: 6px 14px; border-radius: 6px; cursor: pointer;
          font-size: 0.85rem; font-family: 'Poppins', sans-serif; transition: background 0.2s;
        }
        .remove-image-btn:hover { background: #dc2626; }

        .form-actions { margin-top: auto; padding-top: 8px; }

        .submit-product-btn {
          background: linear-gradient(135deg, #4F46E5, #6366F1);
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 13px 24px; border-radius: 8px; border: none;
          font-weight: 600; font-size: 1rem; font-family: 'Poppins', sans-serif;
          cursor: pointer; transition: all 0.3s ease;
         color: white;
        }
        .submit-product-btn:hover:not(:disabled) { background-color: #3a2dee; transform: translateY(-2px); }
        .submit-product-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .submit-product-btn:active:not(:disabled) { animation: pulse 0.3s ease; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }

        .register-icon { width: 20px; height: 20px; }
        .btn-spinner {
          width: 18px; height: 18px;
          border: 3px solid rgba(255,255,255,0.4); border-radius: 50%;
          border-top-color: white; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .product-form-grid { grid-template-columns: 1fr; }
          .dashboard-cont { padding-left: 24px; }
        }
        @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}

export default AddProductWhole;