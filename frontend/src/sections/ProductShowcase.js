import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import ProductImage from "../assets/React App - Google Chrome 06-09-2024 02_00_26.png";
import Pyeramid from "../assets/pyramid.png";
import TubeImage from "../assets/tube.png";
import '../sections/ProductCase.css'
export const ProductShowcase = () => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);

  return (
    <section ref={sectionRef} className="product-showcase-section">
      <div className="container-product">
        <div className="max-width-container">
          <div className="flx-cnt">
            <div className="tag">Keep a track of your inventory</div>
          </div>
          <h2 className="heading">Interactive Dashboard</h2>
          <p className="description">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Explicabo
            est provident consequatur neque hic dolorem.
          </p>
        </div>
        <div className="" style={{position:"relative"}}>
          <img
            src={ProductImage}
            alt="Product Image"

            className="product-ig"
          />
          <motion.img
            src={Pyeramid}
            alt="Pyramid Image"
            height={262}
              width={262}
            className="pyramid-image"
            style={{ translateY }}
          />
          <motion.img
            src={TubeImage}
            alt="Tube Image"
            height={248}
              width={248}
            className="tube-image"
            style={{ translateY }}
          />
        </div>
      </div>
    </section>
  );
};
