import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subirPlanilla } from '../api/planillasApi';
import { procesarPlanilla, ResultadoProcesamiento } from '../api/reportesApi';
import BotonRegresar from '../components/BotonRegresar';
const PASOS = ['Archivo', 'Firmas', 'Validación', 'Confirmación'];

function NuevaCargaWizardPage(): JSX.Element {
  const [paso, setPaso] = useState(1);
  const [hospital, setHospital] = useState('Hospital del Día Chimbacalle');
  const [periodo, setPeriodo] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [revisadoNombre, setRevisadoNombre] = useState('');
  const [revisadoIdentificacion, setRevisadoIdentificacion] = useState('');
  const [aprobadoNombre, setAprobadoNombre] = useState('');
  const [aprobadoIdentificacion, setAprobadoIdentificacion] = useState('');

  const [planillaId, setPlanillaId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<ResultadoProcesamiento | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  async function irAPaso2(): Promise<void> {
    setError(null);
    if (!file) {
      setError('Selecciona un archivo .xlsx o .xlsm');
      return;
    }
    if (!/^\d{2}-\d{4}$/.test(periodo)) {
      setError('El período debe tener formato MM-YYYY, ej. 08-2026');
      return;
    }
    setCargando(true);
    try {
      const data = await subirPlanilla(hospital, periodo, file);
      setPlanillaId(data.id);
      setPaso(2);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al subir el archivo');
    } finally {
      setCargando(false);
    }
  }

  async function irAPaso3YProcesar(): Promise<void> {
    if (!planillaId || !file) return;
    setPaso(3);
    setCargando(true);
    setError(null);
    try {
      const data = await procesarPlanilla(
        planillaId,
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
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 760 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/planillas'); }} style={{ fontSize: 13 }}>
          ← Planillas
        </a>

        <div style={{ marginTop: 12, marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 600 }}>Cargar nueva planilla</div>
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
            Sube el archivo y SIGMA lo procesa y valida contra el catálogo real.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {PASOS.map((label, i) => {
            const num = i + 1;
            const done = paso > num;
            const active = paso === num;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: num < PASOS.length ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12.5, fontWeight: 700,
                      background: done ? 'var(--brand)' : active ? '#fff' : 'var(--surface-alt)',
                      color: done ? '#fff' : active ? 'var(--brand)' : 'var(--text-faint)',
                      border: `1.5px solid ${done || active ? 'var(--brand)' : 'var(--border-strong)'}`,
                    }}
                  >
                    {done ? '✓' : num}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: done || active ? 'var(--text)' : 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                    {label}
                  </div>
                </div>
                {num < PASOS.length && (
                  <div style={{ flex: 1, height: 2, background: paso > num ? 'var(--brand)' : 'var(--border)', margin: '0 8px 20px' }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, minHeight: 380 }}>
          {paso === 1 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Archivo de la planilla</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Formatos: .xlsx, .xlsm</div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Hospital</label>
                <input value={hospital} onChange={(e) => setHospital(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Período (MM-YYYY)</label>
                <input value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="08-2026" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
              </div>

              {!file ? (
                <label
                  className="dropzone"
                  style={{ border: '2px dashed var(--border-strong)', borderRadius: 10, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'var(--surface-alt)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Haz clic para buscar tu archivo</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Planilla .xlsx o .xlsm generada por el prestador</div>
                  <input type="file" accept=".xlsx,.xlsm" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface-alt)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{file.name}</div>
                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--risk-bajo)' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · seleccionado
                    </div>
                  </div>
                  <button className="icon-btn" onClick={() => setFile(null)}>✕</button>
                </div>
              )}
            </div>
          )}

          {paso === 2 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Firmas de revisión y aprobación</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Opcional en este paso — puedes completarlas después.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Nombre revisor" value={revisadoNombre} onChange={setRevisadoNombre} />
                <Campo label="Identificación revisor" value={revisadoIdentificacion} onChange={setRevisadoIdentificacion} />
                <Campo label="Nombre aprobador" value={aprobadoNombre} onChange={setAprobadoNombre} />
                <Campo label="Identificación aprobador" value={aprobadoIdentificacion} onChange={setAprobadoIdentificacion} />
              </div>
            </div>
          )}

          {paso === 3 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Validación</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Resultado real del procesamiento contra el catálogo oficial.
              </div>
              {cargando && <div style={{ color: 'var(--text-faint)', padding: '30px 0' }}>Procesando matriz...</div>}
              {!cargando && resultado && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <FilaValidacion ok label={`${resultado.tramitesCreados} trámites creados, ${resultado.tramitesActualizados} actualizados`} />
                  <FilaValidacion ok label={`${resultado.detallesInsertados} líneas insertadas correctamente`} />
                  {resultado.detallesRechazados > 0 && (
                    <FilaValidacion label={`${resultado.detallesRechazados} líneas rechazadas — código no existe en catálogo TPSNS`} />
                  )}
                  {resultado.detallesSinCatalogo > 0 && (
                    <FilaValidacion label={`${resultado.detallesSinCatalogo} insumos/medicamentos sin catálogo — quedan pendientes de auditoría manual`} />
                  )}
                  <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 600 }}>
                    Valor total solicitado: <span style={{ fontFamily: 'var(--mono)' }}>${resultado.valorTotalSolicitado.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {paso === 4 && planillaId && resultado && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--risk-bajo-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>✓</div>
              <div style={{ fontSize: 19, fontWeight: 600 }}>¡Planilla procesada correctamente!</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 420 }}>
                <span style={{ fontFamily: 'var(--mono)' }}>#{planillaId}</span> · {resultado.detallesInsertados} líneas registradas
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-secondary" onClick={() => navigate('/planillas')} style={{ padding: '11px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                  Volver a planillas
                </button>
                <button className="btn-primary" onClick={() => navigate(`/revisar-riesgo/${planillaId}`)} style={{ padding: '11px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                  Ir a revisar riesgo →
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginTop: 12 }}>{error}</p>}

        {paso < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
            {paso > 1 && paso !== 3 ? (
              <button className="btn-secondary" onClick={() => setPaso(paso - 1)} style={{ padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                Atrás
              </button>
            ) : <span />}

            {paso === 1 && (
              <button className="btn-primary" onClick={irAPaso2} disabled={cargando || !file} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                {cargando ? 'Subiendo...' : 'Siguiente'}
              </button>
            )}
            {paso === 2 && (
              <button className="btn-primary" onClick={irAPaso3YProcesar} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                Procesar planilla
              </button>
            )}
            {paso === 3 && resultado && (
              <button className="btn-primary" onClick={() => setPaso(4)} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, marginLeft: 'auto' }}>
                Continuar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }} />
    </div>
  );
}

function FilaValidacion({ label, ok }: { label: string; ok?: boolean }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: ok ? 'var(--text)' : 'var(--risk-medio)' }}>
      <span>{ok ? '✓' : '⚠'}</span>
      {label}
    </div>
  );
}

export default NuevaCargaWizardPage;
