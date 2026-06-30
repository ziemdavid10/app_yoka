import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const userJson = localStorage.getItem('user');

  // 1. Si pas de token, retour au login
  if (!token || !userJson) {
    return <Navigate to="/" replace />;
  }

  const user = JSON.parse(userJson);

  // 2. Si le rôle requis n'est pas présent dans la liste des rôles de l'utilisateur
  if (allowedRole && !user.roles.includes(allowedRole)) {
    // Redirection de secours si le rôle ne correspond pas
    return <Navigate to="/" replace />;
  }

  // 3. Si tout est OK, on affiche la page demandée
  return children;
};

export default ProtectedRoute;