import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaHome, FaUser, FaFileInvoice } from "react-icons/fa";
import { MdSchedule, MdShoppingCart } from "react-icons/md";

import HomePage from "../pages/HomePage";
import SchedulePage from "../pages/SchedulePage";
import OrderPage from "../pages/OrderPage";
import InvoicePage from "../pages/InvoicePage";
import ProfilePage from "../pages/ProfilePage";

const UserDashboard = () => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("home");

  const BASE_URL = process.env.REACT_APP_BASE_URL;

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
    if (loading) return <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>;
    if (error) return <div style={{ padding: "20px", color: "red", textAlign: "center" }}>{error}</div>;

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
  <div style={{ flex: 1, paddingBottom: 60 /* height of footer */ }}>
    {renderSection()}
  </div>

  {/* Footer Navigation */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "10px 0",
      background: "#fff",
      borderTop: "1px solid #ddd",
      position: "fixed",
      bottom: -20,
      width: "100%",
      height: 60, // explicitly define height
    }}
  >
    <button
      onClick={() => setActiveTab("home")}
      style={{
        background: "none",
        border: "none",
        color: activeTab === "home" ? "#4CAF50" : "#555",
        fontSize: "20px",
      }}
    >
      <FaHome />
      <div style={{ fontSize: "12px" }}>Home</div>
    </button>

    <button
      onClick={() => setActiveTab("schedule")}
      style={{
        background: "none",
        border: "none",
        color: activeTab === "schedule" ? "#4CAF50" : "#555",
        fontSize: "20px",
      }}
    >
      <MdSchedule />
      <div style={{ fontSize: "12px" }}>Schedule</div>
    </button>

    <button
      onClick={() => setActiveTab("order")}
      style={{
        background: "none",
        border: "none",
        color: activeTab === "order" ? "#4CAF50" : "#555",
        fontSize: "20px",
      }}
    >
      <MdShoppingCart />
      <div style={{ fontSize: "12px" }}>Order</div>
    </button>

    <button
      onClick={() => setActiveTab("invoice")}
      style={{
        background: "none",
        border: "none",
        color: activeTab === "invoice" ? "#4CAF50" : "#555",
        fontSize: "20px",
      }}
    >
      <FaFileInvoice />
      <div style={{ fontSize: "12px" }}>Invoice</div>
    </button>

    <button
      onClick={() => setActiveTab("profile")}
      style={{
        background: "none",
        border: "none",
        color: activeTab === "profile" ? "#4CAF50" : "#555",
        fontSize: "20px",
      }}
    >
      <FaUser />
      <div style={{ fontSize: "12px" }}>Profile</div>
    </button>
  </div>
</div>

  );
};

export default UserDashboard;
