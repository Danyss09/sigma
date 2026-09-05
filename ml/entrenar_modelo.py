import json
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib

COLUMNAS_FEATURES = ["ratio_valor", "cantidad", "veces_repetido_beneficiario"]


def main():
    df = pd.read_csv("dataset_sintetico.csv")
    X = df[COLUMNAS_FEATURES]
    y = df["anomalo"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    modelo = RandomForestClassifier(
        n_estimators=100, max_depth=6, random_state=42, class_weight="balanced",
    )
    modelo.fit(X_train, y_train)

    y_pred = modelo.predict(X_test)
    y_proba = modelo.predict_proba(X_test)[:, 1]

    print("=== Reporte de clasificación ===")
    print(classification_report(y_test, y_pred, target_names=["normal", "anomalo"]))
    print(f"AUC-ROC: {roc_auc_score(y_test, y_proba):.4f}")

    print("\n=== Importancia de features ===")
    for nombre, imp in sorted(zip(COLUMNAS_FEATURES, modelo.feature_importances_), key=lambda x: -x[1]):
        print(f"  {nombre}: {imp:.4f}")

    joblib.dump(modelo, "modelo_riesgo.pkl")
    with open("columnas_modelo.json", "w") as f:
        json.dump(COLUMNAS_FEATURES, f)

    # Verificación con el caso real validado en la otra sesión:
    # código 99201, oficial $8.71 vs solicitado $45.00 -> ratio = 5.17
    caso_real = pd.DataFrame([{"ratio_valor": 45.00 / 8.71, "cantidad": 1, "veces_repetido_beneficiario": 1}])
    score_caso_real = modelo.predict_proba(caso_real[COLUMNAS_FEATURES])[0][1]
    print(f"\nCaso real de verificación (99201, ratio={45.00/8.71:.2f}): score={score_caso_real:.4f}")
    print("(en la otra sesión dio CRITICO 94.7% — compara si tu modelo da algo similar)")


if __name__ == "__main__":
    main()
