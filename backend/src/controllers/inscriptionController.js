const db = require('../config/db');

exports.inscrireEleve = async (req, res) => {
  const { eleve_id, classe_id } = req.body;

  if (!eleve_id || !classe_id) {
    return res.status(400).json({ error: "Veuillez sélectionner un élève et une classe." });
  }

  try {
    // 1. Récupérer l'année scolaire active
    const [annees] = await db.execute('SELECT id FROM annees_scolaires WHERE statut = TRUE LIMIT 1');
    if (annees.length === 0) {
      return res.status(400).json({ error: "Aucune année scolaire active configurée." });
    }
    const annee_id = annees[0].id;

    // 2. Insérer l'inscription
    await db.execute(
      'INSERT INTO inscriptions (eleve_id, classe_id, annee_id) VALUES (?, ?, ?)',
      [eleve_id, classe_id, annee_id]
    );

    return res.status(201).json({ message: "Élève inscrit avec succès dans cette classe !" });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Cet élève est déjà inscrit pour cette année scolaire." });
    }
    return res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
};

exports.getInscriptions = async (req, res) => {
  try {
    // Jointure complexe pour afficher les vrais noms au lieu des simples IDs
    const query = `
      SELECT i.id, e.matricule, e.nom, e.prenom, c.nom AS classe_nom, a.libelle AS annee_libelle, i.date_inscription
      FROM inscriptions i
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
      INNER JOIN annees_scolaires a ON i.annee_id = a.id
      ORDER BY i.date_inscription DESC
    `;
    const [rows] = await db.execute(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur de récupération des inscriptions." });
  }
};