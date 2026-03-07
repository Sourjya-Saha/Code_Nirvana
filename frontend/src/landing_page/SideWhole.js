import React, { useState, useEffect } from "react";
import "./styles.css";
import { Link, useLocation } from "react-router-dom";
import { ethers } from "ethers";
import CardTransactionRegistry from "./Shipment/CardTransactionRegistry.json";
import contractConfig from "./Shipment/contractAddress.json";
import {
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Menu,
  Home,
  Boxes
} from "lucide-react";

const SideWhole = () => {
  const [isNavbarVisible, setIsNavbarVisible] = useState(false);
  const [activeLink, setActiveLink] = useState("dashboard");
  const location = useLocation();
  const [contract, setContract] = useState(null);
const contractAddress = contractConfig.registryAddress;
  const [walletAddress, setWalletAddress] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    const init = async () => {
      await loadContract();
    };
    init();
  }, []);

  const loadContract = async () => {
    if (typeof window.ethereum !== "undefined") {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

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

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const lockMetaMask = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
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

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.includes("/dashwhole")) {
      setActiveLink("dashboard");
    } else if (currentPath.includes("/rec")) {
      setActiveLink("users");
    } else if (currentPath === "/") {
      setActiveLink("home");
    } else if (currentPath.includes("/login_auth")) {
      setActiveLink("signout");
    } else if (currentPath.includes("/productswhole")) {
      setActiveLink("warehouse");
    } else if (currentPath.includes("/addproductwhole")) {
      setActiveLink("products");
    } else if (currentPath.includes("/cartswhole")) {
      setActiveLink("cart");
    } else if (currentPath.includes("/transactionswhole") || currentPath.includes("/addtransactionwhole")) {
      setActiveLink("transactions");
    }  else if (currentPath.includes("/shipmentorderswholesaler")) {
      setActiveLink("orders")}; 
  }, [location.pathname]);

  const handleLinkClick = (link) => {
    if (link === "signout") {
      lockMetaMask();
    }
    setActiveLink(link);
  };

  return (
    <div className="side-bar">
      <div id="body-pd">
      <header className={`header ${isNavbarVisible ? 'body-pd' : ''}`} id="header">
                    <div className="header_toggle" onClick={toggleNavbar}>
                        <i className={`bx bx-menu ${isNavbarVisible ? 'bx-x' : ''}`} id="header-toggle"></i>
                    </div>

        </header>
        <div
          className={`l-navbar ${isNavbarVisible ? "show" : ""}`}
          id="nav-bar"
        >
          <nav className="nav">
            <div>
              <Link
                className={`nav_logo ${activeLink === "home" ? "active" : ""}`}
                to="/"
                onClick={() => handleLinkClick("home")}
              >
                <img 
  src="https://ipfs.io/ipfs/bafybeigbsspj5dc73hzywe5gwk3rcoj6ubtgdi4ku3k5wff4guibj22gdq"
  alt="NSC Token"
  style={{ 
    width: '32px', 
    height: '32px', 
    borderRadius: '10px', 
    objectFit: 'cover',
    backgroundColor: 'black',
    flexShrink: 0
  }}
  onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f6f5ff'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='8' text-anchor='middle' dominant-baseline='middle' fill='%23a19bf7'%3ENSC%3C/text%3E%3C/svg%3E"; }}
/>
                <span className="nav_logo-name">
                  <span style={{ color: "orange" }}>Nirvana</span>
                  <br></br>
                  <span style={{ color: "#87f167" }}>SmartChain</span>
                </span>
              </Link>
              <div className="nav_list">
                <Link
                  className={`nav_link ${
                    activeLink === "dashboard" ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("dashboard")}
                  to="/dashwhole"
                >
                  <LayoutDashboard className="nav_icon w-6 h-6" />
                  <span className="nav_name">Dashboard</span>
                </Link>

                <Link
                  className={`nav_link ${
                    activeLink === "products" ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("products")}
                  to="/addproductwhole"
                >
                  <Boxes className="nav_icon w-6 h-6" />
                  <span className="nav_name">Products</span>
                </Link>

                <Link
                  className={`nav_link ${
                    activeLink === "users" ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("users")}
                  to="/rec"
                >
                  <Package className="nav_icon w-6 h-6" />
                  <span className="nav_name">Receive</span>
                </Link>
                <Link
                  className={`nav_link ${
                    activeLink === "orders" ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("orders")}
                  to="/shipmentorderswholesaler"
                >
                 <ClipboardList className="nav_icon w-6 h-6" />
                  <span className="nav_name">Shipment Orders</span>
                </Link>
                <Link
                  className={`nav_link ${
                    activeLink === "warehouse" ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("warehouse")}
                  to="/productswhole"
                >
                  <Warehouse className="nav_icon w-6 h-6" />
                  <span className="nav_name">Warehouse</span>
                </Link>

                <Link
                  className={`nav_link ${
                    activeLink === "cart" ? "active" : ""
                  }`}
                  onClick={() => handleLinkClick("cart")}
                  to="/cartswhole"
                >
                  <ShoppingCart className="nav_icon w-6 h-6" />
                  <span className="nav_name">Cart</span>
                </Link>

                <li
                  className={`dropdown ${
                    openDropdown === "transactions" ? "open" : ""
                  }`}
                >
                  <Link
                    className={`dropdown-togg nav_link ${
                      activeLink === "transactions" ? "active" : ""
                    }`}
                    onClick={() => toggleDropdown("transactions")}
                    to="#"
                  >
                    <ClipboardList className="nav_icon w-6 h-6" />
                    <span className="nav_name">Transactions</span>
                    <p className="arrow">&#9662;</p>
                  </Link>
                  <ul className="dropdown-menu">
                    <li >
                      <Link className="dropmenu" to="/addtransactionwhole" style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                        <Truck className="w-4 h-4" />
                        Order Shipment
                      </Link>
                    </li>
                    <li>
                      <Link className="dropmenu" to="/transactionswhole" style={{display:"flex" , alignItems:"center" , gap:"10px"}}>
                        <ClipboardList className="w-4 h-4" />
                        My Shipments
                      </Link>
                    </li>
                  </ul>
                </li>
              </div>
            </div>
            <Link
              to="/login_auth"
              className={`nav_link ${activeLink === "signout" ? "active" : ""}`}
              onClick={() => handleLinkClick("signout")}
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

export default SideWhole;