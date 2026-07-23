exports.up = function (knex) {
  return knex.schema
    .createTable('evaluations', (table) => {
      table.increments('id').primary();
      table.integer('classe_id').notNullable()
        .references('id').inTable('classes').onDelete('CASCADE');
      table.integer('matiere_id').notNullable()
        .references('id').inTable('matieres').onDelete('CASCADE');
      table.integer('annee_id').notNullable()
        .references('id').inTable('annees_scolaires').onDelete('CASCADE');
      table.string('periode', 20).notNullable(); // 'Trimestre 1', 'Séquence 1'...
      table.integer('coefficient').defaultTo(1);
      table.date('date_evaluation').notNullable();
    })
    .createTable('notes', (table) => {
      table.increments('id').primary();
      table.integer('eleve_id').notNullable()
        .references('id').inTable('eleves').onDelete('CASCADE');
      table.integer('evaluation_id').notNullable()
        .references('id').inTable('evaluations').onDelete('CASCADE');
      table.decimal('valeur', 4, 2).notNullable();
      table.unique(['eleve_id', 'evaluation_id'], 'unique_note_eleve');
    })
    .then(() =>
      knex.raw('ALTER TABLE notes ADD CONSTRAINT chk_notes_valeur CHECK (valeur BETWEEN 0 AND 20)')
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('notes')
    .dropTableIfExists('evaluations');
};
