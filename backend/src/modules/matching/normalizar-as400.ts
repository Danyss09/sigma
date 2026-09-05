/**
 * Normalizacion segura de codigos AS400: 13 digitos -> 10 digitos base.
 * Portado de normalizar_as400.py (Fase 1), misma regla verificada:
 * en el catalogo real, 176/176 codigos de 13 digitos observados
 * terminan en "001", y quitar ese sufijo da el codigo base de 10
 * digitos que coincide con ANEXOS en 68 casos confirmados.
 *
 * Esta funcion NO asume que la regla aplique a cualquier codigo nuevo
 * fuera del catalogo verificado -- solo normaliza el FORMATO (13->10),
 * la existencia real del codigo base se valida despues contra el
 * catalogo, nunca se autocompleta solo por el formato.
 */
export function normalizarCodigoAS400(codigoOriginal: string): string | null {
  const codigo = codigoOriginal.trim();
  if (!/^\d{13}$/.test(codigo)) {
    return null;
  }
  if (!codigo.endsWith('001')) {
    return null;
  }
  return codigo.slice(0, 10);
}
