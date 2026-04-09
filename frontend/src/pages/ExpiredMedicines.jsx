import React, { useEffect, useState } from "react";
import axios from "axios";

const ExpiredMedicines = () => {
  const [medicines, setMedicines] = useState([]);

  const tableStyle = {
    borderCollapse: "collapse",
    width: "100%",
    marginTop: "20px",
  };

  const thStyle = {
    border: "1px solid #f3cfcf",
    padding: "10px",
    background: "#ffe6e6",
    color: "#990000",
    fontWeight: "bold",
  };

  const tdStyle = {
    border: "1px solid #f3cfcf",
    padding: "10px",
    textAlign: "center",
  };

  useEffect(() => {
    axios
      .get("https://meditrack-backend-ynr1.onrender.com/api/medicine/list", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        const expiredMeds = res.data.filter((med) => med.status === "expired");
        setMedicines(expiredMeds);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Expired Medicines</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>S.No.</th>
            <th style={thStyle}>Medicine Name</th>
            <th style={thStyle}>Expiry Date</th>
            <th style={thStyle}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {medicines.length === 0 ? (
            <tr>
              <td style={tdStyle} colSpan="4">
                No expired medicines
              </td>
            </tr>
          ) : (
            medicines.map((med, i) => (
              <tr key={med._id}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{med.name}</td>
                <td style={tdStyle}>{med.expiry_date}</td>
                <td style={tdStyle}>{med.quantity}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExpiredMedicines;
