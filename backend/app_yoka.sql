-- =================================================================
-- 1. INITIALISATION DE LA BASE DE DONNÉES
-- =================================================================
DROP DATABASE IF EXISTS app_yoka;
CREATE DATABASE app_yoka CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE app_yoka;

-- =================================================================
-- 2. TABLES SANS DÉPENDANCES (NIVEAU 0)
-- =================================================================

-- Table des Établissements (Multi-tenant)
CREATE TABLE etablissements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    code_unique VARCHAR(50) NOT NULL UNIQUE, -- Ex: 'YOKA-CAMPUS-lampadaire'
    adresse VARCHAR(255) NULL,
    telephone VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Rôles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_role VARCHAR(30) NOT NULL UNIQUE -- 'SUPERADMIN', 'ADMIN', 'COMPTABLE', 'ENSEIGNANT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Années Scolaires
CREATE TABLE annees_scolaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(9) NOT NULL UNIQUE, -- Ex: '2025-2026'
    statut BOOLEAN DEFAULT FALSE        -- TRUE s'il s'agit de l'année en cours
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Matières
CREATE TABLE matieres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =================================================================
-- 3. TABLES DE NIVEAU 1 (DÉPENDANCES DIRECTES)
-- =================================================================

-- Table des Utilisateurs
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    etablissement_id INT NULL, -- NULL uniquement pour le SUPERADMIN
    identifiant VARCHAR(50) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL, -- Hash BCrypt
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NULL,
    statut BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_utilisateurs_etablissement FOREIGN KEY (etablissement_id) 
        REFERENCES etablissements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Classes
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    frais_scolarite DECIMAL(10, 2) NOT NULL,
    etablissement_id INT NULL,
    CONSTRAINT fk_classes_etablissement FOREIGN KEY (etablissement_id) 
        REFERENCES etablissements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Élèves
CREATE TABLE eleves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL UNIQUE, -- Généré automatiquement côté backend
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    date_naissance DATE NOT NULL,
    genre CHAR(1) NOT NULL CHECK (genre IN ('M', 'F')),
    etablissement_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eleves_etablissement FOREIGN KEY (etablissement_id) 
        REFERENCES etablissements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Dépenses (Charges d'établissement)
CREATE TABLE depenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    etablissement_id INT NULL,
    titre VARCHAR(150) NOT NULL,
    categorie VARCHAR(100) NOT NULL, -- 'Salaires', 'Fournitures', 'Loyer', 'Maintenance'
    montant DECIMAL(10, 2) NOT NULL,
    date_depense TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT NULL,
    mode_paiement VARCHAR(50) DEFAULT 'CASH',
    CONSTRAINT fk_depenses_etablissement FOREIGN KEY (etablissement_id) 
        REFERENCES etablissements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =================================================================
-- 4. TABLES DE NIVEAU 2 (Pivots et Relations complexes)
-- =================================================================

-- Table Pivot Utilisateurs <-> Rôles
CREATE TABLE utilisateur_roles (
    utilisateur_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (utilisateur_id, role_id),
    CONSTRAINT fk_pivot_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    CONSTRAINT fk_pivot_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Inscriptions
CREATE TABLE inscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eleve_id INT NOT NULL,
    classe_id INT NOT NULL,
    annee_id INT NOT NULL,
    etablissement_id INT NULL,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_eleve_annee UNIQUE (eleve_id, annee_id),
    CONSTRAINT fk_inscriptions_eleve FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE,
    CONSTRAINT fk_inscriptions_classe FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_inscriptions_annee FOREIGN KEY (annee_id) REFERENCES annees_scolaires(id) ON DELETE RESTRICT,
    CONSTRAINT fk_inscriptions_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table du Journal d'Audit (Piste d'Audit lue par auditController.js)
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NULL,
    etablissement_id INT NULL,
    action VARCHAR(100) NOT NULL, -- ex: 'CREATION_ELEVE', 'CONNEXION_REUSSIE'
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =================================================================
-- 5. TABLES DE NIVEAU 3 (Dépandances d'inscriptions et évaluations)
-- =================================================================

-- Table des Paiements (Frais scolaires rattachés aux inscriptions)
CREATE TABLE paiements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inscription_id INT NOT NULL,
    etablissement_id INT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    type_versement VARCHAR(50) NOT NULL DEFAULT 'Tranche 1', -- ex: 'Tranche 1', 'Tranche 2', 'Totalité'
    mode_paiement VARCHAR(50) NOT NULL,                      -- 'CASH', 'MOMO', 'OM', 'VIREMENT'
    reference_banque VARCHAR(100) NULL,                      -- Id de transaction Mobile money / Banque
    numero_recu VARCHAR(100) NOT NULL UNIQUE,                -- Généré par le backend
    date_paiement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paiements_inscription FOREIGN KEY (inscription_id) REFERENCES inscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_paiements_etablissement FOREIGN KEY (etablissement_id) REFERENCES etablissements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Évaluations (Carnet de notes)
CREATE TABLE evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    classe_id INT NOT NULL,
    matiere_id INT NOT NULL,
    annee_id INT NOT NULL,
    periode VARCHAR(20) NOT NULL, -- Ex: 'Trimestre 1', 'Séquence 1'
    coefficient INT DEFAULT 1,
    date_evaluation DATE NOT NULL,
    CONSTRAINT fk_evaluations_classe FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_matiere FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluations_annee FOREIGN KEY (annee_id) REFERENCES annees_scolaires(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Notes académiques
CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eleve_id INT NOT NULL,
    evaluation_id INT NOT NULL,
    valeur DECIMAL(4, 2) NOT NULL CHECK (valeur BETWEEN 0 AND 20),
    CONSTRAINT unique_note_eleve UNIQUE (eleve_id, evaluation_id),
    CONSTRAINT fk_notes_eleve FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =================================================================
-- 6. INSERTIONS DE CONFIGURATION & DONNÉES DE TEST (SEEDING)
-- =================================================================

-- Insertion des Rôles d'origine
INSERT INTO roles (nom_role) VALUES 
('SUPERADMIN'), 
('ADMIN')
ON DUPLICATE KEY UPDATE nom_role=nom_role;

-- Insertion de l'année scolaire active par défaut (utilisée par inscriptionController)
INSERT INTO annees_scolaires (libelle, statut) 
VALUES ('2025-2026', TRUE)
ON DUPLICATE KEY UPDATE statut=statut;

-- Insertion d'un établissement de test par défaut (ID = 1)
INSERT INTO etablissements (id, nom, code_unique, adresse, telephone) 
VALUES (1, 'Complexe Scolaire Yoka les aiglons', 'YOKA-CAMPUS-lampadaire', 'Yakadouma', '+237 600 00 00 00')
ON DUPLICATE KEY UPDATE nom=nom;

SELECT * FROM app_yoka.utilisateurs;


-- 1. Identifier si une classe prépare à un examen officiel (CM2, 3ème, Terminale...)
ALTER TABLE classes ADD COLUMN est_classe_examen BOOLEAN DEFAULT FALSE;

-- 2. Table de configuration des frais par classe et type de versement
CREATE TABLE configurations_frais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    classe_id INT NOT NULL,
    type_versement ENUM('SCOLARITE', 'APE', 'EXAMEN') NOT NULL,
    montant_total INT NOT NULL,
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY uq_classe_type (classe_id, type_versement)
);

-- 3. Table des tranches associées à une configuration de frais
CREATE TABLE tranches_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_frais_id INT NOT NULL,
    numero_tranche INT NOT NULL, -- 1, 2, 3...
    montant INT NOT NULL,
    FOREIGN KEY (config_frais_id) REFERENCES configurations_frais(id) ON DELETE CASCADE,
    UNIQUE KEY uq_config_tranche (config_frais_id, numero_tranche)
);

-- 4. Adapter la table des paiements pour faire référence à la tranche payée
ALTER TABLE paiements 
ADD COLUMN config_frais_id INT,
ADD COLUMN numero_tranche INT NULL, -- NULL si paiement en "Totalité" d'un coup
ADD FOREIGN KEY (config_frais_id) REFERENCES configurations_frais(id);


CREATE TABLE IF NOT EXISTS `classe_tranches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `classe_id` INT NOT NULL,
  `etablissement_id` INT NOT NULL,
  `nom` VARCHAR(100) NOT NULL, -- ex: "Tranche 1", "Tranche 2", "Frais d'inscription"
  `montant` INT NOT NULL, -- Montant de la tranche en F CFA (les décimales ne sont généralement pas requises)
  `date_limite` DATE NULL, -- Date d'échéance de cette tranche
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Contraintes d'intégrité référentielle (Clés Étrangères)
  CONSTRAINT `fk_tranches_classe` 
    FOREIGN KEY (`classe_id`) 
    REFERENCES `classes` (`id`) 
    ON DELETE CASCADE,
    
  CONSTRAINT `fk_tranches_etablissement` 
    FOREIGN KEY (`etablissement_id`) 
    REFERENCES `etablissements` (`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- Migration : refonte du modèle de versements (scolarité / APE / examen)
--             + année scolaire + intégrité des tranches
-- SGBD : MySQL 8+.  À exécuter dans une fenêtre de maintenance, sur une base
--        sauvegardée au préalable (mysqldump).  Idempotent autant que possible.
-- ============================================================================

START TRANSACTION;

-- 1) CLASSES : marqueur classe d'examen + frais par nature ----------------------
ALTER TABLE classes
  ADD COLUMN est_classe_examen TINYINT(1) NOT NULL DEFAULT 0 AFTER frais_scolarite,
  ADD COLUMN frais_examen       DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER est_classe_examen,
  ADD COLUMN frais_ape          DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER frais_examen;

-- 2) TRANCHES : garantir un montant strictement positif (EXIGENCE 1) ------------
--    (nettoyer d'abord les données existantes à 0 pour éviter l'échec du CHECK)
UPDATE classe_tranches SET montant = 1 WHERE montant IS NULL OR montant <= 0;
ALTER TABLE classe_tranches
  MODIFY montant DECIMAL(12,2) NOT NULL,
  ADD CONSTRAINT chk_tranche_montant_positif CHECK (montant > 0);

-- 3) ANNÉE SCOLAIRE : nouvelle dimension, une active par établissement ----------
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id  INT NOT NULL,
  libelle           VARCHAR(20) NOT NULL,          -- ex : '2025-2026'
  active            TINYINT(1) NOT NULL DEFAULT 0,
  date_debut        DATE NULL,
  date_fin          DATE NULL,
  CONSTRAINT fk_annee_etab FOREIGN KEY (etablissement_id) REFERENCES etablissements(id),
  UNIQUE KEY uq_annee_etab (etablissement_id, libelle)
);
-- Index partiel émulé : au plus une année active par établissement (à garantir applicativement)

-- Rattacher inscriptions et tranches à une année scolaire
ALTER TABLE inscriptions
  ADD COLUMN annee_scolaire_id INT NULL AFTER etablissement_id,
  ADD CONSTRAINT fk_inscription_annee FOREIGN KEY (annee_scolaire_id) REFERENCES annees_scolaires(id);

ALTER TABLE classe_tranches
  ADD COLUMN annee_scolaire_id INT NULL AFTER etablissement_id,
  ADD CONSTRAINT fk_tranche_annee FOREIGN KEY (annee_scolaire_id) REFERENCES annees_scolaires(id);

-- 4) PAIEMENTS : distinguer la NATURE (catégorie) de la TRANCHE ------------------
--    type_versement reste le libellé de tranche ; categorie porte la nature.
ALTER TABLE paiements
  ADD COLUMN categorie ENUM('SCOLARITE','APE','EXAMEN') NOT NULL DEFAULT 'SCOLARITE' AFTER montant;

-- Reprise des données historiques : déduire la catégorie de l'ancien texte libre
UPDATE paiements SET categorie = 'APE'    WHERE type_versement LIKE '%APE%';
UPDATE paiements SET categorie = 'EXAMEN' WHERE type_versement LIKE '%exam%';
-- tout le reste demeure SCOLARITE (défaut)

-- Garde-fou : un montant de paiement doit être strictement positif
ALTER TABLE paiements
  ADD CONSTRAINT chk_paiement_montant_positif CHECK (montant > 0);

COMMIT;

-- ROLLBACK MANUEL (si besoin de revenir en arrière) :
-- ALTER TABLE paiements DROP CONSTRAINT chk_paiement_montant_positif, DROP COLUMN categorie;
-- ALTER TABLE classe_tranches DROP FOREIGN KEY fk_tranche_annee, DROP COLUMN annee_scolaire_id,
--   DROP CONSTRAINT chk_tranche_montant_positif;
-- ALTER TABLE inscriptions DROP FOREIGN KEY fk_inscription_annee, DROP COLUMN annee_scolaire_id;
-- DROP TABLE annees_scolaires;
-- ALTER TABLE classes DROP COLUMN frais_ape, DROP COLUMN frais_examen, DROP COLUMN est_classe_examen;




-- ============================================================================
-- Migration : refonte du modèle de versements (scolarité / APE / examen)
--             + année scolaire + intégrité des tranches
-- SGBD : MySQL 8+.  À exécuter dans une fenêtre de maintenance, sur une base
--        sauvegardée au préalable (mysqldump).  Idempotent autant que possible.
-- ============================================================================

START TRANSACTION;

-- 1) CLASSES : marqueur classe d'examen + frais par nature ----------------------
ALTER TABLE classes
  ADD COLUMN est_classe_examen TINYINT(1) NOT NULL DEFAULT 0 AFTER frais_scolarite,
  ADD COLUMN frais_examen       DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER est_classe_examen,
  ADD COLUMN frais_ape          DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER frais_examen;

-- 2) TRANCHES : garantir un montant strictement positif (EXIGENCE 1) ------------
--    (nettoyer d'abord les données existantes à 0 pour éviter l'échec du CHECK)
UPDATE classe_tranches SET montant = 1 WHERE montant IS NULL OR montant <= 0;
ALTER TABLE classe_tranches
  MODIFY montant DECIMAL(12,2) NOT NULL,
  ADD CONSTRAINT chk_tranche_montant_positif CHECK (montant > 0);

-- 3) ANNÉE SCOLAIRE : nouvelle dimension, une active par établissement ----------
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id  INT NOT NULL,
  libelle           VARCHAR(20) NOT NULL,          -- ex : '2025-2026'
  active            TINYINT(1) NOT NULL DEFAULT 0,
  date_debut        DATE NULL,
  date_fin          DATE NULL,
  CONSTRAINT fk_annee_etab FOREIGN KEY (etablissement_id) REFERENCES etablissements(id),
  UNIQUE KEY uq_annee_etab (etablissement_id, libelle)
);
-- Index partiel émulé : au plus une année active par établissement (à garantir applicativement)

-- Rattacher inscriptions et tranches à une année scolaire
ALTER TABLE inscriptions
  ADD COLUMN annee_scolaire_id INT NULL AFTER etablissement_id,
  ADD CONSTRAINT fk_inscription_annee FOREIGN KEY (annee_scolaire_id) REFERENCES annees_scolaires(id);

ALTER TABLE classe_tranches
  ADD COLUMN annee_scolaire_id INT NULL AFTER etablissement_id,
  ADD CONSTRAINT fk_tranche_annee FOREIGN KEY (annee_scolaire_id) REFERENCES annees_scolaires(id);

-- 4) PAIEMENTS : distinguer la NATURE (catégorie) de la TRANCHE ------------------
--    type_versement reste le libellé de tranche ; categorie porte la nature.
ALTER TABLE paiements
  ADD COLUMN categorie ENUM('SCOLARITE','APE','EXAMEN') NOT NULL DEFAULT 'SCOLARITE' AFTER montant;

-- Reprise des données historiques : déduire la catégorie de l'ancien texte libre
UPDATE paiements SET categorie = 'APE'    WHERE type_versement LIKE '%APE%';
UPDATE paiements SET categorie = 'EXAMEN' WHERE type_versement LIKE '%exam%';
-- tout le reste demeure SCOLARITE (défaut)

-- Garde-fou : un montant de paiement doit être strictement positif
ALTER TABLE paiements
  ADD CONSTRAINT chk_paiement_montant_positif CHECK (montant > 0);

COMMIT;

-- ROLLBACK MANUEL (si besoin de revenir en arrière) :
-- ALTER TABLE paiements DROP CONSTRAINT chk_paiement_montant_positif, DROP COLUMN categorie;
-- ALTER TABLE classe_tranches DROP FOREIGN KEY fk_tranche_annee, DROP COLUMN annee_scolaire_id,
--   DROP CONSTRAINT chk_tranche_montant_positif;
-- ALTER TABLE inscriptions DROP FOREIGN KEY fk_inscription_annee, DROP COLUMN annee_scolaire_id;
-- DROP TABLE annees_scolaires;
-- ALTER TABLE classes DROP COLUMN frais_ape, DROP COLUMN frais_examen, DROP COLUMN est_classe_examen;

ALTER TABLE classes
  ADD COLUMN est_classe_examen TINYINT(1) NOT NULL DEFAULT 0 AFTER frais_scolarite,
  ADD COLUMN frais_examen  DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER est_classe_examen,
  ADD COLUMN frais_ape     DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER frais_examen;

ALTER TABLE classes
  ADD COLUMN est_classe_examen TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN frais_examen  DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN frais_ape     DECIMAL(12,2) NOT NULL DEFAULT 0;
  
DESCRIBE classes;

ALTER TABLE classes
  ADD COLUMN frais_examen DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER est_classe_examen,
  ADD COLUMN frais_ape    DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER frais_examen;
  
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id INT NOT NULL,
  libelle VARCHAR(20) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  date_debut DATE NULL, date_fin DATE NULL,
  UNIQUE KEY uq_annee_etab (etablissement_id, libelle)
);
-- crée l'année active (adapte l'id établissement)
INSERT INTO annees_scolaires (etablissement_id, libelle, active)
SELECT id, '2025-2026', 1 FROM etablissements;

UPDATE classe_tranches SET montant = 1 WHERE montant IS NULL OR montant <= 0;
ALTER TABLE classe_tranches MODIFY montant DECIMAL(12,2) NOT NULL;

ALTER TABLE etablissements ADD COLUMN code_unique VARCHAR(20) NULL;

ALTER TABLE classes
  ADD COLUMN frais_examen DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER est_classe_examen,
  ADD COLUMN frais_ape    DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER frais_examen;
  
DESCRIBE classes;



-- Table année scolaire + année active par établissement
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id INT NOT NULL,
  libelle VARCHAR(20) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  date_debut DATE NULL, date_fin DATE NULL,
  UNIQUE KEY uq_annee_etab (etablissement_id, libelle)
);
INSERT INTO annees_scolaires (etablissement_id, libelle, active)
SELECT id, '2025-2026', 1 FROM etablissements;

-- Catégorie sur les paiements
ALTER TABLE paiements
  ADD COLUMN categorie ENUM('SCOLARITE','APE','EXAMEN') NOT NULL DEFAULT 'SCOLARITE' AFTER montant;

-- Tranches : montant strictement positif
UPDATE classe_tranches SET montant = 1 WHERE montant IS NULL OR montant <= 0;
ALTER TABLE classe_tranches MODIFY montant DECIMAL(12,2) NOT NULL;



CREATE TABLE IF NOT EXISTS annees_scolaires (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etablissement_id INT NOT NULL,
  libelle VARCHAR(20) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  date_debut DATE NULL, date_fin DATE NULL,
  UNIQUE KEY uq_annee_etab (etablissement_id, libelle)
);

DESCRIBE annees_scolaires;
DESCRIBE etablissements;

UPDATE annees_scolaires SET statut = 1 WHERE id = (SELECT id FROM (SELECT MAX(id) AS id FROM annees_scolaires) t);


ALTER TABLE paiements ADD COLUMN categorie ENUM('SCOLARITE','APE','EXAMEN') NOT NULL DEFAULT 'SCOLARITE' AFTER montant;
UPDATE classe_tranches SET montant = 1 WHERE id > 0 AND (montant IS NULL OR montant <= 0);
ALTER TABLE classe_tranches MODIFY montant DECIMAL(12,2) NOT NULL;

SELECT id, nom, frais_scolarite FROM classes ORDER BY id DESC LIMIT 3;

ALTER TABLE paiements MODIFY type_versement VARCHAR(150) NOT NULL;

DESCRIBE paiements;

SELECT id, inscription_id, montant, categorie, type_versement FROM paiements ORDER BY id DESC LIMIT 1;

DESCRIBE inscriptions;
ALTER TABLE inscriptions ADD COLUMN annee_scolaire_id INT NULL;
-- rattacher l'existant à l'année active :
UPDATE inscriptions SET annee_scolaire_id = (SELECT id FROM annees_scolaires WHERE statut = 1 LIMIT 1) WHERE annee_scolaire_id IS NULL;



DESCRIBE annees_scolaires;
DESCRIBE etablissements;
DESCRIBE roles;
DESCRIBE utilisateur_roles;
DESCRIBE utilisateurs;

-- 1. Ajout du champ statut aux établissements (1 = Actif, 0 = Inactif)
ALTER TABLE etablissements 
ADD COLUMN statut TINYINT(1) DEFAULT 1 AFTER telephone;

-- 2. Index pour optimiser les requêtes sur l'année scolaire active
CREATE INDEX idx_annee_statut ON annees_scolaires(statut);


DESCRIBE etablissements;
SELECT * FROM utilisateurs;

INSERT INTO etablissements (nom, code_unique, adresse, telephone, statut) VALUES
('Campus Principal - BERTOUA', 'CAMPUS2', 'Avenue Monseigneur Vogt, Yaoundé', '+237 690000001', 1),
('Campus Annexe - DOUME', 'CAMPUS3', 'Boulevard de la Liberté, Douala', '+237 690000002', 1),
('Institut Yoka - GAROUABOULAYE', 'CAMPUS4', 'Quartier Tamdja, Bafoussam', '+237 690000003', 1),
('Académie Yoka - YOKADOUMA', 'CAMPUS5', 'Quartier Roumde Adjia, Garoua', '+237 690000004', 1);

SELECT * FROM etablissements;

-- 1. Mise à jour de la table 'classes'
ALTER TABLE classes 
  ADD COLUMN frais_ape DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER frais_scolarite,
  ADD COLUMN frais_examen DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER frais_ape,
  ADD COLUMN est_classe_examen TINYINT(1) NOT NULL DEFAULT 0 AFTER frais_examen;

-- 2. Mise à jour de la table 'paiements'
ALTER TABLE paiements 
  ADD COLUMN categorie ENUM('SCOLARITE', 'APE', 'EXAMEN') NOT NULL DEFAULT 'SCOLARITE' AFTER montant;
  
-- 1. Ajout du champ statut aux établissements (1 = Actif, 0 = Inactif)
ALTER TABLE etablissements 
ADD COLUMN statut TINYINT(1) DEFAULT 1 AFTER telephone;

-- 2. Index pour optimiser les requêtes sur l'année scolaire active
CREATE INDEX idx_annee_statut ON annees_scolaires(statut);