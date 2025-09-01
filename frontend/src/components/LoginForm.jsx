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
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      const { access_token, role } = res.data;

      if (access_token && role) {
        setToken(access_token);    // Save JWT token
        setUserRole(role);         // Save role in localStorage

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
    <div className="login-form" style={{ maxWidth: "400px", margin: "50px auto", padding: "30px", backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Login</h2>

      {error && <p style={{ color: "red", textAlign: "center", marginBottom: "15px" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "12px", backgroundColor: "#4CAF50", color: "#fff", fontSize: "16px", border: "none", borderRadius: "5px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
