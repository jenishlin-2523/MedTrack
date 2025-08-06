import React, { useEffect, useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "20px",
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
};

const thStyle = {
  backgroundColor: "#f2f2f2",
  border: "1px solid #ddd",
  padding: "10px",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "10px",
};

const rowEvenStyle = {
  backgroundColor: "#fafafa",
};

const rowOddStyle = {
  backgroundColor: "#fff",
};

const titleStyle = {
  fontSize: "22px",
  fontWeight: "bold",
  marginBottom: "20px",
  fontFamily: "Arial",
};

const containerStyle = {
  padding: "30px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const controlBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px",
  flexWrap: "wrap",
  gap: "10px",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "14px",
  width: "250px",
};

const selectStyle = {
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "14px",
};

const paginationStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: "20px",
  gap: "10px",
};

const pageButtonStyle = {
  padding: "8px 14px",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  cursor: "pointer",
  borderRadius: "5px",
};

const activePageButtonStyle = {
  ...pageButtonStyle,
  backgroundColor: "#007bff",
  color: "#fff",
  fontWeight: "bold",
};

const disabledButtonStyle = {
  ...pageButtonStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const MedicineList = () => {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const token = getToken();
      const res = await axios.get("http://localhost:5000/api/medicine/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMedicines(res.data);
    } catch (error) {
      console.error("Failed to fetch medicines", error);
    }
  };

  const filteredMeds = medicines.filter((med) => {
    const matchSearch = med.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filterType === "All" || med.type?.toLowerCase() === filterType.toLowerCase();
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filteredMeds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMeds = filteredMeds.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>💊 Pharmacy Medicine Inventory</h2>

      <div style={controlBarStyle}>
        <input
          type="text"
          placeholder="Search medicine..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          style={inputStyle}
        />

        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
          style={selectStyle}
        >
          <option value="All">Filter by Type</option>
          <option value="Tablet">Tablet</option>
          <option value="Syrup">Syrup</option>
          <option value="Injection">Injection</option>
          <option value="Capsule">Capsule</option>
          <option value="Ointment">Ointment</option>
          <option value="Drops">Drops</option>
        </select>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Medicine Name</th>
            <th style={thStyle}>Manufacturer</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Pack Size</th>
            <th style={thStyle}>Expiry Date</th>
            <th style={thStyle}>Stock Qty</th>
            <th style={thStyle}>Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          {paginatedMeds.length === 0 ? (
            <tr>
              <td colSpan="8" style={tdStyle}>No matching medicines found.</td>
            </tr>
          ) : (
            paginatedMeds.map((med, index) => (
              <tr
                key={med._id || index}
                style={index % 2 === 0 ? rowEvenStyle : rowOddStyle}
              >
                <td style={tdStyle}>{startIndex + index + 1}</td>
                <td style={tdStyle}>{med.name}</td>
                <td style={tdStyle}>{med.manufacturer_name}</td>
                <td style={tdStyle}>{med.type}</td>
                <td style={tdStyle}>{med.pack_size_label}</td>
                <td style={tdStyle}>{med.expiry_date}</td>
                <td style={tdStyle}>{med.quantity ?? "N/A"}</td>
                <td style={tdStyle}>₹ {med.price} </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={paginationStyle}>
          <button
            style={currentPage === 1 ? disabledButtonStyle : pageButtonStyle}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ⬅ Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              style={currentPage === i + 1 ? activePageButtonStyle : pageButtonStyle}
              onClick={() => goToPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            style={currentPage === totalPages ? disabledButtonStyle : pageButtonStyle}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next ➡
          </button>
        </div>
      )}
    </div>
  );
};

export default MedicineList;
