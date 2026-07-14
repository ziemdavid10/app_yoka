const XLSX = require('xlsx');
const path = require('path');

const eleves = [
  { nom: 'MBARGA', prenom: 'Paul', date_naissance: '2012-03-15', genre: 'M' },
  { nom: 'NKOMO', prenom: 'Marie', date_naissance: '2011-07-22', genre: 'F' },
  { nom: 'BIYA', prenom: 'Christophe', date_naissance: '2013-01-08', genre: 'M' },
  { nom: 'FOUDA', prenom: 'Sandrine', date_naissance: '2012-11-30', genre: 'F' },
  { nom: 'ATANGANA', prenom: 'Eric', date_naissance: '2011-05-19', genre: 'M' },
  { nom: 'ESSOMBA', prenom: 'Celine', date_naissance: '2013-09-04', genre: 'F' },
  { nom: 'MVONDO', prenom: 'Jacques', date_naissance: '2012-06-27', genre: 'M' },
  { nom: 'ONDOA', prenom: 'Beatrice', date_naissance: '2011-12-11', genre: 'F' },
  { nom: 'TAMBA', prenom: 'Samuel', date_naissance: '2013-04-02', genre: 'M' },
  { nom: 'NGONO', prenom: 'Laure', date_naissance: '2012-08-16', genre: 'F' },
];

const ws = XLSX.utils.json_to_sheet(eleves);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Eleves');

const outputPath = path.join(__dirname, '..', 'test_import_eleves.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('Fichier généré :', outputPath);
