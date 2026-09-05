export interface RiesgoMeta {
  label: string;
  bg: string;
  color: string;
}

export function riesgoMeta(nivel: string | null): RiesgoMeta {
  const map: Record<string, RiesgoMeta> = {
    BAJO: { label: 'Bajo', bg: 'var(--risk-bajo-bg)', color: 'var(--risk-bajo)' },
    MEDIO: { label: 'Medio', bg: 'var(--risk-medio-bg)', color: 'var(--risk-medio)' },
    ALTO: { label: 'Alto', bg: 'var(--risk-alto-bg)', color: 'var(--risk-alto)' },
    CRITICO: { label: 'Crítico', bg: 'var(--risk-critico-bg)', color: 'var(--risk-critico)' },
  };
  return map[nivel ?? ''] ?? { label: 'Sin evaluar', bg: 'var(--surface-alt)', color: 'var(--text-faint)' };
}

export function estadoMeta(estado: string): RiesgoMeta {
  const map: Record<string, RiesgoMeta> = {
    SUBIDA: { label: 'Subida', bg: 'var(--surface-alt)', color: 'var(--text-muted)' },
    PROCESANDO: { label: 'Procesando', bg: 'var(--brand-light)', color: 'var(--brand-dark)' },
    COMPLETADA: { label: 'Completada', bg: 'var(--risk-bajo-bg)', color: 'var(--risk-bajo)' },
    ERROR: { label: 'Error', bg: 'var(--risk-critico-bg)', color: 'var(--risk-critico)' },
  };
  return map[estado] ?? { label: estado, bg: 'var(--surface-alt)', color: 'var(--text-muted)' };
}
