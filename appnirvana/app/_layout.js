import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CartProvider } from './consumer/NearestStore/CartContext';
import HomeCon from './consumer/homecon';
import LandingPage from './LandingPage';
import LoginCon from './LoginCon';
import CONorders from './consumer/Consumerorders/CONorders';
import Neareststore from './consumer/NearestStore/NearestStore';
import Cart from './consumer/NearestStore/cart';
import Store from './consumer/NearestStore/store';
import Orderspage from './consumer/NearestStore/OrderPage';
import Printed from './consumer/OCR/printed';
import Authentic from './consumer/Authenticity/authentic';
import Qrdetails from './consumer/Authenticity/qrdetails';
import Shproute from './consumer/Authenticity/shproute';
import Category from './consumer/products/category';
import Product from './consumer/products/product';

const Stack = createNativeStackNavigator();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CartProvider>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
          initialRouteName="LandingPage"
        >
          <Stack.Screen name="Authentic" component={Authentic} />
          <Stack.Screen name="CONorders" component={CONorders} />
          <Stack.Screen name="Neareststore" component={Neareststore} />
          <Stack.Screen name="Cart" component={Cart} />
          <Stack.Screen name="Store" component={Store} />
          <Stack.Screen name="Orderspage" component={Orderspage} />
          <Stack.Screen name="Printed" component={Printed} />
          <Stack.Screen name="LandingPage" component={LandingPage} />
          <Stack.Screen name="LoginCon" component={LoginCon} />
          <Stack.Screen name="HomeCon" component={HomeCon} />
          <Stack.Screen name="Qrdetails" component={Qrdetails} />
          <Stack.Screen name="Shproute" component={Shproute} />
          <Stack.Screen name="Category" component={Category} />
          <Stack.Screen name="Product" component={Product} />
        </Stack.Navigator>
      </CartProvider>
    </GestureHandlerRootView>
  );
}