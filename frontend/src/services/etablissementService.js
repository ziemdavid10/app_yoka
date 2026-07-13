// services/etablissementService.js
const API_URL = 'http://localhost:3000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

// Récupérer tous les établissements
export const fetchEtablissements = async () => {
  const response = await fetch(`${API_URL}/etablissements`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les établissements.');
  return await response.json();
};

// Créer un nouvel établissement
export const saveEtablissement = async (etabData) => {
  const response = await fetch(`${API_URL}/etablissements`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(etabData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la création.');
  return data;
};

// Récupérer la liste globale des administrateurs d'établissements
export const fetchAdminsSysteme = async () => {
  const response = await fetch(`${API_URL}/auth/admins`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de récupérer la liste des administrateurs.');
  return await response.json();
};