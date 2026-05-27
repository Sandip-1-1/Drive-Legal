# violations.py
# ─────────────────────────────────────────────
# Violation Handler — server side.
#
# SEPARATION OF CONCERNS:
#   rules.py      = WHAT the rules are (data)
#   violations.py = WHAT TO DO when broken (logic)
#
# This means you can change fine amounts in rules.py
# without touching this file, and vice versa.
# They never mix — same principle as your JS code.
# ─────────────────────────────────────────────

from datetime import datetime
from rules import get_rule


def process_violation(violation_type, player_id="player_1"):
    """
    Process a single violation event.

    Parameters:
        violation_type : string — e.g. 'red_light', 'speeding'
        player_id      : string — who committed the violation

    Returns:
        dict with success, fine, message, timestamp etc.
        OR dict with success=False and error message
    """

    # Step 1 — look up the rule
    rule = get_rule(violation_type)

    # Step 2 — if rule not found, return error response
    # This handles typos or unknown violation types
    # gracefully instead of crashing
    if rule is None:
        return {
            "success": False,
            "error": f"Unknown violation type: '{violation_type}'"
        }

    # Step 3 — build the response dict
    # datetime.now().isoformat() gives a timestamp like:
    # "2026-05-27T14:32:10.123456"
    result = {
        "success":        True,
        "violation_type": violation_type,
        "player_id":      player_id,
        "fine":           rule["fine"],
        "severity":       rule["severity"],
        "message":        rule["message"],
        "detail":         rule["detail"],
        "points":         rule["points"],
        "timestamp":      datetime.now().isoformat()
    }

    # Step 4 — print to server terminal
    # You'll see this in Terminal 1 when violations occur
    # Very useful for debugging
    print(
        f"[VIOLATION] {player_id}"
        f" | {rule['message']}"
        f" | ₹{rule['fine']}"
    )

    return result