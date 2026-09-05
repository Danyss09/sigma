export interface RespuestaPrediccionML {
  score: number; // 0.0 a 1.0
  label: string; // "BAJO" | "MEDIO" | "ALTO" | "CRITICO"
  shap_values: Record<string, number>;
}
