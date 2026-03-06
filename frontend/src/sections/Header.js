import React from 'react';
import ArrowRight from '../assets/arrow-right.svg';
import Logo from '../assets/Screenshot 2024-09-24 054804.png';
import MenuIcon from '../assets/menu.svg';
import '../sections/Header.css'
import { Link } from 'react-router-dom';

export const Header = () => {
  return (
    <header>
      <div className="header-container">
        <p className="header-welcome">Welcome to NIRVANA-SmartCHAIN</p>
        <div className="header-sign-in">
          <p>Sign In</p>
          <img src={ArrowRight} alt="Arrow Right" className="arrow h-4 w-4 inline-flex justify-center items-center" />
        </div>
      </div>
      <div className="py">
        <div className="cont">
          <div className="divlogo">
            <div className="header-logo">
              <img src={Logo} alt="Saas app" height={45} width={45} />
            </div>
            <img src={MenuIcon} alt="Menu Icon" className="menu-icon" />
            <nav className="navig">
              <a href="#">About</a>
              <a href="#">Features</a>
              <a href="#">Customers</a>
              <a href="#">Updates</a>
              <a href="#">Help</a>
              <Link to='/login_auth'><button className="sign-in-button">
                Sign In
              </button></Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};