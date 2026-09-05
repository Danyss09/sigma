import { useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import BotonRegresar from '../components/BotonRegresar';
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
    <div style={{ maxWidth: 640 }}>
      <BotonRegresar to="/planillas" />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Procesar matriz</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Lee el archivo real de la planilla, valida contra catálogo y crea trámites/expedientes/detalles.
          Usa el <span style={{ fontFamily: 'var(--mono)' }}>planilla_id</span> que te dio "Nueva carga".
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Planilla ID</label>
          <input
            type="number"
            required
            value={planillaId}
            onChange={(e) => setPlanillaId(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Archivo de la matriz (.xlsx / .xlsm)
          </label>
          {!file ? (
            <label
              className="dropzone"
              style={{ border: '2px dashed var(--border-strong)', borderRadius: 8, padding: '24px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--surface-alt)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>Haz clic para buscar tu archivo</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>.xlsx o .xlsm</div>
              <input type="file" required accept=".xlsx,.xlsm" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)' }}>
              <span style={{ fontSize: 12.5 }}>{file.name}</span>
              <button type="button" className="icon-btn" onClick={() => setFile(null)}>✕</button>
            </div>
          )}
        </div>

        <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
          <legend style={{ fontSize: 12.5, fontWeight: 500, padding: '0 4px', color: 'var(--text-muted)' }}>
            Firmas (opcional en este paso)
          </legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="Nombre revisor" value={revisadoNombre} onChange={(e) => setRevisadoNombre(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
            <input placeholder="Identificación revisor" value={revisadoIdentificacion} onChange={(e) => setRevisadoIdentificacion(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
            <input placeholder="Nombre aprobador" value={aprobadoNombre} onChange={(e) => setAprobadoNombre(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
            <input placeholder="Identificación aprobador" value={aprobadoIdentificacion} onChange={(e) => setAprobadoIdentificacion(e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
          </div>
        </fieldset>

        {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13 }}>{error}</p>}

        <button type="submit" disabled={cargando} className="btn-primary" style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
          {cargando ? 'Procesando...' : 'Procesar'}
        </button>
      </form>

      {resultado && (
        <div style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Resultado</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13.5 }}>
            <FilaResultado label="Trámites creados" valor={resultado.tramitesCreados} />
            <FilaResultado label="Trámites actualizados" valor={resultado.tramitesActualizados} />
            <FilaResultado label="Expedientes creados" valor={resultado.expedientesCreados} />
            <FilaResultado label="Detalles insertados" valor={resultado.detallesInsertados} />
            <FilaResultado label="Rechazados" valor={resultado.detallesRechazados} colorVar="--risk-critico" />
            <FilaResultado label="Sin catálogo" valor={resultado.detallesSinCatalogo} colorVar="--risk-medio" />
          </div>
          <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600 }}>
            Valor total solicitado: <span style={{ fontFamily: 'var(--mono)' }}>${resultado.valorTotalSolicitado.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaResultado({ label, valor, colorVar }: { label: string; valor: number; colorVar?: string }): JSX.Element {
  return (
    <>
      <div style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontWeight: 600, color: colorVar ? `var(${colorVar})` : 'var(--text)' }}>{valor}</div>
    </>
  );
}

export default ProcesarPage;
