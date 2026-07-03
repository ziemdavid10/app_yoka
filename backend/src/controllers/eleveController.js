const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

exports.creerEleve = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { matricule, nom, prenom, date_naissance, genre } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!matricule || !nom || !prenom || !date_naissance || !genre) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  try {
    const sql = `
      INSERT INTO eleves (matricule, nom, prenom, date_naissance, genre, etablissement_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [matricule, nom, prenom, date_naissance, genre, etablissement_id]);

    // TRACE AUDIT
    await enregistrerAudit(req, 'CREATION_ELEVE', `Nouvel élève inscrit : ${nom} ${prenom} (Matricule: ${matricule})`);

    return res.status(201).json({
      message: "Élève enregistré avec succès !",
      eleveId: result.insertId
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Ce matricule est déjà attribué à un autre élève." });
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