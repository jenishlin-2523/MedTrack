import React, { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import MedicineForm from "../pages/MedicineForm";
import MedicineList from "../pages/MedicineList";
import NotificationPopup from "../components/NotificationPopup";
import ExpiredMedicines from "../pages/ExpiredMedicines";
import ExpiringSoon from "../pages/ExpiringSoon";
import ManageStock from "../pages/ManageStock";
import NewInvoice from "../pages/NewInvoice";
import { PlusCircle, ListOrdered, LogOut, Bell, Home , ShieldX, TimerReset, PackageCheck, FileText, Clock, Warehouse} from "lucide-react";
import axios from "axios";




const Dashboard = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Admin";

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem("token");

  // Fetch unread notifications count
  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/medicine/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allNotifications = res.data.notifications || [];
      const unread = allNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to load notification count", err);
      setUnreadCount(0);
    }
  };

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 2000); // every 10s
    return () => clearInterval(interval);
  }, []);

  // Fetch again when notification popup closes
  useEffect(() => {
    if (!showNotifications) {
      fetchUnreadCount();
    }
  }, [showNotifications]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <div style={layoutStyle}>
      <header style={headerStyle}>
        <div style={logoStyle}>MediTrack</div>
        <div style={headerRightStyle}>
          <span style={usernameStyle}>{username}</span>
          <div style={{ position: "relative" }}>
            <Bell
              size={20}
              style={iconStyle}
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
            {showNotifications && (
              <NotificationPopup
                token={token}
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                onMarkRead={() => setUnreadCount(0)}
              />
            )}
          </div>
          <LogOut size={20} style={iconStyle} onClick={handleLogout} />
        </div>
      </header>

      <div style={mainContainerStyle}>
        <aside style={sidebarStyle}>
          <h3 style={sidebarTitleStyle}>Dashboard</h3>
          <button style={buttonStyle} onClick={() => navigate("/dashboard")}>
            <Home size={16} style={iconMargin} />
            Home
          </button>
          <button style={buttonStyle} onClick={() => navigate("/dashboard/add-medicine")}>
            <PlusCircle size={16} style={iconMargin} />
            Add Medicine
          </button>
          <button style={buttonStyle} onClick={() => navigate("/dashboard/medicine-list")}>
            <Warehouse size={16} style={iconMargin} />
            Inventory
          </button>
          
          <hr style={{ margin: "20px 0", border: "1px solid #ddd" }} />
          <h> <b> Stock </b></h>
          <hr/>

          <button style={buttonStyle} onClick={() => navigate("/dashboard/manage-stock")}>
            <PackageCheck size={16} style={iconMargin} />
            Manage Stock
          </button>

          <button style={buttonStyle} onClick={() => navigate("/dashboard/expiring-soon")}>
            <TimerReset size={16} style={iconMargin} />
           Expiring Soon
          </button>

          <button style={buttonStyle} onClick={() => navigate("/dashboard/expired")}>
            <ShieldX size={16} style={iconMargin} />
            Expired Medicines
          </button>     

          <hr style={{ margin: "20px 0", border: "1px solid #ddd" }} />
          <h> <b> Billing </b></h>
          <hr/>

          <button style={buttonStyle} onClick={() => navigate("/dashboard/billing")}>
           <FileText size={16} style={iconMargin} />
           New Invoice
          </button>

          <button style={buttonStyle} onClick={() => navigate("/dashboard/billing-history")}>
           <Clock size={16} style={iconMargin} />
            Billing History
          </button>




        </aside>

        <main style={mainContentStyle}>
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="add-medicine" element={<MedicineForm />} />
            <Route path="medicine-list" element={<MedicineList />} />
            <Route path="expiring-soon" element={<ExpiringSoon/>} />
            <Route path="expired" element={<ExpiredMedicines />} />
            <Route path="manage-stock" element={<ManageStock />} />
            <Route path="billing" element={<NewInvoice />} />
           
          </Routes>
        </main>
      </div>
    </div>
  );
};

const DashboardHome = () => (
  <div>
    <h2>Welcome to MediTrack Dashboard</h2>
    <p>Use the sidebar to manage medicines and view your inventory.</p>
  </div>
);

// Badge for unread notifications
const badgeStyle = {
  position: "absolute",
  top: "-4px",
  right: "-4px",
  background: "red",
  color: "white",
  borderRadius: "50%",
  padding: "2px 6px",
  fontSize: "10px",
  fontWeight: "bold",
};

// Layout styles
const layoutStyle = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
};

const headerStyle = {
  height: "60px",
  backgroundColor: "#0e2850ff",
  color: "white",
  padding: "0 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoStyle = {
  fontSize: "20px",
  fontWeight: "bold",
};

const headerRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
};

const usernameStyle = {
  fontWeight: "500",
};

const iconStyle = {
  cursor: "pointer",
};

const mainContainerStyle = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const sidebarStyle = {
  width: "220px",
  backgroundColor: "#f0f0f0",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const sidebarTitleStyle = {
  marginBottom: "20px",
};

const buttonStyle = {
  padding: "10px 15px",
  background: "#ffffff",
  border: "1px solid #ddd",
  borderRadius: "5px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  marginBottom: "10px",
};

const iconMargin = {
  marginRight: "8px",
};

const mainContentStyle = {
  flex: 1,
  padding: "20px",
  overflowY: "auto",
};

export default Dashboard;
