const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 1. Détection de l'environnement PKG (.exe vs dev)
const isPkg = typeof process.pkg !== 'undefined';
const exeDir = isPkg ? path.dirname(process.execPath) : process.cwd();
const dbPath = path.join(exeDir, 'database.sqlite3');

console.log(`📁 Emplacement de la base SQLite : ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(" Erreur de connexion SQLite :", err.message);
  else console.log("⚡ Connecté à la base de données SQLite.");
});

// 2. Initialisation asynchrone du schéma
// src/config/db.js

const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON;');

      // Résolution du chemin pour PKG et dev
      const schemaPath = path.join(__dirname, 'app_yoka.sql'); 

      if (!fs.existsSync(schemaPath)) {
        console.error(` Fichier de schéma introuvable à l'adresse : ${schemaPath}`);
        return reject(new Error(`Fichier SQL introuvable : ${schemaPath}`));
      }

      try {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql, (err) => {
          if (err) {
            console.error(" Erreur d'exécution du fichier SQL :", err.message);
            reject(err);
          } else {
            console.log(" Base SQLite et tables initialisées avec succès !");
            resolve();
          }
        });
      } catch (error) {
        console.error(" Erreur lors de la lecture du fichier SQL :", error.message);
        reject(error);
      }
    });
  });
};

// 3. Traduction de dialecte MySQL -> SQLite
const runQuery = (sql, params = []) => {
  const sanitizedSql = sql
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/\bCURDATE\(\)/gi, "DATE('now')")
    .replace(/\bYEAR\(([^)]+)\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)")
    .replace(/\bMONTH\(([^)]+)\)/gi, "CAST(strftime('%m', $1) AS INTEGER)")
    .replace(/\bDAY\(([^)]+)\)/gi, "CAST(strftime('%d', $1) AS INTEGER)")
    .replace(/%i/g, "%M") // Correction minute MySQL -> SQLite
    .replace(/\bDATE_FORMAT\(\s*([^,]+)\s*,\s*('[^']+')\s*\)/gi, "strftime($2, $1)");

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

// 4. Émulation de getConnection() et des transactions
const getConnection = async () => {
  return {
    execute: runQuery,
    query: runQuery,
    beginTransaction: () => runQuery('BEGIN TRANSACTION'),
    commit: () => runQuery('COMMIT'),
    rollback: () => runQuery('ROLLBACK'),
    release: () => {}
  };
};

module.exports = {
  initDb,
  query: runQuery,
  execute: runQuery,
  getConnection
};