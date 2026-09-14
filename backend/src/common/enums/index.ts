export enum UserRole {
  DIGITADOR = 'DIGITADOR',
  ADMIN = 'ADMIN',
  AUDITOR = 'AUDITOR',
}

export enum PlanillaEstado {
  SUBIDA = 'SUBIDA',
  PROCESANDO = 'PROCESANDO',
  COMPLETADA = 'COMPLETADA',
  ERROR = 'ERROR',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  UPLOAD = 'UPLOAD',
  PROCESS = 'PROCESS',
  DELETE = 'DELETE',
  DOWNLOAD = 'DOWNLOAD',
  AUDITAR = 'AUDITAR',
  FACTURAR = 'FACTURAR',
  DERECHO_OLVIDO = 'DERECHO_OLVIDO',

}

export enum EstadoFila {
  PENDIENTE = 'PENDIENTE',
  AUDITADO = 'AUDITADO',
  RECHAZADO = 'RECHAZADO',
  FACTURADO = 'FACTURADO',
}

export enum DecisionAuditoria {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  PARCIAL = 'PARCIAL',
}

export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  ANULADO = 'ANULADO',
}

export enum NivelRiesgo {
  BAJO = 'BAJO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  CRITICO = 'CRITICO',
}

export enum TipoItem {
  TPSNS = 'TPSNS',
  MEDICAMENTO = 'MEDICAMENTO',
}

export enum TipoMedicamentoInsumo {
  MEDICAMENTO = 'MEDICAMENTO',
  INSUMO = 'INSUMO',
}
export enum TipoResultado {
  INDIVIDUAL = 'INDIVIDUAL',
  CONSOLIDADA = 'CONSOLIDADA',
}

export enum FormatoArchivo {
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export enum TipoPlantilla {
  INDIVIDUAL = 'INDIVIDUAL',
  CONSOLIDADA = 'CONSOLIDADA',
}

