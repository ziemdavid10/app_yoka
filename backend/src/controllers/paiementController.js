const crypto = require('crypto');
const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// Types de versement autorisés (EXIGENCE 3)
const TYPES_GLOBAUX = ['SCOLARITE', 'APE', 'EXAMEN'];

// 1. Enregistrer un versement (Transactionnel + Isolation des caisses)
exports.savePaiement = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Profil utilisateur manquant." });
  }

  // categorie = SCOLARITE | APE | EXAMEN  ;  type_versement = libellé de tranche (pour la scolarité échelonnée)
  const { inscription_id, montant, type_versement, categorie, mode_paiement, reference_banque } = req.body;
  const versement = parseFloat(montant);
  const etablissement_id = req.user.etablissement_id;
  const cat = (categorie || 'SCOLARITE').toUpperCase();

  if (!inscription_id || montant === undefined || montant === null || montant === '') {
    return res.status(400).json({ error: "Les champs obligatoires (inscription_id, montant) sont absents." });
  }
  if (!TYPES_GLOBAUX.includes(cat)) {
    return res.status(400).json({ error: `Catégorie de versement invalide. Attendu : ${TYPES_GLOBAUX.join(', ')}.` });
  }
  // EXIGENCE 1 : un montant nul/zéro/négatif est rejeté
  if (isNaN(versement) || versement <= 0) {
    return res.status(400).json({ error: "Le montant saisi doit être un nombre strictement positif supérieur à zéro." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // A. SÉCURITÉ MULTI-TENANT + lecture des frais par catégorie
    const [verifRows] = await connection.execute(`
      SELECT i.id, c.id AS classe_id, c.frais_scolarite, c.frais_ape, c.frais_examen, c.est_classe_examen,
             e.nom, e.prenom, c.nom AS classe_nom
        FROM inscriptions i
        INNER JOIN eleves e   ON i.eleve_id = e.id
        INNER JOIN classes c  ON i.classe_id = c.id
       WHERE i.id = ? AND i.etablissement_id = ?
    `, [inscription_id, etablissement_id]);

    if (verifRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Dossier d'inscription introuvable ou n'appartenant pas à votre établissement." });
    }

    const info = verifRows[0];

    // EXIGENCE 3 : les frais d'examen ne s'appliquent qu'aux classes d'examen
    if (cat === 'EXAMEN' && !info.est_classe_examen) {
      await connection.rollback();
      return res.status(400).json({ error: "Cette classe n'est pas une classe d'examen : aucun frais d'examen n'est dû." });
    }

    // Montant total attendu pour la catégorie visée
    const attenduParCategorie = {
      SCOLARITE: parseFloat(info.frais_scolarite) || 0,
      APE: parseFloat(info.frais_ape) || 0,
      EXAMEN: parseFloat(info.frais_examen) || 0
    };
    const totalAttendu = attenduParCategorie[cat];

    // Déjà payé POUR CETTE CATÉGORIE uniquement (cloisonnement des enveloppes)
    const [dejaRows] = await connection.execute(
      `SELECT IFNULL(SUM(montant), 0) AS total
         FROM paiements
        WHERE inscription_id = ? AND categorie = ?`,
      [inscription_id, cat]
    );
    const totalDejaPaye = parseFloat(dejaRows[0].total) || 0;
    const resteAPayer = totalAttendu - totalDejaPaye;

    // B. Protection contre le surpaiement (par catégorie)
    if (resteAPayer <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: `Le poste « ${cat} » est déjà entièrement soldé.` });
    }
    if (versement > resteAPayer) {
      await connection.rollback();
      return res.status(400).json({
        error: `Action rejetée. Le versement (${versement} F CFA) dépasse le reste à payer pour « ${cat} » (${resteAPayer} F CFA).`
      });
    }

    // C. EXIGENCE 2 & 4 : blocage séquentiel des TRANCHES (uniquement pour la SCOLARITÉ)
    let trancheCible = type_versement || null;
    if (cat === 'SCOLARITE') {
      const [tranchesRows] = await connection.execute(`
        SELECT ct.id, ct.nom AS label, ct.montant
          FROM classe_tranches ct
         WHERE ct.classe_id = ? AND ct.etablissement_id = ?
         ORDER BY ct.id ASC
      `, [info.classe_id, etablissement_id]);

      if (tranchesRows.length > 0) {
        // Somme déjà réglée par tranche
        const [parTranche] = await connection.execute(
          `SELECT type_versement, IFNULL(SUM(montant),0) AS paye
             FROM paiements
            WHERE inscription_id = ? AND categorie = 'SCOLARITE'
            GROUP BY type_versement`,
          [inscription_id]
        );
        const payeParLabel = {};
        parTranche.forEach(r => { payeParLabel[r.type_versement] = parseFloat(r.paye) || 0; });

        // Première tranche NON entièrement soldée (comparaison sur le solde réel)
        const prochaine = tranchesRows.find(t => (payeParLabel[t.label] || 0) < parseFloat(t.montant));

        if (!prochaine) {
          await connection.rollback();
          return res.status(400).json({ error: "Toutes les tranches de scolarité sont déjà soldées." });
        }

        // On force le versement sur la tranche courante non soldée
        if (type_versement && type_versement !== prochaine.label) {
          await connection.rollback();
          return res.status(400).json({
            error: `Blocage séquentiel : réglez d'abord « ${prochaine.label} » avant toute tranche ultérieure.`
          });
        }
        trancheCible = prochaine.label;

        // Le versement ne peut dépasser le solde restant de la tranche courante
        const resteTranche = parseFloat(prochaine.montant) - (payeParLabel[prochaine.label] || 0);
        if (versement > resteTranche) {
          await connection.rollback();
          return res.status(400).json({
            error: `Le versement (${versement} F CFA) dépasse le solde restant de la tranche « ${prochaine.label} » (${resteTranche} F CFA).`
          });
        }
      }
    }

    // D. Génération de la référence de reçu unique
    const [etabRows] = await connection.execute('SELECT code_unique FROM etablissements WHERE id = ?', [etablissement_id]);
    const code_etablissement = etabRows.length > 0 ? etabRows[0].code_unique : 'GEN';
    const codeEtabPropre = (code_etablissement || 'GEN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8);

    const date = new Date();
    const aa = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const jj = String(date.getDate()).padStart(2, '0');
    const suffixeAleatoire = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    const numero_recu = `REC-${codeEtabPropre}-${aa}${mm}${jj}-${suffixeAleatoire}`;

    // E. Insertion du paiement (catégorie + tranche)
    const [result] = await connection.execute(`
      INSERT INTO paiements
        (inscription_id, montant, categorie, type_versement, mode_paiement, reference_banque, numero_recu, etablissement_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inscription_id, versement, cat,
      cat === 'SCOLARITE' ? (trancheCible || 'Totalité') : cat,
      mode_paiement || 'ESPECES',
      reference_banque || null, numero_recu, etablissement_id
    ]);

    await enregistrerAudit(
      req, 'ENREGISTREMENT_PAIEMENT',
      `Encaissement ${cat} de ${versement} F CFA (Mode: ${mode_paiement || 'ESPECES'}). Réf : ${numero_recu}`
    );

    await connection.commit();

    return res.status(201).json({
      message: "Paiement enregistré avec succès !",
      paiementId: result.insertId,
      numero_recu,
      categorie: cat,
      montant: versement,
      reste_a_payer: resteAPayer - versement
    });

  } catch (error) {
    await connection.rollback();
    console.error("Erreur critique d'enregistrement de versement :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  } finally {
    connection.release();
  }
};



// 2. Listing sécurisé des paiements encaissés
exports.getPaiements = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Profil utilisateur absent." });
  }

  const etablissement_id = req.user.etablissement_id;
  const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');

  try {
    let query = `
      SELECT p.id, p.numero_recu, p.montant, p.mode_paiement, p.date_paiement, p.type_versement, p.reference_banque,
             e.matricule, e.nom, e.prenom, c.nom AS classe_nom
      FROM paiements p
      INNER JOIN inscriptions i ON p.inscription_id = i.id
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
    `;
    
    let params = [];
    if (!isSuperAdmin) {
      query += ` WHERE p.etablissement_id = ? `;
      params.push(etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ` WHERE p.etablissement_id = ? `;
      params.push(req.query.etablissement_id);
    }

    query += ` ORDER BY p.date_paiement DESC `;

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur de récupération des paiements :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  }
};

// 3. KPI Financiers cloisonnés
exports.getStatsFinancieres = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Profil utilisateur absent." });
  }

  const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
  let targetEtablissementId = req.user.etablissement_id;

  if (isSuperAdmin && req.query.etablissement_id) {
    targetEtablissementId = req.query.etablissement_id;
  }

  try {
    const anneeId = req.query.annee_id || null;
    const whereI = [];
    const paramsI = [];
    if (!isSuperAdmin || req.query.etablissement_id) { whereI.push('i.etablissement_id = ?'); paramsI.push(targetEtablissementId); }
    if (anneeId) { whereI.push('i.annee_id = ?'); paramsI.push(anneeId); }
    const condI = whereI.length ? ' WHERE ' + whereI.join(' AND ') : '';

    // Attendu = scolarité + APE + examen (si classe d'examen)
    const [attenduRows] = await db.execute(`
      SELECT IFNULL(SUM(c.frais_scolarite + c.frais_ape + (CASE WHEN c.est_classe_examen THEN c.frais_examen ELSE 0 END)), 0) AS total_attendu
      FROM inscriptions i
      INNER JOIN classes c ON i.classe_id = c.id
      ${condI}
    `, paramsI);

    // Encaissé via l'inscription (pour filtrer par année)
    const [encaisseRows] = await db.execute(`
      SELECT IFNULL(SUM(p.montant), 0) AS total_encaisse
      FROM paiements p INNER JOIN inscriptions i ON p.inscription_id = i.id
      ${condI}
    `, paramsI);

    // Dépenses : pas de lien année → filtre établissement seul
    let condDep = ''; const paramsDep = [];
    if (!isSuperAdmin || req.query.etablissement_id) { condDep = ' WHERE etablissement_id = ? '; paramsDep.push(targetEtablissementId); }
    const [depenseRows] = await db.execute(`
      SELECT IFNULL(SUM(montant), 0) AS total_depenses FROM depenses ${condDep}
    `, paramsDep);

    const totalAttendu = parseFloat(attenduRows[0].total_attendu) || 0;
    const totalEncaisse = parseFloat(encaisseRows[0].total_encaisse) || 0;
    const totalDepenses = parseFloat(depenseRows[0].total_depenses) || 0;

    const totalRestant = totalAttendu - totalEncaisse;
    const soldeCaisse = totalEncaisse - totalDepenses;
    const tauxRecouvrement = totalAttendu > 0 ? parseFloat(((totalEncaisse / totalAttendu) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      total_attendu: totalAttendu,
      total_encaisse: totalEncaisse,
      total_restant: totalRestant,
      total_depenses: totalDepenses,
      solde_caisse: soldeCaisse,
      taux_recouvrement: tauxRecouvrement
    });

  } catch (error) {
    console.error("Erreur de calcul des KPI Financiers :", error);
    return res.status(500).json({ error: "Une anomalie s'est produite lors de l'analyse financière." });
  }
};

// 4. Extraction dynamique des débiteurs insolvables
exports.getDebiteurs = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Profil utilisateur absent." });
  }

  const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
  const etablissement_id = req.user.etablissement_id;

  try {
    let query = `
      SELECT i.id AS inscription_id, e.matricule, e.nom, e.prenom, c.nom AS classe_nom,
             (c.frais_scolarite + c.frais_ape + (CASE WHEN c.est_classe_examen THEN c.frais_examen ELSE 0 END)) AS total_scolarite,
             IFNULL(SUM(p.montant), 0) AS total_paye,
             ((c.frais_scolarite + c.frais_ape + (CASE WHEN c.est_classe_examen THEN c.frais_examen ELSE 0 END)) - IFNULL(SUM(p.montant), 0)) AS reste_a_payer
      FROM inscriptions i
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
      LEFT JOIN paiements p ON i.id = p.inscription_id
    `;

    let params = [];
    const whereD = [];
    if (!isSuperAdmin) { whereD.push('i.etablissement_id = ?'); params.push(etablissement_id); }
    else if (req.query.etablissement_id) { whereD.push('i.etablissement_id = ?'); params.push(req.query.etablissement_id); }
    if (req.query.annee_id) { whereD.push('i.annee_id = ?'); params.push(req.query.annee_id); }
    if (whereD.length) query += ' WHERE ' + whereD.join(' AND ') + ' ';

    query += `
      GROUP BY i.id, e.id, c.id
      HAVING reste_a_payer > 0
      ORDER BY reste_a_payer DESC
    `;

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de l'extraction des débiteurs :", error);
    return res.status(500).json({ error: "Erreur lors du calcul de la liste des débiteurs." });
  }
};

// 5. Enregistrer une dépense opérationnelle (Caisse de l'école)
exports.enregistrerDepense = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Profil utilisateur absent." });
  }

  const { titre, montant, categorie, description, mode_paiement } = req.body;
  const depenseVal = parseFloat(montant);
  const etablissement_id = req.user.etablissement_id;

  if (!titre || !titre.trim() || !montant) {
    return res.status(400).json({ error: "Le titre et le montant de la dépense sont requis." });
  }

  if (isNaN(depenseVal) || depenseVal <= 0) {
    return res.status(400).json({ error: "Le montant de la dépense doit être strictement supérieur à 0 F CFA." });
  }

  try {
    const query = `
      INSERT INTO depenses (titre, montant, categorie, description, mode_paiement, etablissement_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      titre.trim(), 
      depenseVal, 
      categorie || 'AUTRE', 
      description || '', 
      mode_paiement || 'ESPECES', 
      etablissement_id
    ]);

    await enregistrerAudit(
      req, 
      'CREATION_DEPENSE', 
      `Dépense effectuée : ${titre.trim()} (${depenseVal} F CFA)`
    );

    return res.status(201).json({
      message: "Dépense enregistrée avec succès !",
      depenseId: result.insertId
    });

  } catch (error) {
    console.error("Erreur d'enregistrement de dépense :", error);
    return res.status(500).json({ error: "Erreur interne lors de la sauvegarde de la dépense." });
  }
};

// 6. Historique filtré des dépenses opérationnelles
exports.getDepenses = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil de l'agent inexistant." });

  const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
  const etablissement_id = req.user.etablissement_id;

  try {
    let query = `SELECT * FROM depenses`;
    let params = [];

    if (!isSuperAdmin) {
      query += ` WHERE etablissement_id = ? `;
      params.push(etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ` WHERE etablissement_id = ? `;
      params.push(req.query.etablissement_id);
    }

    query += ` ORDER BY id DESC `;

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur de récupération des dépenses :", error);
    return res.status(500).json({ error: "Impossible de récupérer les dépenses de l'établissement." });
  }
};

// 7. Modifier un paiement
exports.updatePaiement = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });

  const { id } = req.params;
  const { montant, type_versement, mode_paiement } = req.body;
  const etablissement_id = req.user.etablissement_id;

  try {
    const [result] = await db.execute(
      'UPDATE paiements SET montant = ?, type_versement = ?, mode_paiement = ? WHERE id = ? AND etablissement_id = ?',
      [parseFloat(montant), type_versement, mode_paiement, id, etablissement_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Paiement introuvable ou accès refusé." });

    await enregistrerAudit(req, 'MODIFICATION_PAIEMENT', `Modification paiement ID ${id}`);
    return res.status(200).json({ message: "Paiement mis à jour !" });
  } catch (error) {
    console.error("Erreur update paiement :", error);
    return res.status(500).json({ error: "Erreur lors de la modification du paiement." });
  }
};

// 8. Supprimer un paiement
exports.deletePaiement = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });

  const { id } = req.params;
  const etablissement_id = req.user.etablissement_id;

  try {
    const [result] = await db.execute(
      'DELETE FROM paiements WHERE id = ? AND etablissement_id = ?',
      [id, etablissement_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Paiement introuvable ou accès refusé." });

    await enregistrerAudit(req, 'SUPPRESSION_PAIEMENT', `Suppression paiement ID ${id}`);
    return res.status(200).json({ message: "Paiement supprimé !" });
  } catch (error) {
    console.error("Erreur suppression paiement :", error);
    return res.status(500).json({ error: "Erreur lors de la suppression du paiement." });
  }
};

// 9. Modifier une dépense
exports.updateDepense = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });

  const { id } = req.params;
  const { titre, montant, categorie, description, mode_paiement } = req.body;
  const etablissement_id = req.user.etablissement_id;

  try {
    const [result] = await db.execute(
      'UPDATE depenses SET titre = ?, montant = ?, categorie = ?, description = ?, mode_paiement = ? WHERE id = ? AND etablissement_id = ?',
      [titre, parseFloat(montant), categorie, description || '', mode_paiement, id, etablissement_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Dépense introuvable ou accès refusé." });

    await enregistrerAudit(req, 'MODIFICATION_DEPENSE', `Modification dépense ID ${id}`);
    return res.status(200).json({ message: "Dépense mise à jour !" });
  } catch (error) {
    console.error("Erreur update dépense :", error);
    return res.status(500).json({ error: "Erreur lors de la modification de la dépense." });
  }
};

// 10. Supprimer une dépense
exports.deleteDepense = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Action non autorisée." });

  const { id } = req.params;
  const etablissement_id = req.user.etablissement_id;

  try {
    const [result] = await db.execute(
      'DELETE FROM depenses WHERE id = ? AND etablissement_id = ?',
      [id, etablissement_id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Dépense introuvable ou accès refusé." });

    await enregistrerAudit(req, 'SUPPRESSION_DEPENSE', `Suppression dépense ID ${id}`);
    return res.status(200).json({ message: "Dépense supprimée !" });
  } catch (error) {
    console.error("Erreur suppression dépense :", error);
    return res.status(500).json({ error: "Erreur lors de la suppression de la dépense." });
  }
};


// 11. Liste des années scolaires (pour les sélecteurs d'états)
exports.getAnneesScolaires = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur absent." });
  try {
    const [rows] = await db.execute(
      "SELECT id, libelle, statut FROM annees_scolaires ORDER BY id DESC"
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur récupération années scolaires :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  }
};

// Bloc SELECT commun de ventilation dû / payé par catégorie
const SELECT_VENTILATION = `
  c.frais_scolarite AS du_scolarite,
  c.frais_ape AS du_ape,
  (CASE WHEN c.est_classe_examen THEN c.frais_examen ELSE 0 END) AS du_examen,
  IFNULL(ps.paye, 0) AS paye_scolarite,
  IFNULL(pa.paye, 0) AS paye_ape,
  IFNULL(pe.paye, 0) AS paye_examen
`;
const JOINS_VENTILATION = `
  INNER JOIN classes c ON i.classe_id = c.id
  INNER JOIN annees_scolaires a ON i.annee_id = a.id
  LEFT JOIN (SELECT inscription_id, SUM(montant) paye FROM paiements WHERE categorie = 'SCOLARITE' GROUP BY inscription_id) ps ON ps.inscription_id = i.id
  LEFT JOIN (SELECT inscription_id, SUM(montant) paye FROM paiements WHERE categorie = 'APE'       GROUP BY inscription_id) pa ON pa.inscription_id = i.id
  LEFT JOIN (SELECT inscription_id, SUM(montant) paye FROM paiements WHERE categorie = 'EXAMEN'    GROUP BY inscription_id) pe ON pe.inscription_id = i.id
`;

function filtreEtat(req) {
  const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
  const where = []; const params = [];
  if (!isSuperAdmin) { where.push('i.etablissement_id = ?'); params.push(req.user.etablissement_id); }
  else if (req.query.etablissement_id) { where.push('i.etablissement_id = ?'); params.push(req.query.etablissement_id); }
  if (req.query.annee_id) { where.push('i.annee_id = ?'); params.push(req.query.annee_id); }
  return { cond: where.length ? ' WHERE ' + where.join(' AND ') : '', params };
}

// 12. État financier PAR ÉLÈVE (par année scolaire)
exports.getEtatParEleve = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur absent." });
  try {
    const { cond, params } = filtreEtat(req);
    const [rows] = await db.execute(`
      SELECT i.id AS inscription_id, e.matricule, e.nom, e.prenom, c.nom AS classe_nom, a.libelle AS annee,
             ${SELECT_VENTILATION}
      FROM inscriptions i
      INNER JOIN eleves e ON i.eleve_id = e.id
      ${JOINS_VENTILATION}
      ${cond}
      ORDER BY c.nom ASC, e.nom ASC, e.prenom ASC
    `, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur état par élève :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  }
};

// 13. État financier PAR CLASSE (par année scolaire)
exports.getEtatParClasse = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur absent." });
  try {
    const { cond, params } = filtreEtat(req);
    const [rows] = await db.execute(`
      SELECT c.id AS classe_id, c.nom AS classe_nom, a.id AS annee_id, a.libelle AS annee,
             COUNT(DISTINCT i.id) AS nb_eleves,
             SUM(c.frais_scolarite) AS du_scolarite,
             SUM(c.frais_ape) AS du_ape,
             SUM(CASE WHEN c.est_classe_examen THEN c.frais_examen ELSE 0 END) AS du_examen,
             SUM(IFNULL(ps.paye, 0)) AS paye_scolarite,
             SUM(IFNULL(pa.paye, 0)) AS paye_ape,
             SUM(IFNULL(pe.paye, 0)) AS paye_examen
      FROM inscriptions i
      ${JOINS_VENTILATION}
      ${cond}
      GROUP BY c.id, a.id
      ORDER BY a.libelle DESC, c.nom ASC
    `, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur état par classe :", error);
    return res.status(500).json({ error: error.sqlMessage || error.message, code: error.code });
  }
};
