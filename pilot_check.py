"""Offline pilot: validates the supplied CSVs without opening Facebook."""
import csv
import json
from pathlib import Path
from unittest.mock import patch
from helpers import listing_helper

def main():
    root = Path(__file__).resolve().parent
    problems = []
    counts = {}
    for kind in ("items", "vehicles"):
        path = root / "csvs" / (kind + ".csv")
        with path.open(encoding="utf-8-sig", newline="") as stream:
            rows = list(csv.DictReader(stream))
        counts[kind] = len(rows)
        for number, row in enumerate(rows, 2):
            if None in row or any(value is None for value in row.values()):
                problems.append(f"{kind}:{number}: column count mismatch")
                continue
            folder = Path(row["Photos Folder"])
            for name in row["Photos Names"].split(";"):
                if not name.strip() or not (folder / name.strip()).is_file():
                    problems.append(f"{kind}:{number}: missing photo {name.strip()}")
            if "Example" in row.get("Title", "") or row.get("Location") == "London, United Kingdom":
                problems.append(f"{kind}:{number}: upstream sample data")
    calls = []
    with patch.object(listing_helper, "remove_listing", side_effect=lambda *args: calls.append("delete_existing")), patch.object(listing_helper, "publish_listing", side_effect=lambda *args: calls.append("publish") or True):
        listing_helper.update_listings([{"Title": "OFFLINE PILOT"}], "item", None)
    assert calls == ["delete_existing", "publish"], calls
    result = {"mode": "offline", "external_actions": 0, "rows": counts,
              "original_flow": calls, "input_problems": problems,
              "ready_for_live_pilot": False,
              "scope": "CSV listing publication; no messaging or AI"}
    print(json.dumps(result, indent=2))
    return 2 if problems else 0

if __name__ == "__main__":
    raise SystemExit(main())
