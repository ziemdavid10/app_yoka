exports.up = function (knex) {
  return knex.schema.alterTable('etablissements', (table) => {
    table.boolean('statut').defaultTo(true).after('telephone'); // 1 = Actif, 0 = Inactif
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('etablissements', (table) => {
    table.dropColumn('statut');
  });
};
