const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Créer une nouvelle classe
exports.creerClasse = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { nom, frais_scolarite, est_classe_examen, frais_examen, frais_ape } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!nom || !nom.trim() || frais_scolarite === undefined || frais_scolarite === null || frais_scolarite === '') {
    return res.status(400).json({ error: "Le nom et les frais de scolarité sont obligatoires." });
  }
  const scolarite = parseFloat(frais_scolarite);
  if (isNaN(scolarite) || scolarite <= 0) {
    return res.status(400).json({ error: "Les frais de scolarité doivent être strictly positifs." });
  }

  const estExamen = est_classe_examen ? 1 : 0;
  const fraisExamen = estExamen ? (parseFloat(frais_examen) || 0) : 0;
  const fraisApe = parseFloat(frais_ape) || 0;

  if (estExamen && fraisExamen <= 0) {
    return res.status(400).json({ error: "Une classe d'examen doit définir des frais d'examen strictement positifs." });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO classes (nom, frais_scolarite, est_classe_examen, frais_examen, frais_ape, etablissement_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nom.trim(), scolarite, estExamen, fraisExamen, fraisApe, etablissement_id]
    );

    await enregistrerAudit(req, 'CREATION_CLASSE', `Création de la classe : ${nom.trim()} (Scolarité: ${scolarite} F CFA${estExamen ? `, Examen: ${fraisExamen}` : ''})`);

    return res.status(201).json({ message: "Classe créée avec succès !", classeId: result.insertId });
  } catch (error) {
    console.error("Erreur lors de la création de la classe :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  }
};

// 2. Récupérer toutes les classes
exports.getClasses = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    let query = 'SELECT * FROM classes';
    let params = [];

    if (!isSuperAdmin) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }

    query += ' ORDER BY nom ASC';

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des classes :", error);
    return res.status(500).json({ error: "Erreur de récupération des classes." });
  }
};

// 2b. Modifier une classe
exports.updateClasse = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });

  const { id } = req.params;
  const { nom, frais_scolarite, est_classe_examen, frais_examen, frais_ape } = req.body;
  const etablissement_id = req.user.etablissement_id;

  const scolarite = parseFloat(frais_scolarite);
  if (!nom || !nom.trim() || isNaN(scolarite) || scolarite <= 0) {
    return res.status(400).json({ error: "Nom et frais de scolarité (strictement positifs) requis." });
  }
  const estExamen = est_classe_examen ? 1 : 0;
  const fraisExamen = estExamen ? (parseFloat(frais_examen) || 0) : 0;
  const fraisApe = parseFloat(frais_ape) || 0;
  if (estExamen && fraisExamen <= 0) {
    return res.status(400).json({ error: "Une classe d'examen doit définir des frais d'examen strictement positifs." });
  }

  try {
    const [result] = await db.execute(
      `UPDATE classes SET nom = ?, frais_scolarite = ?, est_classe_examen = ?, frais_examen = ?, frais_ape = ?
       WHERE id = ? AND etablissement_id = ?`,
      [nom.trim(), scolarite, estExamen, fraisExamen, fraisApe, id, etablissement_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Classe introuvable ou accès refusé." });

    await enregistrerAudit(req, 'MODIFICATION_CLASSE', `Modification de la classe ID ${id}`);
    return res.status(200).json({ message: "Classe mise à jour !" });
  } catch (error) {
    console.error("Erreur update classe :", error);
    return res.status(500).json({ error: "Erreur lors de la modification de la classe." });
  }
};

// 2c. Supprimer une classe
exports.deleteClasse = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });

  const { id } = req.params;
  const etablissement_id = req.user.etablissement_id;

  try {
    const [insc] = await db.execute(
      'SELECT COUNT(*) AS n FROM inscriptions WHERE classe_id = ? AND etablissement_id = ?',
      [id, etablissement_id]
    );
    if (insc[0].n > 0) {
      return res.status(409).json({ error: "Impossible de supprimer : des élèves sont inscrits dans cette classe." });
    }

    const [result] = await db.execute(
      'DELETE FROM classes WHERE id = ? AND etablissement_id = ?',
      [id, etablissement_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Classe introuvable ou accès refusé." });

    await enregistrerAudit(req, 'SUPPRESSION_CLASSE', `Suppression de la classe ID ${id}`);
    return res.status(200).json({ message: "Classe supprimée !" });
  } catch (error) {
    console.error("Erreur suppression classe :", error);
    return res.status(500).json({ error: "Erreur lors de la suppression de la classe." });
  }
};

// 3. Enregistrer ou mettre à jour les tranches (Adapté pour SQLite)
exports.saveTranches = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const classe_id = req.params.classe_id || req.body.classe_id;
  const { tranches } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!classe_id || !Array.isArray(tranches)) {
    return res.status(400).json({ error: "Données invalides. L'ID de classe et la liste des tranches sont requis." });
  }

  const [ctxRows] = await db.execute(
     `SELECT c.nom AS classe_nom, c.frais_scolarite, et.code_unique, et.nom AS etab_nom,
            (SELECT libelle FROM annees_scolaires WHERE statut = 1 ORDER BY id DESC LIMIT 1) AS annee_active
       FROM classes c
       INNER JOIN etablissements et ON et.id = c.etablissement_id
      WHERE c.id = ? AND c.etablissement_id = ?`,
    [classe_id, etablissement_id]
  );

  if (ctxRows.length === 0) {
    return res.status(404).json({ error: "Classe introuvable ou hors de votre établissement." });
  }

  const ctx = ctxRows[0];
  const annee = ctx.annee_active || String(new Date().getFullYear()) + '-' + String(new Date().getFullYear() + 1);
  const prefixe = `${ctx.code_unique || ctx.etab_nom} · ${annee} · ${ctx.classe_nom}`;

  if (tranches.length > 0) {
    const somme = tranches.reduce((s, t) => s + (parseFloat(t.montant) || 0), 0);
    const total = parseFloat(ctx.frais_scolarite) || 0;
    if (Math.abs(somme - total) > 0.01) {
      return res.status(400).json({
        error: `La somme des tranches (${somme} F CFA) doit être égale aux frais de scolarité de la classe (${total} F CFA).`
      });
    }
  }

  for (let i = 0; i < tranches.length; i++) {
    const m = parseFloat(tranches[i].montant);
    if (isNaN(m) || m <= 0) {
      return res.status(400).json({
        error: `Montant invalide pour la tranche n°${i + 1} : la valeur doit être un nombre strictement supérieur à zéro.`
      });
    }
  }

  const connection = db.getConnection ? await db.getConnection() : db;
  const useTransaction = !!db.getConnection;

  try {
    if (useTransaction) await connection.beginTransaction();

    await connection.execute(
      'DELETE FROM classe_tranches WHERE classe_id = ? AND etablissement_id = ?',
      [classe_id, etablissement_id]
    );

    // Insertion répétée compatible SQLite (au lieu de la syntaxe MySQL VALUES ?)
    for (let index = 0; index < tranches.length; index++) {
      const t = tranches[index];
      const brut = (t.nom || t.libelle || t.label || `Tranche ${index + 1}`).toString().trim();
      const nomComplet = `${prefixe} · ${brut}`;

      await connection.execute(
        `INSERT INTO classe_tranches (classe_id, etablissement_id, nom, montant, date_limite)
         VALUES (?, ?, ?, ?, ?)`,
        [classe_id, etablissement_id, nomComplet, parseFloat(t.montant), t.date_limite || null]
      );
    }

    if (useTransaction) await connection.commit();

    await enregistrerAudit(req, 'CONFIG_TRANCHES', `Mise à jour des tranches de paiement pour la classe ID : ${classe_id}`);
    return res.status(200).json({ message: "Tranches enregistrées avec succès !" });

  } catch (error) {
    if (useTransaction) await connection.rollback();
    console.error("Erreur saveTranches :", error);
    return res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement des tranches." });
  } finally {
    if (useTransaction && connection.release) connection.release();
  }
};

// 4. Récupérer les tranches configurées (Adapté pour strftime)
exports.getTranches = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée." });
  }

  const classe_id = req.params.classe_id;
  const etablissement_id = req.user.etablissement_id;

  if (!classe_id) {
    return res.status(400).json({ error: "L'identifiant de la classe est manquant." });
  }

  try {
    const query = `
      SELECT id, nom, nom AS label, montant,
             strftime('%Y-%m-%d', date_limite) AS date_limite
        FROM classe_tranches
       WHERE classe_id = ? AND etablissement_id = ?
       ORDER BY id ASC
    `;
    const [rows] = await db.execute(query, [classe_id, etablissement_id]);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getTranches :", error);
    return res.status(500).json({ error: "Impossible de récupérer les tranches de cette classe." });
  }
};