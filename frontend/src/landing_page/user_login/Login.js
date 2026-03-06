// import React from 'react';
// import { Link } from 'react-router-dom';
// import './Auth.css';

// function Login() {
//   return (
//     <div className='login-bg'>
//     <div className="auth-container">
//     <div className="logo-container">
//         <img src="https://i.imgur.com/hczKIze.jpg" alt="Logo" className="logo" />
//       </div>
//       <h2>Login</h2>
//       <form>
//         <div className="input-grp">
//           <label htmlFor="email">
//             <i className="fas fa-envelope"></i> Email
//           </label>
//           <input type="text"  id="username" placeholder="Enter your email" />
//         </div>
//         <div className="input-grp">
//           <label htmlFor="password">
//             <i className="fas fa-lock"></i> Password
//           </label>
//           <input type="password" id="password" placeholder="Enter your password" />
//         </div>
        
//         <Link to='/home' style={{textDecoration:"none" , color: "#764ba2" }}  type="submit" className="auth-btn text-center">Login</Link>
//       </form>
     
//       <p>
//         Don't have an account? <Link to="/signup">Sign up here</Link>
//       </p>
//     </div>
//     </div>
//   );
// }

// export default Login;