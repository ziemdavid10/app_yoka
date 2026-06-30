const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Max 10 connexions simultanées
  queueLimit: 0
});

// Petit test de connexion au démarrage
pool.getConnection()
  .then(conn => {
    console.log('Connexion réussie à la base de données MySQL !');
    conn.release();
  })
  .catch(err => {
    console.error('Erreur de connexion à MySQL :', err.message);
  });

module.exports = pool;