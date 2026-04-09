import React, { useEffect, useState } from "react";
import axios from "axios";
import alarmSound from "../assets/alarm.mp3";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrophy, FaStar, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

const SchedulePage = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastTriggered, setLastTriggered] = useState("");

  // Gamification state
  const [score, setScore] = useState(parseInt(localStorage.getItem('medScore') || '0', 10));
  const [streak, setStreak] = useState(parseInt(localStorage.getItem('medStreak') || '0', 10));
  const [showReward, setShowReward] = useState(false);

  // Smart Delay active alarms
  const [activeAlarms, setActiveAlarms] = useState([]);

  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");
  const BASE_URL = (process.env.REACT_APP_API_BASE || "https://meditrack-backend-ynr1.onrender.com") + "/api/invoice";

  const fetchSchedules = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/all/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const groupedMap = new Map();

      (res.data || []).forEach((invoice) => {
        (invoice.items || []).forEach((item) => {
          if (item.selectedQty > 0) {
            const times = (item.schedule || []).map((s) => s.value);
            if (times.length === 0) return;

            if (groupedMap.has(item.medicineId)) {
              const existing = groupedMap.get(item.medicineId);
              existing.stockLeft += item.selectedQty;
              times.forEach(t => {
                if (!existing.times.includes(t)) existing.times.push(t);
              });
            } else {
              groupedMap.set(item.medicineId, {
                id: item.medicineId + Math.random().toString(), // Unique key for mapping
                name: item.name,
                medicineId: item.medicineId,
                stockLeft: item.selectedQty,
                times: [...times],
                taken: false
              });
            }
          }
        });
      });

      setSchedules(Array.from(groupedMap.values()));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [username, token]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Check more frequently
    return () => clearInterval(timer);
  }, []);

  // Update Game Stats
  const addScore = (points) => {
    const newScore = score + points;
    const newStreak = streak + 1;
    setScore(newScore);
    setStreak(newStreak);
    localStorage.setItem('medScore', newScore.toString());
    localStorage.setItem('medStreak', newStreak.toString());

    setShowReward(true);
    setTimeout(() => setShowReward(false), 3000);
  };

  // Alarm & Smart Delay Trigger Logic
  useEffect(() => {
    const handleAlarms = () => {
      const nowString = currentTime.toTimeString().slice(0, 5);

      // Prevent spamming
      if (nowString === lastTriggered) return;

      let newlyTriggered = [];

      schedules.forEach((med) => {
        if (med.times.includes(nowString) && med.stockLeft > 0) {
          // Check if it's already an active alarm
          if (!activeAlarms.find(a => a.medicineId === med.medicineId && a.originalTime === nowString)) {
            newlyTriggered.push({
              ...med,
              originalTime: nowString,
              delayedUntil: null, // Not delayed yet
              triggerHash: Math.random().toString()
            });
          }
        }
      });

      if (newlyTriggered.length > 0) {
        setActiveAlarms(prev => [...prev, ...newlyTriggered]);
        setLastTriggered(nowString);
        playAudio();
      }

      // Check delayed alarms
      activeAlarms.forEach(alarm => {
        if (alarm.delayedUntil) {
          if (nowString === alarm.delayedUntil) {
            playAudio();
            // Clear the delay so it shows as active now
            setActiveAlarms(prev => prev.map(a =>
              a.triggerHash === alarm.triggerHash ? { ...a, delayedUntil: null } : a
            ));
          }
        }
      });
    };
    handleAlarms();
  }, [currentTime, schedules, activeAlarms, lastTriggered]);

  const playAudio = () => {
    const audio = new Audio(alarmSound);
    audio.play().catch(() => console.error("Audio playback failed. Please interact with document."));
  };

  const handleTakePill = async (alarm) => {
    try {
      await axios.post(
        `${BASE_URL}/reduce-stock`,
        { medicineId: alarm.medicineId, username, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from active alarms
      setActiveAlarms(prev => prev.filter(a => a.triggerHash !== alarm.triggerHash));

      // Gamification Reward
      // More points if they didn't delay it
      const points = alarm.delayedUntil ? 10 : 50;
      addScore(points);

      fetchSchedules(); // Refresh stock
    } catch (err) {
      console.error("Failed to reduce stock:", err);
      alert("Error marking as taken.");
    }
  };

  const handleSmartDelay = (alarm, delayMinutes) => {
    // Calculate new time
    const newTime = new Date(currentTime.getTime() + delayMinutes * 60000);
    const delayString = newTime.toTimeString().slice(0, 5);

    // Reset streak slightly as penalization for snoozing
    if (streak > 0) {
      setStreak(Math.max(0, streak - 1));
      localStorage.setItem('medStreak', Math.max(0, Math.max(0, streak - 1)).toString());
    }

    setActiveAlarms(prev => prev.map(a =>
      a.triggerHash === alarm.triggerHash ? { ...a, delayedUntil: delayString } : a
    ));
  };


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

  const renderSection = (title, list, color, Icon) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ marginBottom: 30, background: "#fff", borderRadius: 16, padding: "20px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}
    >
      <div style={{ display: "flex", alignItems: "center", borderBottom: `2px solid ${color}30`, paddingBottom: 10, marginBottom: 15 }}>
        <Icon style={{ color: color, fontSize: 24, marginRight: 10 }} />
        <h2 style={{ color: '#333', margin: 0, fontSize: 20, fontWeight: "normal" }}>{title}</h2>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "#999", fontStyle: "italic" }}>
          No medicines scheduled
        </div>
      ) : (
        list.map((med, idx) => (
          <motion.div
            whileHover={{ scale: 1.01 }}
            key={idx}
            className="med-item"
            style={{
              borderLeft: `4px solid ${color}`,
            }}
          >
            <div>
              <div style={{ fontWeight: "normal", fontSize: "16px", color: "#333", marginBottom: 4 }}>{med.name}</div>
              <div style={{ fontSize: "13px", color: "#666", display: "flex", alignItems: "center" }}>
                <FaClock style={{ marginRight: 5, color: color }} />
                {med.time}
              </div>
            </div>
            <div className="med-item-stock" style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: 4 }}>Stock left</div>
              <div style={{ fontWeight: "normal", color: med.stockLeft < 5 ? "#ef4444" : "#4CAF50", fontSize: "18px" }}>
                {med.stockLeft}
              </div>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );

  return (
    <div className="schedule-container">
      <style>{`
        .schedule-container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 100px;
          font-family: 'Inter', sans-serif;
        }
        .gamification-header {
          background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
          color: white;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 20px rgba(76, 175, 80, 0.2);
        }
        .gamification-stats {
          display: flex;
          gap: 20px;
        }
        .stat-box {
          text-align: center;
          background: rgba(255, 255, 255, 0.2);
          padding: 10px 20px;
          border-radius: 12px;
          flex: 1;
        }
        .alarm-card {
          background: #fff;
          border: 2px solid #ef4444;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.2);
          position: relative;
          overflow: hidden;
        }
        .alarm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .alarm-icon {
          font-size: 40px;
          color: #ef4444;
          animation: wobble 2s infinite;
        }
        .delay-options {
          display: flex;
          gap: 10px;
        }
        .med-item {
          padding: 16px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #fafafa;
          transition: box-shadow 0.2s;
          border-radius: 0 8px 8px 0;
        }
        .btn-green {
          background: #4CAF50;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 15px;
          font-size: 16px;
          font-weight: normal;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
          flex: 2;
        }
        .btn-delay {
          flex: 1;
          padding: 10px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          cursor: pointer;
          font-weight: normal;
          color: #475569;
        }
        
        @media (max-width: 600px) {
          .gamification-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
          .gamification-stats {
            width: 100%;
            justify-content: space-around;
            gap: 10px;
          }
          .alarm-header {
            flex-direction: column-reverse;
            gap: 10px;
            text-align: center;
          }
          .alarm-icon {
            margin-bottom: 5px;
          }
          .delay-options {
            flex-direction: column;
          }
          .med-item {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 10px;
          }
          .med-item-stock {
            text-align: left !important;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #eaeaea;
            padding-top: 10px;
            margin-top: 5px;
          }
        }
        @keyframes wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
      `}</style>
      {/* Gamification Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gamification-header"
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "normal", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FaTrophy style={{ marginRight: "10px", color: "#FFD700" }} />
            Health Score
          </h1>
          <p style={{ margin: "5px 0 0 0", opacity: 0.9, fontSize: "14px", fontWeight: "normal" }}>Stay consistent to earn points!</p>
        </div>
        <div className="gamification-stats">
          <div className="stat-box">
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "normal", opacity: 0.9 }}>Points</div>
            <div style={{ fontSize: "28px", fontWeight: "normal", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {score}
              <AnimatePresence>
                {showReward && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.5 }}
                    animate={{ opacity: 1, y: -20, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    style={{ position: 'absolute', color: '#FFD700', fontSize: '20px', right: '-40px' }}
                  >
                    +50
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "normal", opacity: 0.9 }}>Streak</div>
            <div style={{ fontSize: "28px", fontWeight: "normal", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {streak} <span style={{ fontSize: "20px", marginLeft: "5px" }}>🔥</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active "Smart Delay" Alarms Dashboard */}
      <AnimatePresence>
        {activeAlarms.filter(a => !a.delayedUntil).map((alarm, idx) => (
          <motion.div
            key={alarm.triggerHash}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, height: 0 }}
            className="alarm-card"
          >
            {/* Pulse effect */}
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#ef4444', zIndex: 0 }}
            />

            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "15px" }}>
              <div className="alarm-header">
                <div>
                  <h3 style={{ margin: 0, color: "#ef4444", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "normal" }}>Time to take your meds!</h3>
                  <h2 style={{ margin: "5px 0", fontSize: "28px", fontWeight: "normal", color: "#333" }}>{alarm.name}</h2>
                  <p style={{ margin: 0, color: "#666", fontWeight: "normal" }}>Scheduled for {alarm.originalTime}</p>
                </div>
                <FaClock className="alarm-icon" />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTakePill(alarm)}
                  className="btn-green"
                >
                  <FaCheckCircle style={{ marginRight: 8 }} /> Taken Now (+50 pts)
                </motion.button>
              </div>

              {/* Smart Delay Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <div style={{ fontSize: "13px", color: "#666", fontWeight: "normal", textTransform: "uppercase", textAlign: "center" }}>Or Snooze (Break Streak)</div>
                <div className="delay-options">
                  <button onClick={() => handleSmartDelay(alarm, 5)} className="btn-delay">
                    5 mins
                  </button>
                  <button onClick={() => handleSmartDelay(alarm, 15)} className="btn-delay">
                    15 mins
                  </button>
                  <button onClick={() => handleSmartDelay(alarm, 60)} className="btn-delay">
                    1 hour
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "20px" }}>
        {renderSection("Morning", morning, "#FF9800", FaStar)}
        {renderSection("Afternoon", afternoon, "#2196F3", FaStar)}
        {renderSection("Night", night, "#9C27B0", FaStar)}
      </div>
    </div>
  );
};

export default SchedulePage;
