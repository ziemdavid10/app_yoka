exports.up = function (knex) {
  return knex.schema.createTable('classes', (table) => {
    table.increments('id').primary();
    table.string('nom', 50).notNullable();
    table.decimal('frais_scolarite', 10, 2).notNullable();
    table.integer('etablissement_id').unsigned().nullable()
      .references('id').inTable('etablissements').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('classes');
};
