const db = require('../config/db');

/**
 * Enregistre une action administrative dans le journal d'audit
 */
exports.enregistrerAudit = async (req, action, details) => {
  try {
    // req.user doit être injecté au préalable par ton middleware de vérification JWT
    const utilisateur_id = req.user ? req.user.id : null;
    const etablissement_id = req.user ? req.user.etablissement_id : null;
    
    // Extraction de l'adresse IP de l'appelant
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const sql = `
      INSERT INTO audit_logs (utilisateur_id, etablissement_id, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [utilisateur_id, etablissement_id, action, details, ip_address]);
  } catch (error) {
    console.error("Erreur critique d'écriture dans le journal d'audit :", error);
  }
};