import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import ArrowIcon from '../assets/arrow-right.svg';
import StarImage from '../assets/star.png';
import SpringImage from '../assets/spring.png';
import '../sections/calltoaction.css'; // Import the CSS file
import { Link } from 'react-router-dom'; 

export const CallToAction = () => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);

  return (
    <section
      ref={sectionRef}
      className="call-to-action-section"
    >
      <div className="container">
        <div className="section-heading relative">
          <h2 className="heading">
            Sign up for free today
          </h2>
          <p className="description">
            Celebrate the joy of accomplishment with an app designed to track your inventory and keep an eye on your supply chain
          </p>

          <motion.img
            src={StarImage}
            alt="Star"
            width={360}
            className="star-image"
            style={{ translateY }}
          />

          <motion.img
            src={SpringImage}
            alt="Spring"
            width={360}
            className="spring-image"
            style={{ translateY }}
          />
        </div>

        <div className="button-container">
         <Link to='login_auth'><button className="btn btn-primary">Sign up now</button></Link> 
          <button className="btn btn-text">
            <span>Learn more</span>
            <img src={ArrowIcon} alt="Arrow Icon" className="arrow-icon" />
          </button>
        </div>
      </div>
    </section>
  );
};
