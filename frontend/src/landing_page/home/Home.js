import React from 'react';
import { Header } from '../../sections/Header';
import { Hero } from '../../sections/Hero';
import { LogoTicker } from '../../sections/LogoTicker';
import { ProductShowcase } from '../../sections/ProductShowcase';
import { Testimonials } from '../../sections/Testimonials';
import { Tracking } from '../../sections/Tracking';
import { CallToAction } from '../../sections/CallToAction';
import { Footer } from '../../sections/Footer';
function HomePage() {
    return ( <>
    <Header/>
    <Hero/>
  <LogoTicker/>
  <ProductShowcase/>
  <Testimonials/>
  <Tracking/>
  <CallToAction/>
  <Footer/>
    
    </> );
}

export default HomePage;