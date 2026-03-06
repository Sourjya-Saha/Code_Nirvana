import React, { useState, useEffect } from 'react';
import { useAuth } from '../user_login/AuthContext';
import './Notifications.css';
import { Bell, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const Notifications = () => {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
    const [manufacturerUsers, setManufacturerUsers] = useState({});

    useEffect(() => {
        const fetchNotifications = async () => {
          try {
            // Fetch manufacturer users first
            const manufacturerUsersResponse = await fetch('http://127.0.0.1:5000/get_manufacturer_users');
            const manufacturerUsersData = await manufacturerUsersResponse.json();
            setManufacturerUsers(manufacturerUsersData);
      
            // Fetch orders
            const ordersResponse = await fetch('http://127.0.0.1:5000/getAllOrders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            });
            const orders = await ordersResponse.json();
      
            // Fetch transactions
            const transactionsResponse = await fetch('http://127.0.0.1:5000/get_all_transactions_retailer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            });
            const transactions = await transactionsResponse.json();
      
            // Combine notifications
            const combinedNotifications = [
              ...orders.map(order => ({
                ...order,
                type: 'order',
                icon: order.status === 'paid' ? <CheckCircle size={24} color="#10B981" /> : <AlertTriangle size={24} color="#EF4444" />,
              })),
              ...transactions.map(transaction => ({
                ...transaction,
                type: 'transaction',
                icon: transaction.status === 'paid' ? <CheckCircle size={24} color="#10B981" /> : <XCircle size={24} color="#EF4444" />,
              })),
            ];
      
            // Filter and sort notifications for today
            const today = new Date();
            const todayNotifications = combinedNotifications.filter(notification => {
              const notificationDate = new Date(Date.parse(notification.datetime));
              return notificationDate.toDateString() === today.toDateString();
            });
      
            const sortedNotifications = todayNotifications.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            setNotifications(sortedNotifications);
          } catch (error) {
            console.error('Error fetching notifications:', error);
          }
        };
      
        if (userId) {
          fetchNotifications();
        }
      }, [userId]);
      
      // Helper function to get manufacturer name
      const getManufacturerName = (manuId) => {
        for (const [username, id] of Object.entries(manufacturerUsers)) {
          if (id === manuId) {
            return username;
          }
        }
        return 'Unknown';
      };
      
  const formatDateTime = (dateTimeString) => {
    const date = new Date(Date.parse(dateTimeString));
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

    const getStatusStyle = (status) => ({
      color: status.toLowerCase() === 'paid' ? 'green' : 'red', // Green for 'Paid', red for 'Unpaid'
      fontWeight: 'bold', // Make it bold for emphasis
    });

  const getNotificationDetails = (notification) => {
    if (notification.type === 'order') {
      return (
        <>
          <strong>Order ID:</strong>&nbsp;&nbsp;{notification.order_id} <br />
          <strong>Status:</strong> <span style={getStatusStyle(notification.status)}>{notification.status}</span>  <br />
          <strong>Amount:</strong> <span style={{ color: 'green', fontWeight: 'bold' }}>₹{notification.total}</span><br/>
          <strong>Customer Name:</strong>&nbsp;&nbsp;{notification.customer_name}
        </>
      );
    }
    if (notification.type === 'transaction') {
      return (
        <>
          <strong>Transaction ID:</strong>  {notification.order_id} <br />
          <strong>Status:</strong><span style={getStatusStyle(notification.status)}>{notification.status}</span>  <br />
          <strong>Amount:</strong> <span style={{ color: 'green', fontWeight: 'bold' }}>₹{notification.total}</span><br/>
          <strong>Manufacturer Name:</strong> &nbsp;{getManufacturerName(notification.manu_id)}
        </>
      );
    }
    return '';
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
                    <p className="notification-details">{getNotificationDetails(notification)}</p>
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

export default Notifications;
