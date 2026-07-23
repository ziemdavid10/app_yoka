exports.up = function (knex) {
  return knex.schema.createTable('utilisateurs', (table) => {
    table.increments('id').primary();
    table.integer('etablissement_id').unsigned().nullable() // NULL uniquement pour le SUPERADMIN
      .references('id').inTable('etablissements').onDelete('SET NULL');
    table.string('identifiant', 50).notNullable().unique();
    table.string('mot_de_passe', 255).notNullable(); // Hash BCrypt
    table.string('nom', 50).notNullable();
    table.string('prenom', 50).nullable();
    table.boolean('statut').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('utilisateurs');
};
