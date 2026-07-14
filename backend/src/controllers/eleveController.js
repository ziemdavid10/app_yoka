const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');
// Importation du générateur automatique
const { genererMatricule } = require('../utils/idGenerator');

exports.creerEleve = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  // 🔄 Modification : 'matricule' est retiré du req.body car il est généré par le système
  const { nom, prenom, date_naissance, genre } = req.body;
  const etablissement_id = req.user.etablissement_id;

  // Validation des champs restants
  if (!nom || !prenom || !date_naissance || !genre) {
    return res.status(400).json({ error: "Tous les champs (nom, prénom, date de naissance, genre) sont obligatoires." });
  }

  try {
    // 1. Récupération du code unique de l'établissement de l'admin connecté
    const [etabRows] = await db.execute(
      'SELECT code_unique FROM etablissements WHERE id = ?', 
      [etablissement_id]
    );

    if (etabRows.length === 0) {
      return res.status(404).json({ error: "Impossible de générer le matricule : établissement introuvable." });
    }

    const code_etablissement = etabRows[0].code_unique;

    // 2. Génération automatique du matricule professionnel (Ex: MAT-LYCBIL-2026-0001)
    const matriculeAutomatique = await genererMatricule(etablissement_id, code_etablissement);

    // 3. Insertion en base de données avec le matricule calculé
    const sql = `
      INSERT INTO eleves (matricule, nom, prenom, date_naissance, genre, etablissement_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      matriculeAutomatique, 
      nom, 
      prenom, 
      date_naissance, 
      genre, 
      etablissement_id
    ]);

    // TRACE AUDIT (Mise à jour avec le paramètre 'req' et le matricule auto)
    await enregistrerAudit(
      req, 
      'CREATION_ELEVE', 
      `Nouvel élève inscrit : ${nom} ${prenom} (Matricule généré: ${matriculeAutomatique})`
    );

    // Renvoi de la réponse avec le matricule généré pour l'affichage immédiat côté Front-end
    return res.status(201).json({
      message: "Élève enregistré avec succès !",
      eleveId: result.insertId,
      matricule: matriculeAutomatique
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Une collision de matricule a été détectée. Veuillez réessayer." });
    }
    console.error("Erreur lors de l'enregistrement de l'élève :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'enregistrement." });
  }
};

exports.getEleves = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    let query = 'SELECT * FROM eleves';
    let params = [];

    if (!isSuperAdmin) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }

    query += ' ORDER BY id DESC';

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue sur le serveur." });
  }
};