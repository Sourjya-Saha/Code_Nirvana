import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

export default function Orderspage({ route, navigation }) {
  const { uniqueid, cartItems, totalPrice, userId, storeid } = route.params;
  
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [consumerId, setConsumerId] = useState(null);

  useEffect(() => {
    setConsumerId(1);
  }, []);

  const createRazorpayOrder = async () => {
    try {
      const orderData = {
        order: {
          customer_name: address,
          phone_num: mobileNumber,
          date_time: new Date().toISOString(),
          payment_method: 'online',
          order_details: cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        },
        user_id: uniqueid,
        consumer_id: consumerId
      };

      const response = await fetch('http://127.0.0.1:5000/create_razorpay_order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (orderId) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/update_order_status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: orderId }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
  
      const result = await response.json();
      console.log('Order status updated:', result);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handlePaymentSuccess = async (paymentData, orderData) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/confirm_order_payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_signature: paymentData.razorpay_signature,
          temp_order_data: orderData.temp_order_data
        })
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }
      
      const data = await response.json();
      Alert.alert('Success', `Order placed successfully with order id - ${JSON.stringify(data.order_id)}`);
      await updateOrderStatus(data.order_id);
      navigation.navigate('CONorders', { uniqueid });
    } catch (error) {
      Alert.alert('Error', 'Failed to verify payment. Please contact support.');
    }
  };

  const handleOnlinePayment = async () => {
    if (!mobileNumber || !address) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const orderData = await createRazorpayOrder();
      
      const options = {
        description: 'Medicine Order Payment',
        image: 'https://your-store-logo.png',
        currency: 'INR',
        key: 'rzp_test_2EpPSCTb8XHFCk',
        amount: orderData.total_amount * 100,
        name: 'Pharmacy Store',
        order_id: orderData.razorpay_order_id,
        prefill: {
          email: 'customer@example.com',
          contact: mobileNumber,
          name: address
        },
        theme: { color: '#0a47f0' }
      };

      const data = await RazorpayCheckout.open(options);
      await handlePaymentSuccess(data, orderData);
    } catch (error) {
      console.log('Payment error:', error);
      if (error.code === 2) {
        Alert.alert('Info', 'Payment cancelled by user');
      } else {
        Alert.alert('Error', 'Payment failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCOD = () => {
    if (mobileNumber && address) {
      Alert.alert('Success', 'Order placed successfully with COD');
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Please fill in all fields');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Order Details </Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Item</Text>
          <Text style={styles.tableHeaderText}>Qty</Text>
          <Text style={styles.tableHeaderText}>Price</Text>
        </View>
        {cartItems.map(item => (
          <View style={styles.tableRow} key={item.product_id}>
            <Text style={styles.tableCell}>{item.name}</Text>
            <Text style={styles.tableCell}>x {item.quantity}</Text>
            <Text style={styles.tableCell}>Rs{(item.price_per_unit * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.tableFooter}>
          <Text style={styles.tableCellBold}>Total</Text>
          <Text style={styles.tableCellBold}>Rs {totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.label}>Mobile Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Mobile Number"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Customer Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Customer Name"
        value={address}
        onChangeText={setAddress}
        multiline
      />

      <View style={styles.paymentButtons}>
        <TouchableOpacity 
          style={styles.paymentButton} 
          onPress={handleCOD}
          disabled={isLoading}
        >
          <Text style={styles.paymentButtonText}>COD</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.paymentButton} 
          onPress={handleOnlinePayment}
          disabled={isLoading}
        >
          <Text style={styles.paymentButtonText}>
            {isLoading ? 'Processing...' : 'Pay Online'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.paymentButton} 
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.paymentButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: '#0a47f0',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  table: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
    marginBottom: 10,
  },
  tableHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableCell: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  tableCellBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#fff',
    color: '#0a47f0',
    fontSize: 14,
  },
  paymentButtons: {
    width: '100%',
    marginTop: 20,
  },
  paymentButton: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#0a47f0',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});