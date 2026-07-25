const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 1. Détection de l'environnement PKG (.exe)
// Si on est dans le .exe, on cible le VRAI dossier de l'exécutable sur le disque (process.execPath)
// Sinon, on utilise le répertoire courant de dev (process.cwd())
const isPkg = typeof process.pkg !== 'undefined';
const exeDir = isPkg ? path.dirname(process.execPath) : process.cwd();
const dbPath = path.join(exeDir, 'database.sqlite3');

console.log(` Emplacement de la base SQLite : ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(" Erreur de connexion SQLite :", err.message);
  else console.log(" Connecté à la base de données SQLite.");
});

// 2. db.serialize() pour garantir l'ordre d'initialisation
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON;');

  try {
    // Le schéma .sql est lu depuis le système de fichiers virtuel (lecture seule autorisée)
    const schemaPath = path.join(__dirname, 'app_yoka.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql, (err) => {
        if (err) console.error("Erreur d'initialisation du schéma :", err.message);
        else console.log(" Base SQLite initialisée avec succès !");
      });
    } else {
      console.error("Fichier SQL introuvable dans le paquet :", schemaPath);
    }
  } catch (error) {
    console.error("Erreur lors de la lecture du fichier SQL :", error.message);
  }
});

// 3. Fonction unifiée avec conversion automatique des fonctions MySQL -> SQLite
const runQuery = (sql, params = []) => {
  const sanitizedSql = sql
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/\bCURDATE\(\)/gi, "DATE('now')");

  return new Promise((resolve, reject) => {
    const trimmedSql = sanitizedSql.trim().toUpperCase();
    const isSelect = trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('PRAGMA');

    if (isSelect) {
      db.all(sanitizedSql, params, (err, rows) => {
        if (err) reject(err);
        else resolve([rows]);
      });
    } else {
      db.run(sanitizedSql, params, function (err) {
        if (err) reject(err);
        else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
      });
    }
  });
};

module.exports = {
  query: runQuery,
  execute: runQuery
};