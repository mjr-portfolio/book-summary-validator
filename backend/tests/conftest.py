from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.compare import (
    CompareResponse,
    GenerateQuestionsResponse,
    GradeAnswerResult,
    GradeAnswersResponse,
    StudyQuestion,
)


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


@pytest.fixture
def mock_generate_study_questions():
    mock_response = GenerateQuestionsResponse(
        questions=[
            StudyQuestion(question="What is the main theme?"),
            StudyQuestion(question="Who is the protagonist?"),
            StudyQuestion(question="What conflict drives the plot?"),
        ]
    )
    with patch(
        "app.routes.compare.generate_study_questions_async",
        new_callable=AsyncMock,
        return_value=mock_response,
    ) as mock:
        yield mock


@pytest.fixture
def mock_grade_study_answers():
    mock_response = GradeAnswersResponse(
        results=[
            GradeAnswerResult(
                is_correct=True,
                feedback="Accurate.",
                hint="Keep reviewing themes.",
            ),
            GradeAnswerResult(
                is_correct=False,
                feedback="Incomplete.",
                hint="Revisit character roles.",
            ),
            GradeAnswerResult(
                is_correct=True,
                feedback="Solid.",
                hint="Consider secondary conflicts too.",
            ),
        ],
        correct_count=2,
    )
    with patch(
        "app.routes.compare.grade_study_answers_async",
        new_callable=AsyncMock,
        return_value=mock_response,
    ) as mock:
        yield mock
