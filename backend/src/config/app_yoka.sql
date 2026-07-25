-- ============================================================================
-- SCHÉMA CANONIQUE — app_yoka
-- Reconstruit à partir du script d'origine + des deux migrations précédentes
-- (nettoyage Knex, puis correction des 5 points actés).
--
-- NOTES DE RECONSTRUCTION (choix faits en l'absence de décision explicite,
-- à valider) :
--   - configurations_frais, tranches_config, et les colonnes
--     paiements.config_frais_id / numero_tranche ont été RETIRÉS : aucun des
--     4 contrôleurs fournis ne les utilise (classeController s'appuie
--     entièrement sur classe_tranches). Signale-le si un autre contrôleur
--     non fourni en dépend encore.
--   - annees_scolaires.etablissement_id / .active (variante apparue dans des
--     brouillons de migration) : RETIRÉS, absents des contrôleurs.
--   - inscriptions.annee_scolaire_id et classe_tranches.annee_scolaire_id :
--     RETIRÉS. paiementController joint sur i.annee_id (colonne d'origine),
--     jamais sur annee_scolaire_id.
--   - paiements.type_versement : élargi à VARCHAR(150) DEFAULT 'Tranche 1'
--     (nécessaire : classeController.saveTranches génère des libellés de
--     tranche « etablissement · année · classe · tranche » qui dépassent
--     largement VARCHAR(50)).
--   - chk_paiement_montant_positif et chk_tranche_montant_positif : posés
--     une seule fois chacun (ils l'étaient jusqu'à 3 fois dans les brouillons).
--   - ⚠️ classe_tranches.nom reste en VARCHAR(100) comme à l'origine, mais le
--     même libellé long généré par saveTranches y est stocké : à surveiller,
--     possible troncature/erreur si code_unique + année + nom de classe +
--     libellé de tranche dépasse 100 caractères.
-- ============================================================================


-- =================================================================
-- 1. INITIALISATION DE LA BASE DE DONNÉES
-- =================================================================
-- ⚠️ Destructif — à réserver à une remise à zéro complète (environnement de
-- dev/démo). Sur une base contenant déjà des données réelles, remplace cette
-- section par les ALTER/CREATE ciblés des migrations précédentes.
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
    statut BOOLEAN NOT NULL DEFAULT TRUE,    -- TRUE = actif, FALSE = inactif
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Rôles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_role VARCHAR(30) NOT NULL UNIQUE -- 'SUPERADMIN', 'ADMIN', 'COMPTABLE', 'ENSEIGNANT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Années Scolaires
-- Structure alignée sur anneeScolaireController.js : pas de etablissement_id,
-- pas de colonne "active" — uniquement "statut" (une seule année active à la fois).
CREATE TABLE annees_scolaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(9) NOT NULL UNIQUE, -- Ex: '2025-2026'
    statut BOOLEAN DEFAULT FALSE,       -- TRUE s'il s'agit de l'année en cours
    date_debut DATE NULL,
    date_fin DATE NULL
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
-- est_classe_examen / frais_examen / frais_ape alignés sur classeController.js.
-- Règle métier : si la classe n'est pas une classe d'examen, frais_examen
-- reste à 0 ; si elle l'est, frais_examen est obligatoire et strictement positif.
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    frais_scolarite DECIMAL(10, 2) NOT NULL,
    est_classe_examen BOOLEAN NOT NULL DEFAULT FALSE,
    frais_examen DECIMAL(12, 2) NOT NULL DEFAULT 0,
    frais_ape DECIMAL(12, 2) NOT NULL DEFAULT 0,
    etablissement_id INT NULL,
    CONSTRAINT chk_classe_frais_examen CHECK (
        (est_classe_examen = FALSE AND frais_examen = 0)
        OR
        (est_classe_examen = TRUE AND frais_examen > 0)
    ),
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
    categorie VARCHAR(100) NOT NULL, -- texte libre : 'Salaires', 'Fournitures', 'Loyer', 'Maintenance'...
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
-- Rattachement à l'année scolaire via annee_id (colonne d'origine) :
-- paiementController joint explicitement sur i.annee_id = a.id.
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

-- Table des Tranches de paiement par classe (utilisée par classeController et
-- paiementController — remplace configurations_frais/tranches_config, non
-- utilisées par le code fourni)
CREATE TABLE classe_tranches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    classe_id INT NOT NULL,
    etablissement_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL, -- ex: "YOKA-CAMPUS · 2025-2026 · 6ème A · Tranche 1"
    montant DECIMAL(12, 2) NOT NULL,
    date_limite DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_tranche_montant_positif CHECK (montant > 0),
    CONSTRAINT fk_tranches_classe FOREIGN KEY (classe_id) 
        REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_tranches_etablissement FOREIGN KEY (etablissement_id) 
        REFERENCES etablissements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =================================================================
-- 5. TABLES DE NIVEAU 3 (Dépendances d'inscriptions et évaluations)
-- =================================================================

-- Table des Paiements (Frais scolaires rattachés aux inscriptions)
-- categorie = nature du versement (SCOLARITE/APE/EXAMEN) ; type_versement =
-- libellé de la tranche réglée (ex. le "nom" de classe_tranches, potentiellement
-- long — d'où le VARCHAR(150)).
CREATE TABLE paiements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inscription_id INT NOT NULL,
    etablissement_id INT NULL,
    montant DECIMAL(10, 2) NOT NULL,
    categorie ENUM('SCOLARITE', 'APE', 'EXAMEN') NOT NULL DEFAULT 'SCOLARITE',
    type_versement VARCHAR(150) NOT NULL DEFAULT 'Tranche 1',
    mode_paiement VARCHAR(50) NOT NULL,                      -- 'ESPECES', 'MOMO', 'OM', 'VIREMENT'...
    reference_banque VARCHAR(100) NULL,                      -- Id de transaction Mobile money / Banque
    numero_recu VARCHAR(100) NOT NULL UNIQUE,                -- Généré par le backend
    date_paiement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_paiement_montant_positif CHECK (montant > 0),
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
-- 6. TABLE DE CONFIGURATION SYSTÈME (singleton, sans dépendances)
-- =================================================================

CREATE TABLE parametres_systeme (
    id                       TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,

    -- Sécurité & Sessions
    exiger_changement_mdp    TINYINT(1)        NOT NULL DEFAULT 1,
    duree_session_heures     SMALLINT UNSIGNED NOT NULL DEFAULT 8,

    -- Journalisation & Rétention
    retention_logs_jours     SMALLINT UNSIGNED NOT NULL DEFAULT 365,
    notif_actions_sensibles  TINYINT(1)        NOT NULL DEFAULT 1,

    -- Sauvegardes automatisées
    frequence_sauvegarde     ENUM('quotidienne', 'hebdomadaire') NOT NULL DEFAULT 'quotidienne',

    -- Alertes de sécurité
    alerte_echec_connexion   TINYINT(1)        NOT NULL DEFAULT 1,

    -- Traçabilité de la dernière modification
    modifie_par              INT UNSIGNED      NULL,
    modifie_le                DATETIME         NULL,

    CONSTRAINT chk_parametres_singleton CHECK (id = 1)
    -- Décommente si tu veux la FK vers utilisateurs (id doit être INT UNSIGNED côté utilisateurs) :
    -- , CONSTRAINT fk_parametres_modifie_par FOREIGN KEY (modifie_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =================================================================
-- 7. INSERTIONS DE CONFIGURATION & DONNÉES DE TEST (SEEDING)
-- =================================================================

-- Rôles d'origine
INSERT INTO roles (nom_role) VALUES 
('SUPERADMIN'), 
('ADMIN')
ON DUPLICATE KEY UPDATE nom_role = nom_role;

-- Année scolaire active par défaut
INSERT INTO annees_scolaires (libelle, statut) 
VALUES ('2025-2026', TRUE)
ON DUPLICATE KEY UPDATE statut = statut;

-- Établissement de test par défaut (ID = 1)
INSERT INTO etablissements (id, nom, code_unique, adresse, telephone, statut) 
VALUES (1, 'Complexe Scolaire Yoka les aiglons', 'YOKA-CAMPUS-lampadaire', 'Yakadouma', '+237 600 00 00 00', TRUE)
ON DUPLICATE KEY UPDATE nom = nom;

-- Établissements additionnels de test
INSERT INTO etablissements (nom, code_unique, adresse, telephone, statut) VALUES
('Campus Principal - BERTOUA', 'CAMPUS2', 'Avenue Monseigneur Vogt, Yaoundé', '+237 690000001', TRUE),
('Campus Annexe - DOUME', 'CAMPUS3', 'Boulevard de la Liberté, Douala', '+237 690000002', TRUE),
('Institut Yoka - GAROUABOULAYE', 'CAMPUS4', 'Quartier Tamdja, Bafoussam', '+237 690000003', TRUE),
('Académie Yoka - YOKADOUMA', 'CAMPUS5', 'Quartier Roumde Adjia, Garoua', '+237 690000004', TRUE)
ON DUPLICATE KEY UPDATE nom = nom;

-- Paramètres système (ligne unique)
INSERT INTO parametres_systeme (id, exiger_changement_mdp, duree_session_heures, retention_logs_jours,
                                 notif_actions_sensibles, frequence_sauvegarde, alerte_echec_connexion)
VALUES (1, 1, 8, 365, 1, 'quotidienne', 1)
ON DUPLICATE KEY UPDATE id = id;