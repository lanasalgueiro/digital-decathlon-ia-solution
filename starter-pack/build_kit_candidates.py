from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parent
CANDIDATES_DIR = ROOT / "candidates"
PRODUCTS_CSV = ROOT / "products.csv"
COMBINATIONS_JSON = ROOT / "question_fitness_combinations.json"
OUT_JSON = CANDIDATES_DIR / "fitness_kit_candidates.json"
TRILHAS_COMBINATIONS_JSON = ROOT / "question_trilhas_combinations.json"
TRILHAS_OUT_JSON = CANDIDATES_DIR / "trilhas_kit_candidates.json"
CAMPING_COMBINATIONS_JSON = ROOT / "question_camping_combinations.json"
CAMPING_OUT_JSON = CANDIDATES_DIR / "camping_kit_candidates.json"
CORRIDA_COMBINATIONS_JSON = ROOT / "question_corrida_combinations.json"
CORRIDA_OUT_JSON = CANDIDATES_DIR / "corrida_kit_candidates.json"
QUESTIONS_FITNESS = ROOT / "questions_fitness.json"
QUESTIONS_TRILHAS = ROOT / "questions_trilhas.json"
QUESTIONS_CAMPING = ROOT / "questions_camping.json"
QUESTIONS_CORRIDA = ROOT / "questions_corrida.json"

# Regras de kit na saída (alinhado aos HTMLs kit-test / fitness_test)
KIT_MIN_SCORE = 0  # score mínimo inclusivo (>=); 0 = sem piso (antes 20)
KIT_MAIN_TOP = 1
KIT_ADDON_TOP = 6


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip().lower()


def map_budget_answer(raw: str) -> str:
    bud = _norm(raw)
    if "essencial" in bud or "sem gastar" in bud:
        return "budget"
    if "equilíbrio" in bud or "equilibrio" in bud:
        return "balanced"
    if "investir" in bud or "melhores" in bud:
        return "premium"
    return "unknown"


def parse_price(raw: str) -> float | None:
    s = (raw or "").strip().strip('"')
    if not s:
        return None
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        v = float(s)
    except ValueError:
        return None
    return v if v > 0 else None


def _text_blob(p: dict[str, str]) -> str:
    return " ".join(
        _norm(x)
        for x in (
            p.get("nome do produto", ""),
            p.get("descrição", ""),
            p.get("infotecnica", ""),
            p.get("beneficios", ""),
            p.get("categoria", ""),
            p.get("Esporte", ""),
            p.get("Marca", ""),
        )
        if x
    )


@dataclass(frozen=True)
class Context:
    sport: str
    training: str
    goal: str
    space: str
    frequency: str
    budget: str

    @property
    def key(self) -> str:
        return "|".join(
            [
                f"sport={self.sport}",
                f"training={self.training}",
                f"goal={self.goal}",
                f"space={self.space}",
                f"freq={self.frequency}",
                f"budget={self.budget}",
            ]
        )


def parse_context(row: dict[str, Any]) -> Context:
    by_q: dict[str, str] = row.get("answers_by_question", {}) or {}

    space_raw = by_q.get("Quanto espaço você tem disponível para treinar?", "")
    freq_raw = by_q.get("Com que frequência você pretende treinar?", "")
    goal_raw = by_q.get("Qual seu principal objetivo?", "")
    training_raw = by_q.get("Qual tipo de treino você pretende fazer com mais frequência?", "")

    def map_space(v: str) -> str:
        v = _norm(v)
        if "pouco" in v:
            return "small"
        if "moderado" in v:
            return "medium"
        if "bastante" in v:
            return "large"
        return "unknown"

    def map_freq(v: str) -> str:
        v = _norm(v)
        if v.startswith("1"):
            return "1_2"
        if v.startswith("3"):
            return "3_4"
        if "5" in v:
            return "5_plus"
        return "unknown"

    def map_goal(v: str) -> str:
        v = _norm(v)
        if "massa" in v:
            return "hypertrophy"
        if "emagrecer" in v or "condicionamento" in v:
            return "weight_loss"
        if "bem-estar" in v or "saúde" in v:
            return "wellness"
        if "mobilidade" in v or "along" in v:
            return "mobility"
        if "performance" in v or "intenso" in v:
            return "performance"
        return "unknown"

    def map_training(v: str) -> str:
        v = _norm(v)
        if "muscula" in v:
            return "strength"
        if "hiit" in v or "funcional" in v:
            return "hiit"
        if "cardio" in v:
            return "cardio"
        if "yoga" in v or "along" in v:
            return "yoga"
        if "tudo" in v:
            return "mixed"
        return "unknown"

    return Context(
        sport="fitness",
        training=map_training(training_raw),
        goal=map_goal(goal_raw),
        space=map_space(space_raw),
        frequency=map_freq(freq_raw),
        budget=map_budget_answer(
            by_q.get("Quanto você quer investir para esta aventura?", "")
        ),
    )


@dataclass(frozen=True)
class TrilhasContext:
    """Contexto derivado das respostas (alinhado aos objetive_ia em questions_trilhas.json)."""

    sport: str
    level: str
    duration: str
    terrain: str
    climate: str
    budget: str
    gender: str

    @property
    def key(self) -> str:
        return "|".join(
            [
                f"sport={self.sport}",
                f"level={self.level}",
                f"duration={self.duration}",
                f"terrain={self.terrain}",
                f"climate={self.climate}",
                f"budget={self.budget}",
                f"gender={self.gender}",
            ]
        )


def parse_trilhas_context(row: dict[str, Any]) -> TrilhasContext:
    by_q: dict[str, str] = row.get("answers_by_question", {}) or {}

    lev = _norm(by_q.get("Qual seu nível de experiência em trilhas?", ""))
    if "iniciante" in lev:
        level = "beginner"
    elif "intermediário" in lev or "intermediario" in lev:
        level = "intermediate"
    elif "avançado" in lev or "avancado" in lev:
        level = "advanced"
    else:
        level = "unknown"

    dur = _norm(by_q.get("Quanto tempo dura a trilha que você pretende fazer?", ""))
    if "meio dia" in dur:
        duration = "half_day"
    elif "um dia inteiro" in dur or "dia inteiro" in dur:
        duration = "full_day"
    elif "mais de um dia" in dur:
        duration = "multi_day"
    else:
        duration = "unknown"

    ter = _norm(by_q.get("Qual o tipo de terreno?", ""))
    if ter.startswith("leve") or "parques" in ter:
        terrain = "easy"
    elif "moderado" in ter:
        terrain = "moderate"
    elif "difícil" in ter or "dificil" in ter or "pedras" in ter:
        terrain = "hard"
    else:
        terrain = "unknown"

    cli = _norm(by_q.get("Qual tipo de clima que você fará a trilha?", ""))
    if "quente" in cli:
        climate = "hot"
    elif "chuvoso" in cli or "úmido" in cli or "umido" in cli:
        climate = "wet"
    elif "frio" in cli:
        climate = "cold"
    else:
        climate = "unknown"

    bud = map_budget_answer(by_q.get("Quanto você quer investir para esta aventura?", ""))

    gen = _norm(by_q.get("Para quem é este kit?", ""))
    if "mulher" in gen:
        gender = "woman"
    elif "homem" in gen:
        gender = "man"
    else:
        gender = "unknown"

    return TrilhasContext(
        sport="trilhas",
        level=level,
        duration=duration,
        terrain=terrain,
        climate=climate,
        budget=bud,
        gender=gender,
    )


def load_trilhas_contexts(path: Path) -> list[TrilhasContext]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    seen: set[str] = set()
    out: list[TrilhasContext] = []
    for row in raw:
        ctx = parse_trilhas_context(row)
        if ctx.key not in seen:
            seen.add(ctx.key)
            out.append(ctx)
    return out


@dataclass(frozen=True)
class CampingContext:
    """Contexto derivado das respostas (alinhado a questions_camping.json)."""

    sport: str
    level: str
    venue: str
    party: str
    climate: str
    budget: str
    gender: str

    @property
    def key(self) -> str:
        return "|".join(
            [
                f"sport={self.sport}",
                f"level={self.level}",
                f"venue={self.venue}",
                f"party={self.party}",
                f"climate={self.climate}",
                f"budget={self.budget}",
                f"gender={self.gender}",
            ]
        )


def parse_camping_context(row: dict[str, Any]) -> CampingContext:
    by_q: dict[str, str] = row.get("answers_by_question", {}) or {}

    lev = _norm(by_q.get("Qual seu nível de experiência?", ""))
    if "nunca" in lev:
        level = "beginner"
    elif "algumas vezes" in lev:
        level = "intermediate"
    elif "frequência" in lev or "frequencia" in lev:
        level = "advanced"
    else:
        level = "unknown"

    ven = _norm(by_q.get("Como será sua experiência de camping?", ""))
    if "estruturado" in ven or "banheiro" in ven or "infra" in ven:
        venue = "structured"
    elif "trilha" in ven and "camping" in ven:
        venue = "hike_camp"
    elif "isolado" in ven or "natureza" in ven:
        venue = "remote"
    else:
        venue = "unknown"

    party_raw = _norm(by_q.get("Para quantas pessoas é este kit?", ""))
    if "só eu" in party_raw or party_raw.startswith("só ") or party_raw == "so eu":
        party = "solo"
    elif party_raw.startswith("2"):
        party = "two"
    elif "3 ou mais" in party_raw or party_raw.startswith("3"):
        party = "three_plus"
    else:
        party = "unknown"

    cli = _norm(by_q.get("Em qual tipo de clima você pretende acampar?", ""))
    if "quente" in cli:
        climate = "hot"
    elif "chuvoso" in cli or "úmido" in cli or "umido" in cli:
        climate = "wet"
    elif "frio" in cli:
        climate = "cold"
    else:
        climate = "unknown"

    bud = map_budget_answer(by_q.get("Quanto você quer investir para esta aventura?", ""))

    gen = _norm(by_q.get("Para quem é este kit?", ""))
    if "mulher" in gen:
        gender = "woman"
    elif "homem" in gen:
        gender = "man"
    else:
        gender = "unknown"

    return CampingContext(
        sport="camping",
        level=level,
        venue=venue,
        party=party,
        climate=climate,
        budget=bud,
        gender=gender,
    )


def load_camping_contexts(path: Path) -> list[CampingContext]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    seen: set[str] = set()
    out: list[CampingContext] = []
    for row in raw:
        ctx = parse_camping_context(row)
        if ctx.key not in seen:
            seen.add(ctx.key)
            out.append(ctx)
    return out


@dataclass(frozen=True)
class CorridaContext:
    """Contexto derivado das respostas (alinhado a questions_corrida.json)."""

    sport: str
    usage: str
    distance: str
    priority: str
    budget: str
    gender: str

    @property
    def key(self) -> str:
        return "|".join(
            [
                f"sport={self.sport}",
                f"usage={self.usage}",
                f"distance={self.distance}",
                f"priority={self.priority}",
                f"budget={self.budget}",
                f"gender={self.gender}",
            ]
        )


def parse_corrida_context(row: dict[str, Any]) -> CorridaContext:
    by_q: dict[str, str] = row.get("answers_by_question", {}) or {}

    use = _norm(by_q.get("Como você pretende usar o tênis?", ""))
    if "caminhada" in use or "academia" in use:
        usage = "casual"
    elif "ocasion" in use:
        usage = "occasional"
    elif "frequent" in use:
        usage = "frequent"
    elif "longa" in use or "prova" in use:
        usage = "long_race"
    else:
        usage = "unknown"

    dist = _norm(by_q.get("Qual distância você costuma correr?", ""))
    if dist.startswith("até 5") or dist.startswith("ate 5"):
        distance = "up_to_5km"
    elif "5 km e 10" in dist or "5km e 10" in dist:
        distance = "5_to_10km"
    elif "mais de 10" in dist:
        distance = "over_10km"
    else:
        distance = "unknown"

    pri = _norm(by_q.get("O que é mais importante para você no tênis?", ""))
    if "conforto" in pri and "amortecimento" in pri:
        priority = "comfort"
    elif "equilíbrio" in pri or "equilibrio" in pri:
        priority = "balanced"
    elif "leveza" in pri or "velocidade" in pri:
        priority = "speed"
    else:
        priority = "unknown"

    bud = map_budget_answer(by_q.get("Quanto você quer investir?", ""))

    gen = _norm(by_q.get("Para quem é este kit?", ""))
    if "mulher" in gen:
        gender = "woman"
    elif "homem" in gen:
        gender = "man"
    else:
        gender = "unknown"

    return CorridaContext(
        sport="corrida",
        usage=usage,
        distance=distance,
        priority=priority,
        budget=bud,
        gender=gender,
    )


def load_corrida_contexts(path: Path) -> list[CorridaContext]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    seen: set[str] = set()
    out: list[CorridaContext] = []
    for row in raw:
        ctx = parse_corrida_context(row)
        if ctx.key not in seen:
            seen.add(ctx.key)
            out.append(ctx)
    return out


def load_contexts(path: Path) -> list[Context]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    seen: set[str] = set()
    out: list[Context] = []
    for row in raw:
        ctx = parse_context(row)
        if ctx.key not in seen:
            seen.add(ctx.key)
            out.append(ctx)
    return out


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_js(path: Path, data: Any) -> None:
    """Versão publicável na VTEX (arquivos .js em vez de .json)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    path.write_text(f"window.kit_candidates = [{payload}];", encoding="utf-8")


def _write_candidates(path: Path, data: Any) -> None:
    _write_json(path, data)
    _write_js(path.with_suffix(".js"), data)


def load_products(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [{k: (v or "").strip() for k, v in row.items()} for row in reader]


def sport_match(p: dict[str, str], sport: str) -> bool:
    blob = _text_blob(p)
    if sport == "fitness":
        return "fitness" in blob
    if sport == "trilhas":
        esp = _norm(p.get("Esporte", ""))
        cat = _norm(p.get("categoria", ""))
        nome = _norm(p.get("nome do produto", ""))
        if "trilha" in esp or "trekking" in esp or "trail" in esp:
            return True
        if "trilha" in cat or "trekking" in cat:
            return True
        if "trilha" in nome or "trekking" in nome or "mochilão" in nome or "mochilao" in nome:
            return True
        return False
    if sport == "camping":
        esp = _norm(p.get("Esporte", ""))
        cat = _norm(p.get("categoria", ""))
        nome = _norm(p.get("nome do produto", ""))
        blob = _text_blob(p)
        if "camping" in esp:
            return True
        if _has_any(cat, ["camping", "acampamento", "campismo"]):
            return True
        if _has_any(nome, ["camping", "acampamento", "campismo", "barraca ", "tenda ", " tente "]):
            return True
        if _is_trilha_barraca_tent(nome=nome, blob=blob):
            return True
        if _has_any(
            blob,
            [
                " campista",
                " acampamento",
                " campismo",
                " para camping",
                "fogareiro",
                "cartucho de gás",
                "cartucho de gas",
                "lampião",
                "lampiao",
                "cooler",
                "isopor térmico",
                "isopor termico",
                "mesa de camping",
                "cadeira de camping",
                "saco-cama",
                "saco de dormir",
                "colchão inflável",
                "colchao inflavel",
            ],
        ):
            return True
        return False
    if sport == "corrida":
        return _norm(p.get("Esporte", "")) == "corrida"
    return False


def _has_any(blob: str, terms: Iterable[str]) -> bool:
    return any(t in blob for t in terms)


def max_dimension_cm_from_text(raw: str) -> float | None:
    """
    Extrai a maior medida em cm citada no texto (prioriza infotécnica).
    Remove trechos em mm para não confundir espessura (ex.: tapete 8 mm) com comprimento.
    """
    if not raw:
        return None
    t = _norm(raw).replace(",", ".")
    t = re.sub(r"\d+(?:\.\d+)?\s*mm\b", " ", t)

    vals: list[float] = []
    # Metros (ex.: barra "2,00 m", "1,35 m")
    for m in re.finditer(r"(\d{1,2}(?:\.\d+)?)\s*m\b", t):
        v = float(m.group(1))
        if 0.25 <= v <= 4.0:
            vals.append(v * 100.0)
    # L x A x P em cm
    for m in re.finditer(
        r"(\d{1,3}(?:\.\d+)?)\s*x\s*(\d{1,3}(?:\.\d+)?)\s*x\s*(\d{1,3}(?:\.\d+)?)\s*cm\b",
        t,
    ):
        vals.extend(float(m.group(i)) for i in range(1, 4))
    # L x A em cm
    for m in re.finditer(
        r"(\d{1,3}(?:\.\d+)?)\s*x\s*(\d{1,3}(?:\.\d+)?)\s*cm\b",
        t,
    ):
        vals.extend([float(m.group(1)), float(m.group(2))])
    # Número isolado + cm (diâmetro, comprimento, etc.)
    for m in re.finditer(r"(\d{1,3}(?:\.\d+)?)\s*cm\b", t):
        vals.append(float(m.group(1)))

    vals = [v for v in vals if 3.0 <= v <= 420.0]
    return max(vals) if vals else None


def footprint_tier(*, blob: str, tags: set[str], infotecnica: str) -> str:
    """
    compact  → cabe bem em pouco espaço (acessórios, tapete, elásticos, etc.)
    medium   → volumoso moderado
    large    → estação / cardio / grandes dimensões
    unknown  → sem sinal claro
    """
    tech = _norm(infotecnica)
    measure_blob = f"{tech} {_norm(blob)}"

    # Equipamentos volumosos por tipo (mesmo sem medidas no CSV)
    if "cardio_machine" in tags:
        return "large"
    if _has_any(
        measure_blob,
        [
            "cama elástica",
            "trampolim",
            "estação de musculação",
            "estacao de musculacao",
            "power tower",
            "multigym",
            "multi gym",
            "smith machine",
            "rack musculação",
            "rack musculacao",
        ],
    ):
        return "large"

    # Tapete: ocupa chão, mas é “pouco espaço” friendly (enrolável / fino)
    if "mat" in tags and "cardio_machine" not in tags:
        return "compact"

    # Acessórios leves (não barras longas)
    if (
        ("band" in tags or "jump_rope" in tags or "chalk" in tags)
        and "barbell" not in tags
        and "dumbbell" not in tags
        and "kettlebell" not in tags
    ):
        return "compact"
    if "grip_support" in tags or "yoga_block" in tags or "strap" in tags:
        if "barbell" not in tags and "dumbbell" not in tags:
            return "compact"

    max_cm = max_dimension_cm_from_text(measure_blob)
    if max_cm is None:
        if "barbell" in tags:
            return "medium"
        if "dumbbell" in tags or "kettlebell" in tags:
            return "medium"
        return "unknown"

    # Barra / conjunto longo
    if "barbell" in tags and max_cm >= 120:
        return "large"
    if max_cm >= 155:
        return "large"
    if max_cm <= 85:
        return "compact"
    return "medium"


def enrich_footprint_tags(*, blob: str, tags: set[str], infotecnica: str) -> None:
    tier = footprint_tier(blob=blob, tags=tags, infotecnica=infotecnica)
    tags.add(
        {
            "compact": "footprint_compact",
            "medium": "footprint_medium",
            "large": "footprint_large",
            "unknown": "footprint_unknown",
        }[tier]
    )


def tag_product(p: dict[str, str]) -> set[str]:
    blob = _text_blob(p)
    tags: set[str] = set()

    # Yoga / mobilidade
    if _has_any(blob, ["tapete", "mat", "colchonete"]):
        tags.add("mat")
    if _has_any(blob, ["bloco", "block"]):
        tags.add("yoga_block")
    # Alça de tapete / acessório yoga — não use "faixa" solto (pega elástico).
    if ("strap" in blob and "wrist" not in blob) or (
        "alça" in blob and _has_any(blob, ["tapete", "mat", "yoga", "pilates"])
    ):
        tags.add("strap")
    if _has_any(blob, ["rolo", "foam roller", "massagem"]):
        tags.add("recovery")

    # Força / funcional
    # Expander/faixa costuma mencionar “carga” e não deve virar halter.
    if "expander" not in blob and _has_any(blob, ["halter", "dumbbell"]):
        tags.add("dumbbell")
    if _has_any(blob, ["kettlebell"]):
        tags.add("kettlebell")
    if _has_any(blob, ["anilha", "barra", "bench", "banco", "supino"]):
        tags.add("barbell")
    # "resistência" sozinho aparece em muitos textos (ex: luva resistente),
    # então só marcamos band com termos explícitos.
    # Evite "band" solto (pega wristband etc.). "expander" cobre faixas de resistência.
    if _has_any(
        blob,
        [
            "elástico",
            "faixa elástica",
            "mini band",
            "theraband",
            "expander",
            "super band",
            "power band",
        ],
    ):
        tags.add("band")
    if _has_any(blob, ["corda", "pular"]):
        tags.add("jump_rope")
    # Não use "strap" aqui — confunde com alça de tapete; luva/munhequeira bastam.
    if _has_any(blob, ["luva", "luvas", "munhequeira", "handgrip", "hand grip"]):
        tags.add("grip_support")
    if _has_any(blob, ["magnésio"]):
        tags.add("chalk")

    # Cardio “grande” (pode existir no CSV)
    if _has_any(blob, ["esteira", "bicicleta ergométrica", "spinning", "elíptico", "remo"]):
        tags.add("cardio_machine")

    # Roupas normalmente não são kit “equipamento”
    if _has_any(blob, ["roupas", "camiseta", "shorts", "legging", "top", "jaqueta", "boné"]):
        tags.add("apparel")

    enrich_footprint_tags(blob=blob, tags=tags, infotecnica=p.get("infotecnica", ""))

    return tags


def _is_trilha_barraca_tent(*, nome: str, blob: str) -> bool:
    """Barraca/tenda de dormir; exclui acessórios (estacas, varetas), gazebo, lona, toldo e chão."""
    n = _norm(nome)
    if not n:
        return False
    b = blob
    if "gazebo" in n or "gazebo" in b:
        return False
    # Lonas, toldos e chãos não são barraca (ex.: "Lona para Barraca", "Lona de Chão para Barraca").
    if n.startswith("lona") or n.startswith("toldo"):
        return False
    if n.startswith("chão estanque") or n.startswith("chao estanque"):
        return False
    if n.startswith("chão de tenda") or n.startswith("chao de tenda"):
        return False
    if any(
        sub in n
        for sub in (
            "estaca ",
            "estacas ",
            "varetas ",
            "vareta ",
            "elástico para",
            "elastico para",
            "chão de tenda",
            "chao de tenda",
            " válvula",
            " valvula",
            "cabos de ",
            "martelo ",
            "reparo para",
            "saco de estacas",
        )
    ):
        return False
    if n.startswith("barraca ") or n.startswith("tenda "):
        return True
    if " tente de " in f" {n} ":
        return True
    if "barraca de camping" in n or "barraca para camping" in n:
        return True
    if "tenda de camp" in n:
        return True
    if "barraca " in n and _has_any(b, ["2 seconds", "pessoas", "lugares"]):
        return True
    return False


def tag_trilha_product(p: dict[str, str]) -> set[str]:
    """Tags heurísticas para pontuação alinhada aos objetive_ia do formulário trilhas."""
    blob = _text_blob(p)
    tags: set[str] = set()
    nome = _norm(p.get("nome do produto", ""))
    b = blob

    if (
        "mochila" in nome
        or "mochilão" in nome
        or "mochilao" in nome
        or "mochileiro" in b
        or "backpack" in b
        or re.search(r"\bmochilas?\b.{0,120}\d{1,3}\s*(?:l\b|litros?\b)", b)
    ):
        tags.add("backpack")
    for m in re.finditer(r"(\d+)\s*(?:l|litros?)\b", b.replace("í", "i")):
        try:
            liters = int(m.group(1))
        except ValueError:
            continue
        if liters >= 28:
            tags.add("backpack_large")
        elif liters >= 12:
            tags.add("backpack_medium")

    if ("bota" in nome or "botas" in nome or "botina" in nome) and _has_any(
        b,
        [
            "trilha",
            "trekking",
            "neve",
            "montanh",
            "montanha",
            "imperme",
            "caminhada",
            "caminhar",
            "aquecimento",
            "snow",
        ],
    ):
        tags.add("boots")
    if ("tênis" in nome or "tenis" in nome) and _has_any(b, ["trilha", "trail", "terreno", "montanh"]):
        tags.add("trail_shoes")

    if _has_any(
        b,
        [
            "impermeável",
            "impermeavel",
            "à prova d",
            "a prova d",
            "hidrorrepelente",
            "hidorrepelente",
            "corta vento",
            "corta-vento",
            "prova de vento",
        ],
    ):
        tags.add("weather_shell")

    if _has_any(
        b,
        [
            "fleece",
            "polar",
            "puffer",
            "plumas",
            " neve",
            " térmic",
            " isolante",
            "x-warm",
            "x warm",
            "warm ",
            "aquecimento",
        ],
    ):
        tags.add("warm_layers")

    if _has_any(b, ["respirável", "respiravel", "secagem rápida", "eliminação da transpiração", "leveza"]):
        tags.add("breathable")

    if _has_any(b, ["iniciante", " travel 100", " nh100", " mh100", " essencial"]):
        tags.add("entry_range")
    if _has_any(b, ["avançado", "avancado", " mh500", " sh500", "performance", "intenso", "técnico"]):
        tags.add("tech_high")

    if _has_any(
        b,
        [
            "cantil",
            "garrafa",
            "reservatório",
            "reservatorio",
            "bastão",
            "bastao",
            "lanterna",
            "isopor",
            "fogareiro",
            "filtro de água",
            "filtro de agua",
        ],
    ):
        tags.add("trail_accessory")

    if _has_any(
        b,
        [
            "camiseta",
            "camisa ",
            "calça",
            "calca",
            "jaqueta",
            "casaco",
            "shorts",
            "legging",
            "colete",
            " meia",
        ],
    ):
        tags.add("trail_apparel")

    if _is_trilha_barraca_tent(nome=nome, blob=b):
        tags.add("tent")

    return tags


def _camping_tent_capacity_tags(nome: str, blob: str) -> set[str]:
    """
    Uma única faixa de capacidade por barraca (evita '4 pessoas' no texto longo
    misturar com '2 pessoas' e gerar tags contraditórias).
    """
    n = _norm(nome)
    b0 = _norm(blob[:1400])

    fam = bool(re.search(r"\b(family|família|familia|familiar)\b", f"{n} {b0}"))

    if re.search(r"\b(arpenaz|air seconds)\s*4\.1\b", n):
        mx = 4
    elif re.search(r"\b(arpenaz|air seconds)\s*3\.[0-9]\b", n):
        mx = 3
    else:
        nums_nome: list[int] = []
        for m in re.finditer(r"\b(\d{1,2})\s*(pessoas|lugares|places)\b", n):
            v = int(m.group(1))
            if 1 <= v <= 12:
                nums_nome.append(v)
        for m in re.finditer(
            r"\b(?:para|até|ate|ideal para|acomod|capacidade)\s*(\d{1,2})\s*(?:pessoas|lugares)\b",
            n,
        ):
            v = int(m.group(1))
            if 1 <= v <= 12:
                nums_nome.append(v)
        for m in re.finditer(r"\b(\d)p\b", n):
            v = int(m.group(1))
            if 1 <= v <= 8:
                nums_nome.append(v)

        if nums_nome:
            mx = max(nums_nome)
        else:
            nums_blob: list[int] = []
            for m in re.finditer(r"\b(\d{1,2})\s*(pessoas|lugares|places)\b", b0):
                v = int(m.group(1))
                if 1 <= v <= 12:
                    nums_blob.append(v)
            for m in re.finditer(
                r"\b(?:para|até|ate|ideal para|acomod|capacidade de)\s*(\d{1,2})\s*(?:pessoas|lugares)\b",
                b0,
            ):
                v = int(m.group(1))
                if 1 <= v <= 12:
                    nums_blob.append(v)
            mx = max(nums_blob) if nums_blob else 0

        if fam and mx > 0 and mx < 5:
            mx = max(mx, 5)

    if mx <= 0:
        return {"tent_cap_unknown"}

    if mx <= 1:
        out: set[str] = {"tent_1p"}
    elif mx == 2:
        out = {"tent_2p"}
    elif mx == 3:
        out = {"tent_3p"}
    elif mx <= 5:
        out = {"tent_4_5p"}
    else:
        out = {"tent_6p_plus"}
    if fam:
        out.add("tent_family")
    return out


def _camping_tent_person_range(tags: set[str]) -> tuple[int | None, int | None]:
    """Intervalo estimado (min, max) de pessoas para a barraca; (None, None) se desconhecido."""
    if "tent_cap_unknown" in tags:
        return (None, None)
    caps: list[tuple[int, int]] = []
    if "tent_1p" in tags:
        caps.append((1, 1))
    if "tent_2p" in tags:
        caps.append((2, 2))
    if "tent_3p" in tags:
        caps.append((3, 3))
    if "tent_4_5p" in tags:
        caps.append((4, 5))
    if "tent_6p_plus" in tags:
        caps.append((6, 12))
    if not caps:
        return (None, None)
    lo, hi = (min(c[0] for c in caps), max(c[1] for c in caps))
    if "tent_family" in tags:
        hi = max(hi, 5)
    return (lo, hi)


def _camping_party_allows_tent(*, party: str, tags: set[str]) -> bool:
    """Barraca principal deve ser coerente com 'Para quantas pessoas é este kit?'."""
    lo, hi = _camping_tent_person_range(tags)
    if lo is None or hi is None:
        return True
    if party == "solo":
        return hi <= 2
    if party == "two":
        return hi <= 3
    if party == "three_plus":
        return hi >= 3
    return True


def tag_camping_product(p: dict[str, str]) -> set[str]:
    """Tags heurísticas para pontuação alinhada ao formulário camping."""
    blob = _text_blob(p)
    tags: set[str] = set()
    nome = _norm(p.get("nome do produto", ""))
    b = blob

    if _is_trilha_barraca_tent(nome=nome, blob=b):
        tags.add("tent")
        tags |= _camping_tent_capacity_tags(nome, b)
        if _has_any(b, ["2 seconds", "2 segundos", "montagem instantânea", "autoportante"]):
            tags.add("easy_pitch")
        if _has_any(b, ["compacta", "compacto", "ultraleve", "ultra leve", " trekking", "trekking"]):
            tags.add("compact_gear")

    if _has_any(b, ["saco-cama", "saco cama", "saco de dormir", "sleeping bag"]):
        tags.add("sleeping_bag")
    if _has_any(
        b,
        [
            "colchão inflável",
            "colchao inflavel",
            "colchão autoinflável",
            "colchao autoinflavel",
            "isolante térmico",
            "isolante termico",
            "isomat",
            "isomatte",
        ],
    ):
        tags.add("sleeping_mat")

    if _has_any(
        b,
        [
            "fogareiro",
            "cartucho de gás",
            "cartucho de gas",
            "cozinha de camping",
            "conjunto de cozinha",
        ],
    ) or ("talheres" in nome and "camping" in b):
        tags.add("camp_kitchen")

    ccat = _norm(p.get("categoria", ""))
    if "utensílios de camping" in ccat or "utensilios de camping" in ccat:
        tags.add("camp_kitchen")

    if ("lanterna" in nome or "lampião" in nome or "lampiao" in nome) and _has_any(
        b,
        ["camping", "acampamento", "trek", "lampião", "lampiao", "led"],
    ):
        tags.add("camp_light")

    if "mesa de camping" in nome or "cadeira de camping" in nome:
        tags.add("camp_furniture")

    if _has_any(b, ["cooler", "isopor térmico", "isopor termico", "caixa térmica", "caixa termica"]):
        tags.add("cooler_box")

    if (
        "mochila" in nome
        or "mochilão" in nome
        or "mochilao" in nome
        or "mochileiro" in b
        or re.search(r"\bmochilas?\b.{0,120}\d{1,3}\s*(?:l\b|litros?\b)", b.replace("í", "i"))
    ):
        tags.add("backpack")

    if _has_any(
        b,
        [
            "impermeável",
            "impermeavel",
            "à prova d",
            "a prova d",
            "hidrorrepelente",
            "hidorrepelente",
            "corta vento",
            "corta-vento",
            "prova de vento",
        ],
    ):
        tags.add("weather_shell")

    if _has_any(
        b,
        [
            "fleece",
            "polar",
            "puffer",
            "plumas",
            " neve",
            " térmic",
            " isolante",
            "x-warm",
            "x warm",
            "warm ",
            "aquecimento",
        ],
    ):
        tags.add("warm_layers")

    if _has_any(b, ["respirável", "respiravel", "secagem rápida", "eliminação da transpiração", "ventil"]):
        tags.add("breathable")

    if _has_any(b, ["iniciante", " travel 100", " nh100", " mh100", " essencial"]):
        tags.add("entry_range")
    if _has_any(b, ["avançado", "avancado", " mh500", " sh500", "performance", "intenso", "técnico"]):
        tags.add("tech_high")

    if _has_any(
        b,
        [
            "camiseta",
            "camisa ",
            "calça",
            "calca",
            "jaqueta",
            "casaco",
            "shorts",
            "legging",
        ],
    ):
        if _has_any(b, ["camping", "acampamento", "campismo", "trilha", "ar livre", "aquecimento"]):
            tags.add("camping_apparel")

    return tags


def tag_corrida_product(p: dict[str, str]) -> set[str]:
    """Tags heurísticas para pontuação alinhada ao formulário corrida."""
    blob = _text_blob(p)
    tags: set[str] = set()
    nome = _norm(p.get("nome do produto", ""))
    b = blob

    if ("tênis" in nome or "tenis" in nome) and "corrida" in nome:
        if "trail" in nome or "trilha" in nome:
            tags.add("trail_shoe")
        else:
            tags.add("running_shoe")

    if _has_any(
        b,
        [
            "amortecimento",
            "softech",
            "conforto",
            "absorção",
            "absorcao",
            "macia",
            "kipride max",
            "kipride",
            "fastech",
        ],
    ):
        tags.add("cushioned")

    if _has_any(
        b,
        [
            "leveza",
            "leve",
            "ultraleve",
            "ultra leve",
            "velocidade",
            "placa de carbono",
            "placa carbono",
            "carbono",
            "kipstorm tempo",
            "tempo ",
            "elite",
            "182 g",
            "190 g",
            "200 g",
            "215 g",
        ],
    ):
        tags.add("lightweight")

    if _has_any(
        b,
        [
            "versátil",
            "versatil",
            "academia",
            "caminhada",
            "treino diário",
            "treino diario",
            "iniciante",
            "trotes",
        ],
    ):
        tags.add("versatile")

    if _has_any(
        b,
        [
            "maratona",
            "meia maratona",
            "prova",
            "competição",
            "competicao",
            "performance",
            "placa",
            "kipstorm",
        ],
    ):
        tags.add("race_perf")

    if _has_any(b, ["durabilidade", "durável", "duravel", "frequente", "recorrente"]):
        tags.add("durable")

    if _has_any(b, ["iniciante", "essencial", "ks500", "ks900", " entry", "básico", "basico"]):
        tags.add("entry_range")

    if _has_any(
        b,
        [
            "carbono",
            "placa",
            "elite",
            "storm",
            "challenger",
            "fastech+",
            "competição",
            "competicao",
            "sonicblast",
            "superblast",
        ],
    ):
        tags.add("tech_high")

    if _has_any(b, ["camiseta", "camisa ", "regata", "top ", "cropped"]):
        tags.add("running_apparel_top")
    if _has_any(b, ["shorts", "bermuda", "legging", "calça de corrida", "calca de corrida"]):
        tags.add("running_apparel_bottom")
    cat = _norm(p.get("categoria", ""))
    if "meias" in cat or nome.startswith("meia") or nome.startswith("meias"):
        tags.add("running_sock")
    if _has_any(b, ["boné", "bone", "viseira", "gorro", "chapéu", "chapeu"]):
        tags.add("running_hat")
    if _has_any(b, ["cinta", "pochete", "cinto de corrida"]):
        tags.add("running_belt")
    if "mochila" in nome or "mochila" in b:
        tags.add("running_pack")
    if _has_any(b, ["suplemento", "gel energ", "isotônico", "isotonico", "whey"]):
        tags.add("supplement")

    return tags


@dataclass(frozen=True)
class ProductFeat:
    product_id: str
    name: str
    sport: str
    category: str
    brand: str
    blob: str
    tags: set[str]
    genero: str = ""
    image_url: str = ""
    price: float | None = None


@dataclass(frozen=True)
class PriceThresholds:
    p33: float
    p66: float
    has_prices: bool


def compute_price_thresholds(products: Iterable[ProductFeat]) -> PriceThresholds:
    prices = sorted(p.price for p in products if p.price is not None and p.price > 0)
    if len(prices) < 3:
        if prices:
            mid = (prices[0] + prices[-1]) / 2.0
            return PriceThresholds(p33=mid, p66=mid, has_prices=True)
        return PriceThresholds(p33=0.0, p66=float("inf"), has_prices=False)
    n = len(prices)
    return PriceThresholds(p33=prices[n // 3], p66=prices[(2 * n) // 3], has_prices=True)


def score_price_fit(
    *,
    budget: str,
    level: str = "",
    frequency: str = "",
    price: float | None,
    thresholds: PriceThresholds,
) -> int:
    if not thresholds.has_prices or price is None:
        return 0
    p33, p66 = thresholds.p33, thresholds.p66
    delta = 0
    if budget == "budget":
        if price <= p33:
            delta += 24
        elif price >= p66:
            delta -= 20
    elif budget == "premium":
        if price >= p66:
            delta += 24
        elif price <= p33:
            delta -= 16
    elif budget == "balanced":
        if p33 < price < p66:
            delta += 10
    if level == "beginner":
        if price <= p33:
            delta += 14
        elif price >= p66:
            delta -= 10
    if frequency == "1_2":
        if price <= p33:
            delta += 8
        elif price >= p66:
            delta -= 6
    return delta


def _row_image_url(rp: dict[str, str]) -> str:
    for key in ("ImageUrl", "imageUrl", "image_url"):
        v = (rp.get(key) or "").strip()
        if v:
            return v
    return ""


def _candidate_dict(p: ProductFeat, score: int) -> dict[str, Any]:
    d: dict[str, Any] = {
        "productId": p.product_id,
        "name": p.name,
        "sport": p.sport,
        "category": p.category,
        "brand": p.brand,
        "score": score,
        "tags": sorted(p.tags),
    }
    if p.image_url:
        d["imageUrl"] = p.image_url
    if p.price is not None:
        d["price"] = p.price
    return d


def score_for_slot(
    *,
    ctx: Context,
    tags: set[str],
    blob: str,
    slot: str,
    price: float | None = None,
    price_thresholds: PriceThresholds | None = None,
) -> int:
    # Complementares: calçado não entra no kit de equipamento (evita “pilates” no nome do tênis)
    if slot == "addons" and _has_any(
        blob,
        ["tênis", "tenis", "sapatilha", "chuteira", "calçados|", "|calçados"],
    ):
        return 0

    # Piso: já passou no filtro "fitness" no CSV — evita score 0 e sumir antes do corte mínimo.
    score = 22
    if "apparel" in tags:
        score -= 50

    # Espaço x pegada física (infotécnica + tipo de produto)
    if ctx.space == "small":
        if "footprint_large" in tags:
            score -= 62
        elif "footprint_medium" in tags:
            score -= 18
        elif "footprint_unknown" in tags and (
            "barbell" in tags or "kettlebell" in tags or "dumbbell" in tags
        ):
            score -= 12
        if "footprint_compact" in tags:
            score += 32
    elif ctx.space == "medium":
        if "footprint_large" in tags:
            score -= 22
        if "footprint_compact" in tags:
            score += 12
    elif ctx.space == "large":
        if "footprint_large" in tags:
            score += 18
        if "footprint_medium" in tags:
            score += 6

    # Slot principal
    if slot == "main":
        if ctx.training == "yoga":
            if "mat" in tags:
                score += 100
            if "yoga_block" in tags or "strap" in tags:
                score += 20
        elif ctx.training == "strength":
            if "dumbbell" in tags or "kettlebell" in tags or "barbell" in tags:
                score += 80
            if "band" in tags:
                score += 30
        elif ctx.training == "hiit":
            if "kettlebell" in tags or "jump_rope" in tags or "band" in tags:
                score += 70
            if "mat" in tags:
                score += 20
        elif ctx.training == "cardio":
            if "cardio_machine" in tags:
                score += 90
            if "jump_rope" in tags:
                score += 60
        else:  # mixed/unknown
            if "mat" in tags:
                score += 60
            if "band" in tags:
                score += 55
            if "jump_rope" in tags:
                score += 45
            if "dumbbell" in tags or "kettlebell" in tags:
                score += 40

    # Slots complementares
    if slot == "addons":
        if ctx.training in ("strength", "hiit", "mixed"):
            if "band" in tags:
                score += 40
            if "grip_support" in tags:
                score += 20
        if ctx.training in ("yoga", "mixed"):
            if "strap" in tags:
                score += 35
            if "yoga_block" in tags:
                score += 35
        if "recovery" in tags:
            score += 15
        if "mat" in tags:
            score += 10

    # Pequeno boost por match textual do treino
    if ctx.training == "yoga" and "yoga" in blob:
        score += 10
    if ctx.training == "strength" and ("muscul" in blob or "halter" in blob):
        score += 10
    if ctx.training == "hiit" and ("hiit" in blob or "funcional" in blob):
        score += 10
    if ctx.training == "cardio" and "cardio" in blob:
        score += 10

    # Objetivo (alinhado ao objetive_ia da pergunta de motivação)
    if ctx.goal == "hypertrophy":
        if "dumbbell" in tags or "barbell" in tags or "kettlebell" in tags:
            score += 24
        if "band" in tags:
            score += 14
    elif ctx.goal == "weight_loss":
        if "jump_rope" in tags or "cardio_machine" in tags:
            score += 26
        if "mat" in tags and slot == "main":
            score += 12
    elif ctx.goal == "wellness":
        if "mat" in tags:
            score += 22
        if "recovery" in tags:
            score += 16
    elif ctx.goal == "mobility":
        if "mat" in tags or "yoga_block" in tags or "strap" in tags:
            score += 30
        if "recovery" in tags:
            score += 14
    elif ctx.goal == "performance":
        if "cardio_machine" in tags or "kettlebell" in tags or "barbell" in tags:
            score += 22
        if "jump_rope" in tags or "band" in tags:
            score += 12

    # Frequência (alinhado ao objetive_ia — baixa frequência favorece simplicidade; alta favorece apoio ao treino)
    if ctx.frequency == "1_2":
        if "footprint_compact" in tags:
            score += 14
        if slot == "main" and ctx.training == "yoga" and "mat" in tags:
            score += 12
    elif ctx.frequency == "3_4":
        if "mat" in tags and "apparel" not in tags:
            score += 8
    elif ctx.frequency == "5_plus":
        if slot == "addons" and any(t in tags for t in ("band", "grip_support", "chalk", "recovery")):
            score += 20
        if "mat" in tags and "apparel" not in tags and ctx.training in (
            "hiit",
            "strength",
            "mixed",
            "yoga",
        ):
            score += 10

    score += score_price_fit(
        budget=ctx.budget,
        frequency=ctx.frequency,
        price=price,
        thresholds=price_thresholds or PriceThresholds(0.0, float("inf"), False),
    )

    return score


def trilhas_gender_ok(genero_raw: str, gender: str) -> bool:
    if gender not in ("woman", "man"):
        return True
    g = _norm(genero_raw)
    if not g:
        return True
    if g in ("quechua", "forclaz", "kiprun", "domyos", "kalenji", "artengo", "geologic"):
        return True
    masc = any(x in g for x in ("masculino", "homens", "homem"))
    fem = any(x in g for x in ("feminino", "mulher"))
    if gender == "woman":
        return not masc or fem
    return not fem or masc


def score_trilhas_for_slot(
    *,
    ctx: TrilhasContext,
    tags: set[str],
    blob: str,
    name: str,
    slot: str,
    genero: str,
    price: float | None = None,
    price_thresholds: PriceThresholds | None = None,
) -> int:
    # Principal: bota de trilha/trekking (tag boots). Complementares: sem segunda bota (mesma âncora).
    if slot == "main" and "boots" not in tags:
        return 0
    if slot == "addons" and "boots" in tags:
        return 0

    # Barracas no CSV costumam vir como MASCULINO; botas seguem filtro de gênero do contexto.
    if "tent" not in tags and not trilhas_gender_ok(genero, ctx.gender):
        return 0

    score = 24

    if ctx.level == "beginner":
        if "entry_range" in tags:
            score += 28
        if "tech_high" in tags:
            score -= 14
    elif ctx.level == "intermediate":
        score += 8
    elif ctx.level == "advanced":
        if "tech_high" in tags:
            score += 30
        if "entry_range" in tags:
            score -= 10

    if ctx.duration == "multi_day":
        if "backpack" in tags:
            score += 36
        if "backpack_large" in tags:
            score += 28
        if "trail_accessory" in tags:
            score += 16
    elif ctx.duration == "full_day":
        if "backpack" in tags:
            score += 22
        if "backpack_medium" in tags or "backpack_large" in tags:
            score += 12
    elif ctx.duration == "half_day" and slot == "addons" and "trail_accessory" in tags:
        score += 10

    if ctx.terrain == "hard":
        if "boots" in tags:
            score += 40
        if "trail_shoes" in tags:
            score += 32
        if "weather_shell" in tags:
            score += 18
    elif ctx.terrain == "moderate":
        if "trail_shoes" in tags or "boots" in tags:
            score += 22
        if "weather_shell" in tags:
            score += 10
    elif ctx.terrain == "easy":
        if "trail_apparel" in tags:
            score += 18
        if "entry_range" in tags:
            score += 10

    if ctx.climate == "hot":
        if "breathable" in tags:
            score += 26
        if "warm_layers" in tags:
            score -= 18
    elif ctx.climate == "cold":
        if "warm_layers" in tags:
            score += 34
        if "weather_shell" in tags:
            score += 14
    elif ctx.climate == "wet":
        if "weather_shell" in tags:
            score += 30
        if "boots" in tags:
            score += 12

    if ctx.budget == "budget":
        if "entry_range" in tags:
            score += 18
        if "tech_high" in tags:
            score -= 6
    elif ctx.budget == "premium":
        if "tech_high" in tags:
            score += 22
    elif ctx.budget == "balanced":
        score += 6

    score += score_price_fit(
        budget=ctx.budget,
        level=ctx.level,
        price=price,
        thresholds=price_thresholds or PriceThresholds(0.0, float("inf"), False),
    )

    if slot == "main":
        # Âncora do kit trilhas: bota (trilha/trekking); o restante do score diferencia modelos.
        score += 90
        if ctx.terrain in ("moderate", "hard"):
            score += 18
        if ctx.duration in ("full_day", "multi_day"):
            score += 14
        if ctx.climate in ("wet", "cold"):
            if "weather_shell" in tags or "imperme" in blob:
                score += 22
        if ctx.level == "beginner" and "entry_range" in tags:
            score += 12
        if ctx.level == "advanced" and "tech_high" in tags:
            score += 16
        if ctx.climate == "cold" and "warm_layers" in tags:
            score += 10
    else:
        if "trail_apparel" in tags:
            score += 12
        if "trail_accessory" in tags:
            score += 20

    return score


def score_camping_for_slot(
    *,
    ctx: CampingContext,
    tags: set[str],
    blob: str,
    name: str,
    slot: str,
    genero: str,
    price: float | None = None,
    price_thresholds: PriceThresholds | None = None,
) -> int:
    # Principal: barraca/tenda (tag tent). Complementares: sem segunda barraca.
    if slot == "main" and "tent" not in tags:
        return 0
    if slot == "addons" and "tent" in tags:
        return 0

    # Vestuário de camping: respeita o gênero do kit. Equipamento (utensílios, gás, etc.) segue neutro.
    if "tent" not in tags and "camping_apparel" in tags and not trilhas_gender_ok(genero, ctx.gender):
        return 0

    if slot == "main" and "tent" in tags and not _camping_party_allows_tent(party=ctx.party, tags=tags):
        return 0

    score = 24

    if ctx.level == "beginner":
        if "entry_range" in tags:
            score += 26
        if "tech_high" in tags:
            score -= 12
        if "easy_pitch" in tags:
            score += 14
    elif ctx.level == "intermediate":
        score += 8
    elif ctx.level == "advanced":
        if "tech_high" in tags:
            score += 26
        if "entry_range" in tags:
            score -= 8

    if ctx.venue == "structured":
        if slot == "addons":
            if "camp_furniture" in tags:
                score += 24
            if "cooler_box" in tags:
                score += 18
        if slot == "main" and "compact_gear" not in tags:
            score += 10
    elif ctx.venue == "remote":
        if "weather_shell" in tags:
            score += 18
        if "warm_layers" in tags:
            score += 12
    elif ctx.venue == "hike_camp":
        if "compact_gear" in tags or "easy_pitch" in tags:
            score += 22
        if "backpack" in tags:
            score += 10
        if slot == "main" and "compact_gear" not in tags:
            score -= 8

    if slot == "main" and "tent" in tags:
        if ctx.party == "solo":
            if "tent_1p" in tags or "tent_2p" in tags:
                score += 28
            if "tent_3p" in tags:
                score -= 10
        elif ctx.party == "two":
            if "tent_2p" in tags:
                score += 34
            elif "tent_3p" in tags:
                score += 12
            if "tent_1p" in tags:
                score += 8
        elif ctx.party == "three_plus":
            if "tent_3p" in tags or "tent_4_5p" in tags or "tent_family" in tags or "tent_6p_plus" in tags:
                score += 26
            if "tent_2p" in tags:
                score -= 18

    if ctx.climate == "hot":
        if "breathable" in tags:
            score += 22
        if "warm_layers" in tags:
            score -= 14
    elif ctx.climate == "cold":
        if "warm_layers" in tags:
            score += 28
        if "weather_shell" in tags:
            score += 12
    elif ctx.climate == "wet":
        if "weather_shell" in tags:
            score += 26
        if "imperme" in blob:
            score += 10

    if ctx.budget == "budget":
        if "entry_range" in tags:
            score += 16
        if "tech_high" in tags:
            score -= 6
    elif ctx.budget == "premium":
        if "tech_high" in tags:
            score += 20
    elif ctx.budget == "balanced":
        score += 6

    score += score_price_fit(
        budget=ctx.budget,
        level=ctx.level,
        price=price,
        thresholds=price_thresholds or PriceThresholds(0.0, float("inf"), False),
    )

    if slot == "main":
        score += 86
        if ctx.climate in ("wet", "cold") and ("weather_shell" in tags or "imperme" in blob):
            score += 18
        if ctx.level == "beginner" and "easy_pitch" in tags:
            score += 14
        if ctx.venue == "hike_camp" and "compact_gear" in tags:
            score += 12
    else:
        if "sleeping_bag" in tags:
            score += 22
        if "sleeping_mat" in tags:
            score += 18
        if "camp_kitchen" in tags:
            score += 16
        if "camp_light" in tags:
            score += 14
        if "camping_apparel" in tags:
            score += 12
        if ctx.climate == "cold" and "warm_layers" in tags:
            score += 12
        if "camp_furniture" in tags and ctx.venue == "structured":
            score += 10

    return score


def score_corrida_for_slot(
    *,
    ctx: CorridaContext,
    tags: set[str],
    blob: str,
    name: str,
    slot: str,
    genero: str,
    price: float | None = None,
    price_thresholds: PriceThresholds | None = None,
) -> int:
    # Principal: tênis de corrida de rua. Complementares: sem segundo tênis.
    if slot == "main" and "running_shoe" not in tags:
        return 0
    if slot == "addons" and "running_shoe" in tags:
        return 0

    apparel_tags = {"running_apparel_top", "running_apparel_bottom"}
    if apparel_tags & tags and not trilhas_gender_ok(genero, ctx.gender):
        return 0
    if slot == "main" and "running_shoe" in tags and not trilhas_gender_ok(genero, ctx.gender):
        return 0

    score = 24

    if ctx.usage == "casual":
        if "versatile" in tags:
            score += 30
        if "cushioned" in tags:
            score += 20
        if "race_perf" in tags:
            score -= 14
        if "tech_high" in tags:
            score -= 8
    elif ctx.usage == "occasional":
        if "versatile" in tags:
            score += 20
        if "cushioned" in tags:
            score += 16
        if "entry_range" in tags:
            score += 12
    elif ctx.usage == "frequent":
        if "durable" in tags:
            score += 28
        if "cushioned" in tags:
            score += 20
        if "versatile" in tags:
            score += 10
    elif ctx.usage == "long_race":
        if "cushioned" in tags:
            score += 32
        if "durable" in tags:
            score += 22
        if "race_perf" in tags:
            score += 18

    if ctx.distance == "up_to_5km":
        if "lightweight" in tags:
            score += 22
        if "versatile" in tags:
            score += 12
    elif ctx.distance == "5_to_10km":
        if "cushioned" in tags:
            score += 18
        if "versatile" in tags:
            score += 12
        if "lightweight" in tags:
            score += 8
    elif ctx.distance == "over_10km":
        if "cushioned" in tags:
            score += 30
        if "durable" in tags:
            score += 20
        if "lightweight" in tags and "cushioned" not in tags:
            score -= 12

    if ctx.priority == "comfort":
        if "cushioned" in tags:
            score += 34
        if "lightweight" in tags and "cushioned" not in tags:
            score -= 10
    elif ctx.priority == "balanced":
        if "versatile" in tags:
            score += 16
        if "cushioned" in tags:
            score += 12
        if "lightweight" in tags:
            score += 10
    elif ctx.priority == "speed":
        if "lightweight" in tags:
            score += 34
        if "race_perf" in tags:
            score += 26
        if "cushioned" in tags and "lightweight" not in tags:
            score -= 8

    if ctx.budget == "budget":
        if "entry_range" in tags:
            score += 18
        if "tech_high" in tags:
            score -= 8
    elif ctx.budget == "premium":
        if "tech_high" in tags:
            score += 22
        if "race_perf" in tags:
            score += 12
    elif ctx.budget == "balanced":
        score += 6

    score += score_price_fit(
        budget=ctx.budget,
        price=price,
        thresholds=price_thresholds or PriceThresholds(0.0, float("inf"), False),
    )
    if ctx.usage in ("casual", "occasional") and price is not None:
        score += score_price_fit(
            budget="budget",
            price=price,
            thresholds=price_thresholds or PriceThresholds(0.0, float("inf"), False),
        ) // 2

    if slot == "main":
        score += 90
        if ctx.priority == "speed" and "lightweight" in tags:
            score += 16
        if ctx.priority == "comfort" and "cushioned" in tags:
            score += 14
        if ctx.usage == "long_race" and "cushioned" in tags:
            score += 12
        if ctx.budget == "budget" and "entry_range" in tags:
            score += 10
        if ctx.budget == "premium" and "tech_high" in tags:
            score += 12
    else:
        if "running_apparel_top" in tags:
            score += 22
        if "running_apparel_bottom" in tags:
            score += 20
        if "running_sock" in tags:
            score += 18
        if "running_hat" in tags:
            score += 14
        if "running_pack" in tags:
            score += 12
        if "running_belt" in tags:
            score += 12
        if "supplement" in tags:
            score += 10

    return score


def pick_trilhas_candidates(
    *,
    ctx: TrilhasContext,
    products: list[ProductFeat],
    slot: str,
    top_n: int,
    reserved_category_paths: set[str] | None = None,
    min_score: int = KIT_MIN_SCORE,
    addon_slots: tuple[str, ...] = (),
    price_thresholds: PriceThresholds | None = None,
) -> list[dict[str, Any]]:
    scored: list[tuple[int, ProductFeat]] = []
    for p in products:
        s = score_trilhas_for_slot(
            ctx=ctx,
            tags=p.tags,
            blob=p.blob,
            name=p.name,
            slot=slot,
            genero=p.genero,
            price=p.price,
            price_thresholds=price_thresholds,
        )
        if s <= 0:
            continue
        scored.append((s, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    if slot == "addons" and addon_slots:
        return pick_addons_per_guide_order(
            sport="trilhas",
            scored=scored,
            addon_slots=addon_slots,
            top_n=top_n,
            reserved_category_paths=reserved_category_paths,
            min_score=min_score,
        )
    out: list[dict[str, Any]] = []
    used_ids: set[str] = set()
    used_categories: set[str] = set(reserved_category_paths or [])

    for s, p in scored:
        if s < min_score:
            continue
        if not p.product_id or p.product_id in used_ids:
            continue
        if slot == "addons":
            if addon_slots:
                sk = addon_dedupe_slot_key(
                    sport="trilhas",
                    category=p.category,
                    name=p.name,
                    blob=p.blob,
                    addon_slots=addon_slots,
                )
                if not sk:
                    continue
                if sk in used_categories:
                    continue
                used_categories.add(sk)
            else:
                ck = category_path_key(p.category)
                if ck in used_categories:
                    continue
                used_categories.add(ck)
        used_ids.add(p.product_id)
        out.append(_candidate_dict(p, s))
        if len(out) >= top_n:
            break
    return out


def pick_camping_candidates(
    *,
    ctx: CampingContext,
    products: list[ProductFeat],
    slot: str,
    top_n: int,
    reserved_category_paths: set[str] | None = None,
    min_score: int = KIT_MIN_SCORE,
    addon_slots: tuple[str, ...] = (),
    price_thresholds: PriceThresholds | None = None,
) -> list[dict[str, Any]]:
    scored: list[tuple[int, ProductFeat]] = []
    for p in products:
        s = score_camping_for_slot(
            ctx=ctx,
            tags=p.tags,
            blob=p.blob,
            name=p.name,
            slot=slot,
            genero=p.genero,
            price=p.price,
            price_thresholds=price_thresholds,
        )
        if s <= 0:
            continue
        scored.append((s, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    if slot == "addons" and addon_slots:
        return pick_addons_per_guide_order(
            sport="camping",
            scored=scored,
            addon_slots=addon_slots,
            top_n=top_n,
            reserved_category_paths=reserved_category_paths,
            min_score=min_score,
        )
    out: list[dict[str, Any]] = []
    used_ids: set[str] = set()
    used_categories: set[str] = set(reserved_category_paths or [])

    for s, p in scored:
        if s < min_score:
            continue
        if not p.product_id or p.product_id in used_ids:
            continue
        if slot == "addons":
            if addon_slots:
                sk = addon_dedupe_slot_key(
                    sport="camping",
                    category=p.category,
                    name=p.name,
                    blob=p.blob,
                    addon_slots=addon_slots,
                )
                if not sk:
                    continue
                if sk in used_categories:
                    continue
                used_categories.add(sk)
            else:
                ck = category_path_key(p.category)
                if ck in used_categories:
                    continue
                used_categories.add(ck)
        used_ids.add(p.product_id)
        out.append(_candidate_dict(p, s))
        if len(out) >= top_n:
            break
    return out


def pick_corrida_candidates(
    *,
    ctx: CorridaContext,
    products: list[ProductFeat],
    slot: str,
    top_n: int,
    reserved_category_paths: set[str] | None = None,
    min_score: int = KIT_MIN_SCORE,
    addon_slots: tuple[str, ...] = (),
    price_thresholds: PriceThresholds | None = None,
) -> list[dict[str, Any]]:
    scored: list[tuple[int, ProductFeat]] = []
    for p in products:
        s = score_corrida_for_slot(
            ctx=ctx,
            tags=p.tags,
            blob=p.blob,
            name=p.name,
            slot=slot,
            genero=p.genero,
            price=p.price,
            price_thresholds=price_thresholds,
        )
        if s <= 0:
            continue
        scored.append((s, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    if slot == "addons" and addon_slots:
        return pick_addons_per_guide_order(
            sport="corrida",
            scored=scored,
            addon_slots=addon_slots,
            top_n=top_n,
            reserved_category_paths=reserved_category_paths,
            min_score=min_score,
        )
    out: list[dict[str, Any]] = []
    used_ids: set[str] = set()
    used_categories: set[str] = set(reserved_category_paths or [])

    for s, p in scored:
        if s < min_score:
            continue
        if not p.product_id or p.product_id in used_ids:
            continue
        if slot == "addons":
            if addon_slots:
                sk = addon_dedupe_slot_key(
                    sport="corrida",
                    category=p.category,
                    name=p.name,
                    blob=p.blob,
                    addon_slots=addon_slots,
                )
                if not sk:
                    continue
                if sk in used_categories:
                    continue
                used_categories.add(sk)
            else:
                ck = category_path_key(p.category)
                if ck in used_categories:
                    continue
                used_categories.add(ck)
        used_ids.add(p.product_id)
        out.append(_candidate_dict(p, s))
        if len(out) >= top_n:
            break
    return out


def category_path_key(cat: str) -> str:
    """Normaliza o path de categoria do CSV para comparar duplicatas."""
    c = re.sub(r"\s+", " ", (cat or "").strip()).lower()
    return c if c else "__sem_categoria__"


def read_addon_category_slots(questions_path: Path) -> tuple[str, ...]:
    """Lê `addon_category_slots` do JSON de perguntas (primeira entrada não vazia)."""
    if not questions_path.is_file():
        return ()
    try:
        data: Any = json.loads(questions_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ()
    if not isinstance(data, list):
        return ()
    for q in data:
        if not isinstance(q, dict):
            continue
        raw = q.get("addon_category_slots")
        if isinstance(raw, list) and raw:
            return tuple(str(x).strip() for x in raw if str(x).strip())
    return ()


def normalize_taxonomy_path(s: str) -> str:
    """Unifica separadores do catálogo (| no CSV) e do guia (➜, >)."""
    t = re.sub(r"\s*[|➜›>]\s*", "|", (s or "").strip())
    parts = [re.sub(r"\s+", " ", p).strip().lower() for p in t.split("|") if p.strip()]
    return "|".join(parts)


def _path_matches_guide(cn: str, gn: str) -> bool:
    if not gn or not cn:
        return False
    if cn == gn:
        return True
    # Path mais profundo no CSV (|) ou mesmo segmento com sufixo após vírgula (ex.: Mochilas, bolsas…)
    if len(cn) > len(gn) and cn.startswith(gn) and cn[len(gn)] in "|,":
        return True
    return False


def _fitness_cardio_slot_key(cn: str) -> str | None:
    prefixes = (
        "equipamentos|esteira",
        "equipamentos|elíptico",
        "equipamentos|bicicletas ergométrica",
    )
    for p in prefixes:
        if cn == p or cn.startswith(p + "|"):
            return normalize_taxonomy_path("Equipamentos|Esteira / Elíptico / Bicicleta Ergométrica")
    if cn.startswith("equipamentos|bicicleta") and "ergométr" in cn:
        return normalize_taxonomy_path("Equipamentos|Esteira / Elíptico / Bicicleta Ergométrica")
    # CSV: "Equipamentos|Bicicleta Spinning" (singular; sem "ergométrica" no path)
    if "bicicleta" in cn and "spinning" in cn:
        return normalize_taxonomy_path("Equipamentos|Esteira / Elíptico / Bicicleta Ergométrica")
    return None


def _camping_isolante_slot_key(cn: str, text_blob: str) -> str | None:
    target = normalize_taxonomy_path("Acessórios|Apoio|Isolante Térmico")
    if cn == target or cn.startswith(target + "|"):
        return target
    colch = normalize_taxonomy_path("Acessórios|Apoio|Colchões e Colchonetes")
    if cn == colch or cn.startswith(colch + "|"):
        if any(
            x in text_blob
            for x in (
                "isolante",
                "r-value",
                "r value",
                "isolamento térmico",
            )
        ):
            return target
    return None


def addon_dedupe_slot_key(
    *,
    sport: str,
    category: str,
    name: str,
    blob: str,
    addon_slots: tuple[str, ...],
) -> str | None:
    """
    Chave estável para no máximo um complementar por “slot” do guia em questions_*.json.
    Sem guia (lista vazia), volta ao comportamento antigo via caller (category_path_key).
    """
    if not addon_slots:
        return None
    cn = normalize_taxonomy_path(category)
    text = f"{cn} {_norm(name)} {_norm(blob)}"

    if sport == "fitness":
        ck = _fitness_cardio_slot_key(cn)
        if ck:
            return ck
    if sport == "camping":
        ck = _camping_isolante_slot_key(cn, text)
        if ck:
            return ck

    guides = sorted({normalize_taxonomy_path(g) for g in addon_slots if g.strip()}, key=len, reverse=True)
    for gn in guides:
        if _path_matches_guide(cn, gn):
            return gn
    return None


def reserved_addon_keys(
    *,
    sport: str,
    category: str,
    name: str,
    blob: str,
    addon_slots: tuple[str, ...],
) -> set[str]:
    """Chaves a bloquear nos complementares após escolher o principal."""
    keys: set[str] = {category_path_key(category)}
    slot_k = addon_dedupe_slot_key(
        sport=sport, category=category, name=name, blob=blob, addon_slots=addon_slots
    )
    if slot_k:
        keys.add(slot_k)
    return keys


def pick_addons_per_guide_order(
    *,
    sport: str,
    scored: list[tuple[int, ProductFeat]],
    addon_slots: tuple[str, ...],
    top_n: int,
    reserved_category_paths: set[str] | None,
    min_score: int,
) -> list[dict[str, Any]]:
    """
    Um complementar por ramo do guia (ordem do JSON), melhor score em cada ramo.
    Evita que categorias muito pontuadas monopolizem os N slots e deixem ramos como Utensílios vazios.
    """
    reserved = set(reserved_category_paths or ())
    used_ids: set[str] = set()
    picked_slot: set[str] = set()
    out: list[dict[str, Any]] = []

    for g_raw in addon_slots:
        gn = normalize_taxonomy_path(str(g_raw).strip())
        if not gn or gn in picked_slot or gn in reserved:
            continue
        best: tuple[int, ProductFeat] | None = None
        for s, p in scored:
            if s < min_score or not p.product_id or p.product_id in used_ids:
                continue
            if category_path_key(p.category) in reserved:
                continue
            sk = addon_dedupe_slot_key(
                sport=sport,
                category=p.category,
                name=p.name,
                blob=p.blob,
                addon_slots=addon_slots,
            )
            if sk is None or sk != gn:
                continue
            if best is None or s > best[0]:
                best = (s, p)
        if best:
            s, p = best
            used_ids.add(p.product_id)
            picked_slot.add(gn)
            out.append(_candidate_dict(p, s))
        if len(out) >= top_n:
            break

    # Fitness: se o principal já “consumiu” um ramo do guia (tapete ou cardio indoor),
    # completa até top_n com categorias extra do CSV (não entram na ordem base do JSON).
    if sport == "fitness" and len(out) < top_n:
        overflow = (
            "Equipamentos ➜ Kettlebells",
            "Equipamentos ➜ Cordas",
        )
        extended_slots = tuple(addon_slots) + overflow
        for g_raw in overflow:
            if len(out) >= top_n:
                break
            gn = normalize_taxonomy_path(str(g_raw).strip())
            if not gn or gn in picked_slot or gn in reserved:
                continue
            best: tuple[int, ProductFeat] | None = None
            for s, p in scored:
                if s < min_score or not p.product_id or p.product_id in used_ids:
                    continue
                if category_path_key(p.category) in reserved:
                    continue
                sk = addon_dedupe_slot_key(
                    sport=sport,
                    category=p.category,
                    name=p.name,
                    blob=p.blob,
                    addon_slots=extended_slots,
                )
                if sk is None or sk != gn:
                    continue
                if best is None or s > best[0]:
                    best = (s, p)
            if best:
                s, p = best
                used_ids.add(p.product_id)
                picked_slot.add(gn)
                out.append(_candidate_dict(p, s))
    return out


def pick_candidates(
    *,
    ctx: Context,
    products: list[ProductFeat],
    slot: str,
    top_n: int,
    reserved_category_paths: set[str] | None = None,
    min_score: int = KIT_MIN_SCORE,
    addon_slots: tuple[str, ...] = (),
    price_thresholds: PriceThresholds | None = None,
) -> list[dict[str, Any]]:
    scored: list[tuple[int, ProductFeat]] = []
    for p in products:
        s = score_for_slot(
            ctx=ctx,
            tags=p.tags,
            blob=p.blob,
            slot=slot,
            price=p.price,
            price_thresholds=price_thresholds,
        )
        if slot == "addons":
            # Complementares por categoria: score negativo não pode eliminar o SKU
            # antes do matching ao guia (senão slots como cardio ficam vazios em espaço pequeno).
            s = max(0, s)
        elif s == 0 or s < 0:
            continue
        scored.append((s, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    if slot == "addons" and addon_slots:
        return pick_addons_per_guide_order(
            sport="fitness",
            scored=scored,
            addon_slots=addon_slots,
            top_n=top_n,
            reserved_category_paths=reserved_category_paths,
            min_score=min_score,
        )
    out: list[dict[str, Any]] = []
    used_ids: set[str] = set()
    used_categories: set[str] = set(reserved_category_paths or [])

    for s, p in scored:
        if s < min_score:
            continue
        if not p.product_id or p.product_id in used_ids:
            continue
        if slot == "addons":
            if addon_slots:
                sk = addon_dedupe_slot_key(
                    sport="fitness",
                    category=p.category,
                    name=p.name,
                    blob=p.blob,
                    addon_slots=addon_slots,
                )
                if not sk:
                    continue
                if sk in used_categories:
                    continue
                used_categories.add(sk)
            else:
                ck = category_path_key(p.category)
                if ck in used_categories:
                    continue
                used_categories.add(ck)
        used_ids.add(p.product_id)
        out.append(_candidate_dict(p, s))
        if len(out) >= top_n:
            break
    return out


def run_fitness(*, combinations_path: Path, out_path: Path) -> int:
    if not PRODUCTS_CSV.is_file():
        raise SystemExit(f"Arquivo não encontrado: {PRODUCTS_CSV}")
    if not combinations_path.is_file():
        raise SystemExit(f"Arquivo não encontrado: {combinations_path}")

    raw_products = load_products(PRODUCTS_CSV)
    # Pré-processa (filtra + extrai blob/tags) uma vez, pra ficar rápido
    products: list[ProductFeat] = []
    for rp in raw_products:
        if not sport_match(rp, "fitness"):
            continue
        pid = (rp.get("ProductIdVTEX", "") or "").strip()
        if not pid:
            continue
        blob = _text_blob(rp)
        tags = tag_product(rp)
        products.append(
            ProductFeat(
                product_id=pid,
                name=rp.get("nome do produto", ""),
                sport=rp.get("Esporte", ""),
                category=rp.get("categoria", ""),
                brand=rp.get("Marca", ""),
                blob=blob,
                tags=tags,
                genero=(rp.get("Genero", "") or "").strip(),
                image_url=_row_image_url(rp),
                price=parse_price(rp.get("price", "")),
            )
        )
    contexts = load_contexts(combinations_path)
    addon_slots = read_addon_category_slots(QUESTIONS_FITNESS)
    price_thresholds = compute_price_thresholds(products)

    out: dict[str, Any] = {
        "sport": "fitness",
        "source": {
            "products_csv": str(PRODUCTS_CSV.name),
            "combinations_json": str(combinations_path.name),
            "questions_json": str(QUESTIONS_FITNESS.name),
        },
        "notes": [
            "Este arquivo é gerado automaticamente a partir do CSV.",
            "Produtos considerados: apenas linhas em que o texto agregado (nome, descrição, benefícios, infotécnica, categoria, esporte, marca) contém a palavra \"fitness\".",
            "Orçamento: pergunta \"Quanto você quer investir para esta aventura?\" + coluna price do CSV — produtos mais baratos (tercil inferior) ganham score extra em budget; premium favorece tercil superior. Baixa frequência (1–2x/semana) também inclina para itens mais acessíveis.",
            "Pegada de tamanho: tags footprint_* a partir de infotécnica (cm/m) + tipo de equipamento; score ajusta por espaço, tipo de treino, objetivo e frequência (alinhado aos objetive_ia das perguntas).",
            "addon_candidates: campo `addon_category_slots` em questions_fitness.json — um complementar por ramo do guia, na ordem do JSON (melhor score em cada ramo); Esteira/Elíptico/Bicicleta ergométrica/Spinning compartilham um slot; fora do guia não entra. Reserva-se o path bruto do principal e o slot do principal. Complementares usam score mínimo 0 (scores negativos viram 0) para ainda permitir um item por categoria quando o contexto penaliza pegada. Se após os ramos do JSON faltar item até 6 e o esporte for fitness, tentam-se Kettlebells e Cordas (paths do CSV) como preenchimento.",
            f"Apenas produtos com score >= {KIT_MIN_SCORE}; até {KIT_MAIN_TOP} principal(is) e {KIT_ADDON_TOP} complementares por contexto.",
        ],
        "contexts": [],
    }

    for ctx in contexts:
        main_candidates = pick_candidates(
            ctx=ctx,
            products=products,
            slot="main",
            top_n=KIT_MAIN_TOP,
            min_score=KIT_MIN_SCORE,
            price_thresholds=price_thresholds,
        )
        reserved_cats: set[str] = set()
        if main_candidates:
            mc = main_candidates[0]
            reserved_cats = reserved_addon_keys(
                sport="fitness",
                category=str(mc.get("category", "")),
                name=str(mc.get("name", "")),
                blob="",
                addon_slots=addon_slots,
            )
        addon_candidates = pick_candidates(
            ctx=ctx,
            products=products,
            slot="addons",
            top_n=KIT_ADDON_TOP,
            reserved_category_paths=reserved_cats,
            min_score=KIT_MIN_SCORE,
            addon_slots=addon_slots,
            price_thresholds=price_thresholds,
        )
        out["contexts"].append(
            {
                "context_key": ctx.key,
                "context": {
                    "sport": ctx.sport,
                    "training": ctx.training,
                    "goal": ctx.goal,
                    "space": ctx.space,
                    "frequency": ctx.frequency,
                    "budget": ctx.budget,
                },
                "main_candidates": main_candidates,
                "addon_candidates": addon_candidates,
            }
        )

    _write_candidates(out_path, out)
    js_path = out_path.with_suffix(".js")
    print(f"Gerado: {out_path} e {js_path} (contexts={len(out['contexts'])})")
    return 0


def run_trilhas(*, combinations_path: Path, out_path: Path) -> int:
    if not PRODUCTS_CSV.is_file():
        raise SystemExit(f"Arquivo não encontrado: {PRODUCTS_CSV}")
    if not combinations_path.is_file():
        raise SystemExit(f"Arquivo não encontrado: {combinations_path}")

    raw_products = load_products(PRODUCTS_CSV)
    products: list[ProductFeat] = []
    for rp in raw_products:
        if not sport_match(rp, "trilhas"):
            continue
        pid = (rp.get("ProductIdVTEX", "") or "").strip()
        if not pid:
            continue
        blob = _text_blob(rp)
        tags = tag_trilha_product(rp)
        products.append(
            ProductFeat(
                product_id=pid,
                name=rp.get("nome do produto", ""),
                sport=rp.get("Esporte", ""),
                category=rp.get("categoria", ""),
                brand=rp.get("Marca", ""),
                blob=blob,
                tags=tags,
                genero=(rp.get("Genero", "") or "").strip(),
                image_url=_row_image_url(rp),
                price=parse_price(rp.get("price", "")),
            )
        )
    contexts = load_trilhas_contexts(combinations_path)
    addon_slots = read_addon_category_slots(QUESTIONS_TRILHAS)
    price_thresholds = compute_price_thresholds(products)

    out: dict[str, Any] = {
        "sport": "trilhas",
        "source": {
            "products_csv": str(PRODUCTS_CSV.name),
            "combinations_json": str(combinations_path.name),
            "questions_json": str(QUESTIONS_TRILHAS.name),
        },
        "notes": [
            "Arquivo gerado a partir do CSV + question_trilhas_combinations.json.",
            "Principal do kit: sempre uma bota de trilha/trekking (tag boots); complementares excluem segunda bota.",
            "Produtos: Esporte/categoria/nome com trilha, trekking ou trail; score alinhado aos objetive_ia (nível, duração, terreno, clima, orçamento, gênero).",
            "Orçamento e nível iniciante: coluna price do CSV — tercil inferior ganha score extra em budget e para iniciantes; premium favorece tercil superior (além das tags entry_range/tech_high).",
            "addon_candidates: campo `addon_category_slots` em questions_trilhas.json — um complementar por ramo do guia, na ordem do JSON (melhor score em cada ramo); fora do guia não entra. Reserva path bruto do principal + slot do principal.",
            f"Apenas produtos com score >= {KIT_MIN_SCORE}; até {KIT_MAIN_TOP} principal(is) e {KIT_ADDON_TOP} complementares por contexto.",
        ],
        "contexts": [],
    }

    for ctx in contexts:
        main_candidates = pick_trilhas_candidates(
            ctx=ctx,
            products=products,
            slot="main",
            top_n=KIT_MAIN_TOP,
            min_score=KIT_MIN_SCORE,
            price_thresholds=price_thresholds,
        )
        reserved_cats: set[str] = set()
        if main_candidates:
            mc = main_candidates[0]
            reserved_cats = reserved_addon_keys(
                sport="trilhas",
                category=str(mc.get("category", "")),
                name=str(mc.get("name", "")),
                blob="",
                addon_slots=addon_slots,
            )
        addon_candidates = pick_trilhas_candidates(
            ctx=ctx,
            products=products,
            slot="addons",
            top_n=KIT_ADDON_TOP,
            reserved_category_paths=reserved_cats,
            min_score=KIT_MIN_SCORE,
            addon_slots=addon_slots,
            price_thresholds=price_thresholds,
        )
        out["contexts"].append(
            {
                "context_key": ctx.key,
                "context": {
                    "sport": ctx.sport,
                    "level": ctx.level,
                    "duration": ctx.duration,
                    "terrain": ctx.terrain,
                    "climate": ctx.climate,
                    "budget": ctx.budget,
                    "gender": ctx.gender,
                },
                "main_candidates": main_candidates,
                "addon_candidates": addon_candidates,
            }
        )

    _write_candidates(out_path, out)
    js_path = out_path.with_suffix(".js")
    print(f"Gerado: {out_path} e {js_path} (contexts={len(out['contexts'])}, produtos trilha={len(products)})")
    return 0


def run_camping(*, combinations_path: Path, out_path: Path) -> int:
    if not PRODUCTS_CSV.is_file():
        raise SystemExit(f"Arquivo não encontrado: {PRODUCTS_CSV}")
    if not combinations_path.is_file():
        raise SystemExit(f"Arquivo não encontrado: {combinations_path}")

    raw_products = load_products(PRODUCTS_CSV)
    products: list[ProductFeat] = []
    for rp in raw_products:
        if not sport_match(rp, "camping"):
            continue
        pid = (rp.get("ProductIdVTEX", "") or "").strip()
        if not pid:
            continue
        blob = _text_blob(rp)
        tags = tag_camping_product(rp)
        products.append(
            ProductFeat(
                product_id=pid,
                name=rp.get("nome do produto", ""),
                sport=rp.get("Esporte", ""),
                category=rp.get("categoria", ""),
                brand=rp.get("Marca", ""),
                blob=blob,
                tags=tags,
                genero=(rp.get("Genero", "") or "").strip(),
                image_url=_row_image_url(rp),
                price=parse_price(rp.get("price", "")),
            )
        )
    contexts = load_camping_contexts(combinations_path)
    addon_slots = read_addon_category_slots(QUESTIONS_CAMPING)
    price_thresholds = compute_price_thresholds(products)

    out: dict[str, Any] = {
        "sport": "camping",
        "source": {
            "products_csv": str(PRODUCTS_CSV.name),
            "combinations_json": str(combinations_path.name),
            "questions_json": str(QUESTIONS_CAMPING.name),
        },
        "notes": [
            "Arquivo gerado a partir do CSV + question_camping_combinations.json.",
            "Principal do kit: barraca/tenda (tag tent); capacidade inferida do nome (prioritário) e texto; barracas fora do perfil 'nº de pessoas' ficam fora do principal.",
            "Score alinhado a nível, tipo de experiência (estruturado / isolado / trilha+camping), nº de pessoas, clima, orçamento e gênero.",
            "Orçamento e nível iniciante: coluna price do CSV — tercil inferior ganha score extra em budget e para iniciantes; premium favorece tercil superior (além das tags entry_range/tech_high).",
            "addon_candidates: campo `addon_category_slots` em questions_camping.json — um complementar por ramo do guia, na ordem do JSON (melhor score em cada ramo); colchões com isolante térmico mapeiam para o slot Isolante Térmico; fora do guia não entra. Reserva path bruto do principal + slot do principal.",
            f"Apenas produtos com score >= {KIT_MIN_SCORE}; até {KIT_MAIN_TOP} principal(is) e {KIT_ADDON_TOP} complementares por contexto.",
        ],
        "contexts": [],
    }

    for ctx in contexts:
        main_candidates = pick_camping_candidates(
            ctx=ctx,
            products=products,
            slot="main",
            top_n=KIT_MAIN_TOP,
            min_score=KIT_MIN_SCORE,
            price_thresholds=price_thresholds,
        )
        reserved_cats: set[str] = set()
        if main_candidates:
            mc = main_candidates[0]
            reserved_cats = reserved_addon_keys(
                sport="camping",
                category=str(mc.get("category", "")),
                name=str(mc.get("name", "")),
                blob="",
                addon_slots=addon_slots,
            )
        addon_candidates = pick_camping_candidates(
            ctx=ctx,
            products=products,
            slot="addons",
            top_n=KIT_ADDON_TOP,
            reserved_category_paths=reserved_cats,
            min_score=KIT_MIN_SCORE,
            addon_slots=addon_slots,
            price_thresholds=price_thresholds,
        )
        out["contexts"].append(
            {
                "context_key": ctx.key,
                "context": {
                    "sport": ctx.sport,
                    "level": ctx.level,
                    "venue": ctx.venue,
                    "party": ctx.party,
                    "climate": ctx.climate,
                    "budget": ctx.budget,
                    "gender": ctx.gender,
                },
                "main_candidates": main_candidates,
                "addon_candidates": addon_candidates,
            }
        )

    _write_candidates(out_path, out)
    js_path = out_path.with_suffix(".js")
    print(f"Gerado: {out_path} e {js_path} (contexts={len(out['contexts'])}, produtos camping={len(products)})")
    return 0


def run_corrida(*, combinations_path: Path, out_path: Path) -> int:
    if not PRODUCTS_CSV.is_file():
        raise SystemExit(f"Arquivo não encontrado: {PRODUCTS_CSV}")
    if not combinations_path.is_file():
        raise SystemExit(f"Arquivo não encontrado: {combinations_path}")

    raw_products = load_products(PRODUCTS_CSV)
    products: list[ProductFeat] = []
    for rp in raw_products:
        if not sport_match(rp, "corrida"):
            continue
        pid = (rp.get("ProductIdVTEX", "") or "").strip()
        if not pid:
            continue
        blob = _text_blob(rp)
        tags = tag_corrida_product(rp)
        products.append(
            ProductFeat(
                product_id=pid,
                name=rp.get("nome do produto", ""),
                sport=rp.get("Esporte", ""),
                category=rp.get("categoria", ""),
                brand=rp.get("Marca", ""),
                blob=blob,
                tags=tags,
                genero=(rp.get("Genero", "") or "").strip(),
                image_url=_row_image_url(rp),
                price=parse_price(rp.get("price", "")),
            )
        )
    contexts = load_corrida_contexts(combinations_path)
    addon_slots = read_addon_category_slots(QUESTIONS_CORRIDA)
    price_thresholds = compute_price_thresholds(products)

    out: dict[str, Any] = {
        "sport": "corrida",
        "source": {
            "products_csv": str(PRODUCTS_CSV.name),
            "combinations_json": str(combinations_path.name),
            "questions_json": str(QUESTIONS_CORRIDA.name),
        },
        "notes": [
            "Arquivo gerado a partir do CSV + question_corrida_combinations.json.",
            "Principal do kit: tênis de corrida de rua (tag running_shoe); trail excluído do principal.",
            "Score alinhado a uso pretendido, distância, prioridade (conforto/performance), orçamento e gênero.",
            "Orçamento: coluna price do CSV — tercil inferior ganha score extra em budget; premium favorece tercil superior.",
            "addon_candidates: campo `addon_category_slots` em questions_corrida.json — um complementar por ramo do guia, na ordem do JSON.",
            f"Apenas produtos com score >= {KIT_MIN_SCORE}; até {KIT_MAIN_TOP} principal(is) e {KIT_ADDON_TOP} complementares por contexto.",
        ],
        "contexts": [],
    }

    for ctx in contexts:
        main_candidates = pick_corrida_candidates(
            ctx=ctx,
            products=products,
            slot="main",
            top_n=KIT_MAIN_TOP,
            min_score=KIT_MIN_SCORE,
            price_thresholds=price_thresholds,
        )
        reserved_cats: set[str] = set()
        if main_candidates:
            mc = main_candidates[0]
            reserved_cats = reserved_addon_keys(
                sport="corrida",
                category=str(mc.get("category", "")),
                name=str(mc.get("name", "")),
                blob="",
                addon_slots=addon_slots,
            )
        addon_candidates = pick_corrida_candidates(
            ctx=ctx,
            products=products,
            slot="addons",
            top_n=KIT_ADDON_TOP,
            reserved_category_paths=reserved_cats,
            min_score=KIT_MIN_SCORE,
            addon_slots=addon_slots,
            price_thresholds=price_thresholds,
        )
        out["contexts"].append(
            {
                "context_key": ctx.key,
                "context": {
                    "sport": ctx.sport,
                    "usage": ctx.usage,
                    "distance": ctx.distance,
                    "priority": ctx.priority,
                    "budget": ctx.budget,
                    "gender": ctx.gender,
                },
                "main_candidates": main_candidates,
                "addon_candidates": addon_candidates,
            }
        )

    _write_candidates(out_path, out)
    js_path = out_path.with_suffix(".js")
    print(f"Gerado: {out_path} e {js_path} (contexts={len(out['contexts'])}, produtos corrida={len(products)})")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Gera JSON de candidatos a kit por esporte.")
    parser.add_argument(
        "--sport",
        choices=("fitness", "trilhas", "camping", "corrida"),
        default="fitness",
        help="Esporte / formulário (default: fitness).",
    )
    parser.add_argument(
        "--combinations",
        type=Path,
        default=None,
        help="JSON de combinações (default conforme --sport).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Arquivo de saída (default: candidates/<sport>_kit_candidates.json).",
    )
    args = parser.parse_args(argv)

    if args.sport == "fitness":
        return run_fitness(
            combinations_path=args.combinations or COMBINATIONS_JSON,
            out_path=args.out or OUT_JSON,
        )
    if args.sport == "trilhas":
        return run_trilhas(
            combinations_path=args.combinations or TRILHAS_COMBINATIONS_JSON,
            out_path=args.out or TRILHAS_OUT_JSON,
        )
    if args.sport == "camping":
        return run_camping(
            combinations_path=args.combinations or CAMPING_COMBINATIONS_JSON,
            out_path=args.out or CAMPING_OUT_JSON,
        )
    return run_corrida(
        combinations_path=args.combinations or CORRIDA_COMBINATIONS_JSON,
        out_path=args.out or CORRIDA_OUT_JSON,
    )


if __name__ == "__main__":
    raise SystemExit(main())

