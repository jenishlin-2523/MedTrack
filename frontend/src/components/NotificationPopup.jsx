import React, { useEffect, useState } from "react";
import axios from "axios";

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "transparent",
  zIndex: 999,
};

const popupStyle = {
  position: "absolute",
  top: "70px",
  right: "20px",
  width: "320px",
  background: "#fff",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  borderRadius: "10px",
  padding: "15px",
  zIndex: 1000,
  color: "#000",
  animation: "slideIn 0.3s ease",
  maxHeight: "400px",
  overflowY: "auto",
  fontFamily: "'Segoe UI', sans-serif",
};

const itemStyle = {
  padding: "12px",
  borderBottom: "1px solid #e0e0e0",
  cursor: "pointer",
  borderRadius: "6px",
  transition: "background 0.2s ease",
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
};

const itemHoverStyle = {
  backgroundColor: "#f3f4f6",
};

const tagStyles = {
  base: {
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#fff",
    marginLeft: "auto",
    whiteSpace: "nowrap",
  },
  Urgent: {
    backgroundColor: "#dc2626",
  },
  "Near Expiry": {
    backgroundColor: "#f97316",
  },
  Default: {
    backgroundColor: "#eab308",
  },
};

const NotificationPopup = ({ isOpen, onClose, onMarkRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(
        "https://meditrack-backend-ynr1.onrender.com/api/medicine/notifications?unread=false",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data && Array.isArray(res.data.notifications)) {
        const notifications = res.data.notifications;

        const proximityOrder = {
          Urgent: 0,
          "Near Expiry": 1,
          Default: 2,
        };

        const finalSorted = notifications.sort((a, b) => {
          if (a.notification_read !== b.notification_read) {
            return a.notification_read ? 1 : -1;
          }
          const pA = proximityOrder[a.proximity] ?? 2;
          const pB = proximityOrder[b.proximity] ?? 2;
          return pA - pB;
        });

        setNotifications(finalSorted);
      } else {
        console.error("Invalid format from backend:", res.data);
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
      setNotifications([]);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch(
        "https://meditrack-backend-ynr1.onrender.com/api/medicine/notifications/mark-as-read",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (onMarkRead) onMarkRead();
      setHasMarkedRead(true);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  useEffect(() => {
    let timer;
    if (isOpen) {
      fetchNotifications();
      setHasMarkedRead(false);

      timer = setTimeout(() => {
        markAllAsRead();
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleNotificationClick = (note) => {
    if (note.redirectTo) {
      window.location.href = note.redirectTo;
    }
  };

  if (!isOpen) return null;

  const unread = notifications.filter((n) => !n.notification_read);
  const read = notifications.filter((n) => n.notification_read);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={popupStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <strong style={{ fontSize: "16px" }}>Notifications</strong>
          <span style={{ cursor: "pointer", fontSize: "16px" }} onClick={onClose}>
            ✕
          </span>
        </div>

        {notifications.length === 0 ? (
          <p style={{ color: "#555", fontStyle: "italic" }}>
            No upcoming medicine expiries.
          </p>
        ) : (
          [...unread, ...read].map((note, i) => {
            const isRead = note.notification_read || hasMarkedRead;
            const displayNumber = !isRead ? unread.indexOf(note) + 1 : null;
            const tagColor = tagStyles[note.proximity] || tagStyles.Default;

            return (
              <div
                key={note.id || i}
                style={{
                  ...itemStyle,
                  ...(hovered === i ? itemHoverStyle : {}),
                  backgroundColor: isRead ? "#f9fafb" : "#fff",
                  fontWeight: isRead ? "normal" : "bold",
                  color: isRead ? "#555" : "#111",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleNotificationClick(note)}
              >
                {!isRead && (
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: "20px",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: "#ef4444",
                    }}
                  >
                    {displayNumber}
                  </span>
                )}

                <div style={{ flex: 1 }}>
                  <div>{note.message}</div>
                </div>

                <div style={{ ...tagStyles.base, ...tagColor }}>
                  {note.proximity}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationPopup;
