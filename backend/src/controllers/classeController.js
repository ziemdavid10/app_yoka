const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

exports.creerClasse = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { nom, frais_scolarite } = req.body;
  const etablissement_id = req.user.etablissement_id; // Injecté via le token

  if (!nom || !frais_scolarite) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO classes (nom, frais_scolarite, etablissement_id) VALUES (?, ?, ?)', 
      [nom, frais_scolarite, etablissement_id]
    );

    // TRACE AUDIT
    await enregistrerAudit(req, 'CREATION_CLASSE', `Création de la classe : ${nom} (Frais: ${frais_scolarite} F CFA)`);

    return res.status(201).json({ message: "Classe créée avec succès !", classeId: result.insertId });
  } catch (error) {
    console.error("Erreur lors de la création de la classe :", error);
    return res.status(500).json({ error: "Erreur lors de la création de la classe." });
  }
};

exports.getClasses = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    let query = 'SELECT * FROM classes';
    let params = [];

    // Cloisonnement multi-tenant
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
    console.error("Erreur lors de la récupération des classes :", error);
    return res.status(500).json({ error: "Erreur de récupération des classes." });
  }
};