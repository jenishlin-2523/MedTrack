import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setToken, setUserRole } from "../utils/auth"; // Save token and role

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5000";

      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        username,
        password,
      });

      // Make sure backend sends username in response
      const { access_token, role, username: resUsername } = res.data;

      if (access_token && role) {
        setToken(access_token); // Save JWT
        setUserRole(role); // Save role
        localStorage.setItem("username", resUsername || username); // ✅ Save username

        // Redirect based on role
        if (role === "admin") {
          navigate("/dashboard");
        } else {
          navigate("/user-dashboard");
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      if (err.response && err.response.data?.msg) {
        setError(err.response.data.msg);
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-form-container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f0fdf4",
        fontFamily: "'Inter', sans-serif",
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        padding: "20px",
        boxSizing: "border-box"
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
          
          .login-wrapper {
            display: flex;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.03);
            overflow: hidden;
            width: 100%;
            max-width: 900px;
            min-height: 500px;
          }

          .image-panel {
            flex: 1;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
          }

          .image-panel img {
            max-width: 100%;
            max-height: 400px;
            object-fit: contain;
            filter: drop-shadow(0 10px 15px rgba(22, 163, 74, 0.2));
            transition: transform 0.3s ease;
          }


          .login-panel {
            flex: 1;
            padding: 50px 40px;
            color: #1f2937;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .input-field {
            width: 100%;
            padding: 14px 16px;
            margin-bottom: 24px;
            background: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            color: #111827;
            font-size: 16px;
            outline: none;
            transition: border-color 0.2s ease;
            box-sizing: border-box;
          }

          .input-field::placeholder {
            color: #9ca3af;
          }

          .input-field:focus {
            border-color: #22c55e;
            background: #ffffff;
          }

          .login-btn {
            width: 100%;
            padding: 14px;
            background: #22c55e;
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s ease;
            margin-top: 10px;
          }

          .login-btn:hover {
            background: #16a34a;
          }

          .login-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          .title-text {
            display: none;
            font-size: 36px;
            font-weight: 400;
            margin-bottom: 8px;
            text-align: center;
            color: #16a34a;
            letter-spacing: 1px;
          }
          
          .subtitle-text {
            text-align: center;
            color: #6b7280;
            margin-bottom: 40px;
            font-size: 15px;
            font-weight: 400;
          }

          @media (max-width: 768px) {
            .login-wrapper {
              flex-direction: column;
            }
            .image-panel {
              display: none;
            }
            .login-panel {
              padding: 40px 20px;
            }
            .title-text {
              display: block;
            }
          }
        `}
      </style>

      <div className="login-wrapper">
        <div className="image-panel">
          <img src="/pharmacy_logo.png" alt="Pharmacy Logo" />
        </div>

        <div className="login-panel">
          <h1 className="title-text">MEDITRACK</h1>
          <p className="subtitle-text">Welcome back! Please sign in.</p>

          {error && (
            <div style={{
              background: "#fef2f2",
              borderLeft: "4px solid #ef4444",
              padding: "12px 16px",
              marginBottom: "20px",
              borderRadius: "4px",
              color: "#991b1b",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="input-field"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-btn"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
