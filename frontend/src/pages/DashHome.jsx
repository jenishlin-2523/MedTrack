// src/pages/DashHome.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import CountUp from "react-countup";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, LabelList
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A"];
const BASE_URL = process.env.REACT_APP_API_BASE || "https://meditrack-backend-ynr1.onrender.com";

const DashHome = () => {
  const [medicines, setMedicines] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState("");

  const username = localStorage.getItem("username") || "demoUser";

  useEffect(() => {
    fetchMedicines();
    fetchInvoices();
  }, []);

  // ------------------- Fetch Functions -------------------
  const fetchMedicines = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/medicine/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedicines(res.data || []);
    } catch (err) {
      console.error("Error fetching medicines:", err);
      setError("Failed to fetch medicines. Check console for details.");
    }
  };

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BASE_URL}/api/invoice/all/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(res.data || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    }
  };

  // ------------------- Counters -------------------
  const totalMedicines = medicines.length;
  const totalQuantity = medicines.reduce((sum, med) => sum + (med.quantity || 0), 0);
  const lowStock = medicines.filter((m) => m.quantity < 10).length;
  const nearExpiry = medicines.filter(
    (m) => ["urgent – expires within 30 days", "near expiry (within 3 months)"].includes(m.status)
  ).length;

  // ------------------- Charts -------------------
  const expiryDistribution = useMemo(() => {
    const statusCount = {};
    medicines.forEach((m) => {
      statusCount[m.status] = (statusCount[m.status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [medicines]);

  const stockByType = useMemo(() => {
    const typeCount = {};
    medicines.forEach((m) => {
      const type = m.type || "Unknown";
      typeCount[type] = (typeCount[type] || 0) + (m.quantity || 0);
    });
    return Object.entries(typeCount).map(([type, value]) => ({ type, value }));
  }, [medicines]);

  // ------------------- Custom Tooltip -------------------
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "#fff",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          
        }}>
          <p style={{ margin: 0 }}><strong>{label}</strong></p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color, margin: 0 }}>
              {p.name || p.dataKey}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: "30px", fontFamily: "'Times New Roman', sans-serif",overflow: "hidden",}}>
      <h2 style={{ marginBottom: "10px", color: "#333" }}>MediTrack Dashboard</h2>
      <p style={{ color: "#555", marginBottom: "30px" }}>Overview of medicines, stock, and visual insights</p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Counters */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
        {[{
          label: "Total Medicines",
          value: totalMedicines,
          color: "#0088FE"
        }, {
          label: "Total Stock Quantity",
          value: totalQuantity,
          color: "#00C49F"
        }, {
          label: "Low Stock Medicines",
          value: lowStock,
          color: "#FF8042"
        }, {
          label: "Near Expiry",
          value: nearExpiry,
          color: "#FFBB28"
        }].map((card) => (
          <div key={card.label} style={{
            flex: "1 1 200px",
            background: "#fff",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
            textAlign: "center",
            transition: "transform 0.3s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            <h4 style={{ marginBottom: "10px", color: card.color }}>{card.label}</h4>
            <CountUp start={0} end={card.value} duration={1.5} separator="," style={{ fontSize: "28px", fontWeight: "bold", color: "#333" }} />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* Expiry Donut Chart */}
<div style={{
  flex: 1,
  minWidth: "300px",
  height: "350px",
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
  position: "relative",
  overflow: "hidden",
  
}}>
  <h4 style={{ marginBottom: "20px" }}>Expiry Distribution</h4>
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={expiryDistribution}
        dataKey="value"
        nameKey="name"
        innerRadius={70}
        outerRadius={100}
        paddingAngle={3}
        cornerRadius={10}
        labelLine={false}
        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
      >
        {expiryDistribution.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={COLORS[index % COLORS.length]}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          background: "#fff",
          borderRadius: "8px",
          padding: "10px",
          boxShadow: "0 2px 15px rgba(0,0,0,0.15)"
        }}
        formatter={(value, name) => [`${value} Medicines`, name]}
      />
      <Legend
        verticalAlign="bottom"
        height={36}
        iconSize={10}
        formatter={(value) => <span style={{ fontSize: "12px", color: "#555" }}>{value}</span>}
      />
    </PieChart>
  </ResponsiveContainer>

  {/* Center total */}
  <div style={{
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    pointerEvents: "none",
    
  }}>
    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#333" }}>
      {medicines.length}
    </span>
    <br />
    <span style={{ fontSize: "12px", color: "#888" }}>Total Medicines</span>
  </div>
</div>


        {/* Stock Bar Chart */}
        <div style={{ flex: 1, minWidth: "300px", height: "350px", background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}>
          <h4 style={{ marginBottom: "20px" }}>Stock by Type</h4>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={stockByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" tick={{ fill: "#555" }} />
              <YAxis tick={{ fill: "#555" }} />
              <Tooltip content={CustomTooltip} />
              <Bar dataKey="value" fill="url(#colorStock)" radius={[8, 8, 0, 0]}>
                <LabelList dataKey="value" position="top" />
              </Bar>
              <defs>
                <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00C49F" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#0088FE" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashHome;
