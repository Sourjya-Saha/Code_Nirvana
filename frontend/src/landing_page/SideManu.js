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
    Box
} from 'lucide-react';

const SideManu = () => {
    const [isNavbarVisible, setIsNavbarVisible] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [activeLink, setActiveLink] = useState('dashboard');
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

    const handleLinkClick = (link) => {
        if (link === 'signout') {
            lockMetaMask();    
        }
        setActiveLink(link);
    };

    useEffect(() => {
        const currentPath = location.pathname;

        if (currentPath.includes('/dashmanu')) {
            setActiveLink('dashboard');
        } else if (currentPath.includes('/shipment')) {
            setActiveLink('shipment');
        } else if (currentPath.includes('/productsmanu')) {
            setActiveLink('products');
        } else if (currentPath.includes('/carts')) {
            setActiveLink('cart');
        } else if (currentPath.includes('/warehousemanu')) {
            setActiveLink('warehouse');
        } else if (currentPath.includes('/allshipments')) {
            setActiveLink('allshipments');
        } else if (currentPath === '/') {
            setActiveLink('home');
        } else if (currentPath.includes('/login_auth')) {
            setActiveLink('signout');
        }
    }, [location.pathname]);

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
                            <Link
                                className={`nav_logo ${activeLink === 'home' ? 'active' : ''}`}
                                onClick={() => handleLinkClick('home')}
                                to="/"
                            >
                                <Home className="nav_logo-icon dash w-7 h-7" />
                                <span className="nav_logo-name">
                                    <span style={{ color: "orange" }}>Nirvana</span>
                                    <br />
                                    <span style={{ color: "#87f167" }}>SmartChain</span>
                                </span>
                            </Link>
                            <div className="nav_list">
                                <Link
                                    className={`nav_link ${activeLink === 'dashboard' ? 'active' : ''}`}
                                    onClick={() => handleLinkClick('dashboard')}
                                    to="/dashmanu"
                                >
                                    <LayoutDashboard className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Dashboard</span>
                                </Link>

                                <Link
                                    className={`nav_link ${activeLink === 'shipment' ? 'active' : ''}`}
                                    onClick={() => handleLinkClick('shipment')}
                                    to="/shipment"
                                >
                                    <Package className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Shipment</span>
                                </Link>

                                <Link
                                    className={`nav_link ${activeLink === 'products' ? 'active' : ''}`}
                                    onClick={() => handleLinkClick('products')}
                                    to="/productsmanu"
                                >
                                    <Boxes className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Products</span>
                                </Link>

                                <Link
                                    className={`nav_link ${activeLink === 'cart' ? 'active' : ''}`}
                                    onClick={() => handleLinkClick('cart')}
                                    to="/carts"
                                >
                                    <ShoppingCart className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Cart</span>
                                </Link>

                                <Link
                                    className={`nav_link ${activeLink === 'allshipments' ? 'active' : ''}`}
                                    onClick={() => handleLinkClick('allshipments')}
                                    to="/allshipments"
                                >
                                    <ClipboardList className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Shipment Orders</span>
                                </Link>

                                <Link
                                    className={`nav_link ${activeLink === 'warehouse' ? 'active' : ''}`}
                                    onClick={() => handleLinkClick('warehouse')}
                                    to="/warehousemanu"
                                >
                                    <Warehouse className="nav_icon w-6 h-6" />
                                    <span className="nav_name">Warehouse</span>
                                </Link>
                            </div>
                        </div>
                        <Link
                            className={`nav_link ${activeLink === 'signout' ? 'active' : ''}`}
                            onClick={() => handleLinkClick('signout')}
                            to="/login_auth"
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

export default SideManu;