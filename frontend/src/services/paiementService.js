const API_URL = 'http://localhost:3000/api/paiements';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchPaiements = async () => {
  const response = await fetch(API_URL, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger l\'historique des paiements.');
  return await response.json();
};

export const savePaiement = async (paiementData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(paiementData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const fetchStatsFinancieres = async () => {
  const response = await fetch('http://localhost:3000/api/paiements/stats', { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les statistiques.');
  return await response.json();
};

export const fetchDebiteurs = async () => {
  const response = await fetch('http://localhost:3000/api/paiements/debiteurs', { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger la liste des débiteurs.');
  return await response.json();
};

export const fetchDepenses = async () => {
  const response = await fetch(`${API_URL}/depenses`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Erreur de chargement des charges.');
  return await response.json();
};

export const saveDepense = async (depenseData) => {
  const response = await fetch(`${API_URL}/depenses`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(depenseData)
  });
  if (!response.ok) throw new Error("Échec de l'enregistrement de la charge.");
  return await response.json();
};