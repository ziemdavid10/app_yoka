const db = require('../config/db');
const { enregistrerAudit } = require('../utils/auditLogger');
const { genererMatricule } = require('../utils/idGenerator');
const XLSX = require('xlsx');

// 1. Création sécurisée d'un élève
exports.creerEleve = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  const { nom, prenom, date_naissance, genre } = req.body;
  const etablissement_id = req.user.etablissement_id;

  if (!nom || !nom.trim() || !prenom || !prenom.trim() || !date_naissance || !genre) {
    return res.status(400).json({ error: "Tous les champs (nom, prénom, date de naissance, genre) sont obligatoires." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [etabRows] = await connection.execute(
      'SELECT code_unique FROM etablissements WHERE id = ?', 
      [etablissement_id]
    );

    if (etabRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Impossible de générer le matricule : établissement d'attache introuvable." });
    }

    const codeEtablissement = etabRows[0].code_unique;
    const matriculeAutomatique = await genererMatricule(etablissement_id, codeEtablissement);

    const [result] = await connection.execute(
      'INSERT INTO eleves (nom, prenom, date_naissance, genre, matricule, etablissement_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nom.trim().toUpperCase(), prenom.trim(), date_naissance, genre.toUpperCase(), matriculeAutomatique, etablissement_id]
    );

    await enregistrerAudit(req, 'CREATION_ELEVE', `Création de l'élève : ${nom.toUpperCase()} ${prenom} (Matricule: ${matriculeAutomatique})`);

    await connection.commit();

    return res.status(201).json({
      message: "Élève enregistré avec succès !",
      eleveId: result.insertId,
      matricule: matriculeAutomatique
    });

  } catch (error) {
    await connection.rollback();
    const isDuplicate = error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT' || (error.message && error.message.includes('UNIQUE'));
    if (isDuplicate) {
      return res.status(400).json({ error: "Une collision de matricule a été détectée. Veuillez réessayer." });
    }
    console.error("Erreur lors de l'enregistrement de l'élève :", error);
    return res.status(500).json({ error: "Une erreur interne est survenue lors de l'enregistrement." });
  } finally {
    if (connection.release) connection.release();
  }
};

// 2. Récupération cloisonnée des élèves
exports.getEleves = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Action non autorisée. Profil utilisateur manquant." });
  }

  try {
    const isSuperAdmin = req.user.roles && req.user.roles.includes('SUPERADMIN');
    let query = 'SELECT * FROM eleves';
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
    console.error("Erreur lors de la récupération des élèves :", error);
    return res.status(500).json({ error: "Erreur lors de la récupération de la liste des élèves." });
  }
};

// 3. Modification d'un élève
exports.modifierEleve = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Non autorisé." });
  const { id } = req.params;
  const { nom, prenom, date_naissance, genre } = req.body;
  if (!nom || !prenom || !date_naissance || !genre)
    return res.status(400).json({ error: "Tous les champs sont obligatoires." });
  try {
    const [result] = await db.execute(
      'UPDATE eleves SET nom=?, prenom=?, date_naissance=?, genre=? WHERE id=? AND etablissement_id=?',
      [nom.trim().toUpperCase(), prenom.trim(), date_naissance, genre.toUpperCase(), id, req.user.etablissement_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Élève introuvable." });
    await enregistrerAudit(req, 'MODIFICATION_ELEVE', `Modification de l'élève ID ${id} : ${nom} ${prenom}`);
    return res.status(200).json({ message: "Élève mis à jour." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de la modification." });
  }
};

// 4. Suppression d'un élève
exports.supprimerEleve = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Non autorisé." });
  const { id } = req.params;
  try {
    const [result] = await db.execute(
      'DELETE FROM eleves WHERE id=? AND etablissement_id=?',
      [id, req.user.etablissement_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Élève introuvable." });
    await enregistrerAudit(req, 'SUPPRESSION_ELEVE', `Suppression de l'élève ID ${id}`);
    return res.status(200).json({ message: "Élève supprimé." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur lors de la suppression." });
  }
};

// 5. Import en masse depuis un fichier Excel
exports.importerEleves = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Non autorisé." });
  if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });

  const etablissement_id = req.user.etablissement_id;

  const connection = await db.getConnection();
  try {
    const [etabRows] = await connection.execute(
      'SELECT code_unique FROM etablissements WHERE id = ?', [etablissement_id]
    );
    if (etabRows.length === 0) return res.status(404).json({ error: "Établissement introuvable." });
    const codeEtablissement = etabRows[0].code_unique;

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: "Le fichier est vide ou mal formaté." });
    if (rows.length > 500) return res.status(400).json({ error: "Limite de 500 élèves par import." });

    await connection.beginTransaction();

    const resultats = { inseres: 0, erreurs: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nom = (row['nom'] || row['NOM'] || row['Nom'] || '').toString().trim().toUpperCase();
      const prenom = (row['prenom'] || row['PRENOM'] || row['Prénom'] || row['prenom'] || '').toString().trim();
      const genre = (row['genre'] || row['GENRE'] || row['Genre'] || 'M').toString().trim().toUpperCase();

      let date_naissance = row['date_naissance'] || row['DATE_NAISSANCE'] || row['Date de naissance'] || '';
      if (date_naissance instanceof Date) {
        date_naissance = date_naissance.toISOString().split('T')[0];
      } else {
        date_naissance = date_naissance.toString().trim();
      }

      if (!nom || !prenom || !date_naissance) {
        resultats.erreurs.push({ ligne: i + 2, raison: `Données manquantes (nom, prénom ou date_naissance)` });
        continue;
      }

      try {
        const matricule = await genererMatricule(etablissement_id, codeEtablissement);
        await connection.execute(
          'INSERT INTO eleves (nom, prenom, date_naissance, genre, matricule, etablissement_id) VALUES (?, ?, ?, ?, ?, ?)',
          [nom, prenom, date_naissance, genre === 'F' ? 'F' : 'M', matricule, etablissement_id]
        );
        resultats.inseres++;
      } catch (err) {
        resultats.erreurs.push({ ligne: i + 2, raison: err.message });
      }
    }

    await connection.commit();
    await enregistrerAudit(req, 'IMPORT_ELEVES', `Import Excel : ${resultats.inseres} élève(s) importé(s), ${resultats.erreurs.length} erreur(s).`);

    return res.status(200).json({
      message: `Import terminé : ${resultats.inseres} élève(s) importé(s).`,
      ...resultats
    });

  } catch (error) {
    await connection.rollback();
    console.error('Erreur import Excel:', error);
    return res.status(500).json({ error: "Erreur lors de l'import du fichier." });
  } finally {
    if (connection.release) connection.release();
  }
};