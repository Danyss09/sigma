import { useState, useEffect } from 'react';
import { listarPendientes, decidirAuditoria, DetalleAuditoria } from '../api/auditoriaApi';

function AuditoriaPage(): JSX.Element {
  const [items, setItems] = useState<DetalleAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<DetalleAuditoria | null>(null);

  async function cargar(): Promise<void> {
    setCargando(true);
    setError(null);
    try {
      const data = await listarPendientes();
      setItems(data.items);
    } catch {
      setError('No se pudo cargar la lista de pendientes');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-hospital-900 mb-4">
        Auditoría — Líneas pendientes ({items.length})
      </h1>

      {cargando && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && items.length === 0 && (
        <p className="text-gray-500">No hay líneas pendientes de auditoría.</p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <div className="text-sm">
              <p className="font-medium">
                {item.codigoOriginal} — {item.descripcion ?? '(sin descripción)'}
              </p>
              <p className="text-gray-500">
                {item.expediente.nombrePaciente} · Trámite {item.expediente.tramite.numeroTramite} ·{' '}
                {item.expediente.tramite.tipoServicio} ·{' '}
                <span
                  className={
                    item.estadoFila === 'RECHAZADO' ? 'text-red-600 font-medium' : 'text-amber-600'
                  }
                >
                  {item.estadoFila}
                </span>
              </p>
              <p className="text-gray-500">
                Solicitado: ${Number(item.valorSolicitado).toFixed(2)} · Oficial:{' '}
                {item.valorUnitarioOficial ?? '(sin definir)'}
              </p>
            </div>
            <button
              onClick={() => setSeleccionado(item)}
              className="bg-hospital-600 text-white px-3 py-1.5 rounded text-sm hover:bg-hospital-700"
            >
              Decidir
            </button>
          </div>
        ))}
      </div>

      {seleccionado && (
        <ModalDecidir
          detalle={seleccionado}
          onClose={() => setSeleccionado(null)}
          onDecidido={() => {
            setSeleccionado(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalDecidir({
  detalle,
  onClose,
  onDecidido,
}: {
  detalle: DetalleAuditoria;
  onClose: () => void;
  onDecidido: () => void;
}): JSX.Element {
  const [decision, setDecision] = useState<'APROBADO' | 'RECHAZADO' | 'PARCIAL'>('APROBADO');
  const [motivoGlosa, setMotivoGlosa] = useState('');
  const [valorUnitarioOficial, setValorUnitarioOficial] = useState('');
  const [valorSolicitado, setValorSolicitado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiereValorManual = detalle.valorUnitarioOficial === null;

  async function handleDecidir(): Promise<void> {
    setError(null);
    setEnviando(true);
    try {
      await decidirAuditoria(detalle.id, {
        decision,
        motivoGlosa: motivoGlosa || undefined,
        valorUnitarioOficial: valorUnitarioOficial ? Number(valorUnitarioOficial) : undefined,
        valorSolicitado: valorSolicitado ? Number(valorSolicitado) : undefined,
      });
      onDecidido();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al registrar la decisión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-3">
        <h2 className="font-semibold text-hospital-900">
          {detalle.codigoOriginal} — {detalle.expediente.nombrePaciente}
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Decisión</label>
          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value as typeof decision)}
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="APROBADO">Aprobado</option>
            <option value="PARCIAL">Parcial</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Motivo / Glosa</label>
          <input
            value={motivoGlosa}
            onChange={(e) => setMotivoGlosa(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        {(requiereValorManual || decision === 'PARCIAL') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Valor unitario oficial {requiereValorManual && '(obligatorio)'}
              </label>
              <input
                type="number"
                step="0.0001"
                value={valorUnitarioOficial}
                onChange={(e) => setValorUnitarioOficial(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Valor solicitado {requiereValorManual && '(obligatorio)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={valorSolicitado}
                onChange={(e) => setValorSolicitado(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </div>
          </>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm border">
            Cancelar
          </button>
          <button
            onClick={handleDecidir}
            disabled={enviando}
            className="px-4 py-2 rounded text-sm bg-hospital-600 text-white hover:bg-hospital-700 disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditoriaPage;
