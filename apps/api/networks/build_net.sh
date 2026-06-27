#!/usr/bin/env bash
#
# build_net.sh — rebuild apps/api/networks/intersection.net.xml from the
# plain-XML gangnam.* inputs (nodes/edges/connections/TLS) using netconvert.
#
# intersection.net.xml is a BUILT artifact — never hand-edit it. Edit the
# gangnam.* inputs and re-run this script instead.
#
# WHY gangnam_build.tll.xml (19-char states) instead of gangnam.tll.xml (8-char):
#   netconvert 1.27.0 IGNORES the explicit linkIndex attributes in
#   gangnam.con.xml and assigns its own sequential linkIndex per connection
#   (0..18 for our 19 connections). An 8-char TLS state can only address
#   indices 0-7, so feeding gangnam.tll.xml here fails with
#   "Invalid linkIndex 8 for traffic light 'gangnam_center' with 8 links".
#   gangnam_build.tll.xml encodes the SAME 8-phase protected-left logic but
#   with 19-char state strings, one char per netconvert-assigned link.
#
#   gangnam.tll.xml remains the human-readable 8-char authoring view (one char
#   per N/E/S/W through+left group). Keep the two in sync: any phase-logic or
#   timing change must be mirrored in both files. The phase count (8) and the
#   built-net state width (19) are guarded by tests in
#   tests/test_gangnam_net_build.py.
#
# Run from anywhere; the script cd's into apps/api itself.
set -euo pipefail

API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_DIR"

uv run --extra simulation netconvert \
  --node-files networks/gangnam.nod.xml \
  --edge-files networks/gangnam.edg.xml \
  --connection-files networks/gangnam.con.xml \
  --tllogic-files networks/gangnam_build.tll.xml \
  --output-file networks/intersection.net.xml \
  --default.lanewidth 3.6 \
  --offset.disable-normalization true \
  --no-turnarounds true
