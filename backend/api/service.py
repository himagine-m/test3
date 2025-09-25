# backend/api/service.py
import copy
import time
import uuid
from typing import Dict, Any, Optional
from .repository import (
    list_floor_files,
    load_floor_geojson,
    save_floor_geojson,
    ensure_history_dir,
    append_history_event,
    read_history_events,
)

def _now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def list_floors():
    files = list_floor_files()
    # ファイル名（拡張子なし）= floor_id として返却
    return [f.stem for f in files]

def get_devices(floor_id: str) -> Dict[str, Any]:
    fc = load_floor_geojson(floor_id)
    _ensure_feature_collection(fc)
    return fc

def get_device(floor_id: str, device_id: str) -> Dict[str, Any]:
    fc = load_floor_geojson(floor_id)
    _ensure_feature_collection(fc)
    for feat in fc["features"]:
        if str(feat.get("properties", {}).get("id")) == str(device_id):
            return feat
    raise _not_found(f"Device not found: {device_id}")

def create_device(floor_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    # 受け付け形式：
    # - GeoJSON Feature そのまま
    # - { "properties": {...}, "geometry": {...} }
    feature = _normalize_feature(payload)
    _validate_feature_minimal(feature)

    # ID自動採番（なければ付与）
    props = feature.setdefault("properties", {})
    if "id" not in props or not props["id"]:
        props["id"] = str(uuid.uuid4())

    # 監査情報
    now = _now_iso()
    props["created_at"] = props.get("created_at", now)
    props["updated_at"] = now

    fc = load_floor_geojson(floor_id)
    _ensure_feature_collection(fc)

    # 既存ID重複チェック
    if any(str(f.get("properties", {}).get("id")) == str(props["id"]) for f in fc["features"]):
        raise _bad_request(f"Device id already exists: {props['id']}")

    fc["features"].append(feature)
    save_floor_geojson(floor_id, fc)

    append_history_event("create", floor_id=floor_id, feature=feature)
    return feature

def update_device(floor_id: str, device_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    fc = load_floor_geojson(floor_id)
    _ensure_feature_collection(fc)

    idx = None
    for i, feat in enumerate(fc["features"]):
        if str(feat.get("properties", {}).get("id")) == str(device_id):
            idx = i
            break
    if idx is None:
        raise _not_found(f"Device not found: {device_id}")

    existing = copy.deepcopy(fc["features"][idx])

    # PATCH（properties/geometry/全体）
    if "type" in patch and patch.get("type") == "Feature":
        # 全置換
        new_feature = _normalize_feature(patch)
    else:
        # 部分更新
        new_feature = copy.deepcopy(existing)
        if "properties" in patch and isinstance(patch["properties"], dict):
            new_feature.setdefault("properties", {}).update(patch["properties"])
        if "geometry" in patch and isinstance(patch["geometry"], dict):
            new_feature["geometry"] = patch["geometry"]

    _validate_feature_minimal(new_feature)

    # idは固定（URLの device_id がソースオブトゥルース）
    new_feature.setdefault("properties", {})["id"] = str(device_id)
    new_feature["properties"]["updated_at"] = _now_iso()
    # created_atは引き継ぐ
    if "created_at" not in new_feature["properties"]:
        new_feature["properties"]["created_at"] = existing.get("properties", {}).get("created_at", _now_iso())

    fc["features"][idx] = new_feature
    save_floor_geojson(floor_id, fc)

    append_history_event("update", floor_id=floor_id, feature=new_feature, before=existing)
    return new_feature

def delete_device(floor_id: str, device_id: str) -> None:
    fc = load_floor_geojson(floor_id)
    _ensure_feature_collection(fc)
    before_len = len(fc["features"])
    kept = [f for f in fc["features"] if str(f.get("properties", {}).get("id")) != str(device_id)]
    if len(kept) == before_len:
        raise _not_found(f"Device not found: {device_id}")
    fc["features"] = kept
    save_floor_geojson(floor_id, fc)

    append_history_event("delete", floor_id=floor_id, feature={"properties": {"id": device_id}})

def list_history(floor_id: Optional[str], limit: int = 100):
    ensure_history_dir()
    return read_history_events(floor_id=floor_id, limit=limit)

# -------- Helpers --------

def _ensure_feature_collection(fc: Dict[str, Any]):
    if not isinstance(fc, dict) or fc.get("type") != "FeatureCollection":
        raise _server_error("Invalid GeoJSON on disk: not a FeatureCollection")
    fc.setdefault("features", [])

def _normalize_feature(obj: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(obj, dict):
        raise _bad_request("Payload must be a JSON object")
    if obj.get("type") == "Feature":
        return {"type": "Feature", "properties": obj.get("properties", {}), "geometry": obj.get("geometry")}
    # フィールド直指定でも受け付け
    return {"type": "Feature", "properties": obj.get("properties", {}), "geometry": obj.get("geometry")}

def _validate_feature_minimal(feature: Dict[str, Any]):
    if feature.get("type") != "Feature":
        raise _bad_request("Feature.type must be 'Feature'")
    geom = feature.get("geometry")
    if not isinstance(geom, dict) or "type" not in geom or "coordinates" not in geom:
        raise _bad_request("Feature.geometry must include type and coordinates")
    # 必須プロパティ例（必要に応じて拡張）
    props = feature.setdefault("properties", {})
    # 名称・種別など任意
    if not isinstance(props, dict):
        raise _bad_request("Feature.properties must be an object")

# -------- Error helpers --------

class APIError(Exception):
    status = 400
    def __init__(self, message, status=None):
        super().__init__(message)
        if status:
            self.status = status
        self.message = message

def _bad_request(msg): return APIError(msg, status=400)
def _not_found(msg):  return APIError(msg, status=404)
def _server_error(msg): return APIError(msg, status=500)