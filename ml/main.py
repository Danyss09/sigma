from datetime import datetime, timezone
import json
from pertinencia_service import PayloadValidacionPertinencia, ResultadoValidacionPertinencia, validar_pertinencia
import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SIGMA ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    modelo = joblib.load("modelo_riesgo.pkl")
    with open("columnas_modelo.json") as f:
        COLUMNAS_FEATURES: list[str] = json.load(f)
    explainer = shap.TreeExplainer(modelo)
    MODELO_CARGADO = True
except FileNotFoundError:
    modelo = None
    COLUMNAS_FEATURES = []
    explainer = None
    MODELO_CARGADO = False


class DetalleParaPredecir(BaseModel):
    ratio_valor: float
    cantidad: float
    veces_repetido_beneficiario: int


class PrediccionRiesgo(BaseModel):
    score: float
    label: str
    shap_values: dict[str, float]
    base_value: float


def _score_a_nivel(score: float) -> str:
    if score < 0.25:
        return "BAJO"
    if score < 0.5:
        return "MEDIO"
    if score < 0.75:
        return "ALTO"
    return "CRITICO"


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": MODELO_CARGADO,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.post("/validar-pertinencia", response_model=ResultadoValidacionPertinencia)
async def validar_pertinencia_endpoint(payload: PayloadValidacionPertinencia):
       return validar_pertinencia(payload)

@app.post("/predecir-riesgo", response_model=PrediccionRiesgo)
def predecir_riesgo(detalle: DetalleParaPredecir) -> PrediccionRiesgo:
    if not MODELO_CARGADO:
        raise HTTPException(status_code=503, detail="Modelo no cargado. Corre entrenar_modelo.py primero.")

    X = pd.DataFrame(
        [[getattr(detalle, col) for col in COLUMNAS_FEATURES]],
        columns=COLUMNAS_FEATURES,
    )

    score = float(modelo.predict_proba(X)[0][1])

    raw_shap = explainer.shap_values(X)
    if isinstance(raw_shap, list):
        valores = raw_shap[1][0]
    else:
        raw_shap = np.array(raw_shap)
        valores = raw_shap[0, :, 1] if raw_shap.ndim == 3 else raw_shap[0]

    shap_dict = {col: float(v) for col, v in zip(COLUMNAS_FEATURES, valores)}

    # <-- NUEVO: Obtener el base_value manejando el formato (lista o valor único)
    if isinstance(explainer.expected_value, (list, np.ndarray)):
        base_value = float(explainer.expected_value[1])
    else:
        base_value = float(explainer.expected_value)

    return PrediccionRiesgo(
        score=round(score, 4), 
        label=_score_a_nivel(score), 
        shap_values=shap_dict,
        base_value=base_value
    )