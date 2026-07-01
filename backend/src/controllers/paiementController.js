const db = require('../config/db');

// 1. Enregistrer un versement (savePaiement)
exports.savePaiement = async (req, res) => {
  const { inscription_id, montant, type_versement, mode_paiement, reference_banque } = req.body;
  const versement = parseFloat(montant);

  if (!inscription_id || !montant || !type_versement) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  try {
    // 1. Calcul du reste à payer actuel avant d'accepter le nouveau paiement
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

    // 2. Garde-fou : Refuser si le montant dépasse la dette
    if (versement > resteAPayer) {
      return res.status(400).json({ 
        error: `Action refusée. Le montant saisi (${versement.toLocaleString()} F) excède le reste à payer de l'élève (${resteAPayer.toLocaleString()} F CFA).` 
      });
    }

    // 3. Si tout est valide, on procède à l'insertion
    const numero_recu = `REC-${Date.now()}`;
    const sql = `
      INSERT INTO paiements (inscription_id, montant, type_versement, mode_paiement, reference_banque, numero_recu) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [inscription_id, versement, type_versement, mode_paiement || 'CASH', reference_banque || null, numero_recu]);
    
    return res.status(201).json({ message: "Versement encaissé et validé !" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de la validation du paiement." });
  }
};

// 2. Enregistrer une charge / dépense
exports.enregistrerDepense = async (req, res) => {
  const { titre, categorie, montant, description, mode_paiement } = req.body;

  if (!titre || !categorie || !montant) {
    return res.status(400).json({ error: "Le titre, la catégorie et le montant sont requis." });
  }

  try {
    const sql = "INSERT INTO depenses (titre, categorie, montant, description, mode_paiement) VALUES (?, ?, ?, ?, ?)";
    await db.execute(sql, [titre, categorie, parseFloat(montant), description || null, mode_paiement || 'CASH']);
    return res.status(201).json({ message: "Dépense enregistrée au journal !" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement de la dépense." });
  }
};

// 3. Récupérer l'historique des dépenses
exports.getDepenses = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM depenses ORDER BY date_depense DESC");
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors du chargement des dépenses." });
  }
};

// 4. Moteur de statistiques globales (Recettes - Dépenses = Solde Réel)
exports.getStatsFinancieres = async (req, res) => {
  try {
    // Calcul de l'attendu global
    const [attenduRows] = await db.execute(`
      SELECT SUM(c.frais_scolarite) AS total_attendu 
      FROM inscriptions i
      INNER JOIN classes c ON i.classe_id = c.id
    `);

    // Calcul du total encaissé
    const [encaisseRows] = await db.execute("SELECT SUM(montant) AS total_encaisse FROM paiements");

    // Calcul du total des charges
    const [depenseRows] = await db.execute("SELECT SUM(montant) AS total_depenses FROM depenses");

    const totalAttendu = parseFloat(attenduRows[0].total_attendu) || 0;
    const totalEncaisse = parseFloat(encaisseRows[0].total_encaisse) || 0;
    const totalDepenses = parseFloat(depenseRows[0].total_depenses) || 0;

    const totalRestant = totalAttendu - totalEncaisse; // Ce qui reste dehors
    const soldeCaisse = totalEncaisse - totalDepenses; // Trésorerie réelle en caisse
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
    console.error(error);
    return res.status(500).json({ error: "Erreur de calcul des indicateurs financiers." });
  }
};

// 5. Récupérer l'historique global des paiements
exports.getPaiements = async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.numero_recu, e.matricule, e.nom, e.prenom, c.nom AS classe_nom, p.montant, p.mode_paiement, p.date_paiement
      FROM paiements p
      INNER JOIN inscriptions i ON p.inscription_id = i.id
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
      ORDER BY p.date_paiement DESC
    `;
    const [rows] = await db.execute(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors du chargement des paiements." });
  }
};

// 6. Obtenir la liste des élèves débiteurs
exports.getDebiteurs = async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id AS inscription_id,
        e.matricule,
        e.nom,
        e.prenom,
        c.nom AS classe_nom,
        c.frais_scolarite AS total_scolarite,
        IFNULL(SUM(p.montant), 0) AS total_paye,
        (c.frais_scolarite - IFNULL(SUM(p.montant), 0)) AS reste_a_payer
      FROM inscriptions i
      INNER JOIN eleves e ON i.eleve_id = e.id
      INNER JOIN classes c ON i.classe_id = c.id
      LEFT JOIN paiements p ON i.id = p.inscription_id
      GROUP BY i.id
      HAVING reste_a_payer > 0
      ORDER BY reste_a_payer DESC
    `;
    const [rows] = await db.execute(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de la récupération des débiteurs." });
  }
};