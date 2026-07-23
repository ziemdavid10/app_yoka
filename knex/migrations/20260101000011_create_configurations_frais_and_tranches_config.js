exports.up = function (knex) {
  return knex.schema
    .createTable('configurations_frais', (table) => {
      table.increments('id').primary();
      table.integer('classe_id').notNullable()
        .references('id').inTable('classes').onDelete('CASCADE');
      table.enu('type_versement', ['SCOLARITE', 'APE', 'EXAMEN']).notNullable();
      table.integer('montant_total').notNullable();
      table.unique(['classe_id', 'type_versement'], 'uq_classe_type');
    })
    .createTable('tranches_config', (table) => {
      table.increments('id').primary();
      table.integer('config_frais_id').notNullable()
        .references('id').inTable('configurations_frais').onDelete('CASCADE');
      table.integer('numero_tranche').notNullable(); // 1, 2, 3...
      table.integer('montant').notNullable();
      table.unique(['config_frais_id', 'numero_tranche'], 'uq_config_tranche');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('tranches_config')
    .dropTableIfExists('configurations_frais');
};
