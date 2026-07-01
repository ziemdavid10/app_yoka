// import React from 'react';

// const SuperAdminDashboard = () => {
//   const user = JSON.parse(localStorage.getItem('user'));

//   const handleLogout = () => {
//     localStorage.clear();
//     window.location.href = '/';
//   };

//   return (
//     <div style={styles.container}>
//       <aside style={styles.sidebar}>
//         <h2>Yoka SuperAdmin</h2>
//         <p style={{ fontSize: '12px', color: '#bbb' }}>{user?.prenom} {user?.nom}</p>
//         <nav style={styles.nav}>
//           <a href="#" style={styles.activeNavLink}>🏢 Établissements</a>
//           <a href="#" style={styles.navLink}>🔑 Gestion des Admins</a>
//           <a href="#" style={styles.navLink}>📊 Statistiques Globales</a>
//         </nav>
//         <button onClick={handleLogout} style={styles.logoutBtn}>Déconnexion</button>
//       </aside>

//       <main style={styles.main}>
//         <header style={styles.header}>
//           <h1>Vue Globale Multi-Établissement</h1>
//         </header>
//         <section style={styles.statsGrid}>
//           <div style={styles.card}><h3>Total Établissements</h3><p style={styles.statNumber}>12</p></div>
//           <div style={styles.card}><h3>Total Élèves (Réseau)</h3><p style={styles.statNumber}>4 520</p></div>
//           <div style={styles.card}><h3>Chiffre d'Affaires Global</h3><p style={styles.statNumber}>85 000 000 F</p></div>
//         </section>
//       </main>
//     </div>
//   );
// };

// // Styles basiques partagés (Provisoires avant intégration d'un framework CSS)
// const styles = {
//   container: { display: 'flex', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif' },
//   sidebar: { width: '260px', backgroundColor: '#1e293b', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column' },
//   nav: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px', flexGrow: 1 },
//   navLink: { color: '#cbd5e1', textDecoration: 'none', padding: '10px', borderRadius: '5px' },
//   activeNavLink: { color: '#fff', backgroundColor: '#0B6DAE', padding: '10px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' },
//   logoutBtn: { padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
//   main: { flexGrow: 1, padding: '30px', overflowY: 'auto' },
//   header: { borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' },
//   statsGrid: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
//   card: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minWidth: '220px', flexGrow: 1 },
//   statNumber: { fontSize: '32px', fontWeight: 'bold', color: '#0B6DAE', margin: '10px 0 0 0' }
// };

// export default SuperAdminDashboard;


import React, { useState, useEffect } from 'react';

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

const NAV_ITEMS = [
  { key: 'etablissements', label: 'Établissements', icon: 'apartment' },
  { key: 'admins', label: 'Gestion des admins', icon: 'manage_accounts' },
  { key: 'statistiques', label: 'Statistiques globales', icon: 'insights' },
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
            <div className="yk-fade-in">
              <div className="yk-card">
                <h3 className="yk-card-title"><Icon name="insights" /> Statistiques globales</h3>
                <div className="yk-empty-state">
                  <Icon name="query_stats" style={{ fontSize: '32px' }} />
                  <p>Les indicateurs de performance consolidés du réseau seront affichés ici.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

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

  .yk-app {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    display: flex;
    min-height: 100vh;
    background: var(--yk-bg);
    color: var(--yk-ink);
  }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal; font-style: normal; font-size: 20px; line-height: 1;
    letter-spacing: normal; text-transform: none; display: inline-flex;
    white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-smoothing: antialiased;
  }

  /* ---------- SIDEBAR ---------- */
  .yk-sidebar {
    width: 264px; flex-shrink: 0;
    background: linear-gradient(180deg, #1e293b 0%, #161f30 100%);
    color: #e2e8f0; padding: 22px 18px;
    display: flex; flex-direction: column; gap: 22px;
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
  }

  .yk-brand { display: flex; align-items: center; gap: 12px; }
  .yk-brand-mark {
    width: 42px; height: 42px; border-radius: 11px;
    background: rgba(99, 102, 241, 0.18); color: #818cf8;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .yk-brand h2 { margin: 0; font-size: 17px; font-weight: 700; color: #fff; }
  .yk-brand-sub { font-size: 11.5px; color: #94a3b8; }

  .yk-profile {
    display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: var(--yk-radius);
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  }
  .yk-avatar {
    width: 36px; height: 36px; border-radius: 50%; background: #4338ca; color: #fff;
    font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .yk-profile-name { margin: 0; font-size: 13px; font-weight: 600; color: #f1f5f9; }
  .yk-profile-role { margin: 0; font-size: 11px; color: #94a3b8; }

  .yk-nav { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
  .yk-nav-link {
    display: flex; align-items: center; gap: 12px; color: #cbd5e1; background: transparent; border: none;
    text-align: left; padding: 11px 12px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
    font-weight: 500; width: 100%; transition: background 0.15s ease, color 0.15s ease; font-family: inherit;
  }
  .yk-nav-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
  .yk-nav-link.is-active { background: #0f172a; color: #fff; font-weight: 600; box-shadow: inset 3px 0 0 #818cf8; }

  .yk-logout {
    display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px;
    background: rgba(220, 38, 38, 0.12); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.25);
    border-radius: 9px; cursor: pointer; font-weight: 600; font-size: 13px; font-family: inherit;
    transition: background 0.15s ease;
  }
  .yk-logout:hover { background: rgba(220, 38, 38, 0.22); }

  .yk-overlay { display: none; }

  /* ---------- CONTENT ---------- */
  .yk-content-wrap { flex-grow: 1; display: flex; flex-direction: column; min-width: 0; }

  .yk-topbar {
    display: none; align-items: center; gap: 12px; padding: 14px 18px;
    background: #fff; border-bottom: 1px solid var(--yk-border); position: sticky; top: 0; z-index: 5;
  }
  .yk-burger {
    border: none; background: #f1f5f9; border-radius: 8px; padding: 8px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--yk-ink);
  }
  .yk-topbar-title { display: flex; align-items: center; gap: 8px; color: var(--yk-ink); }
  .yk-topbar-title h1 { font-size: 16px; margin: 0; font-weight: 700; }

  .yk-main { flex-grow: 1; padding: 28px 32px 40px; max-width: 1280px; width: 100%; margin: 0 auto; }

  .yk-fade-in { animation: yk-fade 0.25s ease; }
  @keyframes yk-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  .yk-page-header { margin-bottom: 22px; }
  .yk-page-header h1 { margin: 0 0 6px; font-size: 21px; font-weight: 800; color: var(--yk-ink); }
  .yk-page-header p { margin: 0; font-size: 13.5px; color: var(--yk-muted); }

  /* ---------- STATS ---------- */
  .yk-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .yk-stat-card {
    background: var(--yk-card); border-radius: var(--yk-radius); box-shadow: var(--yk-shadow);
    border: 1px solid var(--yk-border); border-top: 3px solid transparent;
    padding: 20px; display: flex; align-items: center; gap: 16px;
  }
  .yk-stat-indigo { border-top-color: var(--yk-indigo); }
  .yk-stat-blue { border-top-color: var(--yk-blue); }
  .yk-stat-green { border-top-color: var(--yk-green); }

  .yk-stat-icon {
    width: 46px; height: 46px; border-radius: 11px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
  }
  .yk-stat-indigo .yk-stat-icon { background: #eef2ff; color: var(--yk-indigo); }
  .yk-stat-blue .yk-stat-icon { background: #eff6ff; color: var(--yk-blue); }
  .yk-stat-green .yk-stat-icon { background: #ecfdf5; color: var(--yk-green); }

  .yk-stat-card h3 { margin: 0; font-size: 12px; color: var(--yk-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
  .yk-stat-number { margin: 6px 0 0; font-size: 26px; font-weight: 800; color: var(--yk-ink); }

  /* ---------- CARDS ---------- */
  .yk-card {
    background: var(--yk-card); border-radius: var(--yk-radius); box-shadow: var(--yk-shadow);
    border: 1px solid var(--yk-border); padding: 20px;
  }
  .yk-card-title {
    margin: 0 0 16px; padding-bottom: 14px; border-bottom: 1px solid var(--yk-border);
    color: var(--yk-ink); font-size: 14.5px; font-weight: 700; display: flex; align-items: center; gap: 8px;
  }

  .yk-empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 46px 20px; color: var(--yk-muted); text-align: center;
  }
  .yk-empty-state .material-symbols-outlined { color: #cbd5e1; }
  .yk-empty-state p { margin: 0; font-size: 13.5px; max-width: 360px; }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 1000px) {
    .yk-stats-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 860px) {
    .yk-sidebar {
      position: fixed; left: 0; top: 0; z-index: 50;
      transform: translateX(-100%); transition: transform 0.22s ease;
      box-shadow: 12px 0 30px rgba(0,0,0,0.25);
    }
    .yk-sidebar.is-open { transform: translateX(0); }
    .yk-overlay { display: block; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 40; }
    .yk-topbar { display: flex; }
    .yk-main { padding: 18px 16px 32px; }
    .yk-stats-grid { grid-template-columns: 1fr; }
  }
`;

export default SuperAdminDashboard;
