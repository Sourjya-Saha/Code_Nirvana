import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

const ChatComponent = ({ userId, cartId, role, onClose }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const scrollViewRef = useRef(null);
  const messageQueue = useRef(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const getRoleColor = (role) => {
    const roleColors = {
      manufacturer: '#818cf8',
      wholesaler: '#34d399',
      retailer: '#f472b6',
      driver: '#fbbf24',
      distributor: '#a78bfa',
    };
    return roleColors[role] || '#9ca3af';
  };

  useEffect(() => {
    console.log('Initializing socket with:', { userId, cartId, role });
    
    const newSocket = io('http://172.20.10.5:8000', {
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

    return () => {
      console.log('Component unmounting, cleaning up socket');
      newSocket.disconnect();
    };
  }, [userId, cartId, role]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

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

  const handleInputChange = (text) => {
    if (text.length <= 200) {
      setMessageInput(text);
      setCharCount(text.length);
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
    return message.sender_id === userId || message.role === role;
  };

  const MessageBubble = ({ message, isUser }) => (
    <Animated.View 
      style={[
        styles.messageBubble,
        isUser ? styles.userMessage : styles.otherMessage,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.messageHeader}>
        <View style={styles.senderInfo}>
          <LinearGradient
            colors={[getRoleColor(message.role), `${getRoleColor(message.role)}80`]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {message.sender_name ? message.sender_name[0].toUpperCase() : '?'}
            </Text>
          </LinearGradient>
          <View style={styles.senderDetails}>
            <Text style={styles.senderName}>{message.sender_name || 'User'}</Text>
            <View style={[styles.roleTag, { backgroundColor: `${getRoleColor(message.role)}15` }]}>
              <Text style={[styles.roleText, { color: getRoleColor(message.role) }]}>
                {message.role}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[
        styles.messageContent,
        isUser ? styles.userMessageContent : styles.otherMessageContent
      ]}>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {message.content}
        </Text>
      </View>

      <View style={styles.messageFooter}>
        <Ionicons name="time-outline" size={12} color="#94a3b8" />
        <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
        {isUser && <Ionicons name="checkmark-done" size={12} color="#22c55e" />}
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Shipment Chat Room</Text>
                <View style={styles.connectionStatus}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }
                  ]} />
                  <Text style={styles.statusText}>
                    {isConnected ? 'Connected' : 'Reconnecting...'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <React.Fragment key={`${message.sender_id}-${message.timestamp}`}>
            {isNewDay(message, index) && (
              <View style={styles.dateDivider}>
                <Text style={styles.dateText}>
                  {new Date(message.timestamp).toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            )}
            <MessageBubble 
              message={message} 
              isUser={isUserMessage(message)}
            />
          </React.Fragment>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageInput}
          onChangeText={handleInputChange}
          placeholder="Type your message..."
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={200}
        />
        <View style={styles.inputFooter}>
          <Text style={styles.charCount}>{charCount}/200</Text>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageInput.trim() || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!messageInput.trim() || !isConnected}
          >
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
              style={styles.sendButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="send" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    margin: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    overflow: 'hidden',
    // borderBottomLeftRadius: 24,
    // borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
  },
  headerContent: {
    marginTop:-20,
    padding: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    gap: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  messagesContent: {
    padding: 20,
    gap: 12,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 4,
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senderDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageContent: {
    padding: 12,
    borderRadius: 20,
    marginTop: 4,
  },
  userMessageContent: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
  },
  otherMessageContent: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1e293b',
  },
  userMessageText: {
    color: '#1e40af',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingLeft: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 12,
    fontSize: 15,
    maxHeight: 100,
    color: '#0f172a',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  charCount: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatComponent;