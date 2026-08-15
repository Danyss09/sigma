import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { useAuthStore } from '../store/authStore';

function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSesion = useAuthStore((state) => state.setSesion);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const data = await login(email, password);
      setSesion({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        usuario: data.user,
      });
      navigate('/subir');
    } catch {
      setError('Email o contraseña incorrectos.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-hospital-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-hospital-900 text-center">SIGMA</h1>
        <p className="text-sm text-gray-500 text-center">Ingresa con tu cuenta</p>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-hospital-600 text-white py-2 rounded hover:bg-hospital-700 disabled:opacity-50"
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
