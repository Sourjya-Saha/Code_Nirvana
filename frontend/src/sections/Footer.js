import React from 'react';
import Logo from '../assets/Screenshot 2024-09-24 054804.png';
import SocialX from '../assets/social-x.svg';
import SocialInsta from '../assets/social-insta.svg';
import SocialLinkedIn from '../assets/social-linkedin.svg';
import SocialPin from '../assets/social-pin.svg';
import SocialYt from '../assets/social-youtube.svg';
import '../sections/Footer.css'; // Import the CSS file

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="divlg">
          <div className="header-logo">
            <img src={Logo} alt="Saas app" className="logok" />
          </div>
        </div>
        <nav className="footer-nav">
          <a href="#">@Srinjoy.roy.it27</a>
          <a href="#">@Sourjya.saha.it27</a>
          <a href="#">@Aritra.dhar.it27</a>
       
        </nav>
        <div className="social-icons">
          <img src={SocialInsta} alt="Instagram" className="social-icon" />
          <img src={SocialLinkedIn} alt="LinkedIn" className="social-icon" />
          <img src={SocialX} alt="Twitter" className="social-icon" />
          <img src={SocialPin} alt="Pinterest" className="social-icon" />
          <img src={SocialYt} alt="YouTube" className="social-icon" />
        </div>
        <p className="footer-text">&copy; 2024 Nirvana Smart-Chain, Inc. All rights reserved</p>
      </div>
    </footer>
  );
};
