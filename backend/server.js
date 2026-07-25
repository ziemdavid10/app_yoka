const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');
const path = require('path');
const fs = require('fs'); // Détection et lecture sécurisée des fichiers
const { exec } = require('child_process'); // Lancement du navigateur par défaut

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

// --- GESTION DU FRONTEND REACT ---

// 1. Détection intelligente du chemin 'public' (Virtuel PKG vs Réel)
let publicPath = path.join(__dirname, 'public');

// Si index.html n'est pas embarqué dans l'exécutable, on cherche dans un dossier 'public' externe à côté du .exe
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
  const exeDir = typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : process.cwd();
  publicPath = path.join(exeDir, 'public');
}

console.log(` Dossier Frontend utilisé : ${publicPath}`);

// 2. Servir les fichiers statiques (JS, CSS, images)
app.use(express.static(publicPath));

/// 3. Redirection SPA React (Compatible Express v5)
app.use((req, res, next) => {
  // 1. Si la requête commence par /api, on laisse passer vers la gestion 404 API
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: "Route API introuvable." });
  }

  // 2. Pour toutes les autres routes (ex: /login, /dashboard), on renvoie index.html
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(" Erreur : Le fichier index.html du Frontend est introuvable.");
  }
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

    // 2. Initialisation de l'ADMIN CAMPUS (admin_campus)
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
  const url = `http://localhost:${PORT}`;
  console.log(`Le serveur tourne sur : ${url}`);
  
  // 1. Exécution du script de seeding au démarrage
  await initialiserAdministrateurs();

  // 2. Ouverture automatique du navigateur par défaut sous Windows
  exec(`start ${url}`);
});