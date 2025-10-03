// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getToken, getUserRole } from "./utils/auth"; // ensure getUserRole exists
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import Dashboard from "./components/Dashboard"; // admin dashboard
import UserDashboard from "./components/UserDashboard"; // user dashboard

// ---------------- ProtectedRoute ----------------
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = React.useMemo(() => getToken(), []);
  const role = React.useMemo(() => getUserRole(), []);

  if (!token) {
    // Not logged in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Role not authorized
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ---------------- RootRedirect ----------------
const RootRedirect = () => {
  const token = React.useMemo(() => getToken(), []);
  const role = React.useMemo(() => getUserRole(), []);

  if (!token) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/dashboard" replace />;
  return <Navigate to="/user-dashboard" replace />;
};

// ---------------- App Component ----------------
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />

        {/* Admin dashboard */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* User dashboard */}
        <Route
          path="/user-dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
