const crypto = require('crypto');
const db = require('../config/db');

/**
 * Nettoie et normalise le code de l'établissement pour les identifiants (sans espaces ni caractères spéciaux)
 */
const formaterCodeEtab = (code) => {
  return code ? code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8) : 'GEN';
};

/**
 * 1. GÉNÉRATEUR DE MATRICULE PROFESSIONNEL
 * Format: MAT-CODEECOLE-ANNEE-SEQ (Ex: MAT-LYCBIL-2026-0001)
 */
// Dans src/utils/idGenerator.js

exports.genererMatricule = async (etablissement_id, code_etablissement) => {
  const anneeCourante = new Date().getFullYear();
  const codeEtabPropre = code_etablissement ? code_etablissement.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8) : 'GEN';

  // 🔄 Modification : On compte spécifiquement dans la table 'eleves'
  const query = `
    SELECT COUNT(*) AS total 
    FROM eleves 
    WHERE etablissement_id = ? AND YEAR(created_at) = ?
  `;
  
  const [rows] = await db.execute(query, [etablissement_id, anneeCourante]);
  const suivante = rows[0].total + 1;
  
  // Formatage à 4 chiffres (Ex: 0001, 0012, 0145)
  const sequenceStr = String(suivante).padStart(4, '0');
  
  return `MAT-${codeEtabPropre}-${anneeCourante}-${sequenceStr}`;
};

/**
 * 2. GÉNÉRATEUR DE NUMÉRO DE FACTURE (Norme Comptable Impérative)
 * Séquence ininterrompue par année/mois. Format: FAC-CODEECOLE-AAMM-SEQ (Ex: FAC-LYCBIL-2607-00001)
 */
exports.genererNumeroFacture = async (etablissement_id, code_etablissement) => {
  const date = new Date();
  const anneeCourt = String(date.getFullYear()).slice(-2);
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const codeEtabPropre = formaterCodeEtab(code_etablissement);
  const prefixeTemporel = `${anneeCourt}${mois}`; // Ex: "2607" pour Juillet 2026

  // Récupérer la facture la plus haute pour cet établissement et cette période
  const query = `
    SELECT MAX(numero_facture) AS max_facture 
    FROM factures 
    WHERE etablissement_id = ? AND numero_facture LIKE ?
  `;
  
  // Filtre de recherche du type "FAC-LYCBIL-2607-%"
  const recherche = `FAC-${codeEtabPropre}-${prefixeTemporel}-%`;
  const [rows] = await db.execute(query, [etablissement_id, recherche]);
  
  let suivante = 1;
  
  if (rows[0].max_facture) {
    // Extraction des derniers chiffres de la chaîne pour incrémenter
    const parties = rows[0].max_facture.split('-');
    const derniereSequence = parseInt(parties[parties.length - 1], 10);
    if (!isNaN(derniereSequence)) {
      suivante = derniereSequence + 1;
    }
  }

  const sequenceStr = String(suivante).padStart(5, '0');
  return `FAC-${codeEtabPropre}-${prefixeTemporel}-${sequenceStr}`;
};

/**
 * 3. GÉNÉRATEUR DE RÉFÉRENCE DE TRANSACTION FINANCIÈRE
 * Non-séquentielle mais hautement sécurisée contre la fraude/prédictibilité.
 * Format: TXN-CODEECOLE-AAMMJJ-HEXA (Ex: TXN-LYCBIL-260713-3F8E)
 */
exports.genererReferenceTransaction = (code_etablissement) => {
  const date = new Date();
  const aa = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const jj = String(date.getDate()).padStart(2, '0');
  
  const codeEtabPropre = formaterCodeEtab(code_etablissement);
  
  // Génération d'un suffixe pseudo-aléatoire cryptographique imbattable de 5 caractères alphanumériques
  const suffixeAleatoire = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  
  return `TXN-${codeEtabPropre}-${aa}${mm}${jj}-${suffixeAleatoire}`;
};