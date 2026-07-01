const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./src/routes/authRoutes'); 

const eleveRoutes = require('./src/routes/eleveRoutes');

const classeRoutes = require('./src/routes/classeRoutes');

const inscriptionRoutes = require('./src/routes/inscriptionRoutes');

const paiementRoutes = require('./src/routes/paiementRoutes');

dotenv.config();

const app = express();

// Middlewares globaux
app.use(cors()); // Autorise le Frontend React à interroger le Backend
app.use(express.json()); // Permet à Express de lire le format JSON dans req.body

// Branchement des routes
app.use('/api/auth', authRoutes);
app.use('/api/eleves', eleveRoutes);
app.use('/api/classes', classeRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/paiements', paiementRoutes);

// Route de secours / Test
app.get('/', (req, res) => {
  res.send('Serveur de gestion scolaire actif et opérationnel !');
});

// Lancement du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Le serveur tourne sur : http://localhost:${PORT}`);
});