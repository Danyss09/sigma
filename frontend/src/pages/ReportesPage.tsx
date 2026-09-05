import { useState, useEffect } from 'react';
import { axiosClient } from '../api/axiosClient';
import {
  generarIndividuales,
  generarConsolidadas,
  listarResultados,
  listarServicios,
  descargarResultado,
  ResultadoReporte,
  ResultadoPlanilla,
} from '../api/reportesApi';

function ReportesPage(): JSX.Element {
  const [planillaId, setPlanillaId] = useState('');
  const [servicios, setServicios] = useState<string[]>([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoReporte | null>(null);
  const [resultados, setResultados] = useState<ResultadoPlanilla[]>([]);

  useEffect(() => {
    setServicios([]);
    setServicioSeleccionado('');
    if (!planillaId) return;

    listarServicios(Number(planillaId))
      .then(setServicios)
      .catch(() => setServicios([]));
  }, [planillaId]);

  async function ejecutar(
    fn: (id: number, servicios?: string[]) => Promise<ResultadoReporte>,
  ): Promise<void> {
    setError(null);
    if (!planillaId) {
      setError('Indica el planilla_id');
      return;
    }
    setCargando(true);
    try {
      const filtro = servicioSeleccionado ? [servicioSeleccionado] : undefined;
      const data = await fn(Number(planillaId), filtro);
      setUltimoResultado(data);
      const lista = await listarResultados(Number(planillaId));
      setResultados(lista);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al generar el reporte');
    } finally {
      setCargando(false);
    }
  }

  async function verResultados(): Promise<void> {
    setError(null);
    if (!planillaId) {
      setError('Indica el planilla_id');
      return;
    }
    try {
      const lista = await listarResultados(Number(planillaId));
      setResultados(lista);
    } catch {
      setError('No se pudo cargar la lista de resultados');
    }
  }

  async function handleDescargar(r: ResultadoPlanilla): Promise<void> {
    setError(null);
    setDescargandoId(r.id);
    try {
      await descargarResultado(r.id, r.nombreArchivo);
    } catch {
      setError(`No se pudo descargar ${r.nombreArchivo}`);
    } finally {
      setDescargandoId(null);
    }
  }

  async function handleUnirTodas(): Promise<void> {
    setError(null);
    if (!planillaId) {
      setError('Indica el planilla_id');
      return;
    }
    setCargando(true);
    try {
      await axiosClient.post(
        `/planillas/${planillaId}/unir-individuales`,
        null,
        { params: servicioSeleccionado ? { servicio: servicioSeleccionado } : {} },
      );
      const lista = await listarResultados(Number(planillaId));
      setResultados(lista);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al unir los PDF individuales');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-hospital-900 mb-4">Generar reportes</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Planilla ID</label>
          <input
            type="number"
            value={planillaId}
            onChange={(e) => setPlanillaId(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Servicio {servicios.length === 0 && planillaId && '(sin servicios detectados aún)'}
          </label>
          <select
            value={servicioSeleccionado}
            onChange={(e) => setServicioSeleccionado(e.target.value)}
            disabled={servicios.length === 0}
            className="mt-1 w-full border rounded px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">Todos los servicios</option>
            {servicios.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => ejecutar(generarIndividuales)}
            disabled={cargando}
            className="bg-hospital-600 text-white px-4 py-2 rounded hover:bg-hospital-700 disabled:opacity-50 text-sm"
          >
            Generar individuales{servicioSeleccionado ? ` (${servicioSeleccionado})` : ' (todos)'}
          </button>
          <button
            onClick={() => ejecutar(generarConsolidadas)}
            disabled={cargando}
            className="bg-hospital-600 text-white px-4 py-2 rounded hover:bg-hospital-700 disabled:opacity-50 text-sm"
          >
            Generar consolidada{servicioSeleccionado ? ` (${servicioSeleccionado})` : 's (todas)'}
          </button>
          <button
            onClick={handleUnirTodas}
            disabled={cargando}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Unir todas las individuales en un PDF
          </button>
          <button
            onClick={verResultados}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-50"
          >
            Ver resultados
          </button>
        </div>
      </div>

      {ultimoResultado && (
        <div className="mt-4 bg-white rounded-lg shadow p-4 text-sm">
          <p>
            Generados: {ultimoResultado.generados.length} · Errores:{' '}
            {ultimoResultado.errores.length}
          </p>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold text-hospital-900 mb-2">
            Archivos generados ({resultados.length})
          </h2>
          <div className="space-y-2">
            {resultados.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-lg shadow p-3 text-sm flex justify-between items-center"
              >
                <span>
                  {r.tipo} · {r.servicio} {r.tramite ? `· Trámite ${r.tramite}` : ''} ·{' '}
                  {r.formato.toUpperCase()} — {r.nombreArchivo}
                </span>
                <button
                  onClick={() => handleDescargar(r)}
                  disabled={descargandoId === r.id}
                  className="bg-hospital-600 text-white px-3 py-1 rounded text-xs hover:bg-hospital-700 disabled:opacity-50 shrink-0 ml-3"
                >
                  {descargandoId === r.id ? 'Descargando...' : 'Descargar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportesPage;
