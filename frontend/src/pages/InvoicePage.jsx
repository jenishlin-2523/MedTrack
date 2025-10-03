import React, { useEffect, useState } from "react";
import axios from "axios";

const InvoicePage = () => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!token || !username) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/api/invoice/all/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!Array.isArray(res.data)) throw new Error("Invalid response format");

        setInvoices(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch invoices.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [BASE_URL, token, username]);

  if (loading)
    return <div style={{ padding: 20, textAlign: "center" }}>Loading...</div>;
  if (error)
    return (
      <div style={{ padding: 20, color: "red", textAlign: "center" }}>{error}</div>
    );

  if (selectedInvoice) {
    // Show medicines for selected invoice
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "15px" }}>
        <button
          onClick={() => setSelectedInvoice(null)}
          style={{ marginBottom: 20 }}
        >
          ← Back to Invoices
        </button>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Invoice #{selectedInvoice.invoice_number}
        </h2>

        <div
          style={{
            backgroundColor: "#f5f5f5",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <p>
            <strong>Patient Name:</strong> {selectedInvoice.patient_name}
          </p>
          <p>
            <strong>Invoice Date:</strong>{" "}
            {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
          </p>
          <p>
            <strong>Total Amount:</strong> ₹ {selectedInvoice.total_amount}
          </p>
        </div>

        <h3>Purchased Medicines:</h3>
        {selectedInvoice.items.map((item, index) => (
          <div
            key={index}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Name:</strong> {item.name}
            </p>
            <p>
              <strong>Quantity:</strong> {item.selectedQty}
            </p>
            <p>
              <strong>Price:</strong> ₹ {item.price}
            </p>
            <p>
              <strong>Subtotal:</strong> ₹ {item.subtotal}
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Show all invoices as cards
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "15px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>All Invoices</h2>
      {invoices.length === 0 && <p>No invoices found.</p>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >
        {invoices.map((inv) => (
          <div
            key={inv._id}
            onClick={() => setSelectedInvoice(inv)}
            style={{
              cursor: "pointer",
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "10px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <p>
              <strong>Invoice #:</strong> {inv.invoice_number}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(inv.invoice_date).toLocaleDateString()}
            </p>
            <p>
              <strong>Total:</strong> ₹ {inv.total_amount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoicePage;
