import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.security import require_internal_key


def _client():
    app = FastAPI()

    @app.post("/x", dependencies=[Depends(require_internal_key)])
    def x():
        return {"ok": True}

    return TestClient(app)


def test_rejects_missing_key(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "secret123")
    get_settings.cache_clear()
    assert _client().post("/x").status_code == 401


def test_rejects_wrong_key(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "secret123")
    get_settings.cache_clear()
    assert _client().post("/x", headers={"X-Internal-Key": "nope"}).status_code == 401


def test_accepts_correct_key(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "secret123")
    get_settings.cache_clear()
    assert _client().post("/x", headers={"X-Internal-Key": "secret123"}).status_code == 200


def test_dev_without_key_is_open():
    assert _client().post("/x").status_code == 200


def test_production_requires_key():
    with pytest.raises(ValidationError):
        Settings(app_env="production", _env_file=None)