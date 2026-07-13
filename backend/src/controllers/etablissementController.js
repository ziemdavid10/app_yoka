const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Lister tous les établissements avec agrégation financière globale
exports.listerEtablissements = async (req, res) => {
  try {
    // Calcul dynamique des recettes et dépenses rattachées à chaque ID d'établissement
    const query = `
      SELECT 
        e.id,
        e.nom,
        e.code_unique,
        e.adresse,
        e.telephone,
        IFNULL((SELECT SUM(p.montant) FROM paiements p WHERE p.etablissement_id = e.id), 0) AS total_recettes,
        IFNULL((SELECT SUM(d.montant) FROM depenses d WHERE d.etablissement_id = e.id), 0) AS total_depenses
      FROM etablissements e
      ORDER BY e.created_at DESC
    `;

    const [rows] = await db.execute(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur listerEtablissements :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des infrastructures scolaires." });
  }
};

// 2. Créer et initialiser un nouvel établissement (Tenant)
exports.creerEtablissement = async (req, res) => {
  const { nom, code_unique, adresse, telephone } = req.body;

  if (!nom || !code_unique) {
    return res.status(400).json({ error: "Le nom et le code unique sont obligatoires." });
  }

  try {
    // Vérification d'unicité du code de l'établissement
    const [existRows] = await db.execute('SELECT id FROM etablissements WHERE code_unique = ?', [code_unique]);
    if (existRows.length > 0) {
      return res.status(400).json({ error: "Ce code unique d'établissement est déjà attribué." });
    }

    const query = `
      INSERT INTO etablissements (nom, code_unique, adresse, telephone) 
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [nom, code_unique.toUpperCase(), adresse || null, telephone || null]);

    // Piste d'audit pour la traçabilité de l'infrastructure
    await enregistrerAudit(
      req.user ? req.user.id : null,
      'CREATION_ETABLISSEMENT',
      `Déploiement de la structure : ${nom} [${code_unique}]`,
      req.ip
    );

    return res.status(201).json({
      message: "Établissement configuré et isolé avec succès.",
      etablissementId: result.insertId
    });
  } catch (error) {
    console.error("Erreur creerEtablissement :", error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement de l'établissement." });
  }
};