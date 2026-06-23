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


def logspace(start: float, stop: float, count: int) -> list[float]:
    if start <= 0 or stop <= 0:
        raise ValueError("logspace requires positive bounds")
    start_log = math.log(start)
    stop_log = math.log(stop)
    return [math.exp(start_log + (stop_log - start_log) * i / (count - 1)) for i in range(count)]


def saturation_pressure_at_temp(props, ref: str, temp_c: float, quality: int) -> float | None:
    return safe_props(props, "P", "T", temp_c + 273.15, "Q", quality, ref)


def saturation_temp_at_pressure(props, ref: str, pressure_pa: float, quality: int) -> float | None:
    temp_k = safe_props(props, "T", "P", pressure_pa, "Q", quality, ref)
    if temp_k is None:
        return None
    return temp_k - 273.15


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

        min_bubble_pa = saturation_pressure_at_temp(PropsSI, ref, min_c, 0)
        min_dew_pa = saturation_pressure_at_temp(PropsSI, ref, min_c, 1)
        max_bubble_pa = saturation_pressure_at_temp(PropsSI, ref, max_c, 0)
        max_dew_pa = saturation_pressure_at_temp(PropsSI, ref, max_c, 1)
        pressure_min = max(value for value in [min_bubble_pa, min_dew_pa] if value is not None)
        pressure_max = min(value for value in [max_bubble_pa, max_dew_pa] if value is not None)

        points = []
        for pressure in logspace(pressure_min, pressure_max, 181):
            bubble_c = saturation_temp_at_pressure(PropsSI, ref, pressure, 0)
            dew_c = saturation_temp_at_pressure(PropsSI, ref, pressure, 1)
            if bubble_c is None and dew_c is None:
                continue
            points.append({
                "pressurePaAbs": pressure,
                "bubbleC": bubble_c,
                "dewC": dew_c,
                "source": f"CoolProp {CoolProp.__version__}, PropsSI saturation by pressure",
                "warning": None,
            })

        valid = (
            len(points) > 5
            and all(points[j]["pressurePaAbs"] > points[j-1]["pressurePaAbs"] for j in range(1, len(points)))
            and all(
                point["bubbleC"] is None
                or point["dewC"] is None
                or point["dewC"] >= point["bubbleC"] - 1e-6
                for point in points
            )
        )
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
