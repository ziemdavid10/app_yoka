exports.up = function (knex) {
  return knex.schema.createTable('paiements', (table) => {
    table.increments('id').primary();
    table.integer('inscription_id').notNullable()
      .references('id').inTable('inscriptions').onDelete('CASCADE');
    table.integer('etablissement_id').nullable()
      .references('id').inTable('etablissements').onDelete('SET NULL');
    table.decimal('montant', 10, 2).notNullable();
    table.string('type_versement', 50).notNullable().defaultTo('Tranche 1'); // 'Tranche 1', 'Totalité'...
    table.string('mode_paiement', 50).notNullable(); // 'CASH', 'MOMO', 'OM', 'VIREMENT'
    table.string('reference_banque', 100).nullable();
    table.string('numero_recu', 100).notNullable().unique();
    table.timestamp('date_paiement').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('paiements');
};
