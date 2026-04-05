from pathlib import Path

from pydantic_settings import BaseSettings

_root = Path(__file__).resolve().parent.parent.parent


def _validated_path(path_str: str, label: str) -> str:
    resolved = Path(path_str).resolve()
    if not str(resolved).startswith(str(_root)):
        raise ValueError(f"{label} path escapes project root: {resolved}")
    return str(resolved)


class Settings(BaseSettings):
    risk_scores_path: str = str(_root / "ml" / "artifacts" / "risk_scores.geojson")
    hydrants_path: str = str(_root / "data" / "ca_hydrants_osm.geojson")
    lakes_path: str = str(_root / "data" / "lakes" / "California_Lakes.shp")
    incidents_path: str = str(_root / "data" / "California_Fire_Incidents.csv")
    port: int = 8000

    class Config:
        env_file = ".env"

    def model_post_init(self, __context) -> None:
        self.risk_scores_path = _validated_path(self.risk_scores_path, "risk_scores_path")
        self.hydrants_path = _validated_path(self.hydrants_path, "hydrants_path")
        self.lakes_path = _validated_path(self.lakes_path, "lakes_path")
        self.incidents_path = _validated_path(self.incidents_path, "incidents_path")


settings = Settings()
