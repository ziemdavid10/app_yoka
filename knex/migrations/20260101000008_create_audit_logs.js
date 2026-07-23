exports.up = function (knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('utilisateur_id').nullable()
      .references('id').inTable('utilisateurs').onDelete('SET NULL');
    table.integer('etablissement_id').nullable()
      .references('id').inTable('etablissements').onDelete('CASCADE');
    table.string('action', 100).notNullable(); // ex: 'CREATION_ELEVE', 'CONNEXION_REUSSIE'
    table.text('details').nullable();
    table.string('ip_address', 45).nullable();
    table.timestamp('cree_le').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
