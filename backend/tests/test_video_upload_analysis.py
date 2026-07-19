"""Video upload and analysis backend tests."""
import base64
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")

SHOT_TYPES = ["serve", "forehand", "backhand", "volley"]

# Small mock base64 (represents "hello video" bytes)
SHORT_MOCK_B64 = base64.b64encode(b"hello_video_data_mock").decode()
# Slightly larger mock to test truncation path (~1KB)
LARGE_MOCK_B64 = base64.b64encode(b"A" * 1024).decode()


# ---------- Health ----------
class TestHealth:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200


# ---------- Auth guard ----------
class TestAuthGuard:
    def test_upload_requires_auth(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/videos/upload",
            json={"shot_type": "serve", "video_base64": SHORT_MOCK_B64},
        )
        assert r.status_code == 401

    def test_analyze_requires_auth(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/videos/analyze", json={"video_id": "nope"}
        )
        assert r.status_code == 401

    def test_get_me_ok(self, api_client, base_url, auth_headers, test_user):
        r = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["user_id"] == test_user["user_id"]


# ---------- Upload ----------
class TestVideoUpload:
    @pytest.mark.parametrize("shot_type", SHOT_TYPES)
    def test_upload_all_shot_types(self, api_client, base_url, auth_headers, shot_type):
        r = api_client.post(
            f"{base_url}/api/videos/upload",
            headers=auth_headers,
            json={"shot_type": shot_type, "video_base64": SHORT_MOCK_B64},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert isinstance(data.get("video_id"), str) and data["video_id"].startswith("video_")

    def test_upload_short_mock_data(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/videos/upload",
            headers=auth_headers,
            json={"shot_type": "forehand", "video_base64": "abc123"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("video_id")

    def test_upload_larger_mock_data(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/videos/upload",
            headers=auth_headers,
            json={"shot_type": "backhand", "video_base64": LARGE_MOCK_B64},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("video_id")

    def test_first_upload_achievement_awarded(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/achievements/list", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        first_upload = next(
            (a for a in data["achievements"] if a["id"] == "first_upload"), None
        )
        assert first_upload is not None
        assert first_upload["earned"] is True, "first_upload achievement should be awarded after upload"


# ---------- Analysis ----------
class TestVideoAnalysis:
    REQUIRED_FIELDS = [
        "technique_score",
        "footwork_feedback",
        "swing_timing",
        "contact_point",
        "balance_rating",
        "suggested_fixes",
        "pro_comparison",
    ]

    def _upload(self, api_client, base_url, auth_headers, shot_type):
        r = api_client.post(
            f"{base_url}/api/videos/upload",
            headers=auth_headers,
            json={"shot_type": shot_type, "video_base64": SHORT_MOCK_B64},
        )
        assert r.status_code == 200, r.text
        return r.json()["video_id"]

    @pytest.mark.parametrize("shot_type", SHOT_TYPES)
    def test_analyze_all_shot_types(
        self, api_client, base_url, auth_headers, shot_type
    ):
        video_id = self._upload(api_client, base_url, auth_headers, shot_type)
        # AI can be slow
        r = api_client.post(
            f"{base_url}/api/videos/analyze",
            headers=auth_headers,
            json={"video_id": video_id},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        analysis = body.get("analysis")
        assert isinstance(analysis, dict)
        for f in self.REQUIRED_FIELDS:
            assert f in analysis, f"missing field {f} in analysis for {shot_type}"

        # Type checks
        assert isinstance(analysis["technique_score"], int)
        assert 1 <= analysis["technique_score"] <= 100
        assert isinstance(analysis["balance_rating"], int)
        assert 1 <= analysis["balance_rating"] <= 10
        assert isinstance(analysis["suggested_fixes"], list)
        assert len(analysis["suggested_fixes"]) >= 1
        assert isinstance(analysis["footwork_feedback"], str) and analysis["footwork_feedback"]
        assert isinstance(analysis["swing_timing"], str) and analysis["swing_timing"]
        assert isinstance(analysis["contact_point"], str) and analysis["contact_point"]
        assert isinstance(analysis["pro_comparison"], str) and analysis["pro_comparison"]

        # XP awarded 50
        assert body.get("xp_earned") == 50

    def test_analyze_nonexistent_video(self, api_client, base_url, auth_headers):
        r = api_client.post(
            f"{base_url}/api/videos/analyze",
            headers=auth_headers,
            json={"video_id": "video_does_not_exist"},
            timeout=30,
        )
        assert r.status_code == 404

    def test_xp_increments_after_analysis(
        self, api_client, base_url, auth_headers
    ):
        # Snapshot current XP
        me = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers).json()
        xp_before = me.get("xp", 0)

        video_id = self._upload(api_client, base_url, auth_headers, "forehand")
        r = api_client.post(
            f"{base_url}/api/videos/analyze",
            headers=auth_headers,
            json={"video_id": video_id},
            timeout=90,
        )
        assert r.status_code == 200
        me2 = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers).json()
        assert me2.get("xp", 0) - xp_before >= 50


# ---------- Full flow ----------
class TestFullFlow:
    def test_upload_analyze_list_persistence(
        self, api_client, base_url, auth_headers
    ):
        # Upload
        up = api_client.post(
            f"{base_url}/api/videos/upload",
            headers=auth_headers,
            json={"shot_type": "serve", "video_base64": SHORT_MOCK_B64},
        )
        assert up.status_code == 200
        video_id = up.json()["video_id"]

        # Analyze
        an = api_client.post(
            f"{base_url}/api/videos/analyze",
            headers=auth_headers,
            json={"video_id": video_id},
            timeout=90,
        )
        assert an.status_code == 200

        # Verify appears in list and is marked analyzed
        lst = api_client.get(f"{base_url}/api/videos/list", headers=auth_headers)
        assert lst.status_code == 200
        videos = lst.json().get("videos", [])
        this_video = next((v for v in videos if v["video_id"] == video_id), None)
        assert this_video is not None
        assert this_video.get("analyzed") is True
        assert this_video.get("analysis_result") is not None
