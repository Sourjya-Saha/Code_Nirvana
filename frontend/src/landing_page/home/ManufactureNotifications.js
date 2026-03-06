import React, { useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import './Notifications.css';
import { Bell, CheckCircle, XCircle } from 'lucide-react';

const ManufacturerNotifications = () => {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Fetch both types of transactions
        const [retailerResponse, wholesalerResponse] = await Promise.all([
          fetch('http://127.0.0.1:5000/get_all_transactions_manu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manu_id: userId }),
          }),
          fetch('http://127.0.0.1:5000/get_all_transactions_whole_for_manu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manu_id: userId }),
          })
        ]);

        const retailerTransactions = await retailerResponse.json();
        const wholesalerTransactions = await wholesalerResponse.json();

        // Process and combine notifications
        const processedRetailerNotifications = retailerTransactions.map(transaction => ({
          ...transaction,
          type: 'retailer',
          icon: transaction.status.toLowerCase() === 'paid' ? 
            <CheckCircle size={24} color="#10B981" /> : 
            <XCircle size={24} color="#EF4444" />,
        }));

        const processedWholesalerNotifications = wholesalerTransactions.map(transaction => ({
          ...transaction,
          type: 'wholesaler',
          icon: transaction.status.toLowerCase() === 'paid' ? 
            <CheckCircle size={24} color="#10B981" /> : 
            <XCircle size={24} color="#EF4444" />,
        }));

        const allNotifications = [...processedRetailerNotifications, ...processedWholesalerNotifications];

        // Filter and sort notifications for today
        const today = new Date();
        const todayNotifications = allNotifications.filter(notification => {
          const notificationDate = new Date(notification.datetime);
          return notificationDate.toDateString() === today.toDateString();
        });

        const sortedNotifications = todayNotifications.sort((a, b) => 
          new Date(b.datetime) - new Date(a.datetime)
        );
        
        setNotifications(sortedNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
      
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);
      
  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusStyle = (status) => ({
    color: status.toLowerCase() === 'paid' ? 'green' : 'red',
    fontWeight: 'bold',
  });

  const getNotificationDetails = (notification) => {
    const typeLabel = notification.type === 'retailer' ? 'Retailer' : 'Wholesaler';
    return (
      <>
        <strong>Order ID :</strong> {notification.order_id} <br />
        <strong>From :</strong> {typeLabel} <br />
        <strong>Status :</strong> <span style={getStatusStyle(notification.status)}>
          {notification.status}
        </span> <br />
        <strong>Amount :</strong> <span style={{ color: 'green', fontWeight: 'bold' }}>
          ₹{notification.total}
        </span><br/>
        <strong>Customer Name :</strong> {notification.customer_name}<br/>
        <strong>Ph No. :</strong> {notification.phone_num}
      </>
    );
  };

  return (
    <div className="notifications-container">
      <div className="notifications-bell" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={24} />
        {notifications.length > 0 && (
          <span className="notification-count">{notifications.length}</span>
        )}
      </div>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button onClick={() => setIsOpen(false)} className='close-model'>Close</button>
          </div>

          {notifications.length === 0 ? (
            <div className="no-notifications">
              <p>No new notifications</p>
            </div>
          ) : (
            <ul className="notifications-list">
              {notifications.map((notification, index) => (
                <li key={index} className="notification-item">
                  <div className="notification-icon">{notification.icon}</div>
                  <div className="notification-content">
                    <p className="notification-details">
                      {getNotificationDetails(notification)}
                    </p>
                    <span className="notification-time">
                      {formatDateTime(notification.datetime)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ManufacturerNotifications;