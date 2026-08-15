import { useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { procesarPlanilla, ResultadoProcesamiento } from '../api/reportesApi';

function ProcesarPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [planillaId, setPlanillaId] = useState(searchParams.get('planillaId') ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [revisadoNombre, setRevisadoNombre] = useState('');
  const [revisadoIdentificacion, setRevisadoIdentificacion] = useState('');
  const [aprobadoNombre, setAprobadoNombre] = useState('');
  const [aprobadoIdentificacion, setAprobadoIdentificacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoProcesamiento | null>(null);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setResultado(null);

    if (!file || !planillaId) {
      setError('Indica el planilla_id y selecciona el archivo');
      return;
    }

    setCargando(true);
    try {
      const data = await procesarPlanilla(
        Number(planillaId),
        { revisadoNombre, revisadoIdentificacion, aprobadoNombre, aprobadoIdentificacion },
        file,
      );
      setResultado(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al procesar la matriz');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-hospital-900 mb-1">Procesar matriz</h1>
      <p className="text-sm text-gray-500 mb-6">
        Usa el <code>planilla_id</code> que te dio "Subir planilla".
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Planilla ID</label>
          <input
            type="number"
            required
            value={planillaId}
            onChange={(e) => setPlanillaId(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Archivo de la matriz (.xlsx / .xlsm)
          </label>
          <input
            type="file"
            required
            accept=".xlsx,.xlsm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full"
          />
        </div>

        <fieldset className="border rounded p-3">
          <legend className="text-sm font-medium text-gray-700 px-1">
            Firmas (opcional en este paso)
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nombre revisor"
              value={revisadoNombre}
              onChange={(e) => setRevisadoNombre(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Identificación revisor"
              value={revisadoIdentificacion}
              onChange={(e) => setRevisadoIdentificacion(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Nombre aprobador"
              value={aprobadoNombre}
              onChange={(e) => setAprobadoNombre(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Identificación aprobador"
              value={aprobadoIdentificacion}
              onChange={(e) => setAprobadoIdentificacion(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="bg-hospital-600 text-white px-4 py-2 rounded hover:bg-hospital-700 disabled:opacity-50"
        >
          {cargando ? 'Procesando...' : 'Procesar'}
        </button>
      </form>

      {resultado && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-hospital-900 mb-3">Resultado</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Trámites creados</dt>
            <dd>{resultado.tramitesCreados}</dd>
            <dt className="text-gray-500">Trámites actualizados</dt>
            <dd>{resultado.tramitesActualizados}</dd>
            <dt className="text-gray-500">Expedientes creados</dt>
            <dd>{resultado.expedientesCreados}</dd>
            <dt className="text-gray-500">Detalles insertados</dt>
            <dd>{resultado.detallesInsertados}</dd>
            <dt className="text-gray-500">Rechazados</dt>
            <dd className="text-red-600">{resultado.detallesRechazados}</dd>
            <dt className="text-gray-500">Sin catálogo (pendiente auditor)</dt>
            <dd className="text-amber-600">{resultado.detallesSinCatalogo}</dd>
            <dt className="text-gray-500 font-medium">Valor total solicitado</dt>
            <dd className="font-medium">${resultado.valorTotalSolicitado.toFixed(2)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}

export default ProcesarPage;
