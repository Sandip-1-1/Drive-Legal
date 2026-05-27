# rules.py
# ─────────────────────────────────────────────
# The Rule Engine — server side.
#
# WHY move rules to the server?
# If rules only live in the browser (your JS),
# anyone can open DevTools and edit them.
# Rules on the server are the authoritative source.
# The game just displays what the server says.
#
# This is identical in concept to your JS RULES
# object in MainScene.js — just Python syntax.
# ─────────────────────────────────────────────

RULES = {
    "red_light": {
        "fine":     1000,
        "severity": "high",
        "message":  "Red Light Violation",
        "detail":   "Vehicle crossed intersection on a red signal.",
        "points":   3
    },
    "speeding": {
        "fine":     500,
        "severity": "medium",
        "message":  "Speeding Violation",
        "detail":   "Vehicle exceeded the speed limit.",
        "points":   2
    },
    "red_light_speeding": {
        "fine":     2000,
        "severity": "critical",
        "message":  "Red Light + Speeding",
        "detail":   "Multiple violations detected simultaneously.",
        "points":   5
    },
    "wrong_way": {
        "fine":     750,
        "severity": "high",
        "message":  "Wrong Way Driving",
        "detail":   "Vehicle detected driving against traffic flow.",
        "points":   3
    }
}


def get_rule(violation_type):
    """
    Look up a single rule by type.
    Returns the rule dict, or None if not found.

    Usage:
        rule = get_rule('red_light')
        rule['fine']    → 1000
        rule['message'] → 'Red Light Violation'

    .get() is used instead of RULES[violation_type]
    because .get() returns None safely if key missing.
    RULES[violation_type] would crash with KeyError.
    """
    return RULES.get(violation_type, None)


def get_all_rules():
    """
    Return all rules as a dict.
    Used by the GET /rules endpoint so the frontend
    can fetch current fines and messages from server.
    """
    return RULES