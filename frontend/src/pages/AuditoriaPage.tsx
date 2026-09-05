import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BotonRegresar from '../components/BotonRegresar';
import {
  listarPendientes,
  listarMotivosObjecion,
  decidirAuditoria,
  reevaluarRiesgo,
  DetalleAuditoria,
  MotivoObjecion,
} from '../api/auditoriaApi';
import { riesgoMeta } from '../styles/riesgoMeta';

function AuditoriaPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const detalleIdDesdeUrl = searchParams.get('detalleId');
  const planillaIdDesdeUrl = searchParams.get('planillaId');
  const motivoSugeridoIdDesdeUrl = searchParams.get('motivoSugeridoId');

  const [items, setItems] = useState<DetalleAuditoria[]>([]);
  const [motivos, setMotivos] = useState<MotivoObjecion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<DetalleAuditoria | null>(null);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);

  async function cargar(): Promise<void> {
    setCargando(true);
    setError(null);
    try {
      const [data, mot] = await Promise.all([
        listarPendientes(undefined, planillaIdDesdeUrl ? Number(planillaIdDesdeUrl) : undefined),
        listarMotivosObjecion(),
      ]);
      setItems(data.items ?? []);
      setMotivos(mot ?? []);

      if (detalleIdDesdeUrl) {
        const encontrado = (data.items ?? []).find((i) => i.id === Number(detalleIdDesdeUrl));
        if (encontrado) setSeleccionado(encontrado);
      }
    } catch (err: any) {
      const detalle = err?.response?.data?.message ?? err?.message ?? 'Error desconocido';
      setError(`No se pudo cargar la lista de pendientes: ${detalle}`);
      console.error('Error completo en AuditoriaPage:', err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planillaIdDesdeUrl]);

  const VALIDACION_LABEL: Record<string, string> = {
    CORRECTA: 'Coincide con catálogo',
    DIFERENCIA: 'Difiere del catálogo',
    SIN_CATALOGO: 'Sin catálogo',
  };

  return (
    <div>
      <BotonRegresar to="/planillas" />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Auditoría</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Líneas que requieren revisión humana: código no encontrado, riesgo alto/crítico, o coincidencia ambigua.
        </div>
        {planillaIdDesdeUrl && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'var(--brand-light)', color: 'var(--brand-dark)', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
              Mostrando solo planilla #{planillaIdDesdeUrl}
            </span>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/auditoria'); }} style={{ fontSize: 12.5 }}>
              Ver todas →
            </a>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {cargando && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>}

      {!cargando && !error && items.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
          No hay líneas pendientes de auditoría. 🎉
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => {
          const rm = riesgoMeta(item.nivelRiesgo);
          const expandido = expandidoId === item.id;
          const sugeridos = item.motivosSugeridos ?? [];

          return (
            <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div
                onClick={() => setExpandidoId(expandido ? null : item.id)}
                style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 13.5 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)' }}>{item.codigoOriginal}</span>
                    <span>{item.descripcion ?? '(sin descripción)'}</span>
                    {item.servicio && (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>· {item.servicio}</span>
                    )}
                    {item.nivelRiesgo && (
                      <span style={{ background: rm.bg, color: rm.color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                        Riesgo {rm.label}
                      </span>
                    )}
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--surface-alt)', color: 'var(--text-muted)' }}>
                      {VALIDACION_LABEL[item.validacionCatalogo ?? 'SIN_CATALOGO']}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: item.estadoFila === 'RECHAZADO' ? 'var(--risk-critico-bg)' : 'var(--risk-medio-bg)',
                        color: item.estadoFila === 'RECHAZADO' ? 'var(--risk-critico)' : 'var(--risk-medio)',
                      }}
                    >
                      {item.estadoFila}
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                    {item.expediente.nombrePaciente} · Trámite {item.expediente.tramite.numeroTramite} · Planilla #{item.expediente.tramite.planilla.id} · Cant. {item.cantidad}
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                    Solicitado: <span style={{ fontFamily: 'var(--mono)' }}>${Number(item.valorSolicitado).toFixed(2)}</span> · Catálogo:{' '}
                    <span style={{ fontFamily: 'var(--mono)' }}>{item.valorUnitarioOficial !== null ? `$${Number(item.valorUnitarioOficial).toFixed(2)}` : '(sin definir)'}</span>
                    {item.puntajeRiesgo !== null && <> · Puntaje: <span style={{ fontFamily: 'var(--mono)' }}>{item.puntajeRiesgo.toFixed(1)}%</span></>}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSeleccionado(item); }}
                  className="btn-primary"
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                >
                  Decidir
                </button>
              </div>

              {expandido && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    SHAP
                  </div>
                  {item.shapValues ? (
                    Object.entries(item.shapValues)
                      .sort((a: any, b: any) => Math.abs(b[1]) - Math.abs(a[1]))
                      .map(([feature, valor]: any) => (
                        <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <div style={{ width: 200, fontSize: 12, color: 'var(--text-muted)' }}>{feature}</div>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, Math.abs(valor) * 100)}%`, height: '100%', background: valor > 0 ? 'var(--risk-critico)' : 'var(--risk-bajo)' }} />
                          </div>
                          <div style={{ width: 50, fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'right' }}>{Number(valor).toFixed(2)}</div>
                        </div>
                      ))
                  ) : (
                    <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Sin evaluación de IA todavía para esta línea.</p>
                  )}

                  {sugeridos.length > 0 && (
                    <div style={{ marginTop: 14, padding: 12, background: 'var(--brand-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-dark)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Motivo de objeción sugerido
                      </div>
                      {sugeridos.map((m: any) => (
                        <div key={m.id} style={{ fontSize: 12.5, marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{m.codigo_original}</span> — {m.descripcion}
                        </div>
                      ))}
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, fontStyle: 'italic' }}>
                        Sugerencia automática — la decisión final es del auditor.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {seleccionado && (
        <ModalDecidir
          detalle={seleccionado}
          motivos={motivos}
          motivoSugeridoId={motivoSugeridoIdDesdeUrl}
          onClose={() => {
            setSeleccionado(null);
            navigate(planillaIdDesdeUrl ? `/auditoria?planillaId=${planillaIdDesdeUrl}` : '/auditoria', { replace: true });
          }}
          onDecidido={() => {
            setSeleccionado(null);
            navigate(planillaIdDesdeUrl ? `/auditoria?planillaId=${planillaIdDesdeUrl}` : '/auditoria', { replace: true });
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalDecidir({
  detalle,
  motivos,
  motivoSugeridoId,
  onClose,
  onDecidido,
}: {
  detalle: DetalleAuditoria;
  motivos: MotivoObjecion[];
  motivoSugeridoId?: string | null;
  onClose: () => void;
  onDecidido: () => void;
}): JSX.Element {
  const [decision, setDecision] = useState<'APROBADO' | 'RECHAZADO' | 'PARCIAL'>('APROBADO');
  const [motivoGlosa, setMotivoGlosa] = useState('');
  const [motivoObjecionId, setMotivoObjecionId] = useState<string>(motivoSugeridoId ?? '');
  const [valorUnitarioOficial, setValorUnitarioOficial] = useState('');
  const [valorSolicitado, setValorSolicitado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reevaluando, setReevaluando] = useState(false);
  const [resultadoReeval, setResultadoReeval] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const requiereValorManual = detalle.valorUnitarioOficial === null;
  const cambioValor = valorUnitarioOficial !== '' || valorSolicitado !== '';

  async function handleDecidir(): Promise<void> {
    setError(null);
    setEnviando(true);
    try {
      await decidirAuditoria(detalle.id, {
        decision,
        motivoGlosa: motivoGlosa || undefined,
        motivoObjecionId: motivoObjecionId ? Number(motivoObjecionId) : undefined,
        valorUnitarioOficial: valorUnitarioOficial ? Number(valorUnitarioOficial) : undefined,
        valorSolicitado: valorSolicitado ? Number(valorSolicitado) : undefined,
      });

      if (cambioValor) {
        setReevaluando(true);
        try {
          const nueva = await reevaluarRiesgo(detalle.id);
          setResultadoReeval(nueva);
        } finally {
          setReevaluando(false);
        }
      } else {
        onDecidido();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al registrar la decisión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, width: 460, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
          {detalle.codigoOriginal} — {detalle.expediente.nombrePaciente}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>
          Trámite {detalle.expediente.tramite.numeroTramite} · Planilla #{detalle.expediente.tramite.planilla.id}
        </div>

        {!resultadoReeval ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Decisión</label>
              <select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }}>
                <option value="APROBADO">Aprobado</option>
                <option value="PARCIAL">Parcial</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>

            {decision === 'RECHAZADO' && (
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Motivo de objeción (CTM/LQD/REV)</label>
                <select value={motivoObjecionId} onChange={(e) => setMotivoObjecionId(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }}>
                  <option value="">Sin motivo específico</option>
                  {motivos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.codigo_original} — {m.descripcion?.slice(0, 50) ?? ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>Observación / glosa</label>
              <input value={motivoGlosa} onChange={(e) => setMotivoGlosa(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
            </div>

            {(requiereValorManual || decision === 'PARCIAL') && (
              <>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    Valor unitario oficial {requiereValorManual && '(obligatorio)'}
                  </label>
                  <input type="number" step="0.0001" value={valorUnitarioOficial} onChange={(e) => setValorUnitarioOficial(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                    Valor solicitado {requiereValorManual && '(obligatorio)'}
                  </label>
                  <input type="number" step="0.01" value={valorSolicitado} onChange={(e) => setValorSolicitado(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
                </div>
              </>
            )}

            {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13 }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={handleDecidir} disabled={enviando} className="btn-primary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                {enviando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>✓ Decisión guardada</div>
            {reevaluando ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Recalculando riesgo con el valor corregido...</p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Riesgo recalculado: <strong>{resultadoReeval.nivelRiesgo ?? 'N/A'}</strong>
                </p>
                <button onClick={onDecidido} className="btn-primary" style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                  Cerrar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditoriaPage;
