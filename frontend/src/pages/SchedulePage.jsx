import React, { useEffect, useState } from "react";
import axios from "axios";
import alarmSound from "../assets/alarm.mp3";

const SchedulePage = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const BASE_URL = process.env.REACT_APP_BASE_URL + "/api/invoice";

  // Fetch medicines with stock > 0
  const fetchSchedules = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/all/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filtered = res.data.flatMap((invoice) =>
        invoice.items
          .filter((item) => item.selectedQty > 0)
          .map((item) => ({
            name: item.name,
            medicineId: item.medicineId,
            stockLeft: item.selectedQty,
            times: item.schedule.map((s) => s.value),
          }))
      );

      setSchedules(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Update current time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Alarm & reduce stock
  useEffect(() => {
    const handleAlarms = async () => {
      for (let med of schedules) {
        for (let time of med.times) {
          const now = currentTime.toTimeString().slice(0, 5);
          if (now === time && med.stockLeft > 0) {
            const audio = new Audio(alarmSound);
            audio.play().catch(() => {});

            await axios.post(
              `${BASE_URL}/reduce-stock`,
              { medicineId: med.medicineId, username, quantity: 1 },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            fetchSchedules();
          }
        }
      }
    };
    handleAlarms();
  }, [currentTime, schedules, username, token]);

  // Categorize medicines by time of day
  const morning = [];
  const afternoon = [];
  const night = [];

  schedules.forEach((med) => {
    med.times.forEach((time) => {
      const [hour] = time.split(":").map(Number);
      if (hour >= 5 && hour < 12) morning.push({ ...med, time });
      else if (hour >= 12 && hour < 17) afternoon.push({ ...med, time });
      else night.push({ ...med, time });
    });
  });

  // Render section
  const renderSection = (title, list, color) => (
    <div style={{ marginBottom: 25 }}>
      <h2 style={{ color, borderBottom: `2px solid ${color}`, paddingBottom: 5 }}>{title}</h2>
      {list.length === 0 ? (
        <p style={{ fontStyle: "italic", color: "#666" }}>No medicines scheduled.</p>
      ) : (
        list.map((med, idx) => (
          <div
            key={idx}
            style={{
              border: `1px solid ${color}`,
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "14px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <span style={{ fontWeight: 500 }}>{med.name}</span>
            <span
              style={{
                border: `2px solid ${color}`,
                borderRadius: 6,
                padding: "4px 10px",
                whiteSpace: "nowrap",
                fontSize: "13px",
                backgroundColor: "#fff",
              }}
            >
              {med.time} | Stock: {med.stockLeft}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      {renderSection("Morning", morning, "#FF9800")}   {/* Orange for morning */}
      {renderSection("Afternoon", afternoon, "#2196F3")} {/* Blue for afternoon */}
      {renderSection("Night", night, "#9C27B0")}      {/* Purple for night */}
    </div>
  );
};

export default SchedulePage;
