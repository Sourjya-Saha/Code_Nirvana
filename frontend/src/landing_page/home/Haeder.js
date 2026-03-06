import React from 'react';
import './Dashboard.css'

function Header() {
    return ( 
        <>
      
            <div className="row border-bottom mt-3">
                <h1 className="heading fs-3 text-start " style={{
    fontSize: '24px', // Adjust font size
    color: '#333', // Dark gray color
    textAlign: 'center', // Center align text
    margin: '20px 0', // Add space above and below
    fontWeight: 'bold', // Make the text bold
    textTransform: 'uppercase', // Make text uppercase
    letterSpacing: '1.5px', // Add spacing between letters
    paddingBottom: '10px', // Space between text and underline
    width: 'fit-content', // Fit content width
    marginInline: 'auto' // Center horizontally
  }}>Welcome Back! , User</h1>
           
                
            </div>
            <div className="info-section">
                <p  style={{
    fontSize: '16px', // Adjust font size
    color: '#555', // Subtle gray color for text// Center align text
    margin: '10px 0', // Add space above and below
    lineHeight: '1.6', // Improve readability with line height
    fontStyle: 'italic', // Add a slightly informal look
    letterSpacing: '0.5px', // Subtle letter spacing for clarity
  }} >Your performance summary this week</p>
            </div>
           
     
        </>
     );
}

export default Header;