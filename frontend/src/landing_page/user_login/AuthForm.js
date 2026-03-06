import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import './Auth.css';

function AuthForm({ authType, userType, redirectPath }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [metamaskAdd, setMetamaskAdd] = useState('');
  const [userLat, setUserLat] = useState('');
  const [userLong, setUserLong] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = authType === 'signup' 
      ? 'http://127.0.0.1:5000/signup'
      : 'http://127.0.0.1:5000/login';
  
    const requestData = {
      username,
      password,
      user_type: userType,
    };

    // Include additional fields for signup only
    if (authType === 'signup') {
      requestData.user_lat = userLat;
      requestData.user_long = userLong;
      // Only include metamask address for non-distributor roles
      if (userType !== 'distributor') {
        requestData.metamask_add = metamaskAdd;
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });
  
    const data = await response.json();
    if (response.ok) {
      if (authType === 'signup') {
        navigate(`/login/${userType}`);
      } else {
        if (data.unique_user_id) {
          login(data.unique_user_id);
        }
        navigate(redirectPath);
      }
    } else {
      setError(data.error);
    }
  };

  const handleUseCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLat(latitude);
        setUserLong(longitude);
        alert("Location fetched successfully.");
      },
      () => {
        alert("Unable to fetch your current location.");
      }
    );
  };

  const getUserTypeDisplay = () => {
    switch(userType) {
      case 'manufacturer': return 'Manufacturer';
      case 'wholesaler': return 'Wholesaler';
      case 'retailer': return 'Retailer';
      case 'distributor': return 'Distributor';
      default: return '';
    }
  };

  return (
    <div className="login-bg">
      <div className="auth-container">
       
        <h2>
          {authType === 'signup' ? 'Signup' : 'Login'} {getUserTypeDisplay()}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="input-grp">
            <label htmlFor="username">
              <i className="fas fa-user"></i> Username
            </label>
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-grp">
            <label htmlFor="password">
              <i className="fas fa-lock"></i> Password
            </label>
            <div className="password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="password-toggle" onClick={togglePasswordVisibility}>
                {showPassword ? (
                  <EyeOff size={20} color="white" />
                ) : (
                  <Eye size={20} color="white" />
                )}
              </span>
            </div>
          </div>

          {/* Show these fields only during signup */}
          {authType === 'signup' && (
            <>
              {/* Show metamask field only for non-distributor roles */}
              {userType !== 'distributor' && (
                <div className="input-grp">
                  <label htmlFor="metamask_add">Metamask Address</label>
                  <input
                    type="text"
                    id="metamask_add"
                    placeholder="Enter your Metamask address"
                    value={metamaskAdd}
                    onChange={(e) => setMetamaskAdd(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="input-grp">
                <label htmlFor="user_lat">Latitude</label>
                <input
                  type="text"
                  id="user_lat"
                  placeholder="Latitude"
                  value={userLat}
                  onChange={(e) => setUserLat(e.target.value)}
                  required
                  readOnly
                />
              </div>
              <div className="input-grp">
                <label htmlFor="user_long">Longitude</label>
                <input
                  type="text"
                  id="user_long"
                  placeholder="Longitude"
                  value={userLong}
                  onChange={(e) => setUserLong(e.target.value)}
                  required
                  readOnly
                />
              </div>
              <button
                type="button"
                className="auth-btn"
                style={{marginBottom:"10px"}}
                onClick={handleUseCurrentLocation}
              >
                Use Current Location
              </button>
            </>
          )}

          {error && <p className="error">{error}</p>}
          <button type="submit" className="auth-btn">
            {authType === 'signup' ? 'Signup' : 'Login'}
          </button>
        </form>
        <p>
          {authType === 'signup' ? (
            <>
              Already have an account?{' '}
              <Link to={`/login/${userType}`}>Login here</Link>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <Link to={`/signup/${userType}`}>Sign up here</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default AuthForm;