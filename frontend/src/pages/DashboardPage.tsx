import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { obtenerResumenGlobal, ResumenGlobal } from '../api/dashboardApi';
import { riesgoMeta } from '../styles/riesgoMeta';

const COLOR_RIESGO: Record<string, string> = {
  BAJO: 'var(--risk-bajo)',
  MEDIO: 'var(--risk-medio)',
  ALTO: 'var(--risk-alto)',
  CRITICO: 'var(--risk-critico)',
};

function DashboardPage(): JSX.Element {
  const [resumen, setResumen] = useState<ResumenGlobal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    obtenerResumenGlobal()
      .then(setResumen)
      .catch((err) => setError(err?.response?.data?.message ?? 'No se pudo cargar el resumen'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)' }}>Cargando...</div>;
  if (error) return <p style={{ color: 'var(--risk-critico)', fontSize: 13 }}>{error}</p>;
  if (!resumen) return <></>;

  const porEstadoFila = Object.fromEntries(resumen.porEstadoFila.map((f) => [f.clave, f.total]));
  const porNivel = Object.fromEntries(resumen.porNivelRiesgo.map((f) => [f.clave, f.total]));
  const sinEvaluar = resumen.lineas.total - resumen.lineas.evaluadas;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Panel general</div>
        <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
          Estado global del sistema — todas las planillas y líneas procesadas.
        </div>
      </div>

      {/* Fila 1: niveles de riesgo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 20 }}>
        {(['BAJO', 'MEDIO', 'ALTO', 'CRITICO'] as const).map((nivel) => {
          const rm = riesgoMeta(nivel);
          return (
            <div key={nivel} style={{ background: rm.bg, border: `1px solid ${rm.bg}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12.5, color: rm.color, fontWeight: 600 }}>Riesgo {rm.label}</div>
              <div style={{ marginTop: 8, fontSize: 30, fontWeight: 700, color: rm.color }}>{porNivel[nivel] ?? 0}</div>
            </div>
          );
        })}
      </div>

      {/* Fila 2: evaluación, auditoría, objeciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Líneas evaluadas" valor={resumen.lineas.evaluadas} sub={`de ${resumen.lineas.total} totales`} />
        <StatCard label="Sin evaluar" valor={sinEvaluar} colorVar="--risk-medio" onClick={() => navigate('/planillas')} />
        <StatCard label="Auditadas" valor={porEstadoFila['AUDITADO'] ?? 0} colorVar="--risk-bajo" />
        <StatCard label="Pendientes de auditoría" valor={porEstadoFila['PENDIENTE'] ?? 0} colorVar="--risk-alto" onClick={() => navigate('/auditoria')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total objetadas" valor={resumen.totalObjetadas} colorVar="--risk-critico" />
        <StatCard label="Correcciones automáticas" valor={resumen.totalCorrecciones} onClick={() => navigate('/correcciones')} />
        <StatCard label="Rechazadas (estado fila)" valor={porEstadoFila['RECHAZADO'] ?? 0} colorVar="--risk-critico" />
      </div>

      {/* Fila 3: gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Distribución de riesgo (global)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resumen.porNivelRiesgo.map((f) => ({ nivel: f.clave, total: f.total }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="nivel" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {resumen.porNivelRiesgo.map((f, i) => (
                  <Cell key={i} fill={COLOR_RIESGO[f.clave] ?? 'var(--brand)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Planillas procesadas por mes</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={resumen.tendenciaMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" fontSize={11} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, valor, sub, colorVar, onClick,
}: { label: string; valor: number; sub?: string; colorVar?: string; onClick?: () => void }): JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 20,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700, color: colorVar ? `var(${colorVar})` : 'var(--text)' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default DashboardPage;
