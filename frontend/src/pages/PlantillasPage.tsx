import { useState, useEffect, FormEvent } from 'react';
import BotonRegresar from '../components/BotonRegresar';
import { listarPlantillas, subirPlantilla, Plantilla } from '../api/plantillasApi';

function PlantillasPage(): JSX.Element {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'INDIVIDUAL' | 'CONSOLIDADA'>('INDIVIDUAL');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(true);

  async function cargar(): Promise<void> {
    setCargandoLista(true);
    try {
      const data = await listarPlantillas();
      setPlantillas(data);
    } finally {
      setCargandoLista(false);
    }
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
    <div>
      <BotonRegresar to="/planillas" />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Plantillas base</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Los archivos .xlsx maestros que se usan como plantilla al generar planillas individuales/consolidadas.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'flex-start' }}>
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Subir nueva plantilla</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Nombre</label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as typeof tipo)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font)' }}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="CONSOLIDADA">Consolidada</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Archivo .xlsx</label>
              {!archivo ? (
                <label
                  className="dropzone"
                  style={{ border: '2px dashed var(--border-strong)', borderRadius: 8, padding: '24px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--surface-alt)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Haz clic para buscar</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>.xlsx</div>
                  <input type="file" required accept=".xlsx" hidden onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
                </label>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)' }}>
                  <span style={{ fontSize: 12.5 }}>{archivo.name}</span>
                  <button type="button" className="icon-btn" onClick={() => setArchivo(null)}>✕</button>
                </div>
              )}
            </div>

            {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13 }}>{error}</p>}

            <button type="submit" disabled={cargando} className="btn-primary" style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
              {cargando ? 'Subiendo...' : 'Subir plantilla'}
            </button>
          </div>
        </form>

        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Plantillas activas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cargandoLista && <div style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>Cargando...</div>}
            {!cargandoLista && plantillas.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-faint)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                No hay plantillas subidas.
              </div>
            )}
            {plantillas.map((p) => (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.tipo} · versión {p.version}</div>
                </div>
                <span
                  style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                    background: p.activo ? 'var(--risk-bajo-bg)' : 'var(--surface-alt)',
                    color: p.activo ? 'var(--risk-bajo)' : 'var(--text-faint)',
                  }}
                >
                  {p.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlantillasPage;
