"""
Gera combinações de respostas de um formulário (fitness, trilhas, etc.).

Cada linha inclui objetive_ia (lista) e objetive_ia_by_question, copiados do JSON de perguntas.

Modos:
  - --all: gera o produto cartesiano de todas as opções (N1 x N2 x ... x Nk)
          e salva tudo em um arquivo para processamento posterior.
"""

from __future__ import annotations

import argparse
import itertools
import json
import sys
from pathlib import Path
from typing import Any, Iterable

try:
    from dotenv import load_dotenv

    load_dotenv()
except ModuleNotFoundError:
    pass

QUESTIONS_FILE = Path(__file__).resolve().parent / "questions_fitness.json"
DEFAULT_OUT_FILE = Path(__file__).resolve().parent / "question_fitness_combinations.json"


def load_questions(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))

    def sort_key(q: dict[str, Any]) -> tuple[int, str]:
        # O JSON pode vir com "order" (string/int) ou sem ordenação explícita.
        order_raw = q.get("order")
        try:
            order_int = int(order_raw) if order_raw is not None else 10**9
        except (TypeError, ValueError):
            order_int = 10**9
        # Mesma prioridade que fitness_test.html / kit-test.html: order numérico, depois texto da pergunta.
        return (order_int, str(q.get("question_text", "") or ""))

    return sorted(raw, key=sort_key)


def parse_options(options_json: str) -> list[str]:
    opts = json.loads(options_json)
    out: list[str] = []
    for o in opts:
        if isinstance(o, str):
            out.append(o.strip())
        elif isinstance(o, dict) and o.get("label") is not None:
            out.append(str(o["label"]).strip())
        else:
            out.append(str(o).strip())
    return out


def answers_pipe(selected: Iterable[str]) -> str:
    return "|".join(selected)


def all_combinations(questions: list[dict[str, Any]]) -> Iterable[tuple[str, ...]]:
    option_lists = [parse_options(q["options_json"]) for q in questions]
    return itertools.product(*option_lists)


def count_combinations(questions: list[dict[str, Any]]) -> int:
    total = 1
    for q in questions:
        total *= len(parse_options(q["options_json"]))
    return total


def build_combination_row(
    *,
    index: int,
    questions: list[dict[str, Any]],
    selected: tuple[str, ...],
) -> dict[str, Any]:
    form_id = str(questions[0].get("form_id", "")) if questions else ""
    answers_list = list(selected)

    question_texts = [str(q.get("question_text", f"q{i+1}")) for i, q in enumerate(questions)]
    objectives = [str(q.get("objetive_ia", "")) for q in questions]
    return {
        "index": index,
        "form_id": form_id,
        "objetive_ia": objectives,
        "answers": answers_list,
        "answers_pipe": answers_pipe(answers_list),
        "answers_by_question": {
            question_texts[i]: answers_list[i] for i in range(len(question_texts))
        },
        "objetive_ia_by_question": {
            question_texts[i]: objectives[i] for i in range(len(question_texts))
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gera e salva todas as combinações do formulário (objetive_ia por pergunta)."
    )
    parser.add_argument(
        "--questions",
        type=Path,
        default=QUESTIONS_FILE,
        help="JSON com as perguntas (default: questions_fitness.json ao lado do script).",
    )

    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--all",
        action="store_true",
        help="Gera TODAS as combinações possíveis (produto cartesiano).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Máximo de combinações a gerar (debug).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT_FILE,
        help="Arquivo de saída (default: question_fitness_combinations ao lado do script).",
    )
    args = parser.parse_args()

    if not args.questions.is_file():
        print(f"Arquivo não encontrado: {args.questions}", file=sys.stderr)
        return 1

    questions = load_questions(args.questions)
    if not args.all:
        print("Use --all para gerar as combinações.", file=sys.stderr)
        return 2

    total = count_combinations(questions)
    sizes = "x".join(str(len(parse_options(q["options_json"]))) for q in questions)
    planned = min(total, args.limit) if args.limit else total
    form_id = str(questions[0].get("form_id", "")) if questions else ""
    print(
        f"Form '{form_id}': {len(questions)} perguntas ({sizes}) "
        f"= {total} combinações. Gerando {planned}."
    )

    out_rows: list[dict[str, Any]] = []
    for i, combo in enumerate(all_combinations(questions), start=1):
        if args.limit and i > args.limit:
            break
        out_rows.append(
            build_combination_row(index=i, questions=questions, selected=combo)
        )

    args.out.write_text(
        json.dumps(out_rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Arquivo gerado: {args.out} ({len(out_rows)} combinações).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
