const API_URL = 'http://localhost:3000/api/eleves';

// Éléments de configuration globale pour les requêtes
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}` // Optionnel pour le moment, mais prêt pour la sécurité
});

export const fetchEleves = async () => {
  const response = await fetch(API_URL, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les élèves.');
  return await response.json();
};

export const saveEleve = async (eleveData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(eleveData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors de l'ajout.");
  return data;
};