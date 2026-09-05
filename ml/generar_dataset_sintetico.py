"""
Dataset sintético para el modelo de riesgo, con las 3 features exactas
que ya quedaron definidas en el contrato con NestJS:
  - ratio_valor: valor_solicitado / valor_oficial (1.0 = coincide exacto)
  - cantidad: unidades solicitadas
  - veces_repetido_beneficiario: cuántas veces aparece este código para
    el mismo beneficiario (posible doble cobro)
"""
import numpy as np
import pandas as pd

np.random.seed(42)

N_NORMALES = 800
N_ANOMALOS = 100


def generar_normales(n: int) -> pd.DataFrame:
    return pd.DataFrame({
        "ratio_valor": np.random.normal(loc=1.0, scale=0.05, size=n).clip(0.85, 1.15),
        "cantidad": np.random.poisson(lam=2, size=n).clip(1, 10),
        "veces_repetido_beneficiario": np.random.poisson(lam=1, size=n).clip(1, 3),
        "anomalo": 0,
    })


def generar_anomalos(n: int) -> pd.DataFrame:
    partes = []

    # Tipo 1: sobrefacturación (caso real validado: 99201, $45 vs $8.71 = ratio 5.17)
    n1 = n // 3
    partes.append(pd.DataFrame({
        "ratio_valor": np.random.uniform(2.0, 8.0, size=n1),
        "cantidad": np.random.poisson(lam=2, size=n1).clip(1, 10),
        "veces_repetido_beneficiario": np.random.poisson(lam=1, size=n1).clip(1, 3),
    }))

    # Tipo 2: cantidad desproporcionada
    n2 = n // 3
    partes.append(pd.DataFrame({
        "ratio_valor": np.random.normal(loc=1.0, scale=0.05, size=n2).clip(0.85, 1.15),
        "cantidad": np.random.randint(20, 100, size=n2),
        "veces_repetido_beneficiario": np.random.poisson(lam=1, size=n2).clip(1, 3),
    }))

    # Tipo 3: código repetido muchas veces para el mismo beneficiario (doble cobro)
    n3 = n - n1 - n2
    partes.append(pd.DataFrame({
        "ratio_valor": np.random.normal(loc=1.0, scale=0.1, size=n3).clip(0.8, 1.3),
        "cantidad": np.random.poisson(lam=2, size=n3).clip(1, 10),
        "veces_repetido_beneficiario": np.random.randint(8, 20, size=n3),
    }))

    df = pd.concat(partes, ignore_index=True)
    df["anomalo"] = 1
    return df


def main():
    df = pd.concat([generar_normales(N_NORMALES), generar_anomalos(N_ANOMALOS)], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    df.to_csv("dataset_sintetico.csv", index=False)
    print(f"Dataset generado: {len(df)} filas")
    print(df.groupby("anomalo").mean(numeric_only=True))


if __name__ == "__main__":
    main()
