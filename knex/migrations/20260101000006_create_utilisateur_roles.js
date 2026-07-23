exports.up = function (knex) {
  return knex.schema.createTable('utilisateur_roles', (table) => {
    table.integer('utilisateur_id').notNullable()
      .references('id').inTable('utilisateurs').onDelete('CASCADE');
    table.integer('role_id').notNullable()
      .references('id').inTable('roles').onDelete('CASCADE');
    table.primary(['utilisateur_id', 'role_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('utilisateur_roles');
};
