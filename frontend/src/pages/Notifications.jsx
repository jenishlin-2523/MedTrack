import React from "react";
import { BellRing, Calendar, AlertCircle } from "lucide-react";


const getIcon = (type) => {
  switch (type) {
    case "expiry":
      return <Calendar size={20} color="#e29500" />;
    case "missed":
      return <AlertCircle size={20} color="#d40000" />;
    case "low-stock":
      return <BellRing size={20} color="#0077b6" />;
    default:
      return <BellRing size={20} />;
  }
};

const Notifications = () => {
  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>Notifications</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {mockNotifications.map((notif) => (
          <div
            key={notif.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "15px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "#fdfdfd",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ marginRight: "15px" }}>{getIcon(notif.type)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "600" }}>{notif.title}</div>
              <div style={{ fontSize: "14px", color: "#555" }}>{notif.message}</div>
            </div>
            <div style={{ fontSize: "12px", color: "#999", marginLeft: "10px" }}>
              {notif.timestamp}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
