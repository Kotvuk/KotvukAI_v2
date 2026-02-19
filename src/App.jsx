import React, { useState } from 'react';
import { useLang } from './LangContext';
import ChartsPanel from './panels/ChartsPanel';
import AIPanel from './panels/AIPanel';
import LearningPanel from './panels/LearningPanel';
import SettingsPanel from './panels/SettingsPanel';
import AIChat from './panels/AIChat';
import Placeholder from './panels/Placeholder';

const styles = {
  app: { display: 'flex', height: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: "'Inter', sans-serif", overflow: 'hidden' },
  sidebar: (open) => ({
    width: open ? 240 : 0, background: '#0d0d14', borderRight: '1px solid rgba(255,255,255,0.06)',
    transition: 'width 0.25s', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column'
  }),
  sidebarInner: { width: 240, padding: '1rem 0' },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer',
    background: active ? 'rgba(59,130,246,0.15)' : 'transparent', color: active ? '#3b82f6' : '#a0a0b0',
    border: 'none', width: '100%', textAlign: 'left', fontSize: 14, fontFamily: "'Inter',sans-serif",
    borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all 0.15s'
  }),
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0d0d14', flexShrink: 0
  },
  burger: { background: 'none', border: 'none', color: '#e0e0e0', fontSize: 22, cursor: 'pointer', padding: 4 },
  content: { flex: 1, overflow: 'auto', padding: 20 },
  logo: { fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: -0.5 },
  accent: { color: '#3b82f6' },
};

export default function App() {
  const { t } = useLang();
  const [panel, setPanel] = useState('charts');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const PANELS = [
    { id: 'charts', icon: '📊', labelKey: 'charts' },
    { id: 'ai', icon: '🤖', labelKey: 'aiAnalytics' },
    { id: 'trades', icon: '📋', labelKey: 'trades' },
    { id: 'calc', icon: '🧮', labelKey: 'calculator' },
    { id: 'whale', icon: '🐋', labelKey: 'whaleAnalysis' },
    { id: 'alerts', icon: '🔔', labelKey: 'alerts' },
    { id: 'news', icon: '📰', labelKey: 'news' },
    { id: 'watchlist', icon: '🏆', labelKey: 'watchlist' },
    { id: 'learning', icon: '📚', labelKey: 'learning' },
    { id: 'settings', icon: '⚙️', labelKey: 'settings' },
  ];

  const renderPanel = () => {
    switch (panel) {
      case 'charts': return <ChartsPanel />;
      case 'ai': return <AIPanel />;
      case 'learning': return <LearningPanel />;
      case 'settings': return <SettingsPanel />;
      default: return <Placeholder name={t(PANELS.find(p => p.id === panel)?.labelKey || panel)} />;
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.sidebar(sidebarOpen)}>
        <div style={styles.sidebarInner}>
          <div style={{ padding: '8px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Kotvuk<span style={styles.accent}>AI</span></span>
          </div>
          {PANELS.map(p => (
            <button key={p.id} style={styles.navItem(panel === p.id)} onClick={() => setPanel(p.id)}>
              <span>{p.icon}</span><span>{t(p.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={styles.main}>
        <div style={styles.header}>
          <button style={styles.burger} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <span style={styles.logo}>Kotvuk<span style={styles.accent}>AI</span> {t('aiAnalytics')}</span>
        </div>
        <div style={styles.content}>{renderPanel()}</div>
      </div>
      <AIChat />
    </div>
  );
}
