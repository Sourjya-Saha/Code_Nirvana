import React from 'react';
import { motion } from 'framer-motion';
import avatar1 from '../assets/images (4).png';
import avatar2 from '../assets/How_to_Find_a_Solidity_Developer_for_Hire_Comprehensive_Guide.png';
import avatar3 from '../assets/images__2_-removebg-preview.png';
import avatar4 from '../assets/images (1).png';
import avatar5 from '../assets/60c844afa62d003266774427_Screenshot-2021-03-26-at-13.37.png';
import avatar6 from '../assets/images.jpeg';
import avatar7 from '../assets/images (2).png';
import avatar8 from '../assets/images.jpeg';
import avatar9 from '../assets/flutter.png';
import '../sections/testimonial.css'

const testimonials = [
  {
    text: "Real-time interactive dashboard - products, shipment details, order details",
    imageSrc: avatar1,
    name: "Interactive Dashboard",
    username: "",
  },
  {
    text: "Supply chain - 2 step verification wallet address based and QR based verification",
    imageSrc: avatar2,
    name: "Supply Chain",
    username: "",
  },
  {
    text: "Personalised medicine - AI medicine prediction model for consumer symptoms",
    imageSrc: avatar3,
    name: "AI-based Personalised Medicines",
    username: "",
  },
  {
    text: "Supply chain tracking - track the path of any product shipped",
    imageSrc: avatar4,
    name: "Supply Chain - Tracking",
    username: "",
  },
  {
    text: "Encrypted dynamic QR tracking system - tracks the number of scans",
    imageSrc: avatar5,
    name: "Encrypted Dynamic QR",
    username: "",
  },
  {
    text: "OCR - automate orders for consumers by uploading respective prescription",
    imageSrc: avatar6,
    name: "Optical Character Recognition",
    username: "",
  },
  {
    text: "Hospital drug consumption pattern recognition learning model",
    imageSrc: avatar7,
    name: "AI-based Drug Consumption Model",
    username: "",
  },
  {
    text: "Prediction model of which illness is rising amongst Indian regions and prediction of possible future trending drugs so that we can gain advantage over other manufacturers",
    imageSrc: avatar8,
    name: "AI Prediction Model",
    username: "",
  },
  {
    text: "Flutter based android app for consumers having features like tracking supply chain for a particular product for checking its authenticity",
    imageSrc: avatar9,
    name: "Future Scope - App for Consumers",
    username: "",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const TestimonialsColumn = ({ className, testimonials, duration = 10 }) => (
  <div className={className}>
    <motion.div
      animate={{
        translateY: '-50%',
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
        repeatType: 'loop',
      }}
      className="testimonials-column"
    >
      {[...new Array(2)].fill(0).map((_, index) => (
        <React.Fragment key={index}>
          {testimonials.map(({ text, imageSrc, name, username }, idx) => (
            <div className="testimonial-card" key={idx}>
              <div className="testimonial-text">{text}</div>
              <div className="testimonial-details">
                <img
                  src={imageSrc}
                  alt={name}
                  className="testimonial-image"
                />
                <div className="testimonial-info">
                  <div className="testimonial-name">{name}</div>
                  <div className="testimonial-username">{username}</div>
                </div>
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </motion.div>
  </div>
);

export const Testimonials = () => {
  return (
    <section className="testimonials-section">
      <div className="container-test">
        <div className="section-heading">
          <div className="flex justify-center">
            <div className="tag " style={{marginTop:"40px"}}>Version 1.0 is here</div>
          </div>
          <div className="heading-container">
            <h2 className="heading">Our Features</h2>
            <p className="description">
              Lorem ipsum dolor sit, amet consectetur adipisicing elit. Incidunt
              dolorem placeat, pariatur illum nisi eum.
            </p>
          </div>
        </div>
        <div className="testimonials-container">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} duration={19} className="hidden md:block" />
          <TestimonialsColumn testimonials={thirdColumn} duration={17} className="hidden lg:block" />
        </div>
      </div>
    </section>
  );
};
