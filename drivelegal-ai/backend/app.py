# app.py
# ─────────────────────────────────────────────
# The Flask Server — your backend brain.
#
# WHAT FLASK DOES:
# It listens on a port (5000) for HTTP requests.
# When a request arrives, it matches the URL to
# a route function, runs that function, and sends
# the response back.
#
# That's it. Simple but powerful.
#
# HTTP VERBS you'll use:
#   GET  = "give me data, I'm not sending any"
#   POST = "I'm sending you data, process it"
# ─────────────────────────────────────────────

from flask import Flask, request, jsonify
from flask_cors import CORS
from rules import get_all_rules
from violations import process_violation


# ── CREATE THE APP ────────────────────────────
# Flask(__name__) creates the application.
# __name__ tells Flask where this file lives
# so it can find other files relative to it.
app = Flask(__name__)


# ── ENABLE CORS ───────────────────────────────
# CORS = Cross-Origin Resource Sharing.
#
# Without this, your browser BLOCKS requests
# from localhost:5173 (Vite) to localhost:5000 (Flask).
# This is a browser security feature called
# the "Same Origin Policy."
#
# CORS(app) tells Flask to add headers that say:
# "yes, other origins are allowed to talk to me."
CORS(app)


# ─────────────────────────────────────────────
# ROUTES
#
# A route = a URL pattern + HTTP verb + function.
# The @app.route decorator registers the function
# as the handler for that URL + verb combination.
#
# When Flask receives a request, it finds the
# matching route and calls that function.
# The function MUST return a response.
# ─────────────────────────────────────────────


# ── ROUTE 1: Health Check ─────────────────────
# GET http://localhost:5000/
#
# Always build this first.
# If you visit this URL and see the JSON,
# your server is running correctly.
# A standard practice in all real backends.
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status":  "running",
        "message": "DriveLegal API is online",
        "version": "1.0.0"
    })


# ── ROUTE 2: Get All Rules ────────────────────
# GET http://localhost:5000/rules
#
# Frontend calls this on startup to fetch
# current fine amounts from the server.
# This way the game always shows server-accurate
# fines — not hardcoded frontend values.
@app.route('/rules', methods=['GET'])
def get_rules():
    rules = get_all_rules()
    return jsonify({
        "success": True,
        "rules":   rules,
        "count":   len(rules)
    })


# ── ROUTE 3: Get Single Rule ──────────────────
# GET http://localhost:5000/rules/red_light
# GET http://localhost:5000/rules/speeding
#
# <violation_type> is a URL parameter.
# Flask extracts it from the URL automatically
# and passes it as a function argument.
@app.route('/rules/<violation_type>', methods=['GET'])
def get_single_rule(violation_type):
    from rules import get_rule
    rule = get_rule(violation_type)

    if rule is None:
        return jsonify({
            "success": False,
            "error":   f"Rule '{violation_type}' not found"
        }), 404    # 404 = Not Found

    return jsonify({
        "success":        True,
        "violation_type": violation_type,
        "rule":           rule
    })


# ── ROUTE 4: Report Violation ─────────────────
# POST http://localhost:5000/violation
#
# Frontend calls this when player breaks a rule.
#
# Request body (JSON):
#   { "type": "red_light", "player_id": "player_1" }
#
# Response (JSON):
#   { "success": true, "fine": 1000, "message": "...", ... }
@app.route('/violation', methods=['POST'])
def report_violation():

    # request.json reads the JSON body the frontend sent
    # If frontend sent: {"type": "red_light"}
    # then request.json = {"type": "red_light"}
    data = request.json

    # ── INPUT VALIDATION ──────────────────────
    # Never trust that the frontend sent correct data.
    # Always validate before using it.
    # Return clear error messages so debugging is easy.

    if not data:
        return jsonify({
            "success": False,
            "error":   "No JSON data received"
        }), 400    # 400 = Bad Request

    violation_type = data.get('type')
    player_id      = data.get('player_id', 'player_1')

    if not violation_type:
        return jsonify({
            "success": False,
            "error":   "Missing required field: 'type'"
        }), 400

    if not isinstance(violation_type, str):
        return jsonify({
            "success": False,
            "error":   "Field 'type' must be a string"
        }), 400

    # ── PROCESS VIOLATION ─────────────────────
    result = process_violation(violation_type, player_id)

    # Unknown violation type — process_violation returned error
    if not result["success"]:
        return jsonify(result), 404

    # Success — return result with 200 OK
    return jsonify(result), 200


# ── ROUTE 5: Ask AI (Stub) ────────────────────
# POST http://localhost:5000/ask-ai
#
# This is a PLACEHOLDER for Phase 6.
# We build the route now so the URL exists
# and the frontend can already call it.
# Real AI logic replaces the stub in Phase 6.
#
# "Stubbing" = building the skeleton first,
# real implementation comes later.
# Standard professional practice.
@app.route('/ask-ai', methods=['POST'])
def ask_ai():
    data = request.json

    if not data or not data.get('question'):
        return jsonify({
            "success": False,
            "error":   "Missing required field: 'question'"
        }), 400

    question = data.get('question')
    context  = data.get('context', '')

    # Stub response — Phase 6 replaces this with real AI
    return jsonify({
        "success":  True,
        "question": question,
        "answer":   f"[Phase 6 stub] You asked: '{question}'. Real AI coming soon.",
        "context":  context
    })


# ── START THE SERVER ──────────────────────────
# __name__ == '__main__' means:
# "only run this if this file is executed directly"
# "not if it's imported by another file"
#
# debug=True:
#   - auto-restarts when you save changes
#   - shows detailed error pages in browser
#   - NEVER use in production
#
# port=5000 is Flask's default
if __name__ == '__main__':
    app.run(debug=True, port=5000)