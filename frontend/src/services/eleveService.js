const API_URL = '/api/eleves';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchEleves = async (page = 1, limit = 10) => {
  const response = await fetch(`${API_URL}?page=${page}&limit=${limit}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les élèves.');
  return await response.json(); // { data, pagination }
};

export const fetchEleveById = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Élève introuvable.');
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

export const updateEleve = async (id, eleveData) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(eleveData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la modification.');
  return data;
};

export const deleteEleve = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la suppression.');
  return data;
};

export const exportElevesPDF = () => {
  window.open(`${API_URL}/export-pdf?token=${localStorage.getItem('token')}`, '_blank');
};
