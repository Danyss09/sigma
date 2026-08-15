import { useState, FormEvent } from 'react';
import { subirPlanilla, PlanillaSubida } from '../api/planillasApi';
import { useAuthStore } from '../store/authStore';

// Funcional, sin diseño elaborado (así lo marcamos en el DoD del Sprint 1
// para no perder tiempo puliendo visualmente esta semana).
function WizardSubirPlanilla(): JSX.Element {
  const [hospital, setHospital] = useState('Hospital del Día Chimbacalle');
  const [periodo, setPeriodo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<PlanillaSubida | null>(null);

  const usuario = useAuthStore((state) => state.usuario);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setResultado(null);

    if (!file) {
      setError('Selecciona un archivo .xlsx o .xlsm');
      return;
    }
    if (!/^\d{2}-\d{4}$/.test(periodo)) {
      setError('El período debe tener formato MM-YYYY, ej. 04-2025');
      return;
    }

    setCargando(true);
    try {
      const data = await subirPlanilla(hospital, periodo, file);
      setResultado(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al subir el archivo');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-hospital-50 p-8">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-hospital-900 mb-1">
          Subir planilla — Paso 1
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Sesión: {usuario?.nombre} ({usuario?.rol})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Hospital</label>
            <input
              type="text"
              required
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Período (MM-YYYY)
            </label>
            <input
              type="text"
              required
              placeholder="04-2025"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Archivo (.xlsx / .xlsm)
            </label>
            <input
              type="file"
              required
              accept=".xlsx,.xlsm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-hospital-600 text-white py-2 rounded hover:bg-hospital-700 disabled:opacity-50"
          >
            {cargando ? 'Subiendo...' : 'Subir a MinIO'}
          </button>
        </form>

        {resultado && (
          <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded text-sm">
            <p className="font-semibold text-green-800">✅ Subido correctamente</p>
            <p>
              <span className="font-medium">planilla_id:</span> {resultado.id}
            </p>
            <p>
              <span className="font-medium">Ruta en MinIO:</span> {resultado.minioPath}
            </p>
            <p>
              <span className="font-medium">Hash SHA-256:</span>{' '}
              <span className="break-all">{resultado.hashSha256}</span>
            </p>
            <p className="mt-2 text-gray-600">
              Usa este <code>planilla_id</code> en <code>/planillas/{'{id}'}/procesar</code>{' '}
              (Sprint 3 lo conecta automáticamente).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WizardSubirPlanilla;
