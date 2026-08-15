import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listarPlanillas,
  actualizarPlanilla,
  eliminarPlanilla,
  PlanillaListado,
} from '../api/planillasCrudApi';

const COLOR_ESTADO: Record<string, string> = {
  SUBIDA: 'bg-gray-100 text-gray-700',
  PROCESANDO: 'bg-amber-100 text-amber-700',
  COMPLETADA: 'bg-green-100 text-green-700',
  ERROR: 'bg-red-100 text-red-700',
};

function PlanillasListPage(): JSX.Element {
  const [planillas, setPlanillas] = useState<PlanillaListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [editando, setEditando] = useState<PlanillaListado | null>(null);
  const navigate = useNavigate();

  async function cargar(): Promise<void> {
    setCargando(true);
    setError(null);
    try {
      const data = await listarPlanillas(filtroPeriodo ? { periodo: filtroPeriodo } : undefined);
      setPlanillas(data);
    } catch {
      setError('No se pudo cargar la lista de planillas');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPeriodo]);

  async function handleEliminar(p: PlanillaListado): Promise<void> {
    const confirmado = window.confirm(
      `¿Eliminar la planilla #${p.id} (${p.nombreArchivo})?\n\n` +
        `Si ya tiene trámites/detalles procesados, esos NO se borran — quedan huérfanos ` +
        `(sin planilla asociada). Solo se borra el registro de la planilla en sí.`,
    );
    if (!confirmado) return;

    try {
      await eliminarPlanilla(p.id);
      await cargar();
    } catch {
      setError(`No se pudo eliminar la planilla #${p.id}`);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-hospital-900">
          Planillas subidas ({planillas.length})
        </h1>
        <input
          placeholder="Filtrar por período (MM-YYYY)"
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        />
      </div>

      {cargando && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-hospital-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Archivo</th>
              <th className="p-3">Hospital</th>
              <th className="p-3">Período</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Firmas</th>
              <th className="p-3">Subida</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {planillas.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono">{p.id}</td>
                <td className="p-3">{p.nombreArchivo}</td>
                <td className="p-3">{p.hospital}</td>
                <td className="p-3">{p.periodo}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${COLOR_ESTADO[p.estado] ?? ''}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="p-3 text-xs text-gray-500">
                  {p.revisadoNombre ? '✅' : '⬜'} Rev · {p.aprobadoNombre ? '✅' : '⬜'} Aprob
                </td>
                <td className="p-3 text-xs text-gray-500">
                  {new Date(p.createdAt).toLocaleString('es-EC')}
                </td>
                <td className="p-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => navigate(`/procesar?planillaId=${p.id}`)}
                      className="bg-hospital-600 text-white px-2 py-1 rounded text-xs hover:bg-hospital-700"
                    >
                      Procesar
                    </button>
                    <button
                      onClick={() => navigate(`/reportes?planillaId=${p.id}`)}
                      className="border px-2 py-1 rounded text-xs hover:bg-gray-50"
                    >
                      Reportes
                    </button>
                    <button
                      onClick={() => setEditando(p)}
                      className="border px-2 py-1 rounded text-xs hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(p)}
                      className="border border-red-300 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!cargando && planillas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400">
                  No hay planillas subidas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <ModalEditar
          planilla={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalEditar({
  planilla,
  onClose,
  onGuardado,
}: {
  planilla: PlanillaListado;
  onClose: () => void;
  onGuardado: () => void;
}): JSX.Element {
  const [hospital, setHospital] = useState(planilla.hospital);
  const [periodo, setPeriodo] = useState(planilla.periodo);
  const [revisadoNombre, setRevisadoNombre] = useState(planilla.revisadoNombre ?? '');
  const [aprobadoNombre, setAprobadoNombre] = useState(planilla.aprobadoNombre ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar(): Promise<void> {
    setError(null);
    setGuardando(true);
    try {
      await actualizarPlanilla(planilla.id, { hospital, periodo, revisadoNombre, aprobadoNombre });
      onGuardado();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-3">
        <h2 className="font-semibold text-hospital-900">Editar planilla #{planilla.id}</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Hospital</label>
          <input
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Período</label>
          <input
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre revisor</label>
          <input
            value={revisadoNombre}
            onChange={(e) => setRevisadoNombre(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre aprobador</label>
          <input
            value={aprobadoNombre}
            onChange={(e) => setAprobadoNombre(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm border">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-4 py-2 rounded text-sm bg-hospital-600 text-white hover:bg-hospital-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlanillasListPage;
