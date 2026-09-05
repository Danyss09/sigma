import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import {
  generarIndividuales,
  generarConsolidadas,
  listarResultados,
  ResultadoPlanilla,
} from '../api/reportesApi';

// ESTADOS SEPARADOS A PROPÓSITO (bug corregido: antes "no generado" y
// "error real" compartían el mismo estado `error`, así que un mensaje
// viejo podía quedar visible después de una generación exitosa):
//
//   estado === 'cargando'    -> spinner
//   estado === 'no_generado' -> mensaje informativo (nunca un "error")
//   estado === 'error'       -> algo realmente falló
//   estado === 'listo'       -> PDF visible, los otros 3 mensajes NO se muestran
type EstadoVisor = 'cargando' | 'no_generado' | 'error' | 'listo';

function VisorDocumentoPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const planillaId = Number(searchParams.get('planillaId'));
  const tipo = (searchParams.get('tipo') ?? 'individual') as 'individual' | 'consolidada';
  const servicio = searchParams.get('servicio') ?? undefined;
  const tramite = searchParams.get('tramite') ?? undefined;

  const [estado, setEstado] = useState<EstadoVisor>('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');

  function buscarCandidato(resultados: ResultadoPlanilla[]): ResultadoPlanilla | undefined {
    return resultados.find(
      (r) =>
        r.formato === 'pdf' &&
        (tipo === 'individual' ? r.tipo === 'INDIVIDUAL' : r.tipo === 'CONSOLIDADA') &&
        (!tramite || r.tramite === tramite) &&
        (!servicio || r.servicio === servicio),
    );
  }

  async function cargarPdf(candidato: ResultadoPlanilla): Promise<void> {
    const response = await axiosClient.get(`/planillas/resultados/${candidato.id}/descargar`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    setPdfUrl(url);
    setNombreArchivo(candidato.nombreArchivo);
    // Al llegar aquí, el documento SÍ existe: pase lo que pase antes,
    // el estado pasa a 'listo' y con eso 'no_generado'/'error' dejan
    // de renderizarse (son mutuamente excluyentes por diseño).
    setEstado('listo');
  }

  async function cargar(intentarGenerar: boolean): Promise<void> {
    setEstado('cargando');
    setMensajeError('');
    try {
      const resultados = await listarResultados(planillaId);
      const candidato = buscarCandidato(resultados);

      if (candidato) {
        await cargarPdf(candidato);
        return;
      }

      if (!intentarGenerar) {
        // No existe y no se pidió generar -- esto es informativo, NO un error.
        setEstado('no_generado');
        return;
      }

      setEstado('no_generado'); // mientras genera, seguimos mostrando "no generado", no un error
    } catch (err: any) {
      setEstado('error');
      setMensajeError(err?.response?.data?.message ?? err?.message ?? 'Error al consultar el documento');
    }
  }

  async function handleGenerar(): Promise<void> {
    setEstado('cargando');
    setMensajeError('');
    try {
      if (tipo === 'individual') {
        await generarIndividuales(planillaId, servicio ? [servicio] : undefined);
      } else {
        await generarConsolidadas(planillaId, servicio ? [servicio] : undefined);
      }
      const resultados = await listarResultados(planillaId);
      const candidato = buscarCandidato(resultados);
      if (!candidato) {
        throw new Error('El documento se generó pero no se encontró en la lista de resultados.');
      }
      await cargarPdf(candidato); // esto deja estado='listo' y limpia cualquier error previo
    } catch (err: any) {
      setEstado('error');
      setMensajeError(err?.response?.data?.message ?? err?.message ?? 'Error al generar el documento');
    }
  }

  async function handleRegenerar(): Promise<void> {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    await handleGenerar();
  }

  useEffect(() => {
    cargar(false);
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planillaId, tipo, servicio, tramite]);

  return (
    <div>
      <Link to={`/revisar-riesgo/${planillaId}`} style={{ fontSize: 13 }}>← Volver a revisión de riesgo</Link>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {tipo === 'individual' ? 'Planilla individual' : 'Planilla consolidada'}
          {nombreArchivo && estado === 'listo' && (
            <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>{nombreArchivo}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {estado === 'listo' && (
            <button onClick={handleRegenerar} className="btn-secondary" style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
              Regenerar
            </button>
          )}
          {pdfUrl && estado === 'listo' && (
            <a href={pdfUrl} download={nombreArchivo} className="btn-primary" style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, display: 'inline-block' }}>
              Descargar PDF
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {estado === 'cargando' && <div style={{ color: 'var(--text-faint)', paddingTop: 60 }}>Cargando...</div>}

        {estado === 'no_generado' && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              Este documento todavía no ha sido generado.
            </p>
            <button onClick={handleGenerar} className="btn-primary" style={{ padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
              Generar {tipo === 'individual' ? 'planilla individual' : 'planilla consolidada'}
            </button>
          </div>
        )}

        {estado === 'error' && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <p style={{ color: 'var(--risk-critico)', marginBottom: 16 }}>{mensajeError}</p>
            <button onClick={handleGenerar} className="btn-secondary" style={{ padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}>
              Reintentar
            </button>
          </div>
        )}

        {estado === 'listo' && pdfUrl && (
          <iframe title="Documento" src={pdfUrl} style={{ width: '100%', maxWidth: 900, height: '80vh', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />
        )}
      </div>
    </div>
  );
}

export default VisorDocumentoPage;
