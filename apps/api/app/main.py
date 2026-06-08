from fastapi import FastAPI

app = FastAPI(title="Smart Intersection API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
