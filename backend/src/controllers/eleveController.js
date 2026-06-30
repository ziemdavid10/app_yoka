const db = require('../config/db');

// Enregistrer un nouvel élève
exports.creerEleve = async (req, res) => {
  const { matricule, nom, prenom, date_naissance, genre } = req.body;

  // 1. Validation de base des données reçues
  if (!matricule || !nom || !prenom || !date_naissance || !genre) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }

  try {
    // 2. Requête SQL d'insertion
    const sql = `
      INSERT INTO eleves (matricule, nom, prenom, date_naissance, genre) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    // On exécute la requête de manière sécurisée (requête préparée contre les injections SQL)
    const [result] = await db.execute(sql, [matricule, nom, prenom, date_naissance, genre]);

    // 3. Réponse en cas de succès
    return res.status(201).json({
      message: "Élève enregistré avec succès !",
      eleveId: result.insertId
    });

  } catch (error) {
    console.error("Erreur serveur :", error);

    // Gestion spécifique du doublon de matricule (Erreur MySQL 1062)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Ce matricule est déjà attribué à un autre élève." });
    }

    return res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement." });
  }
};

// Récupérer la liste de tous les élèves
exports.getEleves = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM eleves ORDER BY id DESC');
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves :", error);
    return res.status(500).json({ error: "Une erreur est survenue sur le serveur." });
  }
};