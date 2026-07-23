const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Lister les années scolaires
exports.listerAnneesScolaires = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM annees_scolaires ORDER BY id DESC');
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur listerAnneesScolaires :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des années scolaires." });
  }
};

// 2. Créer une nouvelle année scolaire
exports.creerAnneeScolaire = async (req, res) => {
  const { libelle } = req.body; // Ex: "2025-2026"

  if (!libelle) {
    return res.status(400).json({ error: "Le libellé de l'année scolaire est requis." });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO annees_scolaires (libelle, statut) VALUES (?, 0)',
      [libelle]
    );

    await enregistrerAudit(req, 'CREATION_ANNEE_SCOLAIRE', `Création de l'année scolaire : ${libelle}`);
    return res.status(201).json({ message: "Année scolaire créée avec succès.", id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Cette année scolaire existe déjà." });
    }
    console.error("Erreur creerAnneeScolaire :", error);
    return res.status(500).json({ error: "Erreur lors de la création de l'année scolaire." });
  }
};

// 3. Activer une année scolaire (RÈGLE STRICTE : MAX 1 ANNÉE ACTIVE VIA TRANSACTION)
exports.activerAnneeScolaire = async (req, res) => {
  const { id } = req.params;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Étape A: Désactiver TOUTES les années scolaires du système
    await connection.execute('UPDATE annees_scolaires SET statut = 0');

    // Étape B: Activer EXCLUSIVEMENT l'année sélectionnée
    const [result] = await connection.execute(
      'UPDATE annees_scolaires SET statut = 1 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Année scolaire introuvable." });
    }

    await connection.commit();

    await enregistrerAudit(req, 'ACTIVATION_ANNEE_SCOLAIRE', `Activation de l'année scolaire ID: ${id}`);
    return res.status(200).json({ message: "Année scolaire activée avec succès. Les autres années ont été désactivées." });
  } catch (error) {
    await connection.rollback();
    console.error("Erreur activerAnneeScolaire :", error);
    return res.status(500).json({ error: "Erreur serveur lors de l'activation de l'année scolaire." });
  } finally {
    connection.release();
  }
};

// 4. Désactiver une année scolaire
exports.desactiverAnneeScolaire = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute('UPDATE annees_scolaires SET statut = 0 WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Année scolaire introuvable." });
    }

    await enregistrerAudit(req, 'DESACTIVATION_ANNEE_SCOLAIRE', `Désactivation de l'année scolaire ID: ${id}`);
    return res.status(200).json({ message: "Année scolaire désactivée." });
  } catch (error) {
    console.error("Erreur desactiverAnneeScolaire :", error);
    return res.status(500).json({ error: "Erreur lors de la désactivation de l'année scolaire." });
  }
};