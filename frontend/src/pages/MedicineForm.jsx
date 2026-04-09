import React, { useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";

const MedicineForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    expiry_date: "",
    price: "",
    manufacturer_name: "",
    type: "",
    pack_size_label: "",
    quantity: "",
  });

  const [csvFile, setCsvFile] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCSVChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return alert("Please select a CSV file.");
    const token = getToken();
    const formDataObj = new FormData();
    formDataObj.append("csv", csvFile);

    try {
      const res = await axios.post("https://meditrack-backend-ynr1.onrender.com/api/medicine/upload-csv", formDataObj, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert(res.data.message || "CSV uploaded successfully");
      setCsvFile(null);
    } catch (err) {
      console.error(err);
      alert("Error uploading CSV");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();

    try {
      const res = await axios.post("https://meditrack-backend-ynr1.onrender.com/api/medicine/add", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert(res.data.message || "Medicine added successfully");
      setFormData({
        name: "",
        expiry_date: "",
        price: "",
        manufacturer_name: "",
        type: "",
        pack_size_label: "",
        quantity: "",
      });
    } catch (err) {
      console.error(err);
      alert("Error adding medicine");
    }
  };

  const sectionStyle = {
    margin: "30px auto",
    maxWidth: "900px",
    padding: "20px 30px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    background: "#f9f9f9",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  };

  const headingStyle = {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#333",
    textAlign: "left",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    marginTop: "12px",
    fontSize: "14px",
    color: "#333",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  };

  const buttonStyle = {
    marginTop: "20px",
    padding: "10px 20px",
    fontSize: "15px",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
  };

  const greenButton = {
    ...buttonStyle,
    backgroundColor: "#28a745",
  };

  return (
    <div>
      {/* Manual Entry Section */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Add Medicine</h3>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: "0 0 48%" }}>
              <label style={labelStyle}>Medicine Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required style={inputStyle} />
            </div>

            <div style={{ flex: "0 0 48%" }}>
              <label style={labelStyle}>Expiry Date</label>
              <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} required style={inputStyle} />
            </div>

            <div style={{ flex: "0 0 48%" }}>
              <label style={labelStyle}>Price</label>
              <input type="number" name="price" step="0.01" value={formData.price} onChange={handleChange} style={inputStyle} />
            </div>

            <div style={{ flex: "0 0 48%" }}>
              <label style={labelStyle}>Manufacturer</label>
              <input type="text" name="manufacturer_name" value={formData.manufacturer_name} onChange={handleChange} style={inputStyle} />
            </div>

            <div style={{ flex: "0 0 48%" }}>
  <label style={labelStyle}>Type</label>
  <select
    name="type"
    value={formData.type}
    onChange={handleChange}
    style={inputStyle}
    required
  >
    <option value="">Select Type</option>
    <option value="Tablet">Tablet</option>
    <option value="Syrup">Syrup</option>
  </select>
</div>


            <div style={{ flex: "0 0 48%" }}>
              <label style={labelStyle}>Pack Size</label>
              <input type="text" name="pack_size_label" value={formData.pack_size_label} onChange={handleChange} style={inputStyle} />
            </div>

            <div style={{ flex: "0 0 48%" }}>
              <label style={labelStyle}>Quantity</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <button type="submit" style={buttonStyle}>Submit</button>
        </form>
      </div>

      {/* CSV Upload Section */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>Upload CSV File</h3>
        <input type="file" accept=".csv" onChange={handleCSVChange} style={{ marginTop: "10px" }} />
        <br />
        <button onClick={handleCSVUpload} style={greenButton}>Upload CSV</button>
      </div>
    </div>
  );
};

export default MedicineForm;
