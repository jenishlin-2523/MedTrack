// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { getToken, getUserRole } from "./utils/auth"; // make sure getUserRole exists
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import Dashboard from "./components/Dashboard"; // admin dashboard
import UserDashboard from "./components/UserDashboard"; // user dashboard

// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = getToken();
  const role = getUserRole();

  if (!token) {
    // Not logged in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Role not authorized
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => {
  const token = getToken();
  const role = getUserRole();

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
        <Route
          path="/"
          element={
            token
              ? role === "admin"
                ? <Navigate to="/dashboard" />
                : <Navigate to="/user-dashboard" />
              : <Navigate to="/login" />
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
