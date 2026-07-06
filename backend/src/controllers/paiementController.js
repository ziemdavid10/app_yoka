const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');

// 1. Enregistrer un versement (savePaiement)
exports.savePaiement = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Profil utilisateur manquant." });
  
  const { inscription_id, montant, type_versement, mode_paiement, reference_banque } = req.body;
  const versement = parseFloat(montant);
  const etablissement_id = req.user.etablissement_id;

  if (!inscription_id || !montant || !type_versement) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  try {
    // Calcul du reste à payer actuel avant d'accepter le nouveau versement
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

    // FIX : Génération du numéro de reçu unique requis par la base de données
    const numero_recu = `REC-${Date.now()}`;
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

    // TRACE AUDIT
    await enregistrerAudit(req, 'ENREGISTREMENT_PAIEMENT', `Encaissement de ${versement} F CFA. Reçu : ${numero_recu} (Inscription ID: ${inscription_id})`);

    return res.status(201).json({ message: "Paiement enregistré avec succès !", paiementId: result.insertId });
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
  
  // CORRECTION : On extrait 'titre' au lieu de 'motif' pour correspondre au frontend et à la BDD
  const { titre, montant, categorie, description, mode_paiement } = req.body;
  const etablissement_id = req.user.etablissement_id;

  // CORRECTION : Validation sur 'titre'
  if (!titre || !montant) {
    return res.status(400).json({ error: "Le titre et le montant sont obligatoires." });
  }

  try {
    await db.execute(`
      INSERT INTO depenses (titre, montant, categorie, description, mode_paiement, etablissement_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [titre, montant, categorie || 'AUTRE', description || '', mode_paiement || 'ESPECE', etablissement_id]);

    // CORRECTION : Utilisation de 'titre' pour la trace d'audit
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

// 6. Statistiques Financières (KPIs du tableau de bord)
// 6. Moteur de statistiques globales/locales (Restauré avec les bonnes clés KPI)
exports.getStatsFinancieres = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    // Le Superadmin peut cibler une école via query, l'admin local est confiné à son établissement
    const targetEtablissementId = isSuperAdmin ? req.query.etablissement_id : req.user.etablissement_id;

    let conditionInscription = "";
    let conditionDirecte = "";
    const params = [];

    if (targetEtablissementId) {
      conditionInscription = " WHERE i.etablissement_id = ? ";
      conditionDirecte = " WHERE etablissement_id = ? ";
      params.push(targetEtablissementId);
    }

    // 1. Calcul de l'attendu théorique (Somme des frais de scolarité des classes des élèves inscrits)
    const [attenduRows] = await db.execute(`
      SELECT SUM(c.frais_scolarite) AS total_attendu 
      FROM inscriptions i
      INNER JOIN classes c ON i.classe_id = c.id
      ${conditionInscription}
    `, params);

    // 2. Calcul du total réellement encaissé via les versements
    const [encaisseRows] = await db.execute(`SELECT SUM(montant) AS total_encaisse FROM paiements ${conditionDirecte}`, params);

    // 3. Calcul du total des charges / sorties de caisse
    const [depenseRows] = await db.execute(`SELECT SUM(montant) AS total_depenses FROM depenses ${conditionDirecte}`, params);

    // Formater les valeurs numériques pour éviter les mauvaises surprises avec le type BIGNUM SQL
    const totalAttendu = parseFloat(attenduRows[0].total_attendu) || 0;
    const totalEncaisse = parseFloat(encaisseRows[0].total_encaisse) || 0;
    const totalDepenses = parseFloat(depenseRows[0].total_depenses) || 0;

    // Calculs métiers
    const totalRestant = totalAttendu - totalEncaisse;
    const soldeCaisse = totalEncaisse - totalDepenses;
    const tauxRecouvrement = totalAttendu > 0 ? ((totalEncaisse / totalAttendu) * 100).toFixed(1) : 0;

    // Restitution du payload exact attendu par le Dashboard React
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