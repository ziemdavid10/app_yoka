const API_URL = '/api/paiements';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchPaiements = async (page = 1, limit = 10) => {
  const response = await fetch(`${API_URL}?page=${page}&limit=${limit}`, { headers: getHeaders() });
  if (!response.ok) throw new Error("Impossible de charger l'historique des paiements.");
  return await response.json(); // { data, pagination }
};

export const savePaiement = async (paiementData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(paiementData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors du paiement.');
  return data;
};

export const fetchStatsFinancieres = async (anneeId = null) => {
  const q = anneeId ? `?annee_id=${anneeId}` : '';
  const response = await fetch(`${API_URL}/stats${q}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les statistiques.');
  return await response.json();
};

export const fetchDebiteurs = async (page = 1, limit = 10, anneeId = null) => {
  const q = anneeId ? `&annee_id=${anneeId}` : '';
  const response = await fetch(`${API_URL}/debiteurs?page=${page}&limit=${limit}${q}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger la liste des débiteurs.');
  return await response.json(); // { data, pagination }
};

export const exportDebiteursPDF = () => {
  window.open(`${API_URL}/debiteurs/export-pdf?token=${localStorage.getItem('token')}`, '_blank');
};

export const fetchDepenses = async (page = 1, limit = 10) => {
  const response = await fetch(`${API_URL}/depenses?page=${page}&limit=${limit}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Erreur de chargement des charges.');
  return await response.json(); // { data, pagination }
};

export const saveDepense = async (depenseData) => {
  const response = await fetch(`${API_URL}/depenses`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(depenseData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Échec de l'enregistrement de la charge.");
  return data;
};

export const updatePaiement = async (id, data) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Erreur lors de la modification du paiement.');
  return json;
};

export const deletePaiement = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Erreur lors de la suppression du paiement.');
  return json;
};

export const updateDepense = async (id, data) => {
  const response = await fetch(`${API_URL}/depenses/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Erreur lors de la modification de la dépense.');
  return json;
};

export const deleteDepense = async (id) => {
  const response = await fetch(`${API_URL}/depenses/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Erreur lors de la suppression de la dépense.');
  return json;
};


// Liste des années scolaires (sélecteur des états financiers)
export const fetchAnnees = async () => {
  const response = await fetch(`${API_URL}/annees`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les années scolaires.');
  return await response.json();
};

// État financier par classe (ventilé scolarité/APE/examen), filtré par année
export const fetchEtatParClasse = async (anneeId = null) => {
  const q = anneeId ? `?annee_id=${anneeId}` : '';
  const response = await fetch(`${API_URL}/etats/classes${q}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger l\u0027état par classe.');
  return await response.json();
};

// État financier par élève (ventilé scolarité/APE/examen), filtré par année
export const fetchEtatParEleve = async (anneeId = null) => {
  const q = anneeId ? `?annee_id=${anneeId}` : '';
  const response = await fetch(`${API_URL}/etats/eleves${q}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger l\u0027état par élève.');
  return await response.json();
};
