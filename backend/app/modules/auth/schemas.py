from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    phrase: str | None = Field(None, min_length=4, max_length=200)


class RegisterResponse(BaseModel):
    user_uid: str
    token: str
    has_phrase: bool


class LoginRequest(BaseModel):
    user_uid: str = Field(min_length=36, max_length=36)


class LoginResponse(BaseModel):
    token: str


class RecoverRequest(BaseModel):
    user_uid: str = Field(min_length=36, max_length=36)
    phrase: str = Field(min_length=4, max_length=200)


class RecoverResponse(BaseModel):
    token: str


class SetPhraseRequest(BaseModel):
    phrase: str = Field(min_length=4, max_length=200)
