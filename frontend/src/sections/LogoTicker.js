import React from 'react';
import acmeLogo from '../assets/sddefault-removebg-preview.png';
import quantamLogo from '../assets/VyvcKdbWHbTaN3QzRCQQS7pXASq1-303c31j4-removebg-preview.png';
import echoLogo from '../assets/kyKz5-removebg-preview.png';
import celestialLogo from '../assets/8k73hi03ck8mnm830xpu.png';
import pulse from '../assets/ETH_logo_landscape_(gray).png';
import apexLogo from '../assets/images__3_-removebg-preview (1).png';
import sckitLogo from '../assets/images__2_-removebg-preview.png';
import pandas from '../assets/images__1_-removebg-preview (1).png';
import metamask from '../assets/1_eu3r8jvsCHDGj4z5f8Nkxg-removebg-preview (1).png';
import nextjs from '../assets/nextjs-icon-2048x1234-pqycciiu.png';
import { motion } from 'framer-motion';
import '../sections/LogoTicker.css'
export const LogoTicker = () => {
  return (
    <div className='logo-ticker-container'>
      <div className="container">
        <div className='logo-ticker-wrapper'>
          <motion.div
            className='logo-ticker-animation'
            animate={{
              translateX: "-50%",
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "linear",
              repeatType: "loop",
            }}
          >
            {/* First set of logos */}
            <img src={acmeLogo} alt='Acme Logo' className='logo-ticker-image' />
            <img src={quantamLogo} alt='Quantum Logo' className='logo-ticker-image' />
            <img src={echoLogo} alt='Echo Logo' className='logo-ticker-image' />
            <img src={celestialLogo} alt='Celestial Logo' className='logo-ticker-image' />
            <img src={pulse} alt='Pulse Logo' className='logo-ticker-image' />
            <img src={apexLogo} alt='Apex Logo' className='logo-ticker-image' />
            <img src={sckitLogo} alt='SCKIT Logo' className='logo-ticker-image' />
            <img src={pandas} alt='Pandas Logo' className='logo-ticker-image' />
            <img src={metamask} alt='Metamask Logo' className='logo-ticker-image' />
            <img src={nextjs} alt='Next.js Logo' className='logo-ticker-image' />

            {/* Second set of logos for animation loop */}
            <img src={acmeLogo} alt='Acme Logo' className='logo-ticker-image' />
            <img src={quantamLogo} alt='Quantum Logo' className='logo-ticker-image' />
            <img src={echoLogo} alt='Echo Logo' className='logo-ticker-image' />
            <img src={celestialLogo} alt='Celestial Logo' className='logo-ticker-image' />
            <img src={pulse} alt='Pulse Logo' className='logo-ticker-image' />
            <img src={apexLogo} alt='Apex Logo' className='logo-ticker-image' />
            <img src={sckitLogo} alt='SCKIT Logo' className='logo-ticker-image' />
            <img src={pandas} alt='Pandas Logo' className='logo-ticker-image' />
            <img src={metamask} alt='Metamask Logo' className='logo-ticker-image' />
            <img src={nextjs} alt='Next.js Logo' className='logo-ticker-image' />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
