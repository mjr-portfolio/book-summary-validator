from pydantic import BaseModel, field_validator


class CompareRequest(BaseModel):
    book_text: str
    user_summary: str

    @field_validator("book_text", "user_summary")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value


class CompareResponse(BaseModel):
    match_percentage: float
    critique: str

    @field_validator("match_percentage")
    @classmethod
    def validate_percentage_range(cls, value: float) -> float:
        if not 0 <= value <= 100:
            raise ValueError("match_percentage must be between 0 and 100")
        return value


class ExtractTextResponse(BaseModel):
    extracted_text: str

    @field_validator("extracted_text")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("extracted_text must not be empty")
        return value


class LookupTextResponse(BaseModel):
    extracted_text: str

    @field_validator("extracted_text")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("extracted_text must not be empty")
        return value


class ScrapeUrlResponse(BaseModel):
    extracted_text: str

    @field_validator("extracted_text")
    @classmethod
    def must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("extracted_text must not be empty")
        return value
