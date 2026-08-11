from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.compare import CompareResponse


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def mock_compare_texts():
    mock_response = CompareResponse(
        match_percentage=87.5,
        critique="The summary captures the main themes but omits key plot details.",
    )
    with patch(
        "app.routes.compare.compare_texts_async",
        new_callable=AsyncMock,
        return_value=mock_response,
    ) as mock:
        yield mock
