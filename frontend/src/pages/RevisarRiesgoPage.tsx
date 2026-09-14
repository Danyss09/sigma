import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { obtenerDetallePlanilla, PlanillaListado } from '../api/planillasCrudApi';
import { obtenerVistaRiesgo, evaluarRiesgoPlanilla, evaluarUnaLinea, DetalleRiesgo } from '../api/prediccionesApi';
import { riesgoMeta } from '../styles/riesgoMeta';

const CHIPS = [
  { key: 'todos', label: 'Todos' },
  { key: 'BAJO', label: 'Bajo' },
  { key: 'MEDIO', label: 'Medio' },
  { key: 'ALTO', label: 'Alto' },
  { key: 'CRITICO', label: 'Crítico' },
];

function datosDistribucion(detalles: DetalleRiesgo[]) {
  const niveles = ['BAJO', 'MEDIO', 'ALTO', 'CRITICO'];
  return niveles.map((nivel) => ({
    nivel,
    cantidad: detalles.filter((d) => d.nivelRiesgo === nivel).length,
  }));
}

function datosWaterfall(shapValues: Record<string, number>, baseValue: number) {
  const entradas = Object.entries(shapValues).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  let acumulado = baseValue;
  const pasos = entradas.map(([feature, valor]) => {
    const inicio = acumulado;
    acumulado += valor;
    return {
      feature,
      base: Math.min(inicio, acumulado),
      delta: Math.abs(valor),
      esPositivo: valor > 0,
      esBase: false,
    };
  });
  return [
    { feature: 'Valor base', base: 0, delta: baseValue, esPositivo: true, esBase: true },
    ...pasos,
    { feature: 'Score final', base: 0, delta: acumulado, esPositivo: true, esBase: true },
  ];
}

function exportarCSV(detalles: DetalleRiesgo[], planillaId: number): void {
  const encabezados = ['Codigo', 'Descripcion', 'Cantidad', 'Valor Solicitado', 'Valor Oficial', 'Nivel Riesgo', 'Puntaje', 'Corregido'];
  const filas = detalles.map((d) => [
    d.codigo, d.descripcion ?? '', d.cantidad, d.valorSolicitado,
    d.valorOficial ?? '', d.nivelRiesgo ?? '', d.puntaje ?? '', d.corregido ? 'SI' : 'NO',
  ]);
  const csv = [encabezados, ...filas].map((fila) => fila.map((v) => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `resultados_riesgo_planilla_${planillaId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function RevisarRiesgoPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const planillaId = Number(id);
  const navigate = useNavigate();

  const [planilla, setPlanilla] = useState<PlanillaListado | null>(null);
  const [detalles, setDetalles] = useState<DetalleRiesgo[]>([]);
  const [filtro, setFiltro] = useState('todos');
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [evaluando, setEvaluando] = useState(false);
  const [evaluandoLinea, setEvaluandoLinea] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar(): Promise<void> {
    setCargando(true);
    try {
      const [p, d] = await Promise.all([obtenerDetallePlanilla(planillaId), obtenerVistaRiesgo(planillaId)]);
      setPlanilla(p);
      setDetalles(d);
    } catch {
      setError('No se pudo cargar la información de la planilla');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planillaId]);

  async function handleEvaluar(): Promise<void> {
    setError(null);
    setEvaluando(true);
    try {
      await evaluarRiesgoPlanilla(planillaId);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al evaluar riesgo con IA');
    } finally {
      setEvaluando(false);
    }
  }

  async function handleEvaluarLinea(detalleId: number): Promise<void> {
    setError(null);
    setEvaluandoLinea(detalleId);
    try {
      await evaluarUnaLinea(detalleId);
      await cargar();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al evaluar esta línea');
    } finally {
      setEvaluandoLinea(null);
    }
  }

  const yaEvaluado = detalles.some((d) => d.nivelRiesgo !== null);
  const filtrados = detalles.filter((d) => filtro === 'todos' || d.nivelRiesgo === filtro);
  const corregidas = detalles.filter((d) => d.corregido).length;
  const manual = detalles.filter((d) => !d.corregido && (d.nivelRiesgo === 'ALTO' || d.nivelRiesgo === 'CRITICO')).length;

  if (cargando) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>;
  }

  return (
    <div>
      <Link to="/planillas" style={{ fontSize: 13 }}>← Planillas</Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 14, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 600 }}>#{planillaId}</span>
            <span style={{ background: 'var(--brand-light)', color: 'var(--brand-dark)', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
              {planilla?.estado}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>
            {planilla?.hospital} · {planilla?.periodo} · {detalles.length} filas de detalle
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {yaEvaluado ? (
            <>
              <button className="btn-done" style={{ padding: '11px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
                ✓ Evaluado con IA
              </button>
              <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-faint)' }}>Modelo RandomForest · SHAP</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => exportarCSV(detalles, planillaId)} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                  Exportar CSV
                </button>
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/documento?planillaId=${planillaId}&tipo=consolidada`)}
                  style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
                >
                  Generar planilla consolidada →
                </button>
              </div>
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={handleEvaluar}
              disabled={evaluando}
              style={{ padding: '11px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}
            >
              {evaluando ? 'Evaluando...' : 'Ejecutar revisión de riesgo (IA)'}
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: 'var(--risk-critico)', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginBottom: 24 }}>
        <Stat label="Filas evaluadas" valor={yaEvaluado ? detalles.length : 0} />
        <Stat label="Corregidas automáticamente" valor={corregidas} colorVar="--risk-critico" />
        <Stat label="Requieren revisión manual" valor={manual} colorVar="--risk-alto" />
      </div>

      {yaEvaluado && detalles.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Distribución de riesgo</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={datosDistribucion(detalles)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="nivel" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="var(--brand)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {CHIPS.map((c) => (
          <button
            key={c.key}
            className="chip"
            onClick={() => setFiltro(c.key)}
            style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              background: filtro === c.key ? 'var(--brand)' : 'var(--surface)',
              color: filtro === c.key ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${filtro === c.key ? 'var(--brand)' : 'var(--border)'}`,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.7fr 0.6fr 1fr 1fr 1.2fr 0.5fr', padding: '12px 20px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <div>Código</div><div>Descripción</div><div>Cant.</div><div>Solicitado</div><div>Catálogo</div><div>Riesgo</div><div />
        </div>

        {filtrados.map((d) => {
          const rm = riesgoMeta(d.nivelRiesgo);
          const expandible = (yaEvaluado && d.nivelRiesgo !== null) || !!d.motivoNoEvaluado;
          const expandido = expandidoId === d.detalleId;
          const necesitaRevision = (d.nivelRiesgo === 'ALTO' || d.nivelRiesgo === 'CRITICO' || !!d.motivoNoEvaluado) && !d.corregido;

          return (
            <div key={d.detalleId}>
              <div
                className="row-toggle"
                onClick={() => expandible && setExpandidoId(expandido ? null : d.detalleId)}
                style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.7fr 0.6fr 1fr 1fr 1.2fr 0.5fr', padding: '13px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{d.codigo}</div>
                <div style={{ fontSize: 13.5 }}>
                  {d.descripcion}
                  {d.corregido && (
                    <div style={{ marginTop: 3, fontSize: 11, color: 'var(--risk-critico)', fontWeight: 600 }}>
                      ⟳ Corregido automáticamente a catálogo
                    </div>
                  )}
                  {d.motivoNoEvaluado && (
                    <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-faint)' }}>{d.motivoNoEvaluado}</div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.cantidad}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, ...(d.corregido ? { textDecoration: 'line-through', color: 'var(--text-faint)' } : {}) }}>
                  ${d.corregido && d.valorAnteriorCorreccion !== null ? d.valorAnteriorCorreccion.toFixed(2) : d.valorSolicitado.toFixed(2)}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                  {d.valorOficial !== null ? `$${d.valorOficial.toFixed(2)}` : '—'}
                </div>
                <div>
                  <span style={{ background: rm.bg, color: rm.color, padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
                    {yaEvaluado ? rm.label : '—'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {expandible && <span style={{ color: 'var(--text-faint)' }}>{expandido ? '▲' : '▼'}</span>}
                </div>
              </div>

              {expandido && (
                <div style={{ padding: '18px 24px 22px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 36 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                      Contribución al score (SHAP)
                    </div>
                    {d.shapValues ? (
                      d.baseValue !== null ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={datosWaterfall(d.shapValues, d.baseValue)} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" domain={[0, 1]} fontSize={11} />
                            <YAxis type="category" dataKey="feature" width={140} fontSize={11} />
                            <Tooltip formatter={(value: number) => value.toFixed(3)} />
                            <Bar dataKey="base" stackId="w" fill="transparent" />
                            <Bar dataKey="delta" stackId="w" radius={[3, 3, 3, 3]}>
                              {datosWaterfall(d.shapValues, d.baseValue).map((entry, i) => (
                                <Cell key={i} fill={entry.esBase ? 'var(--brand)' : entry.esPositivo ? 'var(--risk-critico)' : 'var(--risk-bajo)'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        Object.entries(d.shapValues)
                          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                          .map(([feature, valor]) => (
                            <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <div style={{ width: 200, fontSize: 12, color: 'var(--text-muted)' }}>{feature}</div>
                              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, Math.abs(valor) * 100)}%`, height: '100%',
                                    background: valor > 0 ? 'var(--risk-critico)' : 'var(--risk-bajo)',
                                  }}
                                />
                              </div>
                              <div style={{ width: 50, fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'right' }}>
                                {valor.toFixed(2)}
                              </div>
                            </div>
                          ))
                      )
                    ) : (
                      <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
                        Sin evaluación de IA todavía — completa el valor oficial en Auditoría y evalúa esta línea.
                      </p>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                      {d.corregido ? 'Motivo de la corrección' : 'Análisis'}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{d.motivoCorreccion ?? 'Sin observaciones adicionales.'}</div>
                    {d.puntaje !== null && (
                      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-faint)' }}>
                        Score de riesgo: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{d.puntaje?.toFixed(1)}%</span>
                      </div>
                    )}

                    {d.motivosSugeridos && d.motivosSugeridos.length > 0 && (
                      <div style={{ marginTop: 14, padding: 12, background: 'var(--brand-light)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-dark)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Motivo de objeción sugerido
                        </div>
                        {d.motivosSugeridos.map((m) => (
                          <div key={m.id} style={{ fontSize: 12.5, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{m.codigo_original}</span> — {m.descripcion}
                          </div>
                        ))}
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, fontStyle: 'italic' }}>
                          Sugerencia automática según la causa del riesgo — la decisión final es del auditor.
                        </div>
                      </div>
                    )}

                    {d.tasaRechazoHistorica?.disponible && (
                      <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Historial real de este código (referencial, no automático)
                        </div>
                        <div style={{ fontSize: 12.5 }}>
                          Este código fue rechazado por pertinencia médica/documentación en el{' '}
                          <strong>{(d.tasaRechazoHistorica.tasaRechazo! * 100).toFixed(0)}%</strong> de {d.tasaRechazoHistorica.totalApariciones} casos reales conocidos.
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, fontStyle: 'italic' }}>
                          Estadística histórica del código, no una predicción — no reemplaza el criterio del auditor.
                        </div>
                      </div>
                    )}

                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(
                          `/documento?planillaId=${planillaId}&tipo=individual&tramite=${encodeURIComponent(d.tramite)}&servicio=${encodeURIComponent(d.servicio)}`,
                        );
                      }}
                      style={{ display: 'inline-block', marginTop: 14, fontSize: 12.5, fontWeight: 600 }}
                    >
                      Ver planilla individual original →
                    </a>

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {necesitaRevision && (
                        <button
                          onClick={() => {
                            const motivoId = d.motivosSugeridos?.[0]?.id;
                            navigate(`/auditoria?detalleId=${d.detalleId}${motivoId ? `&motivoSugeridoId=${motivoId}` : ''}`);
                          }}
                          className="btn-primary"
                          style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}
                        >
                          Revisar / Corregir →
                        </button>
                      )}

                      <button
                        onClick={() => handleEvaluarLinea(d.detalleId)}
                        disabled={evaluandoLinea === d.detalleId}
                        className="btn-secondary"
                        style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}
                      >
                        {evaluandoLinea === d.detalleId ? 'Evaluando...' : 'Evaluar esta línea'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, valor, colorVar }: { label: string; valor: number; colorVar?: string }): JSX.Element {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: colorVar ? `var(${colorVar})` : 'var(--text)' }}>{valor}</div>
    </div>
  );
}

export default RevisarRiesgoPage;
