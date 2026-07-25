-- ============================================================================
-- SCHÉMA CANONIQUE — app_yoka (VERSION SQLITE)
-- ============================================================================

-- Activation explicite du support des clés étrangères pour SQLite
PRAGMA foreign_keys = ON;

-- =================================================================
-- 1. TABLES SANS DÉPENDANCES (NIVEAU 0)
-- =================================================================

-- Table des Établissements (Multi-tenant)
CREATE TABLE IF NOT EXISTS etablissements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    code_unique TEXT NOT NULL UNIQUE,
    adresse TEXT NULL,
    telephone TEXT NULL,
    statut INTEGER NOT NULL DEFAULT 1,  -- 1 = actif, 0 = inactif
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des Rôles
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_role TEXT NOT NULL UNIQUE
);

-- Table des Années Scolaires
CREATE TABLE IF NOT EXISTS annees_scolaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    libelle TEXT NOT NULL UNIQUE,
    statut INTEGER DEFAULT 0,          -- 1 s'il s'agit de l'année en cours
    date_debut DATE NULL,
    date_fin DATE NULL
);

-- Table des Matières
CREATE TABLE IF NOT EXISTS matieres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);


-- =================================================================
-- 2. TABLES DE NIVEAU 1 (DÉPENDANCES DIRECTES)
-- =================================================================

-- Table des Utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    etablissement_id INTEGER NULL,
    identifiant TEXT NOT NULL UNIQUE,
    mot_de_passe TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NULL,
    statut INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
);

-- Table des Classes
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    frais_scolarite REAL NOT NULL,
    est_classe_examen INTEGER NOT NULL DEFAULT 0,
    frais_examen REAL NOT NULL DEFAULT 0,
    frais_ape REAL NOT NULL DEFAULT 0,
    etablissement_id INTEGER NULL,
    CONSTRAINT chk_classe_frais_examen CHECK (
        (est_classe_examen = 0 AND frais_examen = 0)
        OR
        (est_classe_examen = 1 AND frais_examen > 0)
    ),
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
);

-- Table des Élèves
CREATE TABLE IF NOT EXISTS eleves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance DATE NOT NULL,
    genre TEXT NOT NULL CHECK (genre IN ('M', 'F')),
    etablissement_id INTEGER NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
);

-- Table des Dépenses (Charges d'établissement)
CREATE TABLE IF NOT EXISTS depenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    etablissement_id INTEGER NULL,
    titre TEXT NOT NULL,
    categorie TEXT NOT NULL,
    montant REAL NOT NULL,
    date_depense DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT NULL,
    mode_paiement TEXT DEFAULT 'CASH',
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
);


-- =================================================================
-- 3. TABLES DE NIVEAU 2 (Pivots et Relations complexes)
-- =================================================================

-- Table Pivot Utilisateurs <-> Rôles
CREATE TABLE IF NOT EXISTS utilisateur_roles (
    utilisateur_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (utilisateur_id, role_id),
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Table des Inscriptions
CREATE TABLE IF NOT EXISTS inscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL,
    classe_id INTEGER NOT NULL,
    annee_id INTEGER NOT NULL,
    etablissement_id INTEGER NULL,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_eleve_annee UNIQUE (eleve_id, annee_id),
    FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE RESTRICT,
    FOREIGN KEY (annee_id) REFERENCES annees_scolaires(id) ON DELETE RESTRICT,
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
);

-- Table du Journal d'Audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER NULL,
    etablissement_id INTEGER NULL,
    action TEXT NOT NULL,
    details TEXT NULL,
    ip_address TEXT NULL,
    cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE CASCADE
);

-- Table des Tranches de paiement par classe
CREATE TABLE IF NOT EXISTS classe_tranches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classe_id INTEGER NOT NULL,
    etablissement_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    montant REAL NOT NULL,
    date_limite DATE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tranche_montant_positif CHECK (montant > 0),
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE CASCADE
);


-- =================================================================
-- 4. TABLES DE NIVEAU 3 (Dépendances d'inscriptions et évaluations)
-- =================================================================

-- Table des Paiements
CREATE TABLE IF NOT EXISTS paiements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inscription_id INTEGER NOT NULL,
    etablissement_id INTEGER NULL,
    montant REAL NOT NULL,
    categorie TEXT NOT NULL CHECK (categorie IN ('SCOLARITE', 'APE', 'EXAMEN')) DEFAULT 'SCOLARITE',
    type_versement TEXT NOT NULL DEFAULT 'Tranche 1',
    mode_paiement TEXT NOT NULL,
    reference_banque TEXT NULL,
    numero_recu TEXT NOT NULL UNIQUE,
    date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_paiement_montant_positif CHECK (montant > 0),
    FOREIGN KEY (inscription_id) REFERENCES inscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
);

-- Table des Évaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classe_id INTEGER NOT NULL,
    matiere_id INTEGER NOT NULL,
    annee_id INTEGER NOT NULL,
    periode TEXT NOT NULL,
    coefficient INTEGER DEFAULT 1,
    date_evaluation DATE NOT NULL,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE,
    FOREIGN KEY (annee_id) REFERENCES annees_scolaires(id) ON DELETE CASCADE
);

-- Table des Notes académiques
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL,
    evaluation_id INTEGER NOT NULL,
    valeur REAL NOT NULL CHECK (valeur BETWEEN 0 AND 20),
    CONSTRAINT unique_note_eleve UNIQUE (eleve_id, evaluation_id),
    FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
);


-- =================================================================
-- 5. TABLE DE CONFIGURATION SYSTÈME (Singleton)
-- =================================================================

CREATE TABLE IF NOT EXISTS parametres_systeme (
    id INTEGER PRIMARY KEY CHECK (id = 1) DEFAULT 1,
    exiger_changement_mdp INTEGER NOT NULL DEFAULT 1,
    duree_session_heures INTEGER NOT NULL DEFAULT 8,
    retention_logs_jours INTEGER NOT NULL DEFAULT 365,
    notif_actions_sensibles INTEGER NOT NULL DEFAULT 1,
    frequence_sauvegarde TEXT NOT NULL CHECK (frequence_sauvegarde IN ('quotidienne', 'hebdomadaire')) DEFAULT 'quotidienne',
    alerte_echec_connexion INTEGER NOT NULL DEFAULT 1,
    modifie_par INTEGER NULL,
    modifie_le DATETIME NULL
);


-- =================================================================
-- 6. INSERTIONS DE CONFIGURATION & DONNÉES DE TEST (SEEDING)
-- =================================================================

-- Rôles d'origine
INSERT OR IGNORE INTO roles (nom_role) VALUES 
('SUPERADMIN'), 
('ADMIN');

-- Année scolaire active par défaut
INSERT OR IGNORE INTO annees_scolaires (libelle, statut) 
VALUES ('2025-2026', 1);

-- Établissement de test par défaut (ID = 1)
INSERT OR IGNORE INTO etablissements (id, nom, code_unique, adresse, telephone, statut) 
VALUES (1, 'Complexe Scolaire Yoka les aiglons', 'YOKA-CAMPUS-lampadaire', 'Yakadouma', '+237 600 00 00 00', 1);

-- Établissements additionnels de test
INSERT OR IGNORE INTO etablissements (nom, code_unique, adresse, telephone, statut) VALUES
('Campus Principal - BERTOUA', 'CAMPUS2', 'Avenue Monseigneur Vogt, Yaoundé', '+237 690000001', 1),
('Campus Annexe - DOUME', 'CAMPUS3', 'Boulevard de la Liberté, Douala', '+237 690000002', 1),
('Institut Yoka - GAROUABOULAYE', 'CAMPUS4', 'Quartier Tamdja, Bafoussam', '+237 690000003', 1),
('Académie Yoka - YOKADOUMA', 'CAMPUS5', 'Quartier Roumde Adjia, Garoua', '+237 690000004', 1);

-- Paramètres système (ligne unique)
INSERT OR IGNORE INTO parametres_systeme (id, exiger_changement_mdp, duree_session_heures, retention_logs_jours,
                                    notif_actions_sensibles, frequence_sauvegarde, alerte_echec_connexion)
VALUES (1, 1, 8, 365, 1, 'quotidienne', 1);