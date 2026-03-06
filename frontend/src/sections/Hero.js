import React, { useRef } from 'react';
import ArrowIcon from '../assets/arrow-right.svg';
import cogImage from '../assets/cog.png';
import cylinderImage from '../assets/cylinder.png';
import noodleImage from '../assets/noodle.png';
import { motion, useScroll, useTransform } from 'framer-motion';
import '../sections/Hero.css'; // Import the CSS file
import { Link } from 'react-router-dom';

export const Hero = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start end', 'end start'],
  });

  const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);

  return (
    <section ref={heroRef} className="hero-section">
      <div className="contain-hero">
        <div className="hero-flex">
          <div className="hero-left">
            <div className="version-tag">Version 1.0 is Here</div>
            <h1 className="hero-title">Nirvana SmartChain</h1>
            <p className="hero-description">
              Web and Android App: Prevent counterfeits, ensure accurate inventory, and enhance tracking.
              Advanced Drug Inventory System: Monitor drug consumption patterns, ensure transparency and efficiency. 
              Dashboard-Based Monitoring: Track vendor, shipment, and hospital drug usage. 
              Improved Procurement: Ensure drug availability, streamline distribution, and enforce quality controls.
            </p>
            <div className="hero-buttons">
              <Link to='/login_auth'><button className="btnn btnn-primary">Sign In</button></Link>
              <button className="btnn btnn-text">
                <span>Learn More</span>
                <img src={ArrowIcon} alt="Arrow Icon" className="arr" />
              </button>
            </div>
          </div>

          <div className="image-container">
            <motion.img
              src={cogImage}
              alt="Cog Image"
              className="image-cog"
              animate={{
                translateY: [-30, 0],
              }}
              transition={{
                repeat: Infinity,
                repeatType: 'mirror',
                duration: 3,
                ease: 'easeInOut',
              }}
            />
            <motion.img
              src={cylinderImage}
              width={220}
              height={220}
              alt="Cylinder Image"
              className="image-cylinder"
              style={{
                translateY: translateY,
              }}
            />
            <motion.img
              src={noodleImage}
              width={220}
              alt="Noodle Image"
              className="image-noodle"
              style={{
                rotate: 30,
                translateY: translateY,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
