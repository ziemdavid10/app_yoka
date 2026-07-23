exports.up = function (knex) {
  return knex.schema.createTable('classe_tranches', (table) => {
    table.increments('id').primary();
    table.integer('classe_id').notNullable()
      .references('id').inTable('classes').onDelete('CASCADE');
    table.integer('etablissement_id').notNullable()
      .references('id').inTable('etablissements').onDelete('CASCADE');
    table.string('nom', 100).notNullable(); // "Tranche 1", "Frais d'inscription"...
    table.integer('montant').notNullable(); // Montant en F CFA
    table.date('date_limite').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  }).then(() =>
    // MySQL uniquement : "ON UPDATE CURRENT_TIMESTAMP" n'est pas exprimable
    // via le schema builder Knex, on l'ajoute donc en raw.
    knex.raw(
      "ALTER TABLE classe_tranches MODIFY updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    )
  );
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('classe_tranches');
};
