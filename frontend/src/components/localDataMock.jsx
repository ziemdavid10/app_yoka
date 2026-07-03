import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

// Exemple de structure de données renvoyée par le backend de l'école
const localDataMock = [
  { mois: 'Jan', Recettes: 1200000, Dépenses: 400000 },
  { mois: 'Fév', Recettes: 1850000, Dépenses: 550000 },
  { mois: 'Mar', Recettes: 900000,  Dépenses: 300000 },
  { mois: 'Avr', Recettes: 2400000, Dépenses: 800000 },
  { mois: 'Mai', Recettes: 1600000, Dépenses: 950000 },
];

export const AdminLocalChart = ({ data = localDataMock }) => {
  return (
    <div style={{ width: '100%', height: 320, background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e6e9ef' }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
        Analyse Mensuelle : Flux de Trésorerie (F CFA)
      </h4>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mois" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(v) => `${v / 1000}k`} />
          <Tooltip formatter={(value) => `${value.toLocaleString()} F CFA`} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Recettes" fill="#0369a1" radius={[4, 4, 0, 0]} name="Recettes (Caisse)" />
          <Line type="monotone" dataKey="Dépenses" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} name="Charges Décaissées" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};