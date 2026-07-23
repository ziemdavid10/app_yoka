// Regroupe les tables de "niveau 0" du script d'origine : aucune dépendance
// vers une autre table. Base de tout le reste du schéma.

exports.up = function (knex) {
  return knex.schema
    .createTable('etablissements', (table) => {
      table.increments('id').primary();
      table.string('nom', 150).notNullable();
      table.string('code_unique', 50).notNullable().unique();
      table.string('adresse', 255).nullable();
      table.string('telephone', 50).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('roles', (table) => {
      table.increments('id').primary();
      table.string('nom_role', 30).notNullable().unique(); // 'SUPERADMIN', 'ADMIN', ...
    })
    .createTable('matieres', (table) => {
      table.increments('id').primary();
      table.string('nom', 100).notNullable();
      table.string('code', 10).notNullable().unique();
    })
    .createTable('annees_scolaires', (table) => {
      table.increments('id').primary();
      table.string('libelle', 9).notNullable().unique(); // ex: '2025-2026'
      table.boolean('statut').defaultTo(false);           // TRUE = année en cours
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('annees_scolaires')
    .dropTableIfExists('matieres')
    .dropTableIfExists('roles')
    .dropTableIfExists('etablissements');
};
