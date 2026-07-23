exports.up = function (knex) {
  return knex.schema.alterTable('paiements', (table) => {
    table.integer('config_frais_id').nullable()
      .references('id').inTable('configurations_frais');
    table.integer('numero_tranche').nullable(); // NULL si paiement en "Totalité"
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('paiements', (table) => {
    table.dropColumn('numero_tranche');
    table.dropForeign('config_frais_id');
    table.dropColumn('config_frais_id');
  });
};
