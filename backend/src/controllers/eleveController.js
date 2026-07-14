const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');
const { genererMatricule } = require('../utils/idGenerator');

// 1. Création sécurisée d'un élève
exports.creerEleve = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { nom, prenom, date_naissance, genre } = req.body;
  const etablissement_id = req.user.etablissement_id;

  // Validation stricte des données obligatoires
  if (!nom || !nom.trim() || !prenom || !prenom.trim() || !date_naissance || !genre) {
    return res.status(400).json({ error: "Tous les champs (nom, prénom, date de naissance, genre) sont obligatoires." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Récupération sécurisée du code unique de l'établissement rattaché à l'utilisateur
    const [etabRows] = await connection.execute(
      'SELECT code_unique FROM etablissements WHERE id = ?', 
      [etablissement_id]
    );

    if (etabRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Impossible de générer le matricule : établissement d'attache introuvable." });
    }

    const codeEtablissement = etabRows[0].code_unique;

    // Génération asynchrone et sécurisée du matricule automatique (2 paramètres requis)
    const matriculeAutomatique = await genererMatricule(etablissement_id, codeEtablissement);

    // Insertion unifiée
    const [result] = await connection.execute(
      'INSERT INTO eleves (nom, prenom, date_naissance, genre, matricule, etablissement_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nom.trim().toUpperCase(), prenom.trim(), date_naissance, genre.toUpperCase(), matriculeAutomatique, etablissement_id]
    );

    // Trace d'audit persistée
    await enregistrerAudit(req, 'CREATION_ELEVE', `Création de l'élève : ${nom.toUpperCase()} ${prenom} (Matricule: ${matriculeAutomatique})`);

    await connection.commit();

    return res.status(201).json({
      message: "Élève enregistré avec succès !",
      eleveId: result.insertId,
      matricule: matriculeAutomatique
    });

  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Une collision de matricule a été détectée. Veuillez réessayer." });
    }
    console.error("Erreur lors de l'enregistrement de l'élève :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'enregistrement." });
  } finally {
    connection.release();
  }
};

// 2. Récupération cloisonnée des élèves
exports.getEleves = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    let query = 'SELECT * FROM eleves';
    let params = [];

    // Cloisonnement multi-tenant hermétique
    if (!isSuperAdmin) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }

    query += ' ORDER BY id DESC'; // Utilisation d'un tri compatible avec l'index primaire d'origine

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération de la liste des élèves." });
  }
};