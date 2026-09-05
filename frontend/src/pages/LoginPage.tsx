import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarOlvide, setMostrarOlvide] = useState(false);

  const setSesion = useAuthStore((state) => state.setSesion);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const data = await login(email, password);
      setSesion({ accessToken: data.access_token, refreshToken: data.refresh_token, usuario: data.user });
      navigate('/planillas');
    } catch {
      setError('Email o contraseña incorrectos.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--surface)', display: 'flex', overflow: 'hidden' }}>
      {/* Panel izquierdo — marca */}
      <div
        style={{
          width: '560px',
          minHeight: '100vh',
          backgroundColor: 'var(--brand-dark)',
          backgroundImage: 'radial-gradient(oklch(100% 0 0 / 0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          color: '#fff',
          padding: '64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
              <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
              <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.5px' }}>SIGMA</span>
          </div>
          <div style={{ maxWidth: 360 }}>
            <div style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.25 }}>
              Auditoría inteligente de planillas médicas
            </div>
            <div style={{ marginTop: 16, fontSize: 15, lineHeight: 1.6, color: 'oklch(90% 0.02 240)' }}>
              Detecta y corrige automáticamente valores facturados incorrectamente usando
              Machine Learning, con trazabilidad completa para el auditor humano.
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'oklch(75% 0.02 240)' }}>© 2026 SIGMA · Uso interno</div>
      </div>

      {/* Formulario */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 100px' }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Iniciar sesión</div>
          <div style={{ marginTop: 8, marginBottom: 32, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Ingresa tus credenciales institucionales para acceder al panel de auditoría.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Correo institucional</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: 14, fontFamily: 'var(--font)', color: 'var(--text)',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Contraseña</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 14, fontFamily: 'var(--font)', color: 'var(--text)',
                  }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setMostrarPassword((v) => !v)}
                  style={{ position: 'absolute', right: 10, padding: 4 }}
                >
                  {mostrarPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, margin: 0 }}>{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={cargando}
              style={{ padding: 13, borderRadius: 8, fontSize: 15, fontWeight: 600, marginTop: 6 }}
            >
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </button>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMostrarOlvide(true);
              }}
              style={{ fontSize: 13, textAlign: 'center', display: 'block', marginTop: 4 }}
            >
              ¿Olvidaste tu contraseña?
            </a>

            <div style={{ marginTop: 18, fontSize: 12.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>
              SIGMA determina tu rol automáticamente a partir de tus credenciales: Administrador,
              Auditor o Digitador.
            </div>
          </div>
        </form>
      </div>

      {mostrarOlvide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 380 }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>Recuperar acceso</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Por seguridad, SIGMA no envía restablecimientos de contraseña por correo.
              Contacta al administrador de tu institución — puede resetear tu contraseña
              directamente desde el panel de Usuarios.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setMostrarOlvide(false)} className="btn-primary" style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
