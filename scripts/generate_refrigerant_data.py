"""Generate validated refrigerant saturation tables with CoolProp.

Run from repo root:
  python scripts/generate_refrigerant_data.py

The generated TypeScript module is intentionally the only production source for
pressure-temperature tables. Do not edit generated values by hand.
"""
from __future__ import annotations

import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

COOLPROP_VERSION = "6.8.0"
REFRIGERANTS = ["R32", "R410A", "R134a", "R407C", "R404A", "R22", "R290", "R600a", "R1234yf", "R744", "R454B", "R454C"]
OUT_DIR = Path("src/data/generated")


def ensure_coolprop():
    try:
        import CoolProp  # type: ignore
        return CoolProp
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", f"CoolProp=={COOLPROP_VERSION}"])
        import CoolProp  # type: ignore
        return CoolProp


def safe_props(props, output, name1, value1, name2, value2, fluid):
    try:
        value = props(output, name1, value1, name2, value2, fluid)
        if value is None or not math.isfinite(value):
            return None
        return float(value)
    except Exception:
        return None


def classify(ref: str) -> str:
    if ref in {"R407C", "R404A"}:
        return "zeotropic"
    if ref in {"R410A"}:
        return "near-azeotropic"
    return "pure"


def generate():
    CoolProp = ensure_coolprop()
    from CoolProp.CoolProp import PropsSI  # type: ignore

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    tables = []
    report = []

    for ref in REFRIGERANTS:
        critical_k = safe_props(PropsSI, "Tcrit", "", 0, "", 0, ref)
        triple_k = safe_props(PropsSI, "Ttriple", "", 0, "", 0, ref)
        if critical_k is None or triple_k is None:
            tables.append({
                "schemaVersion": 1,
                "generatedAt": generated_at,
                "generator": "pending",
                "coolPropVersion": CoolProp.__version__,
                "refrigerant": ref,
                "refrigerantType": "pending",
                "validRange": {"minC": None, "maxC": None, "minPressurePaAbs": None, "maxPressurePaAbs": None},
                "limitations": ["CoolProp no soporta este refrigerante en esta versión o falló la validación."],
                "points": [],
            })
            report.append({"refrigerant": ref, "status": "pending", "reason": "unsupported or invalid critical/triple temperature"})
            continue

        min_c = max(-60.0, triple_k - 273.15 + 1.0)
        max_c = min(critical_k - 273.15 - 1.0, 65.0)
        points = []
        for i in range(0, 126):
            temp_c = min_c + (max_c - min_c) * i / 125
            temp_k = temp_c + 273.15
            bubble_pa = safe_props(PropsSI, "P", "T", temp_k, "Q", 0, ref)
            dew_pa = safe_props(PropsSI, "P", "T", temp_k, "Q", 1, ref)
            if bubble_pa is None and dew_pa is None:
                continue
            pressure = dew_pa if dew_pa is not None else bubble_pa
            points.append({
                "pressurePaAbs": pressure,
                "bubbleC": temp_c if bubble_pa is not None else None,
                "dewC": temp_c if dew_pa is not None else None,
                "source": f"CoolProp {CoolProp.__version__}, PropsSI saturation by temperature",
                "warning": None,
            })

        valid = len(points) > 5 and all(points[j]["pressurePaAbs"] > points[j-1]["pressurePaAbs"] for j in range(1, len(points)))
        tables.append({
            "schemaVersion": 1,
            "generatedAt": generated_at,
            "generator": "CoolProp" if valid else "pending",
            "coolPropVersion": CoolProp.__version__,
            "refrigerant": ref,
            "refrigerantType": classify(ref) if valid else "pending",
            "validRange": {
                "minC": min_c if valid else None,
                "maxC": max_c if valid else None,
                "minPressurePaAbs": points[0]["pressurePaAbs"] if valid else None,
                "maxPressurePaAbs": points[-1]["pressurePaAbs"] if valid else None,
            },
            "limitations": ["No se calcula saturación por encima de la temperatura crítica."] if valid else ["Falló la validación monotónica."],
            "points": points if valid else [],
        })
        report.append({"refrigerant": ref, "status": "ok" if valid else "failed", "points": len(points)})

    ts = "import type { RefrigerantTable } from './refrigerants'\n\nexport const generatedRefrigerantTables: RefrigerantTable[] = " + json.dumps(tables, ensure_ascii=False, indent=2) + "\n"
    (OUT_DIR / "coolprop-tables.ts").write_text(ts, encoding="utf-8")
    (OUT_DIR / "validation-report.json").write_text(json.dumps({"generatedAt": generated_at, "coolPropVersion": getattr(CoolProp, "__version__", None), "report": report}, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    generate()
