// C'est exactement la migration qui manquait quand paiementController.js
// a commencé à référencer c.frais_ape / c.est_classe_examen.

exports.up = function (knex) {
  return knex.schema.alterTable('classes', (table) => {
    table.boolean('est_classe_examen').notNullable().defaultTo(false).after('frais_scolarite');
    table.decimal('frais_examen', 12, 2).notNullable().defaultTo(0).after('est_classe_examen');
    table.decimal('frais_ape', 12, 2).notNullable().defaultTo(0).after('frais_examen');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('classes', (table) => {
    table.dropColumn('frais_ape');
    table.dropColumn('frais_examen');
    table.dropColumn('est_classe_examen');
  });
};
