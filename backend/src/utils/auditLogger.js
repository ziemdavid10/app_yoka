const db = require('../config/db');

/**
 * Enregistre une action utilisateur dans le journal d'audit (audit_logs)
 * @param {Object} req - L'objet de requête Express
 * @param {string} action - Le type d'action (ex: 'CREATION_ELEVE')
 * @param {string} details - La description textuelle de l'action
 */
exports.enregistrerAudit = async (req, action, details) => {
  try {
    // 1. Récupération de l'adresse IP de manière sécurisée
    const ip_address = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 2. Extraction sécurisée de l'utilisateur et de son école (établissement)
    // On ajoute une sécurité (req.user ?) au cas où une action publique ou non authentifiée survient
    const utilisateur_id = req.user ? req.user.id : null;
    const etablissement_id = req.user ? req.user.etablissement_id : null;

    // 3. Requête d'insertion correspondant à la structure attendue de votre BDD
    const sql = `
      INSERT INTO audit_logs (action, details, ip_address, utilisateur_id, etablissement_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    // 4. Exécution avec les paramètres ordonnés
    await db.execute(sql, [
      action, 
      details, 
      ip_address, 
      utilisateur_id, 
      etablissement_id
    ]);

  } catch (error) {
    // On met un console.error sans bloquer le reste de l'application
    console.error("Échec d'écriture dans le journal d'audit :", error.message);
  }
};