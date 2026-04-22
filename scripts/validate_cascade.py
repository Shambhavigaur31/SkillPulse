import json
import os
import subprocess
import sys

PYTHON = os.environ.get("PYTHON_BIN") or sys.executable
HANDLES = ["shambhavi31", "tourist", "Benq"]


def main() -> int:
    overall_ok = True

    for handle in HANDLES:
        proc = subprocess.run(
            [PYTHON, "lib/inference.py", "--handle", handle, "--json", "--include-meta"],
            capture_output=True,
            text=True,
            check=False,
        )

        if proc.returncode != 0:
            overall_ok = False
            print(f"[{handle}] FAIL: {proc.stderr.strip() or proc.stdout.strip()}")
            continue

        payload = json.loads(proc.stdout)
        rows = payload.get("meta", {}).get("baseVsCascaded", [])
        print(f"[{handle}] base vs cascaded ({len(rows)} skills)")
        for row in rows:
            print(
                f"  {row['skill']}: base={row['baseArs']:.4f}, "
                f"cascaded={row['cascadedArs']:.4f}, delta={row['delta']:.4f}"
            )

    return 0 if overall_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
