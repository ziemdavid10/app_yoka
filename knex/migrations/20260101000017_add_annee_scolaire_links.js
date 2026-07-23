exports.up = async function (knex) {
  await knex.schema.alterTable('inscriptions', (table) => {
    table.integer('annee_scolaire_id').nullable()
      .references('id').inTable('annees_scolaires').after('etablissement_id');
  });

  await knex.schema.alterTable('classe_tranches', (table) => {
    table.integer('annee_scolaire_id').nullable()
      .references('id').inTable('annees_scolaires').after('etablissement_id');
  });

  // Rattache l'existant à l'année scolaire active (statut = 1)
  const [anneeActive] = await knex('annees_scolaires').where('statut', 1).limit(1);
  if (anneeActive) {
    await knex('inscriptions').whereNull('annee_scolaire_id').update({ annee_scolaire_id: anneeActive.id });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('classe_tranches', (table) => {
    table.dropForeign('annee_scolaire_id');
    table.dropColumn('annee_scolaire_id');
  });
  await knex.schema.alterTable('inscriptions', (table) => {
    table.dropForeign('annee_scolaire_id');
    table.dropColumn('annee_scolaire_id');
  });
};
