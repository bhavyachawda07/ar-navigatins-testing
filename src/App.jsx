import { useState, useEffect } from 'react';
import Home from './pages/Home';
import CameraTest from './pages/CameraTest';

// ── Floating background particles ──────────────────────────
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size:  4 + Math.random() * 8,
    left:  Math.random() * 100,
    delay: Math.random() * 12,
    duration: 8 + Math.random() * 14,
    color: ['#3b82f6','#06b6d4','#8b5cf6','#10b981'][i % 4],
  }));

  return (
    <div className="bg-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            width:  p.size,
            height: p.size,
            left:   `${p.left}%`,
            background: p.color,
            animationDelay:    `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateTo = (path) => {
    window.history.pushState(null, '', path);
    setCurrentRoute(path);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <Particles />

      {/* ── Top nav bar ────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10,15,30,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99,179,237,0.12)',
          padding: '0 20px',
        }}
      >
        <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', alignItems: 'center', height: 60, gap: 16 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 0 20px rgba(6,182,212,0.4)',
            }}>
              📍
            </div>
            <div>
              <h1 className="gradient-text" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, margin: 0 }}>
                AR Indoor Nav
              </h1>
              <p style={{ fontSize: 10, color: '#475569', margin: 0, letterSpacing: '0.5px' }}>
                P. P. SAVANI UNIVERSITY
              </p>
            </div>
          </div>

          {/* Router navigation links */}
          <nav style={{ display: 'flex', gap: 10, marginLeft: 24 }}>
            <button
              onClick={() => navigateTo('/')}
              style={{
                background: currentRoute !== '/camera-test' ? 'rgba(59,130,246,0.2)' : 'transparent',
                border: currentRoute !== '/camera-test' ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                color: currentRoute !== '/camera-test' ? '#3b82f6' : '#94a3b8',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              🗺️ Map Nav
            </button>
            <button
              onClick={() => navigateTo('/camera-test')}
              style={{
                background: currentRoute === '/camera-test' ? 'rgba(59,130,246,0.2)' : 'transparent',
                border: currentRoute === '/camera-test' ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                color: currentRoute === '/camera-test' ? '#3b82f6' : '#94a3b8',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📷 Camera Test
            </button>
          </nav>

          {/* Center pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', marginRight: 'auto' }}>
            <span className="badge badge-green">🟢 Live</span>
            <span className="badge badge-blue">Ground Floor</span>
            <span className="badge badge-purple">v1.0</span>
          </div>

          {/* Right info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#475569' }}>11 Rooms · BFS + A*</span>
            <div style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.25)',
            }}>
              🚀 Prototype
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────── */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1600, margin: '0 auto' }}>
        {currentRoute === '/camera-test' ? (
          <CameraTest />
        ) : (
          <Home />
        )}
      </main>
    </div>
  );
}
