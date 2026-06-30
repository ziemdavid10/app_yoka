const API_URL = 'http://localhost:3000/api/auth';

export const loginService = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      // Si le backend renvoie une erreur (401, 400, etc.), on la lève
      throw new Error(data.error || 'Une erreur est survenue lors de la connexion.');
    }

    return data; // Contient le message, le token, et les infos user
  } catch (error) {
    throw error;
  }
};