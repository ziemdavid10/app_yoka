const db = require('../config/db');

exports.creerClasse = async (req, res) => {
  const { nom, frais_scolarite } = req.body;
  if (!nom || !frais_scolarite) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  }
  try {
    const [result] = await db.execute('INSERT INTO classes (nom, frais_scolarite) VALUES (?, ?)', [nom, frais_scolarite]);
    return res.status(201).json({ message: "Classe créée avec succès !", classeId: result.insertId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de la création de la classe." });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM classes ORDER BY nom ASC');
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur de récupération des classes." });
  }
};