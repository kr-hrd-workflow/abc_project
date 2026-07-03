import app.core.config as config

# Repo .env pins SUMO_SIMULATION_MODE=sumo_traci as the DEPLOYMENT default.
# Pytest must run fixture mode: disable dotenv autoload so fresh Settings()
# and the import-time routes singletons default to fixture. An explicit
# Settings(_env_file=...) still reads its file (env-example test). OS env
# vars still win (intentional override path).
# ponytail: process-global mutation, fine — only the pytest process runs this.
config.Settings.model_config["env_file"] = None
config.settings = config.Settings()
