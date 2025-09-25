# backend/api/route.py
from flask import Blueprint, jsonify, request
from .service import (
    list_floors,
    get_devices,
    get_device,
    create_device,
    update_device,
    delete_device,
    list_history,
)

api_bp = Blueprint("api", __name__)

# Floors
@api_bp.get("/floors")
def floors():
    floors = list_floors()
    return jsonify({"floors": floors}), 200

# Devices (collection)
@api_bp.get("/floors/<floor_id>/devices")
def devices(floor_id):
    feature_collection = get_devices(floor_id)
    return jsonify(feature_collection), 200

@api_bp.post("/floors/<floor_id>/devices")
def devices_create(floor_id):
    payload = request.get_json(silent=True) or {}
    feature = create_device(floor_id, payload)
    return jsonify(feature), 201

# Device (single)
@api_bp.get("/floors/<floor_id>/devices/<device_id>")
def device_detail(floor_id, device_id):
    feature = get_device(floor_id, device_id)
    return jsonify(feature), 200

# PATCH: 部分更新（properties / geometry どちらかでも可）
@api_bp.patch("/floors/<floor_id>/devices/<device_id>")
def device_patch(floor_id, device_id):
    payload = request.get_json(silent=True) or {}
    feature = update_device(floor_id, device_id, payload)
    return jsonify(feature), 200

@api_bp.delete("/floors/<floor_id>/devices/<device_id>")
def device_delete(floor_id, device_id):
    delete_device(floor_id, device_id)
    return jsonify({"deleted": True}), 200

# History (最新N件)
@api_bp.get("/history")
def history():
    floor_id = request.args.get("floor")
    limit = int(request.args.get("limit", "100"))
    items = list_history(floor_id=floor_id, limit=limit)
    return jsonify({"history": items}), 200