

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './landing_page/user_login/AuthContext'; // Import the AuthProvider

// Import your components
import Sidebar from './landing_page/Sidebar';
import Dashboard from './landing_page/home/Dashboard';
import Orders from './landing_page/orders/Orders';
import Products from './landing_page/products/Products';
import Warehouse from './landing_page/warehouse/Warehouse';
import AddProduct from './landing_page/products/AddProducts';
import Details from './landing_page/home/details';
import AddOrder from './landing_page/orders/AddOrder';
import Login from './landing_page/user_login/Login';
import Signup from './landing_page/user_login/Signup';
import OCR from './landing_page/warehouse/ocr';
import Login_Interface from './landing_page/user_login/Login_Interface';
import LoginManu from './landing_page/user_login/LoginManu';
import Manufacture from './landing_page/home/Manufactre';
import Shipment from './landing_page/Shipment/Shipment';
import LoginWhole from './landing_page/user_login/LoginWhole';
import Wholesale from './landing_page/home/Wholesale';
import Recieve from './landing_page/Shipment/Recieve';
import DashManu from './landing_page/home/DashboardManu';
import DashWhole from './landing_page/home/DashboardWhole';
import WarehouseManu from './landing_page/warehouse/WarehouseManu';
import ProductsManu from './landing_page/products/ProductsManu';
import Carts from './landing_page/carts/cart';
import Retailship from './landing_page/Shipment/Retailship';
import DashW from './landing_page/Shipment/Recieve';
import Shipment_detail from './landing_page/home/Shipment_detail';
import HomePage from './landing_page/home/Home';
// import SmartCareCenter from './AI_MODEL/Smart';
import LoginRetail from './landing_page/user_login/LoginRetail';
import AuthForm from './landing_page/user_login/AuthForm';

import LiveTracking from './LiveTracking';
import GeolocationMap from './landing_page/Googlemaps/GeolocationMap';
import TrackingSystem from './landing_page/Googlemaps/TrackingSystem';
import Map from './landing_page/Googlemaps/maps';
import AddTransaction from './landing_page/transaction_page/addtransaction';
import { Transaction } from 'ethers';
import Transactions from './landing_page/transaction_page/transaction';
import AllShipment from './landing_page/allShipments/AllShipments';
import HereMapTraffic from './landing_page/Googlemaps/HereMaps';
import TomTomTrafficMap from './landing_page/Googlemaps/HereMaps';
// import TrafficMap from './landing_page/Googlemaps/TomTom';
import TrafficData from './landing_page/Googlemaps/TrafficData';
import TrafficMapData from './landing_page/Googlemaps/TrafficMapData';
import TrafficMapWithErrorHandling from './landing_page/Googlemaps/TrafficData';
import NewGeolocation from './landing_page/Googlemaps/NewGeolocationCode';
import ProductsWhole from './landing_page/products/ProductWhole';
import AddProductWhole from './landing_page/products/AddProductWhole';
import CartWhole from './landing_page/carts/cartsWhole';
import AddTransactionWhole from './landing_page/transaction_page/addtransactionwhole';
import TransactionsWhole from './landing_page/transaction_page/transactionwhole';
import Dashdistruibtor from './landing_page/home/Dashdistributor';
import ShipmentOrdersWhole from './landing_page/allShipments/ShipmentOrderWhole';
import ChatAssistance from './landing_page/chatassistance/Chatbot';
import WhitelistManagement from './landing_page/Shipment/AdminPanel';
import AdminPanel from './landing_page/Shipment/AdminPanel';
if (process.env.NODE_ENV === 'production') {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function() {}; // Disable React DevTools in production
  }
}

const locations = {
  manufacturerLocation: { lat: 22.5726, lng: 88.3639 },
  wholesalerLocation: { lat: 22.6676, lng: 88.3739 },
  retailerLocation: { lat: 22.7276, lng: 88.3839 }
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider> {/* Wrap BrowserRouter in AuthProvider */}
    <BrowserRouter>
      <Routes>
        <Route path='/Manufacture' element={<LoginManu />} />
        <Route path='/' element={<HomePage />} />
        <Route path='/carts' element={<Carts />} />
        <Route path='/dashwhole' element={<DashWhole />} />
        <Route path='/dashmanu' element={<DashManu />} />
        <Route path='/productsmanu' element={<ProductsManu />} />
        <Route path='/warehousemanu' element={<WarehouseManu />} />
        <Route path='/Wholesaler' element={<LoginWhole />} />
        <Route path='/Manu' element={<Manufacture />} />
        <Route path='/whole' element={<Wholesale />} />
        <Route path="/login_auth" element={<Login_Interface />} />
        {/*  <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} /> */}
        <Route path="/home" element={<Dashboard />} />
        <Route path="/details" element={<Details />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/warehouse" element={<Warehouse />} />
        <Route path="/products" element={<Products />} />
        <Route path='/shipment' element={<Shipment />} />
        <Route path='/rec' element={<DashW />} />
        <Route path="/addproducts" element={<AddProduct />} />
        <Route path="/addorders" element={<AddOrder />} />
        <Route path='/OCR' element={<OCR />} />
        <Route path='/retailship' element={<Retailship />} />
        <Route path='/shipment_details' element={<Shipment_detail />} />
        {/* <Route path='/ai' element={<SmartCareCenter />} /> */}
        <Route path='/map' element={<GeolocationMap/>}/>
        <Route path='/livelocation' element={<TrackingSystem/>}/>
        <Route path='/livetracking' element={<LiveTracking/>}/>
        <Route path='/googlemap' element={<Map/>}/>
        <Route path='/addtransaction' element={<AddTransaction/>}/>
        <Route path='/transactions' element={<Transactions/>}/>
        <Route path='/allshipments' element={<AllShipment/>}/>
        <Route path='/productswhole' element={<ProductsWhole/>}/>
        <Route path='/addproductwhole' element={<AddProductWhole/>}/>
        <Route path='/cartswhole' element={<CartWhole/>}/>
        <Route path='/addtransactionwhole' element={<AddTransactionWhole/>}/>
        <Route path='/transactionswhole' element={<TransactionsWhole/>}/>
        <Route path='/dashdistributor' element={<Dashdistruibtor/>}/>
        <Route path='/shipmentorderswholesaler' element={<ShipmentOrdersWhole/>}/>
        {/* <Route path='/newgeo' element={<NewGeolocation/>}/> */}
        <Route path='/chatassistance' element={<ChatAssistance/>}/>

        <Route path='/heremaps' element={<TomTomTrafficMap />}/>
        {/* <Route path='/tomtommaps' element={<TrafficMap />}/> */}
        <Route path='/trafficdata' element={<TrafficMapWithErrorHandling />}/>
        <Route path='/traffic' element={<TrafficMapData />}/>
        {/* Admin route */}
        <Route path='/admin' element={<AdminPanel />}/>

        {/* Signup routes */}
        <Route path="/signup/manufacturer" element={<AuthForm authType="signup" userType="manufacturer" redirectPath="/dashmanu" />} />
        <Route path="/signup/wholesaler" element={<AuthForm authType="signup" userType="wholesaler" redirectPath="/dashwhole" />} />
        <Route path="/signup/retailer" element={<AuthForm authType="signup" userType="retailer" redirectPath="/home" />} />
        <Route path="/signup/distributor" element={<AuthForm authType="signup" userType="distributor" redirectPath="/dashdistributor" />} />
        {/* Login routes */}
        <Route path="/login/manufacturer" element={<AuthForm authType="login" userType="manufacturer" redirectPath="/dashmanu" />} />
        <Route path="/login/wholesaler" element={<AuthForm authType="login" userType="wholesaler" redirectPath="/dashwhole" />} />
        <Route path="/login/retailer" element={<AuthForm authType="login" userType="retailer" redirectPath="/home" />} />
        <Route path="/login/distributor" element={<AuthForm authType="login" userType="distributor" redirectPath="/dashdistributor" />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

// Performance measuring
reportWebVitals();
