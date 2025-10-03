// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaUserEdit, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);

  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const storedUsername = localStorage.getItem("username");
        setUsername(storedUsername || "");

        // Optional: fetch patient name from invoices
        const res = await axios.get(`${BASE_URL}/api/invoice/all/${storedUsername}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.length > 0) {
          setPatientName(res.data[0].patient_name || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, navigate, BASE_URL]);

  const handleUpdate = async () => {
    setMessage("");
    setError("");

    if (!username || !password) {
      setError("Both username and password are required.");
      return;
    }

    try {
      const res = await axios.put(
        `${BASE_URL}/api/user/update`,
        { username, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        localStorage.setItem("username", username);
        setMessage("Profile updated successfully!");
        setPassword("");
        setEditMode(false);
      } else {
        setError(res.data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while updating profile.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  if (loading)
    return <div style={{ padding: 20, textAlign: "center" }}>Loading...</div>;

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "50px auto",
        padding: 30,
        border: "1px solid #ccc",
        borderRadius: 12,
        textAlign: "center",
        backgroundColor: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <FaUser size={60} color="#2563eb" style={{ marginBottom: 15 }} />
      <h2>{patientName || "Patient Name"}</h2>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!editMode ? (
        <>
          <p>Username: <strong>{username}</strong></p>
          <button
            onClick={() => setEditMode(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 15px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            <FaUserEdit /> Edit Profile
          </button>
        </>
      ) : (
        <div style={{ marginTop: 20, textAlign: "left" }}>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              margin: "5px 0 15px 0",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
          <label>New Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              margin: "5px 0 15px 0",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={handleUpdate}
            style={{
              width: "100%",
              padding: 10,
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            Save Changes
          </button>
          <button
            onClick={() => setEditMode(false)}
            style={{
              width: "100%",
              padding: 10,
              backgroundColor: "#f3f4f6",
              color: "#111",
              border: "1px solid #ccc",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <hr style={{ margin: "20px 0" }} />
      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          padding: 10,
          backgroundColor: "#ef4444",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default ProfilePage;
