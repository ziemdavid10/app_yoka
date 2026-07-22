const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Inscrire un élève de manière sécurisée (Transaction + Vérification Multi-tenant)
exports.inscrireEleve = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { eleve_id, classe_id } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!eleve_id || !classe_id) {
    return res.status(400).json({ error: "Veuillez spécifier un élève et une classe valides." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // A. Récupérer l'année scolaire en cours
    const [annees] = await connection.execute('SELECT id, libelle FROM annees_scolaires WHERE statut = TRUE LIMIT 1');
    if (annees.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Aucune année scolaire active n'est configurée sur la plateforme." });
    }
    const annee_id = annees[0].id;
    const annee_libelle = annees[0].libelle;

    // B. SÉCURITÉ MULTI-TENANT : Vérifier que l'élève appartient bien à l'établissement de l'agent connecté
    const [eleveCheck] = await connection.execute(
      'SELECT id, nom, prenom FROM eleves WHERE id = ? AND etablissement_id = ?',
      [eleve_id, etablissement_id]
    );
    if (eleveCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: "Accès refusé. Cet élève n'existe pas ou ne dépend pas de votre établissement." });
    }
    const eleve = eleveCheck[0];

    // C. SÉCURITÉ MULTI-TENANT : Vérifier que la classe rattachée appartient au même établissement
    const [classeCheck] = await connection.execute(
      'SELECT id, nom FROM classes WHERE id = ? AND etablissement_id = ?',
      [classe_id, etablissement_id]
    );
    if (classeCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: "Accès refusé. Cette classe n'existe pas ou ne dépend pas de votre établissement." });
    }
    const classe = classeCheck[0];

    // D. Éviter les doublons d'inscriptions pour la même année scolaire
    const [doubleCheck] = await connection.execute(
      'SELECT id FROM inscriptions WHERE eleve_id = ? AND annee_id = ? AND etablissement_id = ?',
      [eleve_id, annee_id, etablissement_id]
    );
    if (doubleCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Cet élève est déjà officiellement inscrit dans une classe pour l'année scolaire en cours." });
    }

    // E. Insertion de l'inscription
    const [result] = await connection.execute(
      'INSERT INTO inscriptions (eleve_id, classe_id, annee_id, etablissement_id) VALUES (?, ?, ?, ?)',
      [eleve_id, classe_id, annee_id, etablissement_id]
    );

    // F. Trace d'audit persistée
    await enregistrerAudit(
      req, 
      'INSCRIPTION_ELEVE', 
      `Inscription de l'élève : ${eleve.nom} ${eleve.prenom} en classe de ${classe.nom} (Année Scolaire : ${annee_libelle})`
    );

    await connection.commit();

    return res.status(201).json({ 
      message: "Élève inscrit avec succès !", 
      inscriptionId: result.insertId 
    });

  } catch (error) {
    await connection.rollback();
    console.error("Erreur d'inscription :", error);
    return res.status(500).json({ error: "Une erreur interne s'est produite lors du processus d'inscription." });
  } finally {
    connection.release();
  }
};

// 2. Récupérer l'historique des inscriptions
// Remplacez simplement la fonction getInscriptions à la fin du fichier :
exports.getInscriptions = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    
    let query = `
      SELECT i.id, i.eleve_id, i.classe_id, i.annee_id, e.matricule, e.nom, e.prenom, c.nom AS classe_nom, a.libelle AS annee_libelle, i.date_inscription, etab.nom AS etablissement_nom
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

    query += ' ORDER BY i.id DESC'; // Remplacement par le tri ID d'origine, toujours disponible

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de l'extraction des inscriptions :", error);
    return res.status(500).json({ error: "Erreur lors du chargement des inscriptions." });
  }
};


// 3. Modifier une inscription (réaffectation de classe / élève)
exports.modifierInscription = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });
  const { id } = req.params;
  const { classe_id, eleve_id } = req.body;
  const etablissement_id = req.user.etablissement_id;
  if (!classe_id) return res.status(400).json({ error: "La classe est obligatoire." });
  try {
    const [cls] = await db.execute('SELECT id FROM classes WHERE id = ? AND etablissement_id = ?', [classe_id, etablissement_id]);
    if (cls.length === 0) return res.status(403).json({ error: "Classe invalide ou hors de votre établissement." });

    const sets = ['classe_id = ?']; const params = [classe_id];
    if (eleve_id) {
      const [el] = await db.execute('SELECT id FROM eleves WHERE id = ? AND etablissement_id = ?', [eleve_id, etablissement_id]);
      if (el.length === 0) return res.status(403).json({ error: "Élève invalide ou hors de votre établissement." });
      sets.push('eleve_id = ?'); params.push(eleve_id);
    }
    params.push(id, etablissement_id);
    const [result] = await db.execute(`UPDATE inscriptions SET ${sets.join(', ')} WHERE id = ? AND etablissement_id = ?`, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Inscription introuvable ou accès refusé." });

    await enregistrerAudit(req, 'MODIFICATION_INSCRIPTION', `Modification de l\u0027inscription ID ${id}`);
    return res.status(200).json({ message: "Inscription mise à jour !" });
  } catch (error) {
    console.error("Erreur modification inscription :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  }
};

// 4. Supprimer (annuler) une inscription — bloquée si des versements existent
exports.supprimerInscription = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });
  const { id } = req.params;
  const etablissement_id = req.user.etablissement_id;
  try {
    const [pay] = await db.execute('SELECT COUNT(*) AS n FROM paiements WHERE inscription_id = ?', [id]);
    if (pay[0].n > 0) {
      return res.status(409).json({ error: "Impossible d\u0027annuler : des versements sont rattachés à cette inscription." });
    }
    const [result] = await db.execute('DELETE FROM inscriptions WHERE id = ? AND etablissement_id = ?', [id, etablissement_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Inscription introuvable ou accès refusé." });

    await enregistrerAudit(req, 'SUPPRESSION_INSCRIPTION', `Annulation de l\u0027inscription ID ${id}`);
    return res.status(200).json({ message: "Inscription annulée !" });
  } catch (error) {
    console.error("Erreur suppression inscription :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  }
};
