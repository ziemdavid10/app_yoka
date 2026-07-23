exports.up = function (knex) {
  return knex.schema.createTable('inscriptions', (table) => {
    table.increments('id').primary();
    table.integer('eleve_id').notNullable()
      .references('id').inTable('eleves').onDelete('CASCADE');
    table.integer('classe_id').notNullable()
      .references('id').inTable('classes').onDelete('RESTRICT');
    table.integer('annee_id').notNullable()
      .references('id').inTable('annees_scolaires').onDelete('RESTRICT');
    table.integer('etablissement_id').unsigned().nullable()
      .references('id').inTable('etablissements').onDelete('SET NULL');
    table.datetime('date_inscription').defaultTo(knex.fn.now());
    table.unique(['eleve_id', 'annee_id'], 'unique_eleve_annee');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('inscriptions');
};
