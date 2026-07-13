const db = require('../config/db');

/**
 * Enregistre une action administrative dans le journal d'audit
 */
exports.enregistrerAudit = async (req, action, description) => {
  try {
    //  Extraction sécurisée de l'IP (ne plantera pas si req ou req.headers est indéfini)
    const ip_adresse = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    
    // Récupération de l'ID utilisateur de manière sécurisée également
    const utilisateur_id = req?.user?.id || null;

    const query = `
      INSERT INTO logs_audit (utilisateur_id, action, description, ip_adresse, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const db = require('../config/db'); // S'assurer que le chemin vers votre db est correct
    await db.execute(query, [utilisateur_id, action, description, ip_adresse]);

  } catch (error) {
    // On écrit l'erreur dans la console du serveur sans bloquer l'utilisateur final
    console.error(" Échec d'écriture dans le journal d'audit :", error.message);
  }
};