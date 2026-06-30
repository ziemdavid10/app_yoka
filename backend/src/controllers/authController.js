const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. INSCRIPTION (Création d'un utilisateur)
exports.register = async (req, res) => {
  const { identifiant, mot_de_passe, nom, prenom, code_etablissement, nom_role } = req.body;

  if (!identifiant || !mot_de_passe || !nom || !nom_role) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  try {
    let etablissement_id = null;

    // Si ce n'est pas un Superadmin, on récupère l'ID de son établissement via son code
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
    const [role] = await db.execute('SELECT id FROM roles WHERE nom_role = ?', [nom_role]);
    if (role.length === 0) {
      return res.status(440).json({ error: "Le rôle spécifié n'existe pas." });
    }
    const role_id = role[0].id;

    // Hachage du mot de passe avec Bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(mot_de_passe, salt);

    // Insertion de l'utilisateur
    const sqlUser = `INSERT INTO utilisateurs (etablissement_id, identifiant, mot_de_passe, nom, prenom) VALUES (?, ?, ?, ?, ?)`;
    const [userResult] = await db.execute(sqlUser, [etablissement_id, identifiant, hashedPass, nom, prenom]);
    const utilisateur_id = userResult.insertId;

    // Association du rôle dans la table pivot
    await db.execute('INSERT INTO utilisateur_roles (utilisateur_id, role_id) VALUES (?, ?)', [utilisateur_id, role_id]);

    return res.status(201).json({ message: "Utilisateur créé avec succès !" });

  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Cet identifiant est déjà utilisé." });
    }
    return res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
};

// 2. CONNEXION (Login)
exports.login = async (req, res) => {
  const { identifiant, mot_de_passe, code_etablissement, isSuperAdmin } = req.body;

  if (!identifiant || !mot_de_passe) {
    return res.status(400).json({ error: "Identifiant et mot de passe requis." });
  }

  try {
    let query = "";
    let params = [];

    if (isSuperAdmin) {
      // Le Superadmin n'est lié à aucun établissement
      query = `SELECT * FROM utilisateurs WHERE identifiant = ? AND etablissement_id IS NULL`;
      params = [identifiant];
    } else {
      // Un utilisateur standard doit correspondre à son identifiant ET au code de son école
      if (!code_etablissement) {
        return res.status(400).json({ error: "Le code établissement est obligatoire." });
      }
      query = `
        SELECT u.* FROM utilisateurs u
        INNER JOIN etablissements e ON u.etablissement_id = e.id
        WHERE u.identifiant = ? AND e.code_unique = ?
      `;
      params = [identifiant, code_etablissement];
    }

    const [users] = await db.execute(query, params);

    if (users.length === 0) {
      return res.status(401).json({ error: "Identifiants ou code établissement incorrects." });
    }

    const user = users[0];

    if (!user.statut) {
      return res.status(403).json({ error: "Votre compte a été désactivé." });
    }

    // Vérification du mot de passe
    const validPass = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPass) {
      return res.status(401).json({ error: "Identifiants ou code établissement incorrects." });
    }

    // Récupération des rôles de l'utilisateur
    const [roles] = await db.execute(`
      SELECT r.nom_role FROM roles r
      INNER JOIN utilisateur_roles ur ON r.id = ur.role_id
      WHERE ur.utilisateur_id = ?
    `, [user.id]);
    
    const listeRoles = roles.map(r => r.nom_role);

    // Sécurité supplémentaire : Si l'utilisateur prétend être Superadmin mais n'en a pas le rôle en DB
    if (isSuperAdmin && !listeRoles.includes('SUPERADMIN')) {
      return res.status(403).json({ error: "Accès refusé. Vous n'êtes pas Superadmin." });
    }

    // Génération du Token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        etablissement_id: user.etablissement_id, 
        roles: listeRoles 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Envoi de la réponse au frontend
    return res.status(200).json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        identifiant: user.identifiant,
        roles: listeRoles,
        etablissement_id: user.etablissement_id
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Une erreur est survenue lors de la connexion." });
  }
};