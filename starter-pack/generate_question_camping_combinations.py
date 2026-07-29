"""Gera question_camping_combinations.json (produto cartesiano das opções do formulário camping)."""
from __future__ import annotations

import json
from itertools import product
from pathlib import Path

ROOT = Path(__file__).resolve().parent

QUESTIONS = [
    "Qual seu nível de experiência?",
    "Como será sua experiência de camping?",
    "Para quantas pessoas é este kit?",
    "Em qual tipo de clima você pretende acampar?",
    "Quanto você quer investir para esta aventura?",
    "Para quem é este kit?",
]

OPTIONS = [
    ["Nunca acampei", "Já acampei algumas vezes", "Acampo com frequência"],
    [
        "Camping estruturado (com banheiro/infra)",
        "Camping mais isolado / natureza",
        "Trilha + camping (leveza importa)",
    ],
    ["Só eu", "2 pessoas", "3 ou mais pessoas"],
    ["Clima quente e seco", "Chuvoso / úmido", "Clima frio"],
    [
        "Quero começar pelo essencial, sem gastar muito",
        "Busco um equilíbrio entre custo e qualidade",
        "Quero investir nas melhores opções, focando em melhor conforto e performance",
    ],
    ["Mulher", "Homem"],
]

OBJ_BY_Q = {
    "Qual seu nível de experiência?": (
        "Definir a complexidade e tecnicidade dos produtos recomendados. "
        "Usuários iniciantes devem receber itens mais simples e fáceis de montar/utilizar."
    ),
    "Como será sua experiência de camping?": (
        "Identificar se o usuário prioriza conforto, contato com natureza ou mobilidade/peso. "
        "Camping estruturado pode priorizar conforto e espaço. Camping isolado pode priorizar "
        "autonomia e resistência. Trilha + camping deve priorizar leveza, compactação e portabilidade."
    ),
    "Para quantas pessoas é este kit?": (
        "Definir capacidade e dimensionamento dos produtos compartilháveis, principalmente barraca, "
        "colchão, utensílios e iluminação."
    ),
    "Em qual tipo de clima você pretende acampar?": (
        "Priorizar produtos adequados às condições climáticas, considerando ventilação, "
        "impermeabilidade e isolamento térmico."
    ),
    "Quanto você quer investir para esta aventura?": (
        "Ajustar a faixa de preço e nível de tecnologia das recomendações, sem comprometer a adequação "
        "do produto ao perfil de uso informado anteriormente. As respostas anteriores devem ter maior "
        "peso na recomendação do que o orçamento isoladamente."
    ),
    "Para quem é este kit?": "Priorizar vestuário mais adequado ao perfil selecionado.",
}

OBJ_LIST = [OBJ_BY_Q[q] for q in QUESTIONS]


def main() -> None:
    rows: list[dict] = []
    for idx, combo in enumerate(product(*OPTIONS), start=1):
        answers = list(combo)
        by_q = {QUESTIONS[i]: answers[i] for i in range(6)}
        rows.append(
            {
                "index": idx,
                "form_id": "camping",
                "objetive_ia": list(OBJ_LIST),
                "answers": answers,
                "answers_pipe": "|".join(answers),
                "answers_by_question": by_q,
                "objetive_ia_by_question": {q: OBJ_BY_Q[q] for q in QUESTIONS},
            }
        )
    out = ROOT / "question_camping_combinations.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Gerado: {out} ({len(rows)} combinações)")


if __name__ == "__main__":
    main()
