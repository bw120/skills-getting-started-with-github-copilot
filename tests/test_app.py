import copy
import os
import sys
import pytest

# Ensure src is importable
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from app import app, activities
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    original = copy.deepcopy(activities)
    client = TestClient(app)
    yield client
    # restore original in-memory DB
    activities.clear()
    activities.update(original)


def test_get_activities(client):
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_unregister(client):
    email = "newstudent@example.com"
    activity = "Chess Club"

    # sign up
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    assert r.json()["message"] == f"Signed up {email} for {activity}"

    # verify participant added
    r2 = client.get("/activities")
    assert email in r2.json()[activity]["participants"]

    # unregister
    r3 = client.post(f"/activities/{activity}/unregister", params={"email": email})
    assert r3.status_code == 200
    assert r3.json()["message"] == f"Removed {email} from {activity}"

    r4 = client.get("/activities")
    assert email not in r4.json()[activity]["participants"]


def test_signup_existing_returns_400(client):
    # pick an existing participant
    activity = "Chess Club"
    existing = activities[activity]["participants"][0]
    r = client.post(f"/activities/{activity}/signup", params={"email": existing})
    assert r.status_code == 400


def test_unregister_missing_returns_404(client):
    activity = "Chess Club"
    missing = "notfound@example.com"
    r = client.post(f"/activities/{activity}/unregister", params={"email": missing})
    assert r.status_code == 404


def test_activity_not_found_returns_404(client):
    r = client.post(f"/activities/NO_SUCH_ACTIVITY/signup", params={"email": "x@y.com"})
    assert r.status_code == 404
    r2 = client.post(f"/activities/NO_SUCH_ACTIVITY/unregister", params={"email": "x@y.com"})
    assert r2.status_code == 404
