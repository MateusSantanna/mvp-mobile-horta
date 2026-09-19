#!/usr/bin/env python3
"""
Gerador de dados da Horta Inteligente.

Cria leituras horárias simuladas de temperatura, umidade do solo e nível do
reservatório e grava em SQLite (dados/horta.db) e CSV (dados/leituras.csv).
O CSV abre direto no Excel, caso a equipe opte pela base em planilha.

Uso:
    python scripts/gerador_dados.py --dias 30
    python scripts/gerador_dados.py --dias 7 --excel   # também gera .xlsx (precisa de openpyxl)
"""

import argparse
import csv
import math
import random
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA_DADOS = RAIZ / "dados"
BANCO = PASTA_DADOS / "horta.db"
CSV = PASTA_DADOS / "leituras.csv"

ESQUEMA = """
CREATE TABLE IF NOT EXISTS usuario (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT NOT NULL,
    idade     INTEGER,
    endereco  TEXT
);

CREATE TABLE IF NOT EXISTS leitura (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hora     TEXT NOT NULL,          -- ISO 8601
    temperatura   REAL NOT NULL,          -- °C
    umidade       REAL NOT NULL,          -- % de umidade do solo
    reservatorio  REAL NOT NULL           -- % do volume do reservatório
);

CREATE INDEX IF NOT EXISTS idx_leitura_data ON leitura (data_hora);
"""


def temperatura_na_hora(hora: int) -> float:
    """Mínima por volta das 5h, máxima por volta das 15h."""
    return 24.5 + 6.5 * math.cos(((hora - 15) / 24) * 2 * math.pi) + random.uniform(-0.8, 0.8)


def gerar(dias: int):
    fim = datetime.now().replace(minute=0, second=0, microsecond=0)
    umidade, reservatorio = 62.0, 88.0
    leituras = []

    for i in range(dias * 24 - 1, -1, -1):
        momento = fim - timedelta(hours=i)
        temp = temperatura_na_hora(momento.hour)

        evaporacao = (temp - 15) * 0.13 * (1 if 7 <= momento.hour <= 18 else 0.35)
        umidade -= evaporacao + random.uniform(-0.4, 0.4)

        # irrigação automática quando o solo seca
        if umidade < 32 and reservatorio > 4:
            volume = min(30.0, reservatorio * 0.9)
            umidade += volume
            reservatorio -= volume * 0.42

        # reposição manual do reservatório quando o nível fica crítico
        if reservatorio < 8 and momento.hour == 8:
            reservatorio = 100.0

        umidade = max(8.0, min(95.0, umidade))
        reservatorio = max(0.0, min(100.0, reservatorio))

        leituras.append((
            momento.isoformat(timespec="minutes"),
            round(temp, 1),
            round(umidade, 1),
            round(reservatorio),
        ))

    return leituras


def salvar_sqlite(leituras):
    PASTA_DADOS.mkdir(exist_ok=True)
    conexao = sqlite3.connect(BANCO)
    conexao.executescript(ESQUEMA)
    conexao.execute("DELETE FROM leitura")
    conexao.executemany(
        "INSERT INTO leitura (data_hora, temperatura, umidade, reservatorio) VALUES (?, ?, ?, ?)",
        leituras,
    )
    conexao.commit()
    conexao.close()


def salvar_csv(leituras):
    PASTA_DADOS.mkdir(exist_ok=True)
    with CSV.open("w", newline="", encoding="utf-8-sig") as arquivo:
        escritor = csv.writer(arquivo, delimiter=";")
        escritor.writerow(["data", "hora", "temperatura_c", "umidade_pct", "reservatorio_pct"])
        for data_hora, temp, umid, res in leituras:
            momento = datetime.fromisoformat(data_hora)
            escritor.writerow([
                momento.strftime("%d/%m/%Y"),
                momento.strftime("%H:%M"),
                f"{temp:.1f}".replace(".", ","),
                f"{umid:.1f}".replace(".", ","),
                res,
            ])


def salvar_excel(leituras):
    try:
        from openpyxl import Workbook
    except ImportError:
        print("openpyxl não instalado — pulei o .xlsx (pip install openpyxl)")
        return
    planilha = Workbook()
    aba = planilha.active
    aba.title = "Leituras"
    aba.append(["Data", "Hora", "Temperatura (°C)", "Umidade (%)", "Reservatório (%)"])
    for data_hora, temp, umid, res in leituras:
        momento = datetime.fromisoformat(data_hora)
        aba.append([momento.date(), momento.strftime("%H:%M"), temp, umid, res])
    planilha.save(PASTA_DADOS / "leituras.xlsx")


def main():
    parser = argparse.ArgumentParser(description="Gera leituras simuladas da horta.")
    parser.add_argument("--dias", type=int, default=30, help="quantidade de dias de leituras horárias")
    parser.add_argument("--excel", action="store_true", help="também gerar arquivo .xlsx")
    parser.add_argument("--semente", type=int, help="semente aleatória para dados reproduzíveis")
    args = parser.parse_args()

    if args.semente is not None:
        random.seed(args.semente)

    leituras = gerar(args.dias)
    salvar_sqlite(leituras)
    salvar_csv(leituras)
    if args.excel:
        salvar_excel(leituras)

    print(f"{len(leituras)} leituras geradas")
    print(f"  SQLite: {BANCO}")
    print(f"  CSV:    {CSV}")


if __name__ == "__main__":
    main()
