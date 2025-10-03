import React, { useEffect, useState } from "react";
import axios from "axios";

const ExpiringSoon = () => {
  const [medicines, setMedicines] = useState([]);
  const tableStyle = { borderCollapse: "collapse", width: "100%", marginTop: "20px" };
  const thStyle = { border: "1px solid #ddd", padding: "10px", background: "#fff4cc" };
  const tdStyle = { border: "1px solid #ddd", padding: "10px" };

  useEffect(() => {
    const fetchExpiring = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/medicine/list", {
          headers: { Authorization: `Bearer ${token}` }
        });

        const filtered = res.data.filter((med) =>
          med.status === "urgent – expires within 30 days" ||
          med.status === "near expiry (within 3 months)" ||
          med.status === "early alert (6-month zone)"
        );

        setMedicines(filtered);
      } catch (err) {
        console.error("Failed to fetch expiring medicines:", err);
      }
    };

    fetchExpiring();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Expiring Soon</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>S.No.</th>
            <th style={thStyle}>Medicine Name</th>
            <th style={thStyle}>Expiry Date</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Days Left</th>
          </tr>
        </thead>
        <tbody>
          {medicines.length === 0 ? (
            <tr>
              <td style={tdStyle} colSpan="5">No expiring medicines</td>
            </tr>
          ) : (
            medicines.map((med, index) => (
              <tr key={index}>
                <td style={tdStyle}>{index + 1}</td>
                <td style={tdStyle}>{med.name}</td>
                <td style={tdStyle}>{med.expiry_date}</td>
                <td style={tdStyle}>{med.status}</td>
                <td style={tdStyle}>{med.days_left}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExpiringSoon;
