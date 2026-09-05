import { useNavigate } from 'react-router-dom';

// Botón de "Regresar" consistente para usar en TODAS las páginas.
// Por defecto usa el historial del navegador (navigate(-1)); si le
// pasas `to`, navega a esa ruta fija en su lugar (útil cuando el
// historial puede no tener a dónde volver, ej. al entrar por link directo).
function BotonRegresar({ to, label = '← Regresar' }: { to?: string; label?: string }): JSX.Element {
  const navigate = useNavigate();

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        if (to) {
          navigate(to);
        } else {
          navigate(-1);
        }
      }}
      style={{ fontSize: 13, fontWeight: 500, display: 'inline-block', marginBottom: 16 }}
    >
      {label}
    </a>
  );
}

export default BotonRegresar;
