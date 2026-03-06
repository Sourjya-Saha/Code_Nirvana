import React, { useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';

Modal.setAppElement('#root'); // Set the root element for the modal to avoid accessibility issues

const GenerateQRCodeForm = () => {
  const [formData, setFormData] = useState({
    cart_id: '',
    receivers_addressW: '',
    receivers_addressR: '',
    date: '',
    distance: '',
    price_per_unit: '',
    status: '',
  });

  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false); // Modal state

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send POST request to Flask server
      const response = await axios.post('http://localhost:5000/generate_qr', formData, {
        responseType: 'blob', // to receive the image as binary
      });

      // Create a URL from the binary data
      const imageUrl = URL.createObjectURL(new Blob([response.data], { type: 'image/png' }));

      // Set the QR image state to display it
      setQrImage(imageUrl);

      // Close modal after submission
      setModalIsOpen(false);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open the modal
  const openModal = () => {
    setModalIsOpen(true);
  };

  // Close the modal
  const closeModal = () => {
    setModalIsOpen(false);
  };

  // Handle QR code download
  const downloadQrCode = () => {
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = 'QRCode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <button onClick={openModal}>Generate QR</button>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="QR Code Data Form"
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            padding: '20px',
          },
        }}
      >
        <h2>Enter QR Code Data</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Cart ID:</label>
            <input
              type="text"
              name="cart_id"
              value={formData.cart_id}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>Receiver's Address W:</label>
            <input
              type="text"
              name="receivers_addressW"
              value={formData.receivers_addressW}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>Receiver's Address R:</label>
            <input
              type="text"
              name="receivers_addressR"
              value={formData.receivers_addressR}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>Date:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>Distance:</label>
            <input
              type="text"
              name="distance"
              value={formData.distance}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>Price per Unit:</label>
            <input
              type="number"
              name="price_per_unit"
              value={formData.price_per_unit}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label>Status:</label>
            <input
              type="text"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Submit'}
          </button>
          <button type="button" onClick={closeModal} style={{ marginLeft: '10px' }}>
            Cancel
          </button>
        </form>
      </Modal>

      {qrImage && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <h3>Your QR Code:</h3>
          <button onClick={downloadQrCode} style={{ marginTop: '10px' }}>
            Download QR Code
          </button>
          <img src={qrImage} alt="Generated QR Code" style={{ width: '150px', height: '150px' }} />
          <br />
        </div>
      )}
    </div>
  );
};

export default GenerateQRCodeForm;
