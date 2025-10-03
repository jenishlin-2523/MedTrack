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
        setInvoices(res.data || []);
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
  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px" }}>
      <button
        onClick={() => setSelectedInvoice(null)}
        style={{
          marginBottom: 20,
          padding: "6px 12px",
          borderRadius: 4,
          border: "none",
          cursor: "pointer",
          backgroundColor: "#2563eb",
          color: "#fff",
        }}
      >
        ← Back to Invoices
      </button>

      {/* Invoice Header */}
      <div style={{
        backgroundColor: "#f0f4ff",
        padding: "20px",
        borderRadius: 10,
        textAlign: "center",
        marginBottom: 20,
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
      }}>
        <h2 style={{ margin: "0 0 10px 0" }}>Invoice</h2>
        <p style={{ margin: "4px 0" }}><strong>Invoice Number:</strong> {selectedInvoice.invoice_number}</p>
        <p style={{ margin: "4px 0" }}><strong>Patient:</strong> {selectedInvoice.patient_name}</p>
        <p style={{ margin: "4px 0" }}><strong>Date:</strong> {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
      </div>

      {/* Medicines Table */}
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#2563eb", color: "#fff" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>Medicine</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Qty</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Price</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {selectedInvoice.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "8px" }}>{item.name}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>{item.selectedQty}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>₹ {item.price}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>₹ {item.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div style={{
        textAlign: "right",
        fontWeight: "bold",
        fontSize: 16,
        padding: "10px 0",
        borderTop: "1px solid #ddd"
      }}>
        Total: ₹ {selectedInvoice.total_amount}
      </div>
    </div>
  );
}


  // Schedule-like UI for all invoices
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "25px", color: "#2563eb" }}>
        Invoice Schedule
      </h2>

      {invoices.length === 0 && (
        <p style={{ textAlign: "center" }}>No invoices found.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {invoices.map((inv) => (
          <div
            key={inv._id}
            onClick={() => setSelectedInvoice(inv)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "15px 20px",
              border: "1px solid #ddd",
              borderRadius: 10,
              backgroundColor: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: "bold", color: "#333" }}>
                Invoice :  {inv.invoice_number}
              </p>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#555" }}>
                {new Date(inv.invoice_date).toLocaleDateString()}
              </p>
            </div>
            <div
              style={{
                backgroundColor: "#2563eb",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: 12,
              }}
            >
              View
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoicePage;
