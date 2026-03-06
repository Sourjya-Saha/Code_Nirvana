import React from 'react';
import './Nav.css';
import { Link, useLocation } from 'react-router-dom';

function Nav() {
    const location = useLocation(); // Get the current path

    return (
        <>
            <div className="top-sec border-bottom">
                <Link
                    className={`nav-link ${location.pathname === '/home' ? 'active' : ''}`}
                    to="/home"
                >
                    Stats
                </Link>
                <Link
                    className={`nav-link ${location.pathname === '/details' ? 'active' : ''}`}
                    to="/details"
                >
                    Detailed Info
                </Link>
                <Link
                    className={`nav-link ${location.pathname === '/shipment_details' ? 'active' : ''}`}
                    to="/shipment_details"
                >
                    Shipment Details
                </Link>
            </div>
        </>
    );
}

export default Nav;
