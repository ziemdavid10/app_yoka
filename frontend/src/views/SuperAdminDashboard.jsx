import React, { useState, useEffect } from 'react';
// Importation des composants d'analyse et d'audit
import { SuperadminGlobalChart } from '../components/superadminDataMock';
import { AuditLogDashboard } from '../components/AuditLogDashboard';

const loadGoogleIconsFont = () => {
  if (document.getElementById('material-symbols-font')) return;
  const link = document.createElement('link');
  link.id = 'material-symbols-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
};

const Icon = ({ name, style = {}, filled = false }) => (
  <span
    className="material-symbols-outlined"
    style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}`, ...style }}
  >
    {name}
  </span>
);

// Onglets de navigation du SuperAdmin
const NAV_ITEMS = [
  { key: 'etablissements', label: 'Établissements', icon: 'apartment' },
  { key: 'admins', label: 'Gestion des admins', icon: 'manage_accounts' },
  { key: 'statistiques', label: 'Statistiques globales', icon: 'insights' },
  { key: 'audit', label: "Registre d'audit", icon: 'history' },
];

const SuperAdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [activeTab, setActiveTab] = useState('etablissements');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadGoogleIconsFont();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const currentNav = NAV_ITEMS.find(n => n.key === activeTab);

  return (
    <div className="yk-app">
      <style>{CSS}</style>

      {sidebarOpen && <div className="yk-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* BARRE LATÉRALE */}
      <aside className={`yk-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="yk-brand">
          <div className="yk-brand-mark"><Icon name="hub" /></div>
          <div>
            <h2>Yoka SuperAdmin</h2>
            <span className="yk-brand-sub">Pilotage du réseau</span>
          </div>
        </div>

        <div className="yk-profile">
          <div className="yk-avatar">{(user?.prenom?.[0] || 'S')}{(user?.nom?.[0] || '')}</div>
          <div>
            <p className="yk-profile-name">{user?.prenom} {user?.nom}</p>
            <p className="yk-profile-role">Super administrateur</p>
          </div>
        </div>

        <nav className="yk-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`yk-nav-link ${activeTab === item.key ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="yk-logout">
          <Icon name="logout" />
          <span>Déconnexion</span>
        </button>
      </aside>

      {/* ZONE CENTRALE */}
      <div className="yk-content-wrap">
        <header className="yk-topbar">
          <button className="yk-burger" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" />
          </button>
          <div className="yk-topbar-title">
            <Icon name={currentNav?.icon} style={{ fontSize: '22px' }} />
            <h1>{currentNav?.label}</h1>
          </div>
        </header>

        <main className="yk-main">
          {activeTab === 'etablissements' && (
            <div className="yk-fade-in">
              <div className="yk-page-header">
                <h1>Vue globale multi-établissement</h1>
                <p>Aperçu consolidé de l'ensemble des établissements rattachés au réseau Yoka.</p>
              </div>

              <section className="yk-stats-grid">
                <div className="yk-stat-card yk-stat-indigo">
                  <div className="yk-stat-icon"><Icon name="apartment" /></div>
                  <div>
                    <h3>Total établissements</h3>
                    <p className="yk-stat-number">12</p>
                  </div>
                </div>
                <div className="yk-stat-card yk-stat-blue">
                  <div className="yk-stat-icon"><Icon name="groups" /></div>
                  <div>
                    <h3>Total élèves (réseau)</h3>
                    <p className="yk-stat-number">4 520</p>
                  </div>
                </div>
                <div className="yk-stat-card yk-stat-green">
                  <div className="yk-stat-icon"><Icon name="account_balance" /></div>
                  <div>
                    <h3>Chiffre d'affaires global</h3>
                    <p className="yk-stat-number">85 000 000 F</p>
                  </div>
                </div>
              </section>

              <div className="yk-card" style={{ marginTop: '24px' }}>
                <h3 className="yk-card-title"><Icon name="list_alt" /> Établissements du réseau</h3>
                <div className="yk-empty-state">
                  <Icon name="domain_add" style={{ fontSize: '32px' }} />
                  <p>Le détail des établissements s'affichera ici dès que les données seront connectées.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="yk-fade-in">
              <div className="yk-card">
                <h3 className="yk-card-title"><Icon name="manage_accounts" /> Gestion des administrateurs</h3>
                <div className="yk-empty-state">
                  <Icon name="admin_panel_settings" style={{ fontSize: '32px' }} />
                  <p>La liste des administrateurs d'établissement et leurs droits d'accès apparaîtront ici.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statistiques' && (
            <div className="yk-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="yk-page-header">
                <h1>Analyses et Indicateurs Réseau</h1>
                <p>Suivi de la santé financière macroscopique et des flux de trésorerie inter-écoles.</p>
              </div>
              <SuperadminGlobalChart />
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="yk-fade-in">
              <AuditLogDashboard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// --- CHAÎNE CSS (Vérifiez bien qu'elle se termine par la notation `;` tout en bas) ---
const CSS = `
  :root {
    --yk-ink: #0f172a;
    --yk-slate: #475569;
    --yk-muted: #64748b;
    --yk-border: #e6e9ef;
    --yk-bg: #f4f6fa;
    --yk-card: #ffffff;
    --yk-green: #0e9f6e;
    --yk-blue: #0369a1;
    --yk-indigo: #4338ca;
    --yk-radius: 12px;
    --yk-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.10);
  }
  * { box-sizing: border-box; }
  .yk-app { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: flex; min-height: 100vh; background: var(--yk-bg); color: var(--yk-ink); }
  .material-symbols-outlined { font-size: 20px; display: inline-flex; align-items: center; justify-content: center; }
  
  /* ---------- SIDEBAR ---------- */
  .yk-sidebar { width: 264px; flex-shrink: 0; background: linear-gradient(180deg, #1e293b 0%, #161f30 100%); color: #e2e8f0; padding: 22px 18px; display: flex; flex-direction: column; gap: 22px; position: sticky; top: 0; height: 100vh; overflow-y: auto; transition: transform 0.3s ease; }
  .yk-brand { display: flex; align-items: center; gap: 12px; }
  .yk-brand-mark { width: 42px; height: 42px; border-radius: 11px; background: rgba(99, 102, 241, 0.18); color: #818cf8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .yk-brand h2 { margin: 0; font-size: 17px; font-weight: 700; color: #fff; }
  .yk-brand-sub { font-size: 11px; color: #94a3b8; }
  
  .yk-profile { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
  .yk-avatar { width: 38px; height: 38px; border-radius: 50%; background: #0B6DAE; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
  .yk-profile-name { margin: 0; font-size: 13.5px; font-weight: 600; color: #f8fafc; }
  .yk-profile-role { margin: 2px 0 0; font-size: 11px; color: #94a3b8; }
  
  .yk-nav { display: flex; flex-direction: column; gap: 6px; flex-grow: 1; }
  .yk-nav-link { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 14px; background: none; border: none; color: #94a3b8; border-radius: 8px; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; transition: all 0.2s ease; }
  .yk-nav-link:hover { color: #fff; background: rgba(255,255,255,0.05); }
  .yk-nav-link.is-active { color: #fff; background: #0B6DAE; font-weight: 600; }
  .yk-logout { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 14px; background: none; border: none; color: #f87171; border-radius: 8px; font-size: 14px; font-weight: 600; text-align: left; cursor: pointer; margin-top: auto; }
  .yk-logout:hover { background: rgba(239, 68, 68, 0.1); }
  
  /* ---------- STRUCTURE CONTENU ---------- */
  .yk-content-wrap { flex-grow: 1; display: flex; flex-direction: column; min-width: 0; }
  .yk-topbar { height: 64px; background: var(--yk-card); border-bottom: 1px solid var(--yk-border); display: flex; align-items: center; padding: 0 24px; gap: 16px; position: sticky; top: 0; z-index: 10; }
  .yk-burger { display: none; background: none; border: none; color: var(--yk-slate); cursor: pointer; }
  .yk-topbar-title { display: flex; align-items: center; gap: 10px; color: var(--yk-slate); }
  .yk-topbar-title h1 { margin: 0; font-size: 16px; font-weight: 600; color: var(--yk-ink); }
  
  .yk-main { flex-grow: 1; padding: 28px 32px; overflow-y: auto; }
  .yk-page-header { margin-bottom: 24px; }
  .yk-page-header h1 { margin: 0; font-size: 22px; font-weight: 800; color: var(--yk-ink); }
  .yk-page-header p { margin: 6px 0 0; font-size: 14px; color: var(--yk-muted); }
  
  /* ---------- STATS CARDS ---------- */
  .yk-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .yk-stat-card { background: var(--yk-card); padding: 20px; border-radius: var(--yk-radius); box-shadow: var(--yk-shadow); border: 1px solid var(--yk-border); display: flex; align-items: center; gap: 18px; }
  .yk-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .yk-stat-card h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--yk-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .yk-stat-number { margin: 4px 0 0; font-size: 24px; font-weight: 800; color: var(--yk-ink); }
  
  .yk-stat-indigo .yk-stat-icon { background: #eef2ff; color: var(--yk-indigo); }
  .yk-stat-blue .yk-stat-icon { background: #e0f2fe; color: var(--yk-blue); }
  .yk-stat-green .yk-stat-icon { background: #e6f4ea; color: var(--yk-green); }
  
  /* ---------- COMPONENT CARDS & STATES ---------- */
  .yk-card { background: var(--yk-card); border-radius: var(--yk-radius); box-shadow: var(--yk-shadow); border: 1px solid var(--yk-border); padding: 20px; }
  .yk-card-title { margin: 0 0 16px; padding-bottom: 14px; border-bottom: 1px solid var(--yk-border); color: var(--yk-ink); font-size: 14.5px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .yk-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 46px 20px; color: var(--yk-muted); text-align: center; }
  .yk-empty-state p { margin: 0; font-size: 13.5px; max-width: 360px; }
  .yk-fade-in { animation: fadeIn 0.25s ease-out forwards; }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 1000px) { .yk-stats-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 860px) {
    .yk-burger { display: block; }
    .yk-sidebar { position: fixed; left: 0; top: 0; z-index: 50; transform: translateX(-100%); height: 100vh; }
    .yk-sidebar.is-open { transform: translateX(0); }
    .yk-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); z-index: 40; }
    .yk-main { padding: 20px; }
    .yk-stats-grid { grid-template-columns: 1fr; }
  }
`; // <-- Le voilà, le backtick de fermeture indispensable !

export default SuperAdminDashboard;