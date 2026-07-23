exports.up = async function (knex) {
  await knex.schema.createTable('parametres_systeme', (table) => {
    table.specificType('id', 'TINYINT UNSIGNED').notNullable().primary().defaultTo(1);

    table.boolean('exiger_changement_mdp').notNullable().defaultTo(true);
    table.specificType('duree_session_heures', 'SMALLINT UNSIGNED').notNullable().defaultTo(8);

    table.specificType('retention_logs_jours', 'SMALLINT UNSIGNED').notNullable().defaultTo(365);
    table.boolean('notif_actions_sensibles').notNullable().defaultTo(true);

    table.enu('frequence_sauvegarde', ['quotidienne', 'hebdomadaire']).notNullable().defaultTo('quotidienne');

    table.boolean('alerte_echec_connexion').notNullable().defaultTo(true);

    table.integer('modifie_par').unsigned().nullable()
      .references('id').inTable('utilisateurs').onDelete('SET NULL');
    table.datetime('modifie_le').nullable();
  });

  await knex.raw('ALTER TABLE parametres_systeme ADD CONSTRAINT chk_parametres_singleton CHECK (id = 1)');

  // Amorce la ligne unique avec les valeurs par défaut
  await knex('parametres_systeme').insert({
    id: 1,
    exiger_changement_mdp: true,
    duree_session_heures: 8,
    retention_logs_jours: 365,
    notif_actions_sensibles: true,
    frequence_sauvegarde: 'quotidienne',
    alerte_echec_connexion: true
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('parametres_systeme');
};
