const API_URL = 'http://localhost:3000/api/paiements';

export const fetchPaiements = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Impossible de charger l\'historique des paiements.');
  return await response.json();
};

export const savePaiement = async (paiementData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paiementData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const fetchStatsFinancieres = async () => {
  const response = await fetch('http://localhost:3000/api/paiements/stats');
  if (!response.ok) throw new Error('Impossible de charger les statistiques.');
  return await response.json();
};

export const fetchDebiteurs = async () => {
  const response = await fetch('http://localhost:3000/api/paiements/debiteurs');
  if (!response.ok) throw new Error('Impossible de charger la liste des débiteurs.');
  return await response.json();
};

// NOUVEAU : Récupérer les dépenses
export const fetchDepenses = async () => {
  const response = await fetch(`${API_URL}/depenses`);
  if (!response.ok) throw new Error('Erreur de chargement des charges.');
  return await response.json();
};

// NOUVEAU : Créer une dépense
export const saveDepense = async (depenseData) => {
  const response = await fetch(`${API_URL}/depenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(depenseData)
  });
  if (!response.ok) throw new Error("Échec de l'enregistrement de la charge.");
  return await response.json();
};