import React, { useEffect, useState } from "react";
import axios from "axios";

const OrderPage = () => {
  const [outOfStock, setOutOfStock] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const BASE_URL = process.env.REACT_APP_BASE_URL + "/api/invoice";

  // Fetch out-of-stock medicines and pending orders
  useEffect(() => {
    const fetchOutOfStock = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/out-of-stock/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOutOfStock(res.data);
      } catch (err) {
        console.error("Failed to fetch out-of-stock medicines:", err);
      }
    };

    const fetchPendingOrders = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/user-orders/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingOrders(res.data.filter((o) => o.status === "pending"));
      } catch (err) {
        console.error("Failed to fetch pending orders:", err);
      }
    };

    fetchOutOfStock();
    fetchPendingOrders();
  }, [username, token]);

  const openDialog = (med) => {
    setSelectedMed(med);
    setQuantity(1);
    setShowDialog(true);
  };

  const placeOrder = async () => {
    if (!quantity || quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    try {
      const res = await axios.post(
        `${BASE_URL}/place-order`,
        {
          medicineName: selectedMed.name,
          quantity: Number(quantity),
          requestedBy: username,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`Refill request placed for ${selectedMed.name}`);
      setShowDialog(false);

      // Add to pendingOrders state
      setPendingOrders([
        ...pendingOrders,
        { medicineName: selectedMed.name, status: "pending", _id: res.data.orderId },
      ]);
    } catch (err) {
      console.error("Failed to place order:", err);
      alert("Failed to place order");
    }
  };

  const isPending = (medName) => {
    return pendingOrders.some((o) => o.medicineName === medName && o.status === "pending");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: "#1e6922ff" }}>Order / Refill</h2>
      {outOfStock.length === 0 && <p>No medicines to refill.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {outOfStock.map((med, idx) => (
          <div
            key={idx}
            style={{
              border: "2px solid #4caf50",
              borderRadius: 12,
              padding: "10px 15px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "linear-gradient(145deg, #e8f5e9, #c8e6c9)",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            <span style={{ fontWeight: "bold", color: "#1b5e20" }}>{med.name}</span>
            <button
              disabled={isPending(med.name)}
              onClick={() => !isPending(med.name) && openDialog(med)}
              style={{
                backgroundColor: isPending(med.name) ? "#FFA726" : "#4caf50",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: 8,
                cursor: isPending(med.name) ? "not-allowed" : "pointer",
                fontWeight: "bold",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isPending(med.name)) e.currentTarget.style.backgroundColor = "#43a047";
              }}
              onMouseLeave={(e) => {
                if (!isPending(med.name)) e.currentTarget.style.backgroundColor = "#4caf50";
              }}
            >
              {isPending(med.name) ? "Pending" : "Refill"}
            </button>
          </div>
        ))}
      </div>

      {/* Dialog */}
      {showDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#f1f8e9",
              padding: 25,
              borderRadius: 12,
              width: 320,
              display: "flex",
              flexDirection: "column",
              gap: 15,
              boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ textAlign: "center", color: "#2e7d32" }}>{selectedMed.name}</h3>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{
                padding: 8,
                fontSize: 16,
                borderRadius: 6,
                border: "1px solid #4caf50",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #4caf50",
                  cursor: "pointer",
                  backgroundColor: "#ffffff",
                  color: "#2e7d32",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>
              <button
                onClick={placeOrder}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: "#4caf50",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
