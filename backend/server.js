const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');
const path = require('path');

const authRoutes = require('./src/routes/authRoutes');
const eleveRoutes = require('./src/routes/eleveRoutes');
const classeRoutes = require('./src/routes/classeRoutes');
const inscriptionRoutes = require('./src/routes/inscriptionRoutes');
const paiementRoutes = require('./src/routes/paiementRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const etablissementRoutes = require('./src/routes/etablissementRoutes');
const anneeScolaireRoutes = require('./src/routes/anneeScolaireRoutes');
const parametresRoutes = require('./src/routes/parametresRoutes');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());

// Branchement des routes API
app.use('/api/auth', authRoutes);
app.use('/api/eleves', eleveRoutes);
app.use('/api/classes', classeRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/etablissements', etablissementRoutes);
app.use('/api/annees-scolaires', anneeScolaireRoutes);
app.use('/api/parametres', parametresRoutes);

// Servir les fichiers statiques du Frontend React (Dossier 'public' à côté de server.exe)
app.use(express.static(path.join(process.cwd(), 'public')));

// Redirection SPA React (Attrape toutes les routes non-API)
app.use((req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

/**
 * Script d'initialisation sécurisé des comptes administrateurs par défaut
 */
async function initialiserAdministrateurs() {
  try {
    const motDePasseDefaut = 'YokaSecure2026!';
    const hashedPass = await bcrypt.hash(motDePasseDefaut, 10);

    // 1. Initialisation du SUPERADMIN (superyoka)
    const [superAdminRows] = await db.execute(
      'SELECT id FROM utilisateurs WHERE identifiant = ?', 
      ['superyoka']
    );

    if (superAdminRows.length === 0) {
      const [resUser] = await db.execute(
        'INSERT INTO utilisateurs (etablissement_id, identifiant, mot_de_passe, nom, prenom) VALUES (?, ?, ?, ?, ?)',
        [null, 'superyoka', hashedPass, 'Super', 'Yoka']
      );

      const [resRole] = await db.execute('SELECT id FROM roles WHERE nom_role = ?', ['SUPERADMIN']);
      if (resRole.length > 0) {
        await db.execute(
          'INSERT INTO utilisateur_roles (utilisateur_id, role_id) VALUES (?, ?)',
          [resUser.insertId, resRole[0].id]
        );
      }
      console.log(' Compte [superyoka] créé avec succès.');
    } else {
      console.log(' Le compte [superyoka] existe déjà. Initialisation ignorée.');
    }

    // 2. Initialisation de l\'ADMIN CAMPUS (admin_campus)
    const [adminCampusRows] = await db.execute(
      'SELECT id FROM utilisateurs WHERE identifiant = ?', 
      ['admin_campus']
    );

    if (adminCampusRows.length === 0) {
      const [etabs] = await db.execute('SELECT id FROM etablissements LIMIT 1');
      const etablissement_id = etabs.length > 0 ? etabs[0].id : null;

      const [resUser] = await db.execute(
        'INSERT INTO utilisateurs (etablissement_id, identifiant, mot_de_passe, nom, prenom) VALUES (?, ?, ?, ?, ?)',
        [etablissement_id, 'admin_campus', hashedPass, 'Admin', 'Campus']
      );

      const [resRole] = await db.execute('SELECT id FROM roles WHERE nom_role = ?', ['ADMIN']);
      if (resRole.length > 0) {
        await db.execute(
          'INSERT INTO utilisateur_roles (utilisateur_id, role_id) VALUES (?, ?)',
          [resUser.insertId, resRole[0].id]
        );
      }
      console.log(' Compte [admin_campus] créé avec succès.');
    } else {
      console.log(' Le compte [admin_campus] existe déjà. Initialisation ignorée.');
    }

  } catch (error) {
    console.error(" Erreur lors de l'initialisation des administrateurs :", error);
  }
}

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Le serveur tourne sur : http://localhost:${PORT}`);
  
  // Exécution du script de seeding au démarrage
  await initialiserAdministrateurs();
});