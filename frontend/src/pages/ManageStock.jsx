import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const statusColors = {
  valid: "#d4edda",
  "early alert (6-month zone)": "#fff3cd",
  "near expiry (within 3 months)": "#ffeeba",
  "urgent – expires within 30 days": "#f8d7da",
  expired: "#f5c6cb",
};

const ManageStock = () => {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/medicine/list", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        const sorted = (res.data || []).sort(
          (a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)
        );
        setMedicines(sorted);
      })
      .catch((err) => {
        console.error("Error fetching medicines:", err);
        alert("Failed to load medicines");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredMeds = medicines
    .filter((med) => med.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((med) => {
      if (tab === "return") return med.days_left <= 180 && med.status !== "expired";
      if (tab === "dispose") return med.status === "expired";
      return true;
    });

  const getTag = (status) => {
    if (status.includes("urgent")) return "🔴";
    if (status.includes("near")) return "🟠";
    if (status.includes("early")) return "🟡";
    if (status === "valid") return "🟢";
    return "❌";
  };

  const handleDispose = (id) => navigate(`/dispose/${id}`);
  const handleReturn = (id) => navigate(`/return/${id}`);

  return (
    <div style={{ padding: "20px" }}>
      <h2>📦 Manage Stock</h2>

      <div style={topBar}>
        <input
          type="text"
          placeholder="Search medicine..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />

        <div style={tabContainer}>
          <span onClick={() => setTab("all")} style={tabLink(tab === "all")}>All</span>
          <span onClick={() => setTab("return")} style={tabLink(tab === "return")}>Return</span>
          <span onClick={() => setTab("dispose")} style={tabLink(tab === "dispose")}>Dispose</span>
        </div>
      </div>

      {loading ? (
        <p>Loading medicines...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={th}>Name</th>
              <th style={th}>Expiry</th>
              <th style={th}>Qty</th>
              <th style={th}>Status</th>
              <th style={th}>Days Left</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeds.length === 0 ? (
              <tr>
                <td colSpan="7" style={td}>No matching medicines found.</td>
              </tr>
            ) : (
              filteredMeds.map((med, index) => (
                <tr key={med._id} style={{ backgroundColor: statusColors[med.status] || "#ffffff" }}>
                  <td style={td}>{index + 1}</td>
                  <td style={td}>{med.name || "-"}</td>
                  <td style={td}>{med.expiry_date || "-"}</td>
                  <td style={td}>{med.quantity ?? "-"}</td>
                  <td style={td}>
                    {getTag(med.status || "")} <span style={{ fontSize: "0.9em" }}>{med.status}</span>
                  </td>
                  <td style={td}>{med.days_left ?? "-"}</td>
                  <td style={td}>
                    {med.status === "expired" ? (
                      <button style={disposeBtn} onClick={() => handleDispose(med._id)}>Dispose</button>
                    ) : med.days_left <= 180 ? (
                      <button style={returnBtn} onClick={() => handleReturn(med._id)}>Return</button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Styling
const topBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "10px",
};

const tabContainer = {
  display: "flex",
  gap: "15px",
};

const tabLink = (active) => ({
  cursor: "pointer",
  paddingBottom: "4px",
  borderBottom: active ? "3px solid #007bff" : "3px solid transparent",
  color: active ? "#007bff" : "#333",
  fontWeight: active ? "bold" : "normal",
  fontSize: "16px",
});

const inputStyle = {
  padding: "10px",
  width: "100%",
  maxWidth: "400px",
  border: "1px solid #ccc",
  borderRadius: "5px",
};

const th = {
  padding: "12px",
  borderBottom: "2px solid #ddd",
  backgroundColor: "#f0f0f0",
  textAlign: "left",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #ccc",
};

const returnBtn = {
  padding: "6px 12px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const disposeBtn = {
  padding: "6px 12px",
  backgroundColor: "#dc3545",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

export default ManageStock;
