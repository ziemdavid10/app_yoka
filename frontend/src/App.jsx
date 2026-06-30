import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './views/Login';
import SuperAdminDashboard from './views/SuperAdminDashboard';
import AdminDashboard from './views/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route Publique */}
        <Route path="/" element={<Login />} />

        {/* Routes Protégées par Rôle */}
        <Route 
          path="/superadmin/dashboard" 
          element={
            <ProtectedRoute allowedRole="SUPERADMIN">
              <SuperAdminDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRole="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;