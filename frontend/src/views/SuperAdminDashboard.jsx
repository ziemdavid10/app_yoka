import React from 'react';

const SuperAdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2>Yoka SuperAdmin</h2>
        <p style={{ fontSize: '12px', color: '#bbb' }}>{user?.prenom} {user?.nom}</p>
        <nav style={styles.nav}>
          <a href="#" style={styles.activeNavLink}>🏢 Établissements</a>
          <a href="#" style={styles.navLink}>🔑 Gestion des Admins</a>
          <a href="#" style={styles.navLink}>📊 Statistiques Globales</a>
        </nav>
        <button onClick={handleLogout} style={styles.logoutBtn}>Déconnexion</button>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <h1>Vue Globale Multi-Établissement</h1>
        </header>
        <section style={styles.statsGrid}>
          <div style={styles.card}><h3>Total Établissements</h3><p style={styles.statNumber}>12</p></div>
          <div style={styles.card}><h3>Total Élèves (Réseau)</h3><p style={styles.statNumber}>4 520</p></div>
          <div style={styles.card}><h3>Chiffre d'Affaires Global</h3><p style={styles.statNumber}>85 000 000 F</p></div>
        </section>
      </main>
    </div>
  );
};

// Styles basiques partagés (Provisoires avant intégration d'un framework CSS)
const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif' },
  sidebar: { width: '260px', backgroundColor: '#1e293b', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column' },
  nav: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px', flexGrow: 1 },
  navLink: { color: '#cbd5e1', textDecoration: 'none', padding: '10px', borderRadius: '5px' },
  activeNavLink: { color: '#fff', backgroundColor: '#0B6DAE', padding: '10px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' },
  logoutBtn: { padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  main: { flexGrow: 1, padding: '30px', overflowY: 'auto' },
  header: { borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' },
  statsGrid: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  card: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minWidth: '220px', flexGrow: 1 },
  statNumber: { fontSize: '32px', fontWeight: 'bold', color: '#0B6DAE', margin: '10px 0 0 0' }
};

export default SuperAdminDashboard;