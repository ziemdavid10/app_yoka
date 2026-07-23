exports.up = function (knex) {
  return knex.schema.createTable('eleves', (table) => {
    table.increments('id').primary();
    table.string('matricule', 50).notNullable().unique(); // Généré côté backend
    table.string('nom', 50).notNullable();
    table.string('prenom', 50).notNullable();
    table.date('date_naissance').notNullable();
    table.specificType('genre', 'CHAR(1)').notNullable();
    table.integer('etablissement_id').unsigned().nullable()
      .references('id').inTable('etablissements').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  }).then(() =>
    // CHECK (genre IN ('M', 'F')) - ajouté en raw, non supporté nativement
    // par le schema builder pour ce cas précis.
    knex.raw('ALTER TABLE eleves ADD CONSTRAINT chk_eleves_genre CHECK (genre IN (\'M\', \'F\'))')
  );
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('eleves');
};
