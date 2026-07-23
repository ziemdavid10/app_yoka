exports.up = function (knex) {
  return knex.schema.createTable('depenses', (table) => {
    table.increments('id').primary();
    table.integer('etablissement_id').unsigned().nullable()
      .references('id').inTable('etablissements').onDelete('SET NULL');
    table.string('titre', 150).notNullable();
    table.string('categorie', 100).notNullable(); // 'Salaires', 'Fournitures', 'Loyer'...
    table.decimal('montant', 10, 2).notNullable();
    table.timestamp('date_depense').defaultTo(knex.fn.now());
    table.text('description').nullable();
    table.string('mode_paiement', 50).defaultTo('CASH');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('depenses');
};
