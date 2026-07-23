exports.up = async function (knex) {
  // Nettoyer d'abord les données existantes à 0/NULL pour ne pas faire échouer le CHECK
  await knex('classe_tranches')
    .where('montant', null)
    .orWhere('montant', '<=', 0)
    .update({ montant: 1 });

  await knex.schema.alterTable('classe_tranches', (table) => {
    table.decimal('montant', 12, 2).notNullable().alter();
  });

  await knex.raw(
    'ALTER TABLE classe_tranches ADD CONSTRAINT chk_tranche_montant_positif CHECK (montant > 0)'
  );
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE classe_tranches DROP CONSTRAINT chk_tranche_montant_positif');
  await knex.schema.alterTable('classe_tranches', (table) => {
    table.integer('montant').notNullable().alter();
  });
};
