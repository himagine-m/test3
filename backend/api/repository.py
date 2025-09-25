# backend/api/repository.py
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

# ルート = backend/
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DEVICES_DIR = DATA_DIR / "devices"
HISTORY_DIR = DATA_DIR / "history"

def _ensure_dirs():
    DEVICES_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

_ensure_dirs()

def list_floor_files() -> List[Path]:
    return sorted(DEVICES_DIR.glob("*.geojson"))

def floor_file(floor_id: str) -> Path:
    return DEVICES_DIR / f"{floor_id}.geojson"

def ensure_history_dir():
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

def load_floor_geojson(floor_id: str) -> Dict[str, Any]:
    fp = floor_file(floor_id)
    if not fp.exists():
        # 新規Floorは空のコレクションで作成
        fc = {"type": "FeatureCollection", "features": []}
        save_floor_geojson(floor_id, fc)
        return fc
    with fp.open("r", encoding="utf-8") as f:
        return json.load(f)

def save_floor_geojson(floor_id: str, data: Dict[str, Any]) -> None:
    fp = floor_file(floor_id)
    tmp = fp.with_suffix(".geojson.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(fp)

# --- History (JSON Lines: 1行1イベント) ---

def history_file(floor_id: Optional[str] = None) -> Path:
    # フロア毎の履歴ファイル（floor別に分ける）
    name = f"history_{floor_id}.jsonl" if floor_id else "history_all.jsonl"
    return HISTORY_DIR / name

def append_history_event(action: str, floor_id: str, feature: Dict[str, Any], before: Optional[Dict[str, Any]] = None):
    ensure_history_dir()
    event = {
        "action": action,  # "create" | "update" | "delete"
        "floor": floor_id,
        "device_id": feature.get("properties", {}).get("id"),
        "feature": feature,
        "before": before,
    }
    # all + floor別 両方に書く
    for fid in (None, floor_id):
        fp = history_file(fid)
        with fp.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")

def read_history_events(floor_id: Optional[str], limit: int = 100) -> List[Dict[str, Any]]:
    fp = history_file(floor_id)
    if not fp.exists():
        return []
    # 末尾からlimit件読む（簡易実装）
    with fp.open("r", encoding="utf-8") as f:
        lines = f.readlines()
    lines = lines[-limit:]
    return [json.loads(line) for line in lines]