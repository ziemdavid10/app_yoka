exports.up = function (knex) {
  return knex.schema.alterTable('annees_scolaires', (table) => {
    table.date('date_debut').nullable();
    table.date('date_fin').nullable();
    table.index('statut', 'idx_annee_statut');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('annees_scolaires', (table) => {
    table.dropIndex('statut', 'idx_annee_statut');
    table.dropColumn('date_fin');
    table.dropColumn('date_debut');
  });
};
