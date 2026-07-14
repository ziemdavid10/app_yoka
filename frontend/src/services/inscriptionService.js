const API_URL = '/api/inscriptions';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchInscriptions = async (page = 1, limit = 10, classe_id = '') => {
  const params = new URLSearchParams({ page, limit });
  if (classe_id) params.append('classe_id', classe_id);
  const response = await fetch(`${API_URL}?${params}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les inscriptions.');
  return await response.json(); // { data, pagination }
};

export const saveInscription = async (inscriptionData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(inscriptionData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors de l'inscription.");
  return data;
};

export const updateInscription = async (id, inscriptionData) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(inscriptionData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la modification.');
  return data;
};

export const deleteInscription = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors de l'annulation.");
  return data;
};

export const exportInscriptionsPDF = (classe_id) => {
  const params = new URLSearchParams({ classe_id, token: localStorage.getItem('token') });
  window.open(`${API_URL}/export-pdf?${params}`, '_blank');
};
