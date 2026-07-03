const API_URL = 'http://localhost:3000/api/inscriptions';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchInscriptions = async () => {
  const response = await fetch(API_URL, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les inscriptions.');
  return await response.json();
};

export const saveInscription = async (inscriptionData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(inscriptionData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;};