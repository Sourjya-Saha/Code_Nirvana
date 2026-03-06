import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';

const ShowAssignedDrivers = ({ cartId }) => {
  const [showModal, setShowModal] = useState(false);
  const [assignedDrivers, setAssignedDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAssignedDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://127.0.0.1:5000/fetch_drivers_assigned', {
        cart_id: cartId
      });
      setAssignedDrivers([response.data]); // Wrap in array since we get a single driver
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to fetch assigned drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (driverId) => {
    try {
      await axios.post('http://127.0.0.1:5000/delete_assignment', {
        cart_id: cartId,
        driver_id: driverId
      });
      
      // Remove the driver from the list
      setAssignedDrivers([]);
      // Close the modal if no drivers left
      setShowModal(false);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete assignment');
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchAssignedDrivers();
    }
  }, [showModal]);

  return (
    <>
      <button 
        className="assign-driver-btn"
        style={{marginTop:"10px" , backgroundColor:"green"}}
        onClick={() => setShowModal(true)}
      >
        Show Occupied Drivers
      </button>

      {showModal && (
        <div className="assigned-modal-overlay">
          <div className="assigned-modal-content">
            <div className="assigned-modal-header">
              <h2>Assigned Drivers</h2>
              <button 
                className="assigned-close-button"
                onClick={() => setShowModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="assigned-driver-list">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading assigned drivers...</p>
                </div>
              ) : error ? (
                <div className="error-state">
                  <p>{error}</p>
                  <button 
                    className="retry-button"
                    onClick={fetchAssignedDrivers}
                  >
                    Try Again
                  </button>
                </div>
              ) : assignedDrivers.length === 0 ? (
                <div className="empty-state">
                  <p>No drivers currently assigned</p>
                </div>
              ) : (
                assignedDrivers.map(driver => (
                  <div key={driver.generated_unique_id} className="assigned-driver-card">
                    <div className="assigned-driver-info">
                      <div className="assigned-driver-avatar">
                        {driver.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="assigned-driver-details">
                        <h3>{driver.user_name}</h3>
                        <p>Driver ID: {driver.generated_unique_id}</p>
                      </div>
                    </div>
                    <button
                      className="delete-assignment-btn"
                      onClick={() => handleDeleteAssignment(driver.generated_unique_id)}
                    >
                      Delete Assignment
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <style jsx>{`
            .show-assigned-btn {
              width: 100%;
              padding: 12px;
              background: #4a5568;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 1em;
              cursor: pointer;
              transition: all 0.3s ease;
              margin-top: 10px;
            }

            .show-assigned-btn:hover {
              background: #2d3748;
              transform: translateY(-1px);
            }

            .assigned-modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
              backdrop-filter: blur(4px);
            }

            .assigned-modal-content {
              background: white;
              border-radius: 12px;
              width: 90%;
              max-width: 500px;
              max-height: 80vh;
              overflow-y: auto;
              animation: slideUp 0.3s ease-out;
            }

            .assigned-modal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px;
              border-bottom: 1px solid #edf2f7;
            }

            .assigned-modal-header h2 {
              margin: 0;
              font-size: 1.5em;
              color: #2d3748;
            }

            .assigned-close-button {
              background: none;
              border: none;
              color: #718096;
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
              transition: all 0.2s ease;
            }

            .assigned-close-button:hover {
              background: #f7fafc;
              color: #2d3748;
            }

            .assigned-driver-list {
              padding: 20px;
            }

            .loading-state {
              text-align: center;
              padding: 40px 20px;
            }

            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #3182ce;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }

            .error-state {
              text-align: center;
              padding: 40px 20px;
              color: #e53e3e;
            }

            .empty-state {
              text-align: center;
              padding: 40px 20px;
              color: #718096;
            }

            .assigned-driver-card {
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: all 0.2s ease;
            }

            .assigned-driver-card:hover {
              border-color: #3182ce;
              transform: translateY(-2px);
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .assigned-driver-info {
              display: flex;
              align-items: center;
              gap: 16px;
            }
              .assign-driver-btn {
  width: 100%;
  padding: 12px;
  background: #0066CC;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  margin-top:10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

            .assigned-driver-avatar {
              width: 40px;
              height: 40px;
              background: #4299e1;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 1.2em;
            }

            .assigned-driver-details h3 {
              margin: 0;
              color: #2d3748;
              font-size: 1.1em;
            }

            .assigned-driver-details p {
              margin: 4px 0 0;
              color: #718096;
              font-size: 0.9em;
            }

            .delete-assignment-btn {
              padding: 8px 16px;
              background: #e53e3e;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s ease;
              font-size: 0.9em;
            }

            .delete-assignment-btn:hover {
              background: #c53030;
            }

            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(20px);
              }
              to { 
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default ShowAssignedDrivers;