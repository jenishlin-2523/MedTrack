import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaHome, FaUser, FaFileInvoice, FaSignOutAlt } from "react-icons/fa";
import { MdSchedule, MdShoppingCart } from "react-icons/md";
import { useNavigate } from "react-router-dom";

import HomePage from "../pages/HomePage";
import SchedulePage from "../pages/SchedulePage";
import OrderPage from "../pages/OrderPage";
import InvoicePage from "../pages/InvoicePage";
import ProfilePage from "../pages/ProfilePage";

// Import the Chatbot component
import ChatBot from "../aiService/ChatBot";

const UserDashboard = () => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const BASE_URL = process.env.REACT_APP_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        if (!token || !username) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`${BASE_URL}/api/invoice/last/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.invoiceNumber) {
          const invoiceRes = await axios.get(
            `${BASE_URL}/api/invoice/details/${res.data.invoiceNumber}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setInvoice(invoiceRes.data);
        } else {
          setError("No invoices found for this user.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch invoice details.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [BASE_URL]);

  const renderSection = () => {
    if (loading) return <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>Loading dashboard...</div>;
    if (error) return <div style={{ padding: "40px 20px", color: "#ef4444", textAlign: "center" }}>{error}</div>;

    switch (activeTab) {
      case "home": return <HomePage />;
      case "schedule": return <SchedulePage />;
      case "order": return <OrderPage />;
      case "invoice": return <InvoicePage invoice={invoice} />;
      case "profile": return <ProfilePage />;
      default: return null;
    }
  };

  return (
    <div className="dashboard-container">
      <style>
        {`
          .dashboard-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            font-family: 'Inter', sans-serif;
            background: #f8fafc;
            position: relative;
          }
          .dashboard-container *, 
          .dashboard-container h1, 
          .dashboard-container h2, 
          .dashboard-container h3, 
          .dashboard-container h4, 
          .dashboard-container h5, 
          .dashboard-container h6,
          .dashboard-container strong,
          .dashboard-container b {
            font-weight: 300 !important;
          }
          @media (min-width: 768px) {
            .dashboard-container {
              flex-direction: row;
            }
          }
          .content-area {
            flex: 1;
            padding-bottom: 80px; /* Space for footer on mobile */
            max-width: 100vw;
            overflow-x: hidden;
          }
          @media (min-width: 768px) {
            .content-area {
              padding-bottom: 0;
              margin-left: 250px;
              max-width: calc(100vw - 250px);
            }
          }
          .main-nav {
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-top: 1px solid rgba(0,0,0,0.05);
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 70px;
            z-index: 1000;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.04);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          @media (min-width: 768px) {
            .main-nav {
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              width: 250px;
              height: 100vh;
              flex-direction: column;
              justify-content: flex-start;
              align-items: stretch;
              border-top: none;
              border-right: 1px solid rgba(0,0,0,0.05);
              box-shadow: 4px 0 20px rgba(0,0,0,0.04);
              padding-top: 30px;
            }
          }
          .brand-logo {
            display: none;
          }
          @media (min-width: 768px) {
            .brand-logo {
              display: block;
              font-size: 24px;
              font-weight: normal;
              color: #0f172a;
              padding: 0 30px;
              margin-bottom: 40px;
              letter-spacing: -0.5px;
            }
            .brand-logo span {
              color: #22c55e;
            }
          }
          .nav-btn {
            background: none;
            border: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            height: 100%;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 0 10px;
          }
          @media (min-width: 768px) {
            .nav-btn {
              flex-direction: row;
              justify-content: flex-start;
              align-items: center;
              height: 50px;
              flex: none;
              padding: 0 20px;
              margin: 0 15px 10px 15px;
              border-radius: 12px;
              width: calc(100% - 30px);
            }
          }
          .nav-btn .icon {
            font-size: 24px;
            margin-bottom: 4px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          @media (min-width: 768px) {
            .nav-btn .icon {
              font-size: 20px;
              margin-bottom: 0;
              margin-right: 15px;
            }
          }
          .nav-btn .label {
            font-size: 11px;
            font-weight: normal;
            transition: color 0.3s;
            letter-spacing: 0.3px;
          }
          @media (min-width: 768px) {
            .nav-btn .label {
              font-size: 15px;
            }
          }
          @media (max-width: 767px) {
            .nav-btn:hover .icon {
              transform: translateY(-2px);
            }
            .nav-btn.active .icon {
              color: #22c55e;
              transform: translateY(-4px) scale(1.1);
            }
          }
          @media (min-width: 768px) {
            .nav-btn:hover {
              background: rgba(34, 197, 94, 0.05);
            }
            .nav-btn.active {
              background: rgba(34, 197, 94, 0.1);
            }
            .nav-btn:hover .icon,
            .nav-btn.active .icon {
              transform: scale(1.1);
              color: #22c55e;
            }
          }
          .nav-btn.active .label {
            color: #22c55e;
          }
          .nav-btn.inactive .icon {
            color: #94a3b8;
          }
          .nav-btn.inactive .label {
            color: #94a3b8;
          }
          .logout-desktop-only {
            display: none !important;
          }
          @media (min-width: 768px) {
            .logout-desktop-only {
              display: flex !important;
              margin-top: auto !important;
              margin: 20px 15px !important;
              padding: 12px 20px !important;
              border-radius: 12px !important;
              background: rgba(239, 68, 68, 0.05) !important;
              transition: all 0.3s ease !important;
              border: 1px solid rgba(239, 68, 68, 0.1) !important;
            }
            .logout-desktop-only:hover {
              background: rgba(239, 68, 68, 0.1) !important;
              transform: translateX(5px);
            }
            .logout-desktop-only .icon, .logout-desktop-only .label {
              color: #ef4444 !important;
            }
          }
        `}
      </style>

      {/* Main Navigation */}
      <div className="main-nav">
        <div className="brand-logo">
          Med<span>Track</span>
        </div>

        <button
          className={`nav-btn ${activeTab === "home" ? "active" : "inactive"}`}
          onClick={() => setActiveTab("home")}
        >
          <FaHome className="icon" />
          <div className="label">Home</div>
        </button>

        <button
          className={`nav-btn ${activeTab === "schedule" ? "active" : "inactive"}`}
          onClick={() => setActiveTab("schedule")}
        >
          <MdSchedule className="icon" />
          <div className="label">Schedule</div>
        </button>

        <button
          className={`nav-btn ${activeTab === "order" ? "active" : "inactive"}`}
          onClick={() => setActiveTab("order")}
        >
          <MdShoppingCart className="icon" />
          <div className="label">Order</div>
        </button>

        <button
          className={`nav-btn ${activeTab === "invoice" ? "active" : "inactive"}`}
          onClick={() => setActiveTab("invoice")}
        >
          <FaFileInvoice className="icon" />
          <div className="label">Invoice</div>
        </button>

        <button
          className={`nav-btn ${activeTab === "profile" ? "active" : "inactive"}`}
          onClick={() => setActiveTab("profile")}
        >
          <FaUser className="icon" />
          <div className="label">Profile</div>
        </button>

        <button
          className="nav-btn inactive logout-desktop-only"
          onClick={handleLogout}
        >
          <FaSignOutAlt className="icon" style={{ color: "#ef4444" }} />
          <div className="label" style={{ color: "#ef4444" }}>Logout</div>
        </button>
      </div>

      <div className="content-area">
        {renderSection()}
      </div>

      {/* FLOATING MEDICAL CHATBOT */}
      <ChatBot />
    </div>
  );
};

export default UserDashboard;