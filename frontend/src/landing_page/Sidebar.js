import React, { useState, useEffect } from 'react';
import './styles.css';
import { Link, useLocation } from 'react-router-dom';
import { ethers } from "ethers";
import CardTransactionRegistry from "./Shipment/CardTransactionRegistry.json";
import contractConfig from './Shipment/contractAddress.json';
import {
    LayoutDashboard,
    Package,
    Boxes,
    Warehouse,
    ShoppingCart,
    ClipboardList,
    LogOut,
    Menu,
    Home,
    ChevronDown,
    Plus,
    Settings,
    Truck,
    FileStack,
    MessageSquare 
} from 'lucide-react';

const Sidebar = () => {
    const [isNavbarVisible, setIsNavbarVisible] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null);
    const location = useLocation();
    const [contract, setContract] = useState(null);
  const contractAddress = contractConfig.registryAddress;
    const [walletAddress, setWalletAddress] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");  
  
    useEffect(() => {
        const init = async () => {
            await loadContract();
        };
        init();
    }, []); 
    
    const loadContract = async () => {
        if (typeof window.ethereum !== "undefined") {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            
            const checksummedAddress = ethers.getAddress(accounts[0]);
            setWalletAddress(checksummedAddress);
    
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(checksummedAddress);
            const cardTransactionRegistry = new ethers.Contract(
                contractAddress,
                CardTransactionRegistry.abi,
                signer
            );
            setContract(cardTransactionRegistry);
        }
    };

    const lockMetaMask = async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }]
            });
            setWalletAddress(null);
            setContract(null);
            setErrorMessage("Wallet permissions revoked. Reconnect to continue.");
        } catch (error) {
            console.error("Failed to revoke MetaMask permissions:", error);
            setErrorMessage("Failed to revoke MetaMask permissions.");
        }
    };

    const toggleNavbar = () => {
        setIsNavbarVisible(!isNavbarVisible);
    };

    const toggleDropdown = (dropdown) => {
        setOpenDropdown(openDropdown === dropdown ? null : dropdown);
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <div className="side-bar">
              <div id="body-pd">
                <header className={`header ${isNavbarVisible ? 'body-pd' : ''}`} id="header">
                    <div className="header_toggle" onClick={toggleNavbar}>
                        <i className={`bx bx-menu ${isNavbarVisible ? 'bx-x' : ''}`} id="header-toggle"></i>
                    </div>
                   
                </header>

                <div className={`l-navbar ${isNavbarVisible ? 'show' : ''}`} id="nav-bar">
                    <nav className="nav">
                        <div>
                            <Link className="nav_logo" to="">
                                <Home className="nav_logo-icon dash w-7 h-7" />
                                <span className="nav_logo-name">
                                    <span style={{ color: "orange" }}>Nirvana</span>
                                    <br />
                                    <span style={{ color: "#87f167" }}>SmartChain</span>
                                </span>
                            </Link>

                            <div className="nav_list">
                                <Link
                                    className={`nav_link ${isActive('/home') ? 'active' : ''}`}
                                    to="/home"
                                >
                                    <LayoutDashboard className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Dashboard</span>
                                </Link>

                                <Link
                                    className={`nav_link ${isActive('/retailship') ? 'active' : ''}`}
                                    to="/retailship"
                                >
                                    <Package className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Shipment</span>
                                </Link>

                                <li className={`dropdown ${openDropdown === 'products' ? 'open' : ''}`}>
                                    <Link
                                        className={`dropdown-togg nav_link ${isActive('/products') ? 'active' : ''}`}
                                        onClick={() => toggleDropdown('products')}
                                        to="#"
                                    >
                                        <Boxes className="nav_icon w-6 h-6" />
                                        <span className="nav_name">Products</span>
                                        <ChevronDown className="arrow w-4 h-4" />
                                    </Link>
                                    <ul className="dropdown-menu">
                                        <li>
                                            <Link className="dropmenu" to="/addproducts"  style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                                                <Plus className="w-4 h-4" />
                                                Add Products
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="dropmenu" to="/products"  style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                                                <Settings className="w-4 h-4" />
                                                Manage Products
                                            </Link>
                                        </li>
                                    </ul>
                                </li>

                                <li className={`dropdown ${openDropdown === 'orders' ? 'open' : ''}`}>
                                    <Link
                                        className={`dropdown-togg nav_link ${isActive('/orders') ? 'active' : ''}`}
                                        onClick={() => toggleDropdown('orders')}
                                        to="#"
                                    >
                                        <ShoppingCart className="nav_icon w-6 h-6" />
                                        <span className="nav_name">Orders</span>
                                        <ChevronDown className="arrow w-4 h-4" />
                                    </Link>
                                    <ul className="dropdown-menu">
                                        <li>
                                            <Link className="dropmenu" to="/addorders"  style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                                                <Plus className="w-4 h-4" />
                                                Add Orders
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="dropmenu" to="/orders"  style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                                                <Settings className="w-4 h-4" />
                                                Manage Orders
                                            </Link>
                                        </li>
                                    </ul>
                                </li>

                                <li className={`dropdown ${openDropdown === 'transactions' ? 'open' : ''}`}>
                                    <Link
                                        className={`dropdown-togg nav_link ${isActive('/transactions') ? 'active' : ''}`}
                                        onClick={() => toggleDropdown('transactions')}
                                        to="#"
                                    >
                                        <ClipboardList className="nav_icon w-6 h-6"  />
                                        <span className="nav_name">Transactions</span>
                                        <ChevronDown className="arrow w-4 h-4" />
                                    </Link>
                                    <ul className="dropdown-menu">
                                        <li>
                                            <Link className="dropmenu" to="/addtransaction"  style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                                                <Truck className="w-4 h-4" />
                                                Order Shipment
                                            </Link>
                                        </li>
                                        <li>
                                            <Link className="dropmenu" to="/transactions"  style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                                                <FileStack className="w-4 h-4" />
                                                My Shipments
                                            </Link>
                                        </li>
                                    </ul>
                                </li>

                                <Link
                                    className={`nav_link ${isActive('/warehouse') ? 'active' : ''}`}
                                    to="/warehouse"
                                >
                                    <Warehouse className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Warehouse</span>
                                </Link>
                                <Link
                                    className={`nav_link ${isActive('/chatassistance') ? 'active' : ''}`}
                                    to="/chatassistance"
                                >
                                    <MessageSquare className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Chat Assistance</span>
                                </Link>
                            </div>
                        </div>

                        <Link
                            to='/login_auth'
                            onClick={lockMetaMask}
                            className={`nav_link ${isActive('/login_auth') ? 'active' : ''}`}
                        >
                            <LogOut className="nav_icon w-6 h-6" />
                            <span className="nav_name">SignOut</span>
                        </Link>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;