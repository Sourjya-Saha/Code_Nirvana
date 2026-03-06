import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Send, X, UserCircle, Clock, CheckCircle } from 'lucide-react';

const ChatComponent = ({ userId, cartId, role }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messageQueue = useRef(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRoleColor = (role) => {
    const roleColors = {
      manufacturer: '#4f46e5',
      wholesaler: '#059669',
      retailer: '#db2777',
      driver: '#d97706',
      distributor: '#7c3aed',
    };
    return roleColors[role] || '#6b7280';
  };

  // Initialize socket connection immediately, not dependent on isOpen
  useEffect(() => {
    console.log('Initializing socket with:', { userId, cartId, role });
    
    const newSocket = io('http://localhost:8000', {
      query: { user_id: userId, cart_id: cartId, role },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      newSocket.emit('request-chat-history', { cart_id: cartId });
    });

    newSocket.on('chat-history', (data) => {
      console.log('Received chat history:', data);
      if (data?.history) {
        setMessages(data.history);
        messageQueue.current.clear();
        data.history.forEach(msg => {
          messageQueue.current.add(`${msg.sender_id}-${msg.timestamp}`);
        });
      }
    });

    newSocket.on('new-message', (message) => {
      console.log('New message received:', message);
      const messageId = `${message.sender_id}-${message.timestamp}`;
      if (!messageQueue.current.has(messageId)) {
        messageQueue.current.add(messageId);
        setMessages(prev => [...prev, message]);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup only on component unmount
    return () => {
      console.log('Component unmounting, cleaning up socket');
      newSocket.disconnect();
    };
  }, [userId, cartId, role]); // Don't depend on isOpen anymore

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !socket) return;

    console.log('Sending message:', {
      cart_id: cartId,
      content: messageInput.trim()
    });

    socket.emit('send-message', {
      cart_id: cartId,
      content: messageInput.trim()
    });

    setMessageInput('');
    setCharCount(0);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    if (input.length <= 200) {
      setMessageInput(input);
      setCharCount(input.length);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const isNewDay = (message, index) => {
    if (index === 0) return true;
    const currentDate = new Date(message.timestamp).toDateString();
    const prevDate = new Date(messages[index - 1].timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const isUserMessage = (message) => {
    // Check if the message is from the current user
    return message.sender_id === userId || message.role === role;
  };

  return (
    <>
      <button className="chat-button" onClick={() => setIsOpen(true)}>
        <MessageCircle size={24} />
        <span>Chat Room</span>
        {messages.length > 0 && <div className="message-badge">{messages.length}</div>}
      </button>

      {isOpen && (
        <div className="chat-wrapper">
          <div className="chat-container">
            <div className="chat-header">
              <div className="header-content">
                <h3>Shipment Chat Room</h3>
                <span className={`connection-status ${isConnected ? 'connected' : ''}`}>
                  {isConnected ? 'Connected' : 'Reconnecting...'}
                </span>
              </div>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="messages-container" onClick={() => document.querySelector('textarea').focus()}>
              {messages.map((message, index) => (
                <React.Fragment key={`${message.sender_id}-${message.timestamp}`}>
                  {isNewDay(message, index) && (
                    <div className="date-divider">
                      <span>{new Date(message.timestamp).toLocaleDateString([], { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric'
                      })}</span>
                    </div>
                  )}
                  <div className={`message ${isUserMessage(message) ? 'sent' : 'received'}`}>
                    <div className="message-header">
                      <div className="sender-info">
                        <div className="avatar" style={{ backgroundColor: getRoleColor(message.role) }}>
                          {message.sender_name ? message.sender_name[0].toUpperCase() : '?'}
                        </div>
                        <span className="sender-name">{message.sender_name || 'User'}</span>
                        <span className="sender-role" style={{ color: getRoleColor(message.role) }}>
                          {message.role}
                        </span>
                      </div>
                    </div>
                    <div className="message-content">{message.content}</div>
                    <div className="message-footer">
                      <Clock size={12} />
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                      {isUserMessage(message) && <CheckCircle size={12} className="message-status" />}
                    </div>
                  </div>
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
              <textarea
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                maxLength={200}
              />
              <div className="input-footer">
                <span className="char-count">{charCount}/200</span>
                <button 
                  className="send-button"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
         .chat-wrapper {
         position:fixed;
          bottom: 20px;
          right: -5px;
          top:-10px;
        width:509px;
        height: 70vh;
          z-index: 10000;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .chat-button {
          display: flex;
          width:100%;
          justify-content: center; 
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                     0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
          position:relative;
          margin-bottom:10px;
        }

        .chat-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.15);
        }

        .message-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .chat-container {
          width: 510px;
          height: 700px;
          background: white;
           height: 68vh;
          border-radius: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
                     0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .chat-header {
          padding: 20px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .connection-status {
          font-size: 12px;
          opacity: 0.8;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .connection-status.connected::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
        }

        .close-button {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .messages-container {
          flex: 1;
          
  max-height: calc(100% - 180px);

          padding: 20px;
          overflow-y: auto;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .date-divider {
          text-align: center;
          margin: 20px 0;
          position: relative;
        }

        .date-divider span {
          background: #f3f4f6;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .message {
          max-width: 85%;
          position: relative;
          animation: messageAppear 0.3s ease-out;
        }

        .message.sent {
          margin-left: auto;
        }

        .message-header {
          margin-bottom: 4px;
        }

        .sender-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .sender-name {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
        }

        .sender-role {
          font-size: 12px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 12px;
          background: #f3f4f6;
        }

        .message-content {
          background: #f3f4f6;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          color: #1f2937;
          margin: 4px 0;
          position: relative;
          overflow: hidden;
        }

        .message.sent .message-content {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .message-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .message-time {
          font-size: 11px;
        }

        .message-status {
          color: #22c55e;
        }

        .chat-input {
          padding: 20px;
          background: white;
          border-top: 1px solid #e5e7eb;
        }

        textarea {
          width: 100%;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          resize: none;
          height: 100px;
          font-size: 14px;
          font-family: inherit;
          background: #f9fafb;
          transition: all 0.2s ease;
        }

        textarea:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }

        .char-count {
          font-size: 12px;
          color: #6b7280;
        }

        .send-button {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          border-radius: 12px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .send-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #e5e7eb;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: #c5c5c5;
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        .connection-status:not(.connected) {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default ChatComponent;