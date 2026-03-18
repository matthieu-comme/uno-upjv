import { useLocation, useNavigate } from 'react-router-dom';

export default function EndPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const winner = state?.winner ?? 'Inconnu';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white', gap: 24,
    }}>
      <div style={{ fontSize: 64 }}>🏆</div>
      <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900 }}>Partie terminée !</h1>
      <p style={{ margin: 0, opacity: 0.7, fontSize: 18 }}>Gagnant : <strong>{winner}</strong></p>
      <button onClick={() => navigate('/')} style={{
        marginTop: 16, padding: '12px 32px', borderRadius: 12, border: 'none',
        background: '#e53935', color: 'white', fontWeight: 800, fontSize: 16, cursor: 'pointer',
      }}>
        Rejouer
      </button>
    </div>
  );
}
