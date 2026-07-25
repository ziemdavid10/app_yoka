const db = require('../config/db');

exports.getJournalGlobal = async (req, res) => {
  const { etablissement_id } = req.query;
  
  try {
    let sql = `
      SELECT a.id, a.action, a.details, a.ip_address, a.cree_le,
             u.nom AS admin_nom, u.prenom AS admin_prenom, e.nom AS ecole_nom
      FROM audit_logs a
      LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id
      LEFT JOIN etablissements e ON a.etablissement_id = e.id
    `;
    
    const params = [];
    if (etablissement_id) {
      sql += ` WHERE a.etablissement_id = ? `;
      params.push(etablissement_id);
    }
    
    sql += ` ORDER BY a.cree_le DESC LIMIT 200`;

    const [rows] = await db.execute(sql, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors du chargement des pistes d'audit :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue sur le serveur." });
  }
};