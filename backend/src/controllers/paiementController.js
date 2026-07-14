const crypto = require('crypto'); // 🛡️ Requis pour la génération de chaînes uniques
const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Enregistrer un versement (savePaiement avec Génération Automatique)
exports.savePaiement = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur manquant." });
  
  const { inscription_id, montant, type_versement, mode_paiement, reference_banque } = req.body;
  const versement = parseFloat(montant);
  const etablissement_id = req.user.etablissement_id;

  if (!inscription_id || !montant || !type_versement) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  try {
    // A. Calcul du reste à payer actuel avant d'accepter le nouveau versement
    const [verifRows] = await db.execute(`
      SELECT c.frais_scolarite, IFNULL(SUM(p.montant), 0) AS total_deja_paye
      FROM inscriptions i
      INNER JOIN classes c ON i.classe_id = c.id
      LEFT JOIN paiements p ON i.id = p.inscription_id
      WHERE i.id = ?
      GROUP BY c.id;
    `, [inscription_id]);

    if (verifRows.length === 0) {
      return res.status(444).json({ error: "Inscription introuvable." });
    }

    const { frais_scolarite, total_deja_paye } = verifRows[0];
    const resteAPayer = parseFloat(frais_scolarite) - parseFloat(total_deja_paye);

    if (versement > resteAPayer) {
      return res.status(400).json({ error: `Le montant dépasse le reste à payer attendu (${resteAPayer} F CFA).` });
    }

    // B. GÉNÉRATION PROFESSIONNELLE DU NUMÉRO DE REÇU / TRANSACTION
    // 1. Récupération du code unique de l'établissement
    const [etabRows] = await db.execute('SELECT code_unique FROM etablissements WHERE id = ?', [etablissement_id]);
    const code_etablissement = etabRows.length > 0 ? etabRows[0].code_unique : 'GEN';
    const codeEtabPropre = code_etablissement.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8);

    // 2. Construction temporelle (AAMMJJ)
    const date = new Date();
    const aa = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const jj = String(date.getDate()).padStart(2, '0');
    
    // 3. Clé de hachage unique pour éviter les collisions en millisecondes
    const suffixeAleatoire = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
    
    // Résultat Ex: REC-LYCBIL-260713-X7A1B
    const numero_recu = `REC-${codeEtabPropre}-${aa}${mm}${jj}-${suffixeAleatoire}`;

    // C. Insertion sécurisée en Base de données
    const sql = `
      INSERT INTO paiements (inscription_id, montant, type_versement, mode_paiement, reference_banque, numero_recu, etablissement_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(sql, [
      inscription_id, 
      versement, 
      type_versement, 
      mode_paiement || 'ESPECES', 
      reference_banque || null, 
      numero_recu, 
      etablissement_id
    ]);

    // TRACE AUDIT FINANCIÈRE
    await enregistrerAudit(
      req, 
      'ENREGISTREMENT_PAIEMENT', 
      `Encaissement de ${versement} F CFA (Mode: ${mode_paiement || 'ESPECES'}). Réf transaction : ${numero_recu}`
    );

    return res.status(201).json({ 
      message: "Paiement enregistré avec succès !", 
      paiementId: result.insertId,
      numero_recu: numero_recu 
    });
    
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du versement :", error);
    return res.status(500).json({ error: "Erreur interne lors du traitement du versement." });
  }
};

// 2. Obtenir l'historique global des versements
exports.getPaiements = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur manquant." });
  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
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
      query += ' WHERE p.etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE p.etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }
    
    query += ' ORDER BY p.date_paiement DESC';
    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur de récupération des paiements :", error);
    return res.status(500).json({ error: "Erreur lors du chargement des paiements." });
  }
};

// 3. Obtenir la liste des élèves débiteurs
exports.getDebiteurs = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur manquant." });
  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    
    let query = `
      SELECT 
        i.id AS inscription_id, e.matricule, e.nom, e.prenom, c.nom AS classe_nom,
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
      query += ' WHERE i.etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE i.etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }

    query += ' GROUP BY i.id HAVING reste_a_payer > 0 ORDER BY reste_a_payer DESC';

    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur de récupération des débiteurs :", error);
    return res.status(500).json({ error: "Erreur lors du chargement des débiteurs." });
  }
};

// 4. Enregistrer une charge / dépense externe
exports.enregistrerDepense = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur manquant." });
  
  const { titre, montant, categorie, description, mode_paiement } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!titre || !montant) {
    return res.status(400).json({ error: "Le titre et le montant sont obligatoires." });
  }

  try {
    await db.execute(`
      INSERT INTO depenses (titre, montant, categorie, description, mode_paiement, etablissement_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [titre, montant, categorie || 'AUTRE', description || '', mode_paiement || 'ESPECE', etablissement_id]);

    await enregistrerAudit(req, 'CREATION_DEPENSE', `Dépense effectuée : ${titre} (${montant} F CFA)`);
    
    return res.status(201).json({ message: "Dépense enregistrée avec succès !" });
  } catch (error) {
    console.error("Erreur lors de la création de la dépense :", error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement de la charge." });
  }
};

// 5. Récupérer l'historique des dépenses
exports.getDepenses = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur manquant." });
  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    let query = 'SELECT * FROM depenses';
    let params = [];

    if (!isSuperAdmin) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.user.etablissement_id);
    } else if (req.query.etablissement_id) {
      query += ' WHERE etablissement_id = ?';
      params.push(req.query.etablissement_id);
    }

    query += ' ORDER BY id DESC';
    const [rows] = await db.execute(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors du chargement des dépenses :", error);
    return res.status(500).json({ error: "Erreur de récupération des dépenses." });
  }
};

// 6. Moteur de statistiques globales/locales (KPIs)
exports.getStatsFinancieres = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    const targetEtablissementId = isSuperAdmin ? req.query.etablissement_id : req.user.etablissement_id;

    let conditionInscription = "";
    let conditionDirecte = "";
    const params = [];

    if (targetEtablissementId) {
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

    const [encaisseRows] = await db.execute(`SELECT SUM(montant) AS total_encaisse FROM paiements ${conditionDirecte}`, params);
    const [depenseRows] = await db.execute(`SELECT SUM(montant) AS total_depenses FROM depenses ${conditionDirecte}`, params);

    const totalAttendu = parseFloat(attenduRows[0].total_attendu) || 0;
    const totalEncaisse = parseFloat(encaisseRows[0].total_encaisse) || 0;
    const totalDepenses = parseFloat(depenseRows[0].total_depenses) || 0;

    const totalRestant = totalAttendu - totalEncaisse;
    const soldeCaisse = totalEncaisse - totalDepenses;
    const tauxRecouvrement = totalAttendu > 0 ? ((totalEncaisse / totalAttendu) * 100).toFixed(1) : 0;

    return res.status(200).json({
      total_attendu: totalAttendu,
      total_encaisse: totalEncaisse,
      total_restant: totalRestant,
      total_depenses: totalDepenses,
      solde_caisse: soldeCaisse,
      taux_recouvrement: tauxRecouvrement
    });
  } catch (error) {
    console.error("Erreur de calcul des indicateurs financiers :", error);
    return res.status(500).json({ error: "Erreur interne lors du calcul des indicateurs financiers." });
  }
};