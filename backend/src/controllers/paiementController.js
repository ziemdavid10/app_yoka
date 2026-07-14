const crypto = require('crypto');
const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Enregistrer un versement (Transactionnel + Isolation des caisses)
exports.savePaiement = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Profil utilisateur manquant." });
  }
  
  const { inscription_id, montant, type_versement, mode_paiement, reference_banque } = req.body;
  const versement = parseFloat(montant);
  const etablissement_id = req.user.etablissement_id;

  if (!inscription_id || !montant || !type_versement) {
    return res.status(400).json({ error: "Les champs obligatoires (inscription_id, montant, type_versement) sont absents." });
  }

  if (isNaN(versement) || versement <= 0) {
    return res.status(400).json({ error: "Le montant saisi doit être un nombre strictement positif supérieur à zéro." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // A. SÉCURITÉ MULTI-TENANT : Vérifier l'accès à l'inscription et calculer dynamiquement le solde
    const [verifRows] = await connection.execute(`
      SELECT i.id, c.frais_scolarite, e.nom, e.prenom, c.nom AS classe_nom,
             IFNULL((SELECT SUM(p.montant) FROM paiements p WHERE p.inscription_id = i.id), 0) AS total_deja_paye
      FROM inscriptions i
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
      WHERE i.id = ? AND i.etablissement_id = ?
      GROUP BY i.id, c.id
    `, [inscription_id, etablissement_id]);

    if (verifRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Dossier d'inscription introuvable ou n'appartenant pas à votre établissement." });
    }

    const info = verifRows[0];
    const fraisScolarite = parseFloat(info.frais_scolarite);
    const totalDejaPaye = parseFloat(info.total_deja_paye);
    const resteAPayer = fraisScolarite - totalDejaPaye;

    // B. Protection contre le surpaiement
    if (versement > resteAPayer) {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Action rejetée. Le versement proposé (${versement} F CFA) dépasse le reste à payer de cet élève (${resteAPayer} F CFA).` 
      });
    }

    // C. Génération de la référence de reçu unique (numero_recu)
    const [etabRows] = await connection.execute('SELECT code_unique FROM etablissements WHERE id = ?', [etablissement_id]);
    const code_etablissement = etabRows.length > 0 ? etabRows[0].code_unique : 'GEN';
    const codeEtabPropre = code_etablissement.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8);

    const date = new Date();
    const aa = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const jj = String(date.getDate()).padStart(2, '0');
    
    const suffixeAleatoire = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    const numero_recu = `REC-${codeEtabPropre}-${aa}${mm}${jj}-${suffixeAleatoire}`;

    // D. Insertion du paiement (utilisation de numero_recu)
    const [result] = await connection.execute(`
      INSERT INTO paiements 
        (inscription_id, montant, type_versement, mode_paiement, reference_banque, numero_recu, etablissement_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      inscription_id, 
      versement, 
      type_versement, 
      mode_paiement || 'ESPECES', 
      reference_banque || null, 
      numero_recu, 
      etablissement_id
    ]);

    // E. Journalisation d'audit
    await enregistrerAudit(
      req, 
      'ENREGISTREMENT_PAIEMENT', 
      `Encaissement de ${versement} F CFA (Mode: ${mode_paiement || 'ESPECES'}). Réf transaction : ${numero_recu}`
    );

    await connection.commit();

    return res.status(201).json({
      message: "Paiement enregistré avec succès !",
      paiementId: result.insertId,
      numero_recu: numero_recu,
      montant: versement,
      reste_a_payer: resteAPayer - versement
    });

  } catch (error) {
    await connection.rollback();
    console.error("Erreur critique d'enregistrement de versement :", error);
    return res.status(500).json({ error: "Une erreur système s'est produite lors du versement." });
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
    return res.status(500).json({ error: "Erreur serveur lors du chargement des transactions." });
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
    let conditionInscription = "";
    let conditionDirecte = "";
    let params = [];

    if (!isSuperAdmin || req.query.etablissement_id) {
      conditionInscription = " WHERE i.etablissement_id = ? ";
      conditionDirecte = " WHERE etablissement_id = ? ";
      params.push(targetEtablissementId);
    }

    const [attenduRows] = await db.execute(`
      SELECT SUM(c.frais_scolarite) AS total_attendu 
      FROM inscriptions i
      INNER JOIN classes c ON i.classe_id = c.id
      ${conditionInscription}
    `, params);

    const [encaisseRows] = await db.execute(`
      SELECT SUM(montant) AS total_encaisse FROM paiements ${conditionDirecte}
    `, params);

    const [depenseRows] = await db.execute(`
      SELECT SUM(montant) AS total_depenses FROM depenses ${conditionDirecte}
    `, params);

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
             c.frais_scolarite AS total_scolarite,
             IFNULL(SUM(p.montant), 0) AS total_paye,
             (c.frais_scolarite - IFNULL(SUM(p.montant), 0)) AS reste_a_payer
      FROM inscriptions i
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
      LEFT JOIN paiements p ON i.id = p.inscription_id
    `;

    let params = [];
    if (!isSuperAdmin) {
      query += ` WHERE i.etablissement_id = ? `;
      params.push(etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ` WHERE i.etablissement_id = ? `;
      params.push(req.query.etablissement_id);
    }

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
  if (!req.user) {
    return res.status(401).json({ error: "Profil de l'agent inexistant." });
  }

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

    query += ` ORDER BY id DESC `; // Tri sécurisé par ID (déjà chronologique)

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur de récupération des dépenses :", error);
    return res.status(500).json({ error: "Impossible de récupérer les dépenses de l'établissement." });
  }
};