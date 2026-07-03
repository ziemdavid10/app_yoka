import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Données consolidées de toutes les écoles
const superadminDataMock = [
  { ecole: 'Campus Yaoundé', Collecté: 45000000, RestantDehors: 12000000 },
  { ecole: 'Campus Douala',  Collecté: 62000000, RestantDehors: 8000000 },
  { ecole: 'Campus Bafoussam', Collecté: 28000000, RestantDehors: 19000000 },
  { ecole: 'Annexe Garoua',   Collecté: 15000000, RestantDehors: 4000000 },
];

export const SuperadminGlobalChart = ({ data = superadminDataMock }) => {
  return (
    <div style={{ width: '100%', height: 350, background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e6e9ef', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontPalette: 'dark', fontWeight: 700, color: '#0f172a' }}>
        Comparatif Inter-Établissements : Recouvrement des Scolarités
      </h4>
      <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b' }}>Vue consolidée en temps réel du capital encaissé vs les créances extérieures</p>
      
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="ecole" stroke="#475569" fontWeight={500} style={{ fontSize: '12px' }} />
          <YAxis stroke="#475569" style={{ fontSize: '12px' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
          <Tooltip formatter={(value) => `${value.toLocaleString()} F CFA`} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          {/* Barres empilées (Stacked) pour voir la scolarité totale théorique de chaque école */}
          <Bar dataKey="Collecté" stackId="a" fill="#0e9f6e" name="Montant Encaissé" radius={[0, 0, 0, 0]} />
          <Bar dataKey="RestantDehors" stackId="a" fill="#e11d48" name="Dette Restante (Élèves)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};