const db = require('../config/db');

// 1. Enregistrer un versement
exports.enregistrerPaiement = async (req, res) => {
  const { inscription_id, montant, mode_paiement, reference_banque } = req.body;

  if (!inscription_id || !montant || !mode_paiement) {
    return res.status(400).json({ error: "Champs obligatoires manquants." });
  }

  try {
    // Vérifier le montant total de la classe et ce qui a déjà été payé
    const queryVerif = `
      SELECT c.frais_scolarite, IFNULL(SUM(p.montant), 0) AS total_deja_paye
      FROM inscriptions i
      INNER JOIN classes c ON i.classe_id = c.id
      LEFT JOIN paiements p ON i.id = p.inscription_id
      WHERE i.id = ?
      GROUP BY c.id;
    `;
    const [verifRows] = await db.execute(queryVerif, [inscription_id]);

    if (verifRows.length === 0) {
      return res.status(444).json({ error: "Inscription introuvable." });
    }

    const { frais_scolarite, total_deja_paye } = verifRows[0];
    const resteAPayer = frais_scolarite - total_deja_paye;

    if (parseFloat(montant) > resteAPayer) {
      return res.status(400).json({ 
        error: `Le montant versé excède le reste à payer. L'élève doit encore ${resteAPayer} F CFA.` 
      });
    }

    //  CORRECTION : Générer un numéro de reçu unique (Ex: REC-2026-58493)
    const anneeActive = new Date().getFullYear();
    const aleatoire = Math.floor(10000 + Math.random() * 90000); // Génère 5 chiffres aléatoires
    const numero_recu = `REC-${anneeActive}-${aleatoire}`;

    //  CORRECTION : Ajouter 'numero_recu' dans la requête SQL
    const sqlInsert = `
      INSERT INTO paiements (inscription_id, montant, mode_paiement, reference_banque, numero_recu) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    // On passe 'numero_recu' en 5ème paramètre
    await db.execute(sqlInsert, [
      inscription_id, 
      montant, 
      mode_paiement, 
      reference_banque || null, 
      numero_recu
    ]);

    return res.status(201).json({ message: "Paiement enregistré avec succès !", numero_recu });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement du paiement." });
  }
};

// 2. Récupérer l'historique global des paiements
exports.getPaiements = async (req, res) => {
  try {
    // Optionnel : Vous pouvez ajouter p.numero_recu dans le SELECT si vous voulez l'afficher côté front plus tard
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

// 3. Obtenir les statistiques financières globales
exports.getStatsFinancieres = async (req, res) => {
  try {
    const query = `
      SELECT 
        IFNULL(SUM(c.frais_scolarite), 0) AS total_attendu,
        (SELECT IFNULL(SUM(montant), 0) FROM paiements) AS total_encaisse
      FROM inscriptions i
      INNER JOIN classes c ON i.classe_id = c.id
    `;
    const [rows] = await db.execute(query);
    
    const total_attendu = parseFloat(rows[0].total_attendu);
    const total_encaisse = parseFloat(rows[0].total_encaisse);
    const total_restant = total_attendu - total_encaisse;
    const taux_recouvrement = total_attendu > 0 ? ((total_encaisse / total_attendu) * 100).toFixed(1) : 0;

    return res.status(200).json({
      total_attendu,
      total_encaisse,
      total_restant,
      taux_recouvrement
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors du calcul des statistiques." });
  }
};

// // 1. Enregistrer un versement élève (Mis à jour avec type_versement)
// exports.savePaiement = async (req, res) => {
//   const { inscription_id, montant, type_versement, mode_paiement, reference_banque } = req.body;

//   if (!inscription_id || !montant || !type_versement) {
//     return res.status(400).json({ error: "L'inscription, le montant et le type de tranche sont requis." });
//   }

//   try {
//     const numero_recu = `REC-${Date.now()}`;
//     const sql = `
//       INSERT INTO paiements (inscription_id, montant, type_versement, mode_paiement, reference_banque, numero_recu) 
//       VALUES (?, ?, ?, ?, ?, ?)
//     `;
//     await db.execute(sql, [inscription_id, montant, type_versement, mode_paiement || 'CASH', reference_banque || null, numero_recu]);
//     return res.status(201).json({ message: "Versement enregistré avec succès !" });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Erreur lors de l'encaissement." });
//   }
// };

// // 2. Enregistrer une charge / dépense (Nouveau)
// exports.enregistrerDepense = async (req, res) => {
//   const { titre, categorie, montant, description, mode_paiement } = req.body;

//   if (!titre || !categorie || !montant) {
//     return res.status(400).json({ error: "Le titre, la catégorie et le montant sont requis." });
//   }

//   try {
//     const sql = "INSERT INTO depenses (titre, categorie, montant, description, mode_paiement) VALUES (?, ?, ?, ?, ?)";
//     await db.execute(sql, [titre, categorie, parseFloat(montant), description || null, mode_paiement || 'CASH']);
//     return res.status(201).json({ message: "Dépense enregistrée au journal !" });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Erreur lors de l'enregistrement de la dépense." });
//   }
// };

// // 3. Récupérer l'historique des dépenses (Nouveau)
// exports.getDepenses = async (req, res) => {
//   try {
//     const [rows] = await db.execute("SELECT * FROM depenses ORDER BY date_depense DESC");
//     return res.status(200).json(rows);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Erreur lors du chargement des dépenses." });
//   }
// };

// // 4. Moteur de statistiques globales mis à jour (Recettes - Dépenses = Solde Réel)
// exports.getStatsFinancieres = async (req, res) => {
//   try {
//     // Calcul de l'attendu global
//     const [attenduRows] = await db.execute(`
//       SELECT SUM(c.frais_scolarite) AS total_attendu 
//       FROM inscriptions i
//       INNER JOIN classes c ON i.classe_id = c.id
//     `);

//     // Calcul du total encaissé
//     const [encaisseRows] = await db.execute("SELECT SUM(montant) AS total_encaisse FROM paiements");

//     // Calcul du total des charges
//     const [depenseRows] = await db.execute("SELECT SUM(montant) AS total_depenses FROM depenses");

//     const totalAttendu = parseFloat(attenduRows[0].total_attendu) || 0;
//     const totalEncaisse = parseFloat(encaisseRows[0].total_encaisse) || 0;
//     const totalDepenses = parseFloat(depenseRows[0].total_depenses) || 0;

//     const totalRestant = totalAttendu - totalEncaisse; // Ce qui reste dehors
//     const soldeCaisse = totalEncaisse - totalDepenses; // Ce qui est physiquement en caisse
//     const tauxRecouvrement = totalAttendu > 0 ? ((totalEncaisse / totalAttendu) * 100).toFixed(1) : 0;

//     return res.status(200).json({
//       total_attendu: totalAttendu,
//       total_encaisse: totalEncaisse,
//       total_restant: totalRestant,
//       total_depenses: totalDepenses,
//       solde_caisse: soldeCaisse,
//       taux_recouvrement: tauxRecouvrement
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Erreur de calcul des indicateurs financiers." });
//   }
// };

// // Conservez getPaiements et getDebiteurs intacts (ils restent compatibles)
// exports.getPaiements = async (req, res) => {
//   try {
//     const sql = `
//       SELECT p.*, e.nom, e.prenom, c.nom AS classe_nom 
//       FROM paiements p
//       INNER JOIN inscriptions i ON p.inscription_id = i.id
//       INNER JOIN eleves e ON i.eleve_id = e.id
//       INNER JOIN classes c ON i.classe_id = c.id
//       ORDER BY p.date_paiement DESC
//     `;
//     const [rows] = await db.execute(sql);
//     return res.status(200).json(rows);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// exports.getDebiteurs = async (req, res) => {
//   try {
//     const sql = `
//       SELECT i.id AS inscription_id, e.matricule, e.nom, e.prenom, cl.nom AS classe_nom, cl.frais_scolarite AS total_scolarite,
//              COALESCE(SUM(p.montant), 0) AS total_paye,
//              (cl.frais_scolarite - COALESCE(SUM(p.montant), 0)) AS reste_a_payer
//       FROM inscriptions i
//       INNER JOIN eleves e ON i.eleve_id = e.id
//       INNER JOIN classes cl ON i.classe_id = cl.id
//       LEFT JOIN paiements p ON i.id = p.inscription_id
//       GROUP BY i.id, e.matricule, e.nom, e.prenom, cl.nom, cl.frais_scolarite
//       HAVING reste_a_payer > 0
//     `;
//     const [rows] = await db.execute(sql);
//     return res.status(200).json(rows);
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// 4. Obtenir la liste des élèves débiteurs (insolvables)
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