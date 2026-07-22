const API_URL = '/api/classes';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchClasses = async (page = 1, limit = 10) => {
  const response = await fetch(`${API_URL}?page=${page}&limit=${limit}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les classes.');
  return await response.json(); // { data, pagination }
};

export const saveClasse = async (classeData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(classeData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la création.');
  return data;
};

export const updateClasse = async (id, classeData) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(classeData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la modification.');
  return data;
};

export const deleteClasse = async (id) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la suppression.');
  return data;
};

export const fetchTranches = async (classeId) => {
  const response = await fetch(`${API_URL}/${classeId}/tranches`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les tranches.');
  return await response.json();
};

export const saveTranches = async (classeId, tranches) => {
  const response = await fetch(`${API_URL}/${classeId}/tranches`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tranches })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la sauvegarde des tranches.');
  return data;
};
