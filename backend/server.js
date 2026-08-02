const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');
const path = require('path');
const fs = require('fs'); 
const { exec } = require('child_process');

//  AJOUT BACKUP : Importation du service et des routes de sauvegarde
const backupRoutes = require('./src/routes/backupRoutes');
const { initialiserPlanificateurSauvegarde } = require('./src/services/backupService');

// ------------------------------------------------------------------
// 0. CAPTURE SÉCURISÉE DES ERREURS GLOBALES
// ------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error(' Erreur non capturée (uncaughtException) :', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(' Promesse rejetée non gérée (unhandledRejection) :', reason);
});

// Import des routes
const authRoutes = require('./src/routes/authRoutes');
const eleveRoutes = require('./src/routes/eleveRoutes');
const classeRoutes = require('./src/routes/classeRoutes');
const inscriptionRoutes = require('./src/routes/inscriptionRoutes');
const paiementRoutes = require('./src/routes/paiementRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const etablissementRoutes = require('./src/routes/etablissementRoutes');
const anneeScolaireRoutes = require('./src/routes/anneeScolaireRoutes');
const parametresRoutes = require('./src/routes/parametresRoutes');

dotenv.config({ path: path.join(__dirname, '.env') });

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

//  AJOUT BACKUP : Déclaration du point d'accès pour les sauvegardes
app.use('/api/backups', backupRoutes);

// ------------------------------------------------------------------
// GESTION DU FRONTEND REACT
// ------------------------------------------------------------------
let publicPath = path.join(__dirname, 'public');

if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  const exeDir = typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : process.cwd();
  publicPath = path.join(exeDir, 'public');
}

console.log(` Dossier Frontend utilisé : ${publicPath}`);

app.use(express.static(publicPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: "Route API introuvable." });
  }

  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(" Erreur : Le fichier index.html du Frontend est introuvable.");
  }
});

// ------------------------------------------------------------------
// INITIALISATION DES ADMINS
// ------------------------------------------------------------------
async function initialiserAdministrateurs() {
  try {
    await db.query('UPDATE etablissements SET statut = 1 WHERE id = 1');

    const [rows] = await db.query('SELECT id FROM utilisateurs WHERE identifiant = ?', ['superyoka']);
    let userId;

    if (!rows || rows.length === 0) {
      const hash = await bcrypt.hash('Admin@123', 10);
      
      const [result] = await db.query(
        'INSERT INTO utilisateurs (etablissement_id, identifiant, mot_de_passe, nom, statut) VALUES (?, ?, ?, ?, 1)',
        [1, 'superyoka', hash, 'Super Administrateur']
      );

      userId = result.insertId;
      console.log(" Compte Administrateur créé (superyoka).");
    } else {
      userId = rows[0].id;
      await db.query('UPDATE utilisateurs SET statut = 1, etablissement_id = 1 WHERE id = ?', [userId]);
    }

    const [roleRows] = await db.query('SELECT id FROM roles WHERE nom_role = ?', ['SUPERADMIN']);
    
    if (roleRows && roleRows.length > 0) {
      const roleId = roleRows[0].id;
      await db.query(
        'INSERT OR IGNORE INTO utilisateur_roles (utilisateur_id, role_id) VALUES (?, ?)',
        [userId, roleId]
      );
    }

    console.log(" Sécurités et compte Superadmin vérifiés avec succès.");

  } catch (err) {
    console.error(" Erreur lors de la réinitialisation du superadmin :", err.message);
  }
}

// ------------------------------------------------------------------
// DÉMARRAGE DU SERVEUR
// ------------------------------------------------------------------
async function demarrerServeur() {
  try {
    console.log(" Initialisation de la base de données...");
    await db.initDb();

    console.log(" Vérification des comptes administrateurs...");
    await initialiserAdministrateurs();

    //  AJOUT BACKUP : Lancement de la planification en arrière-plan
    console.log(" Démarrage du service de sauvegarde automatique...");
    initialiserPlanificateurSauvegarde();

    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, () => {
      const url = `http://localhost:${PORT}`;
      console.log(` Le serveur tourne sur : ${url}`);

      const startCmd = process.platform === 'win32' ? `start ${url}` :
                       process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
      
      exec(startCmd, (err) => {
        if (err) {
          console.error(" Impossible d'ouvrir le navigateur automatiquement :", err.message);
        }
      });
    });

  } catch (error) {
    console.error(" Erreur critique au démarrage du serveur :", error);
    process.exit(1);
  }
}

demarrerServeur();