import { useState, useEffect, FormEvent } from 'react';
import { listarPlantillas, subirPlantilla, Plantilla } from '../api/plantillasApi';

function PlantillasPage(): JSX.Element {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'INDIVIDUAL' | 'CONSOLIDADA'>('INDIVIDUAL');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar(): Promise<void> {
    const data = await listarPlantillas();
    setPlantillas(data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!archivo) {
      setError('Selecciona el archivo .xlsx de la plantilla');
      return;
    }
    setCargando(true);
    try {
      await subirPlantilla(nombre, tipo, archivo);
      setNombre('');
      setArchivo(null);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al subir la plantilla');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-hospital-900 mb-4">Plantillas base</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="CONSOLIDADA">Consolidada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Archivo .xlsx</label>
          <input
            type="file"
            required
            accept=".xlsx"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="mt-1 w-full"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="bg-hospital-600 text-white px-4 py-2 rounded hover:bg-hospital-700 disabled:opacity-50"
        >
          {cargando ? 'Subiendo...' : 'Subir plantilla'}
        </button>
      </form>

      <h2 className="font-semibold text-hospital-900 mb-2">Plantillas activas</h2>
      <div className="space-y-2">
        {plantillas.map((p) => (
          <div key={p.id} className="bg-white rounded-lg shadow p-4 text-sm">
            <p className="font-medium">
              {p.nombre} — {p.tipo} (v{p.version})
            </p>
            <p className="text-gray-500">{p.activo ? '✅ Activa' : 'Inactiva'}</p>
          </div>
        ))}
        {plantillas.length === 0 && <p className="text-gray-500">No hay plantillas subidas.</p>}
      </div>
    </div>
  );
}

export default PlantillasPage;
