import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../services/api';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  if (isAuthenticated) return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(correo, contrasena);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-panel__visual">
          <ShieldCheck size={44} />
          <h1>Security Monitor</h1>
          <p>Panel corporativo para monitoreo de eventos, riesgo y evidencia visual.</p>
          <div className="radar">
            <span />
            <span />
            <span />
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">Acceso seguro</span>
            <h2>Iniciar sesión</h2>
          </div>

          <label>
            Correo
            <span className="input-shell">
              <Mail size={18} />
              <input
                type="email"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                placeholder="usuario@empresa.com"
                required
                autoComplete="email"
              />
            </span>
          </label>

          <label>
            Contraseña
            <span className="input-shell">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Validando...' : 'Entrar al panel'}
          </button>
        </form>
      </section>
    </main>
  );
}
