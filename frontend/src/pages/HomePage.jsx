import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaUser, FaPills, FaCalendarAlt, FaHeartbeat } from "react-icons/fa";

const HomePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    const fetchAllMedicines = async () => {
      if (!token || !username) {
        setError("User not logged in.");
        setLoading(false);
        return;
      }

      try {
        // Fetch all invoices
const res = await axios.get(`${BASE_URL}/api/invoice/all/${username}`, {
  headers: { Authorization: `Bearer ${token}` },
});

// res.data should now be an array
if (!Array.isArray(res.data)) throw new Error("Invalid data format from server");

// Flatten all items from all invoices
const allItems = res.data.reduce((acc, invoice) => {
  if (invoice.items) acc.push(...invoice.items.map(i => ({ ...i, patient_name: invoice.patient_name })));
  return acc;
}, []);

setItems(allItems || []);

      } catch (err) {
        console.error(err);
        setError("Failed to fetch user medicines.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllMedicines();
  }, [BASE_URL, token, username]);

  if (loading) return <div style={{ padding: 20, textAlign: "center" }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: "red", textAlign: "center" }}>{error}</div>;

  // Card style
  const cardStyle = {
    flex: "1 1 200px",
    minWidth: 200,
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    background: "#fff",
    textAlign: "center",
    margin: 10,
  };

  // Patient Name from the latest invoice
  const patientName = items.length > 0 ? items[0].patient_name : "-";

  // Total medicines & units
  const totalMedicines = items.length;
  const totalUnits = items.reduce((sum, i) => sum + (i.selectedQty || 0), 0);

  // Upcoming schedule (next 3 medicines with schedules)
  const upcomingSchedule = items
    .filter((i) => i.schedule?.length > 0)
    .map((i) => ({
      name: i.name,
      schedule: i.schedule.map((s) => `${s.time} (${s.value})`).join(", "),
    }))
    .slice(0, 3);

  // Health status
  const today = new Date();
  const hasExpired = items.some((i) => {
    if (!i.expiry_date) return false;
    const exp = new Date(i.expiry_date);
    exp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return exp < today;
  });
  const healthStatus = hasExpired ? "Needs Attention" : "Stable";

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: "#2563eb", textAlign: "center" }}>Patient Dashboard</h2>
      <p style={{ textAlign: "center", color: "#555" }}>
        Overview of all your medicines and schedules
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", marginTop: 20 }}>
        {/* Patient Name */}
        <div style={cardStyle}>
          <FaUser size={32} color="#2563eb" />
          <h3 style={{ margin: "10px 0 4px" }}>Patient</h3>
          <p>{patientName}</p>
        </div>

        {/* Total Medicines */}
        <div style={cardStyle}>
          <FaPills size={32} color="#f59e0b" />
          <h3 style={{ margin: "10px 0 4px" }}>Total Medicines</h3>
          <p>{totalMedicines} types</p>
          <p>{totalUnits} units</p>
        </div>

        {/* Upcoming Schedule */}
<div style={cardStyle}>
  <FaCalendarAlt size={32} color="#db2777" />
  <h3 style={{ margin: "10px 0 4px" }}>Upcoming Schedule</h3>
  {items.filter(i => i.schedule?.length > 0).length > 0 ? (
    items
      .filter((i) => i.schedule?.length > 0)
      .slice(0, 2) // only 2 medicines
      .map((i, idx) => (
        <div key={idx} style={{ marginBottom: 10 }}>
          <p style={{ fontWeight: "bold", marginBottom: 4 }}>{i.name}</p>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {i.schedule.map((s, index) => (
              <span
                key={index}
                style={{
                  border: "1px solid #10b981", // green border
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 12,
                  color: "#10b981",
                  backgroundColor: "#f0fdf4",
                }}
              >
                {s.time} ({s.value})
              </span>
            ))}
          </div>
        </div>
      ))
  ) : (
    <p>No scheduled medicines</p>
  )}
</div>
      </div>
    </div>
  );
};

export default HomePage;
