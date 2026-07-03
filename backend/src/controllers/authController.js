const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. INSCRIPTION (Création d'un utilisateur / Admin / Superadmin)
exports.register = async (req, res) => {
  const { identifiant, mot_de_passe, nom, prenom, code_etablissement, nom_role } = req.body;

  if (!identifiant || !mot_de_passe || !nom || !nom_role) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  try {
    let etablissement_id = null;

    // Si ce n'est pas un Superadmin, on récupère l'ID de son établissement via son code unique
    if (nom_role !== 'SUPERADMIN') {
      if (!code_etablissement) {
        return res.status(400).json({ error: "Le code établissement est requis pour ce rôle." });
      }
      const [etab] = await db.execute('SELECT id FROM etablissements WHERE code_unique = ?', [code_etablissement]);
      if (etab.length === 0) {
        return res.status(404).json({ error: "Établissement introuvable avec ce code." });
      }
      etablissement_id = etab[0].id;
    }

    // Récupérer l'ID du rôle demandé
    const [roleRows] = await db.execute('SELECT id FROM roles WHERE nom_role = ?', [nom_role]);
    if (roleRows.length === 0) {
      return res.status(404).json({ error: "Le rôle spécifié n'existe pas." });
    }
    const role_id = roleRows[0].id;

    // Hachage du mot de passe
    const hashedPass = await bcrypt.hash(mot_de_passe, 10);

    // Insertion de l'utilisateur
    const [userResult] = await db.execute(
      'INSERT INTO utilisateurs (etablissement_id, identifiant, mot_de_passe, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      [etablissement_id, identifiant, hashedPass, nom, prenom || '']
    );

    // Attribution du rôle dans la table de jointure
    await db.execute(
      'INSERT INTO utilisateur_roles (utilisateur_id, role_id) VALUES (?, ?)',
      [userResult.insertId, role_id]
    );

    return res.status(201).json({ message: "Utilisateur créé avec succès !" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Cet identifiant est déjà attribué à un autre utilisateur." });
    }
    console.error("Erreur lors de la création du compte :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue sur le serveur." });
  }
};

// 2. CONNEXION AUTHENTIFICATION
exports.login = async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;

  if (!identifiant || !mot_de_passe) {
    return res.status(400).json({ error: "Identifiant et mot de passe requis." });
  }

  try {
    const [users] = await db.execute('SELECT * FROM utilisateurs WHERE identifiant = ?', [identifiant]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Identifiants ou code établissement incorrects." });
    }

    const user = users[0];
    const validPass = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPass) {
      return res.status(401).json({ error: "Identifiants ou code établissement incorrects." });
    }

    // Récupération des rôles associés
    const [roles] = await db.execute(`
      SELECT r.nom_role FROM roles r
      INNER JOIN utilisateur_roles ur ON r.id = ur.role_id
      WHERE ur.utilisateur_id = ?
    `, [user.id]);
    
    const listeRoles = roles.map(r => r.nom_role);

    // Génération du Token JWT
    const token = jwt.sign(
      { id: user.id, etablissement_id: user.etablissement_id, roles: listeRoles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Injection temporaire dans req pour le traceur d'audit
    req.user = { id: user.id, etablissement_id: user.etablissement_id, roles: listeRoles };
    await enregistrerAudit(req, 'CONNEXION_REUSSIE', `L'utilisateur ${identifiant} s'est connecté au système.`);

    return res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        identifiant: user.identifiant,
        nom: user.nom,
        prenom: user.prenom,
        etablissement_id: user.etablissement_id,
        roles: listeRoles
      }
    });
  } catch (error) {
    console.error("Erreur lors de l'authentification :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue sur le serveur." });
  }
};