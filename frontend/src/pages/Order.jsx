import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem("token");
  const BASE_URL = (process.env.REACT_APP_BASE_URL || "https://meditrack-backend-ynr1.onrender.com") + "/api/invoice";
  const navigate = useNavigate();

  // Fetch pending refill requests
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/pending-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch pending orders:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  // Accept order → redirect to billing with prefilled details
  const acceptOrder = async (order) => {
    try {
      await axios.post(
        `${BASE_URL}/accept-order`,
        { orderId: order._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from local list
      setOrders((prev) => prev.filter((o) => o._id !== order._id));

      // Navigate to billing page with prefilled data
      navigate("/dashboard/billing", {
        state: {
          prefill: {
            patientName: order.patientName || "",
            patientContact: order.requestedBy,
            medicineName: order.medicineName,
            quantity: order.quantity,
          },
        },
      });
    } catch (err) {
      console.error("Failed to accept order:", err);
      alert("Failed to accept order");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Pending Refill Requests</h2>
      {orders.length === 0 && <p>No pending refill requests.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {orders.map((order) => (
          <div
            key={order._id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f9f9f9",
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: "bold" }}>{order.medicineName}</p>
              <p style={{ margin: "4px 0 0 0" }}>
                <strong>Quantity:</strong> {order.quantity}
              </p>
              <p style={{ margin: "4px 0 0 0" }}>
                <strong>Patient Contact:</strong> {order.requestedBy}
              </p>
              <p style={{ margin: "4px 0 0 0" }}>
                <strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => acceptOrder(order)}
              style={{
                backgroundColor: "#4caf50",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#43a047")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4caf50")}
            >
              Accept & Bill
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;
