const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

exports.inscrireEleve = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { eleve_id, classe_id } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!eleve_id || !classe_id) {
    return res.status(400).json({ error: "Veuillez sélectionner un élève et une classe." });
  }

  try {
    // Récupérer l'année scolaire en cours d'exécution
    const [annees] = await db.execute('SELECT id FROM annees_scolaires WHERE statut = TRUE LIMIT 1');
    if (annees.length === 0) {
      return res.status(400).json({ error: "Aucune année scolaire active configurée." });
    }
    const annee_id = annees[0].id;

    await db.execute(
      'INSERT INTO inscriptions (eleve_id, classe_id, annee_id, etablissement_id) VALUES (?, ?, ?, ?)',
      [eleve_id, classe_id, annee_id, etablissement_id]
    );

    // TRACE AUDIT
    await enregistrerAudit(req, 'INSCRIPTION_ELEVE', `Élève ID ${eleve_id} affecté à la classe ID ${classe_id} pour l'année ID ${annee_id}`);

    return res.status(201).json({ message: "Élève inscrit avec succès dans cette classe !" });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Cet élève est déjà inscrit pour cette année scolaire." });
    }
    console.error("Erreur lors de l'inscription :", error);
    return res.status(500).json({ error: "Erreur lors de l'inscription." });
  }
};

exports.getInscriptions = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    
    let query = `
      SELECT i.id, e.matricule, e.nom, e.prenom, c.nom AS classe_nom, a.libelle AS annee_libelle, i.date_inscription, etab.nom AS etablissement_nom
      FROM inscriptions i
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
      INNER JOIN annees_scolaires a ON i.annee_id = a.id
      LEFT JOIN etablissements etab ON i.etablissement_id = etab.id
    `;
    
    let params = [];
    if (!isSuperAdmin) {
      query += ' WHERE i.etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE i.etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }

    query += ' ORDER BY i.id DESC';

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des inscriptions :", error);
    return res.status(500).json({ error: "Erreur lors du chargement des inscriptions." });
  }
};