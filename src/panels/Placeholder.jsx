import React from 'react';
import { useLang } from '../LangContext';
export default function Placeholder({ name }) {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🚧</div>
      <h2 style={{ color: '#fff', fontSize: 24, marginBottom: 8 }}>{name}</h2>
      <p style={{ color: '#666', fontSize: 16 }}>{t('comingSoon')}</p>
      <div style={{ marginTop: 24, padding: '12px 24px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, color: '#3b82f6', fontSize: 14 }}>
        {t('underDev')}
      </div>
    </div>
  );
}
