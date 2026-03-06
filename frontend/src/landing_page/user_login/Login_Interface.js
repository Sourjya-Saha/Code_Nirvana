import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Building2, Truck, Store, Factory } from 'lucide-react';

const LoginInterface = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  
  const roles = [
    { title: 'Manufacturer', icon: Factory, color: '#4facfe', gradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' },
    { title: 'Wholesaler', icon: Building2, color: '#00f2fe', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { title: 'Distributor', icon: Truck, color: '#4facfe', gradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' },
    { title: 'Retailer', icon: Store, color: '#00f2fe', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
  ];

  return (
    <div className="login-bg">
      

      <div className="auth-container" style={{
        maxWidth: '900px',
        marginTop:'90px',
        background: 'rgba(255, 255, 255, 0.03)',
        
        border: '1px solid rgba(255, 255, 255, 0.1)',
      
      }}>
        <div className="logo-container" style={{
          position: 'relative',
          marginBottom: '1rem'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
           
            width: '80px',
            height: '80px',
           
            borderRadius: '50%',
            filter: 'blur(30px)',
            opacity: '0.5'
          }} />
          <Lock size={64} style={{
            color: '#4facfe',
           
          
          }}/>
        </div>
        
      
        
        <div style={{
          display: 'grid',
          marginTop:'20px',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '2rem',
          padding: '1rem'
        }}>
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <Link 
                key={index}
                to={`/login/${role.title.toLowerCase()}`}
                style={{ textDecoration: 'none' }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={{
                  background: hoveredCard === index ? 
                    'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '24px',
                  padding: '2.5rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: hoveredCard === index ? 'scale(1.05) translateY(-10px)' : 'scale(1)',
                  boxShadow: hoveredCard === index ? 
                    '0 30px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(79, 172, 254, 0.3)' : 
                    '0 15px 35px rgba(0, 0, 0, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: hoveredCard === index ? '0' : '-100%',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    background: role.gradient,
                    opacity: '0.1',
                    transition: 'top 0.5s ease'
                  }} />
                  <Icon 
                    size={64} 
                    style={{
                      color: role.color,
                      marginBottom: '1.5rem',
                      transition: 'all 0.5s ease',
                      transform: hoveredCard === index ? 'scale(1.2) rotate(10deg)' : 'scale(1)',
                      filter: hoveredCard === index ? 'drop-shadow(0 0 20px rgba(79, 172, 254, 0.5))' : 'none'
                    }}
                  />
                  <h3 style={{
                    fontSize: '1.5rem',
                    margin: '0',
                    fontWeight: '600',
              
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: hoveredCard === index ? 'white' : '#fff',
                    transition: 'all 0.3s ease',
                    textShadow: hoveredCard === index ? '0 0 20px rgba(79, 172, 254, 0.3)' : 'none'
                  }}>
                    Login for {role.title}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoginInterface;