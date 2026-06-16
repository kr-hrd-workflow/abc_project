"""Path shim for `npm run test:api -- test_simulation_snapshot.py`.

The root npm script already passes the `tests` directory to pytest. This file
keeps the plan's bare-filename verification command resolvable from apps/api.
"""
