const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Lister tous les établissements
exports.listerEtablissements = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id,
        e.nom,
        e.code_unique,
        e.adresse,
        e.telephone,
        e.statut,
        IFNULL((SELECT SUM(p.montant) FROM paiements p WHERE p.etablissement_id = e.id), 0) AS total_recettes,
        IFNULL((SELECT SUM(d.montant) FROM depenses d WHERE d.etablissement_id = e.id), 0) AS total_depenses
      FROM etablissements e
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur listerEtablissements :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des établissements." });
  }
};

// 2. Créer un établissement
exports.creerEtablissement = async (req, res) => {
  const { nom, code_unique, adresse, telephone } = req.body;
  if (!nom || !code_unique) {
    return res.status(400).json({ error: "Le nom et le code unique sont obligatoires." });
  }
  try {
    const [existRows] = await db.execute('SELECT id FROM etablissements WHERE code_unique = ?', [code_unique]);
    if (existRows.length > 0) {
      return res.status(400).json({ error: "Ce code unique d'établissement existe déjà." });
    }
    const [result] = await db.execute(
      'INSERT INTO etablissements (nom, code_unique, adresse, telephone, statut) VALUES (?, ?, ?, ?, 1)',
      [nom, code_unique.toUpperCase(), adresse || null, telephone || null]
    );
    await enregistrerAudit(req, 'CREATION_ETABLISSEMENT', `Déploiement de l'établissement : ${nom} [${code_unique}]`);
    return res.status(201).json({ message: "Établissement créé avec succès.", etablissementId: result.insertId });
  } catch (error) {
    console.error("Erreur creerEtablissement :", error);
    return res.status(500).json({ error: "Erreur lors de la création de l'établissement." });
  }
};

// 3. Modifier un établissement
exports.modifierEtablissement = async (req, res) => {
  const { id } = req.params;
  const { nom, adresse, telephone } = req.body;

  if (!nom) {
    return res.status(400).json({ error: "Le nom de l'établissement est requis." });
  }

  try {
    const [result] = await db.execute(
      'UPDATE etablissements SET nom = ?, adresse = ?, telephone = ? WHERE id = ?',
      [nom, adresse || null, telephone || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Établissement introuvable." });
    }

    await enregistrerAudit(req, 'MODIFICATION_ETABLISSEMENT', `Modification des informations de l'établissement ID: ${id}`);
    return res.status(200).json({ message: "Établissement mis à jour avec succès." });
  } catch (error) {
    console.error("Erreur modifierEtablissement :", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour de l'établissement." });
  }
};

// 4. Activer / Désactiver un établissement
exports.changerStatutEtablissement = async (req, res) => {
  const { id } = req.params;
  const { actif } = req.body; // true ou false
  if (actif === undefined) {
    return res.status(400).json({
      error: "Le statut (actif/inactif) est requis."
    });
  }
  try {
    // Conversion du booléen en entier pour la base de données
    const statut = actif ? 1 : 0;
    const [result] = await db.execute(
      'UPDATE etablissements SET statut = ? WHERE id = ?',
      [statut, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Établissement introuvable."
      });
    }
    const action = actif
      ? 'ACTIVATION_ETABLISSEMENT'
      : 'DESACTIVATION_ETABLISSEMENT';
    await enregistrerAudit(
      req,
      action,
      `Changement de statut de l'établissement ID: ${id} -> ${actif ? 'Actif' : 'Inactif'}`
    );
    return res.status(200).json({
      message: `Établissement ${actif ? 'activé' : 'désactivé'} avec succès.`
    });
  } catch (error) {
    console.error("Erreur changerStatutEtablissement :", error);
    return res.status(500).json({
      error: "Erreur lors de la modification du statut de l'établissement."
    });
  }
};
// exports.changerStatutEtablissement = async (req, res) => {
//   const { id } = req.params;
//   const { statut } = req.body; // true/1 ou false/0

//   if (statut === undefined) {
//     return res.status(400).json({ error: "Le statut (actif/inactif) est requis." });
//   }

//   try {
//     const nouvelEtat = statut ? 1 : 0;
//     const [result] = await db.execute('UPDATE etablissements SET statut = ? WHERE id = ?', [nouvelEtat, id]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Établissement introuvable." });
//     }

//     const action = nouvelEtat === 1 ? 'ACTIVATION_ETABLISSEMENT' : 'DESACTIVATION_ETABLISSEMENT';
//     await enregistrerAudit(req, action, `Changement de statut de l'établissement ID: ${id} -> ${nouvelEtat === 1 ? 'Actif' : 'Inactif'}`);

//     return res.status(200).json({ message: `Établissement ${nouvelEtat === 1 ? 'activé' : 'désactivé'} avec succès.` });
//   } catch (error) {
//     console.error("Erreur changerStatutEtablissement :", error);
//     return res.status(500).json({ error: "Erreur lors de la modification du statut de l'établissement." });
//   }
// };

// 5. Supprimer un établissement
exports.supprimerEtablissement = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute('DELETE FROM etablissements WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Établissement introuvable." });
    }

    await enregistrerAudit(req, 'SUPPRESSION_ETABLISSEMENT', `Suppression définitive de l'établissement ID: ${id}`);
    return res.status(200).json({ message: "Établissement supprimé avec succès." });
  } catch (error) {
    console.error("Erreur supprimerEtablissement :", error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "Impossible de supprimer cet établissement car des utilisateurs ou données y sont rattachés." });
    }
    return res.status(500).json({ error: "Erreur lors de la suppression de l'établissement." });
  }
};