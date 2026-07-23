// C'est la migration qui manquait pour l'erreur
// "Unknown column 'categorie' in 'where clause'" sur getEtatParClasse / getEtatParEleve.

exports.up = async function (knex) {
  await knex.schema.alterTable('paiements', (table) => {
    table.enu('categorie', ['SCOLARITE', 'APE', 'EXAMEN']).notNullable().defaultTo('SCOLARITE').after('montant');
  });

  // Reprise des données historiques : déduire la catégorie de l'ancien texte libre
  await knex('paiements').where('type_versement', 'like', '%APE%').update({ categorie: 'APE' });
  await knex('paiements').where('type_versement', 'like', '%exam%').update({ categorie: 'EXAMEN' });
  // Le reste demeure SCOLARITE (valeur par défaut)

  // type_versement devait accueillir des libellés plus longs
  await knex.schema.alterTable('paiements', (table) => {
    table.string('type_versement', 150).notNullable().alter();
  });

  // Garde-fou : un montant de paiement doit être strictement positif
  await knex.raw('ALTER TABLE paiements ADD CONSTRAINT chk_paiement_montant_positif CHECK (montant > 0)');
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE paiements DROP CONSTRAINT chk_paiement_montant_positif');
  await knex.schema.alterTable('paiements', (table) => {
    table.string('type_versement', 50).notNullable().defaultTo('Tranche 1').alter();
    table.dropColumn('categorie');
  });
};
