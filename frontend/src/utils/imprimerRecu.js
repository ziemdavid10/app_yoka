export const imprimerRecu = (paiement) => {
  const fenetreImpression = window.open('', '_blank', 'width=800,height=600');

  const dateFormatee = new Date(paiement.date_paiement).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  fenetreImpression.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reçu de Paiement - ${paiement.numero_recu}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; padding: 40px; margin: 0; }
        .receipt-box { max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
        .school-title { font-size: 22px; font-weight: bold; color: #0f172a; margin: 0; text-transform: uppercase; }
        .receipt-title { font-size: 14px; color: #64748b; font-weight: bold; text-align: right; }
        .recu-id { color: #0284c7; font-size: 16px; margin-top: 5px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .details-table td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 15px; }
        .details-table td.label { color: #64748b; font-weight: 500; width: 40%; }
        .details-table td.value { font-weight: bold; color: #1e293b; text-align: right; }
        .amount-box { background-color: #f0f9ff; border: 1px solid #b3e0ff; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 25px; }
        .amount-text { font-size: 24px; font-weight: bold; color: #0369a1; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
        @media print {
          body { padding: 0; }
          .receipt-box { border: none; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-box">
        <div class="header">
          <div>
            <div class="school-title">YOKA ÉCOLE</div>
            <div style="font-size: 12px; color: #64748b;">Système de Gestion Scolaire</div>
          </div>
          <div class="receipt-title">
            REÇU OFFICIEL
            <div class="recu-id">${paiement.numero_recu}</div>
          </div>
        </div>

        <table class="details-table">
          <tr>
            <td class="label">Élève</td>
            <td class="value">${paiement.nom.toUpperCase()} ${paiement.prenom}</td>
          </tr>
          <tr>
            <td class="label">Matricule</td>
            <td class="value">${paiement.matricule}</td>
          </tr>
          <tr>
            <td class="label">Classe Affectée</td>
            <td class="value">${paiement.classe_nom}</td>
          </tr>
          <tr>
            <td class="label">Mode de Règlement</td>
            <td class="value">${paiement.mode_paiement}</td>
          </tr>
          <tr>
            <td class="label">Date de l'Opération</td>
            <td class="value">${dateFormatee}</td>
          </tr>
        </table>

        <div class="amount-box">
          <div style="font-size: 12px; color: #0369a1; margin-bottom: 5px; font-weight: bold;">MONTANT ENCAISSÉ</div>
          <div class="amount-text">${parseFloat(paiement.montant).toLocaleString()} F CFA</div>
        </div>

        <div style="font-size: 11px; text-align: center; color: #64748b; font-style: italic;">
          Reçu généré électroniquement par l'administration. Valable pour faire valoir ce que de droit.
        </div>

        <div class="footer">
          Yoka École - Service de la Comptabilité Générale &copy; 2026
        </div>
      </div>
    </body>
    </html>
  `);

  fenetreImpression.document.close();
  fenetreImpression.focus();
  
  // Petite pause pour laisser le temps au HTML de s'injecter proprement dans la fenêtre blanche
  setTimeout(() => {
    fenetreImpression.print();
    fenetreImpression.close();
  }, 400);
};