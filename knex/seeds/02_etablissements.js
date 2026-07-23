exports.seed = async function (knex) {
  await knex('etablissements')
    .insert([
      {
        id: 1,
        nom: 'Complexe Scolaire Yoka les aiglons',
        code_unique: 'YOKA-CAMPUS-lampadaire',
        adresse: 'Yakadouma',
        telephone: '+237 600 00 00 00'
      },
      {
        nom: 'Campus Principal - BERTOUA',
        code_unique: 'CAMPUS2',
        adresse: 'Avenue Monseigneur Vogt, Yaoundé',
        telephone: '+237 690000001'
      },
      {
        nom: 'Campus Annexe - DOUME',
        code_unique: 'CAMPUS3',
        adresse: 'Boulevard de la Liberté, Douala',
        telephone: '+237 690000002'
      },
      {
        nom: 'Institut Yoka - GAROUABOULAYE',
        code_unique: 'CAMPUS4',
        adresse: 'Quartier Tamdja, Bafoussam',
        telephone: '+237 690000003'
      },
      {
        nom: 'Académie Yoka - YOKADOUMA',
        code_unique: 'CAMPUS5',
        adresse: 'Quartier Roumde Adjia, Garoua',
        telephone: '+237 690000004'
      }
    ])
    .onConflict('code_unique')
    .ignore();
};
