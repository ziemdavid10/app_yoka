const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Création sécurisée d'une classe (Unique par établissement)
exports.creerClasse = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { nom, frais_scolarite } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!nom || !nom.trim() || frais_scolarite === undefined) {
    return res.status(400).json({ error: "Le nom de la classe et les frais associés sont requis." });
  }

  const montantFrais = parseFloat(frais_scolarite);
  if (isNaN(montantFrais) || montantFrais < 0) {
    return res.status(400).json({ error: "Le montant des frais de scolarité doit être un nombre positif ou nul." });
  }

  try {
    // Évite d'avoir deux classes identiques rattachées au même établissement
    const [doublon] = await db.execute(
      'SELECT id FROM classes WHERE nom = ? AND etablissement_id = ?',
      [nom.trim(), etablissement_id]
    );

    if (doublon.length > 0) {
      return res.status(400).json({ error: `Une classe nommée "${nom.trim()}" est déjà configurée dans votre établissement.` });
    }

    const [result] = await db.execute(
      'INSERT INTO classes (nom, frais_scolarite, etablissement_id) VALUES (?, ?, ?)', 
      [nom.trim(), montantFrais, etablissement_id]
    );

    // Enregistrement de l'action d'administration dans l'audit global
    await enregistrerAudit(req, 'CREATION_CLASSE', `Création de la classe : ${nom.trim()} (Scolarité: ${montantFrais} F CFA)`);

    return res.status(201).json({ 
      message: "Classe créée avec succès !", 
      classeId: result.insertId 
    });

  } catch (error) {
    console.error("Erreur lors de la création de la classe :", error);
    return res.status(500).json({ error: "Erreur interne lors de la création de la classe." });
  }
};

// 2. Listing des classes
exports.getClasses = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    let query = 'SELECT * FROM classes';
    let params = [];

    // Cloisonnement d'accès
    if (!isSuperAdmin) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }

    query += ' ORDER BY nom ASC';

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors du chargement des classes :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des classes." });
  }
};