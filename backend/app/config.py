from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "dev-secret-change-in-production"
    ENVIRONMENT: str = "development"
    GOOGLE_PLACES_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    GOOGLE_CLIENT_ID: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour; refresh token handles long sessions

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
