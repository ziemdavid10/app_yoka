const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. INSCRIPTION
exports.register = async (req, res) => {
  const { identifiant, mot_de_passe, nom, prenom, code_etablissement, nom_role } = req.body;

  if (!identifiant || !mot_de_passe || !nom || !nom_role) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  try {
    let etablissement_id = null;

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

    const [roleRows] = await db.execute('SELECT id FROM roles WHERE nom_role = ?', [nom_role]);
    if (roleRows.length === 0) {
      return res.status(404).json({ error: "Le rôle spécifié n'existe pas." });
    }
    const role_id = roleRows[0].id;

    const hashedPass = await bcrypt.hash(mot_de_passe, 10);

    const [userResult] = await db.execute(
      'INSERT INTO utilisateurs (etablissement_id, identifiant, mot_de_passe, nom, prenom) VALUES (?, ?, ?, ?, ?)',
      [etablissement_id, identifiant, hashedPass, nom, prenom || '']
    );

    await db.execute(
      'INSERT INTO utilisateur_roles (utilisateur_id, role_id) VALUES (?, ?)',
      [userResult.insertId, role_id]
    );

    return res.status(201).json({ message: "Utilisateur créé avec succès !" });
  } catch (error) {
    const isDuplicate = error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT' || (error.message && error.message.includes('UNIQUE'));
    if (isDuplicate) {
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
    const [users] = await db.execute(`
      SELECT u.*, e.statut AS etablissement_statut, e.nom AS etablissement_nom
      FROM utilisateurs u
      LEFT JOIN etablissements e ON u.etablissement_id = e.id
      WHERE u.identifiant = ?
    `, [identifiant]);

    if (users.length === 0) {
      return res.status(401).json({ error: "Identifiants ou code établissement incorrects." });
    }

    const user = users[0];
    const validPass = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPass) {
      return res.status(401).json({ error: "Identifiants ou code établissement incorrects." });
    }

    if (Number(user.statut) === 0) {
      await enregistrerAudit(req, 'CONNEXION_REFUSEE_COMPTE_DESACTIVE', `Tentative de connexion sur le compte désactivé : ${identifiant}`);
      return res.status(403).json({ error: "Ce compte a été désactivé. Contactez votre administrateur." });
    }

    if (user.etablissement_id && Number(user.etablissement_statut) === 0) {
      await enregistrerAudit(req, 'CONNEXION_REFUSEE_ETABLISSEMENT_DESACTIVE', `Tentative de connexion pour un établissement désactivé (${user.etablissement_nom}) : ${identifiant}`);
      return res.status(403).json({ error: "L'établissement rattaché à ce compte est désactivé." });
    }

    const [roles] = await db.execute(`
      SELECT r.nom_role FROM roles r
      INNER JOIN utilisateur_roles ur ON r.id = ur.role_id
      WHERE ur.utilisateur_id = ?
    `, [user.id]);
    
    const listeRoles = roles.map(r => r.nom_role);

    const token = jwt.sign(
      { id: user.id, etablissement_id: user.etablissement_id, roles: listeRoles },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

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

// 3. RECUPERATION DES ADMNISTRATEURS
exports.listerTousLesAdmins = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.identifiant, 
        u.nom, 
        u.prenom, 
        u.statut,
        e.code_unique AS code_etablissement, 
        u.created_at 
      FROM utilisateurs u
      INNER JOIN utilisateur_roles ur ON u.id = ur.utilisateur_id
      INNER JOIN roles r ON ur.role_id = r.id
      LEFT JOIN etablissements e ON u.etablissement_id = e.id
      WHERE r.nom_role = 'ADMIN'
      ORDER BY u.created_at DESC
    `;
    
    const [rows] = await db.execute(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur listerTousLesAdmins :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des comptes administrateurs." });
  }
};

// 4. Modifier un Administrateur
exports.modifierAdmin = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom } = req.body;

  if (!nom) {
    return res.status(400).json({ error: "Le nom est obligatoire." });
  }

  try {
    const [result] = await db.execute(
      'UPDATE utilisateurs SET nom = ?, prenom = ? WHERE id = ?',
      [nom, prenom || '', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Administrateur introuvable." });
    }

    await enregistrerAudit(req, 'MODIFICATION_ADMIN', `Mise à jour du profil admin ID: ${id}`);
    return res.status(200).json({ message: "Profil administrateur mis à jour." });
  } catch (error) {
    console.error("Erreur modifierAdmin :", error);
    return res.status(500).json({ error: "Erreur lors de la modification de l'administrateur." });
  }
};

// 5. Activer / Désactiver un Administrateur
exports.changerStatutAdmin = async (req, res) => {
  const { id } = req.params;
  const { actif } = req.body;

  if (actif === undefined) {
    return res.status(400).json({ error: "Le statut (actif/inactif) est requis." });
  }

  try {
    const nouvelEtat = actif ? 1 : 0;
    const [result] = await db.execute('UPDATE utilisateurs SET statut = ? WHERE id = ?', [nouvelEtat, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Administrateur introuvable." });
    }

    await enregistrerAudit(req, nouvelEtat === 1 ? 'ACTIVATION_ADMIN' : 'DESACTIVATION_ADMIN', `Changement statut admin ID: ${id} -> ${nouvelEtat}`);
    return res.status(200).json({ message: `Compte administrateur ${nouvelEtat === 1 ? 'activé' : 'désactivé'}.` });
  } catch (error) {
    console.error("Erreur changerStatutAdmin :", error);
    return res.status(500).json({ error: "Erreur lors du changement de statut de l'administrateur." });
  }
};

// 6. Réinitialiser le mot de passe d'un Administrateur
exports.reinitialiserMotDePasseAdmin = async (req, res) => {
  const { id } = req.params;
  const { nouveau_mot_de_passe } = req.body;

  if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }

  try {
    const hashedPass = await bcrypt.hash(nouveau_mot_de_passe, 10);
    const [result] = await db.execute('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?', [hashedPass, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Administrateur introuvable." });
    }

    await enregistrerAudit(req, 'REINITIALISATION_MDP_ADMIN', `Réinitialisation du mot de passe pour l'administrateur ID: ${id}`);
    return res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("Erreur reinitialiserMotDePasseAdmin :", error);
    return res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe." });
  }
};

// 7. Supprimer un Administrateur
exports.supprimerAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute('DELETE FROM utilisateur_roles WHERE utilisateur_id = ?', [id]);
    const [result] = await db.execute('DELETE FROM utilisateurs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Administrateur introuvable." });
    }

    await enregistrerAudit(req, 'SUPPRESSION_ADMIN', `Suppression du compte administrateur ID: ${id}`);
    return res.status(200).json({ message: "Administrateur supprimé avec succès." });
  } catch (error) {
    console.error("Erreur supprimerAdmin :", error);
    return res.status(500).json({ error: "Erreur lors de la suppression de l'administrateur." });
  }
};