exports.seed = async function (knex) {
  await knex('roles')
    .insert([{ nom_role: 'SUPERADMIN' }, { nom_role: 'ADMIN' }])
    .onConflict('nom_role')
    .ignore();

  await knex('annees_scolaires')
    .insert({ libelle: '2025-2026', statut: true })
    .onConflict('libelle')
    .ignore();
};
