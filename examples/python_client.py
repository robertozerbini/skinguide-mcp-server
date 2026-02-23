#!/usr/bin/env python3
"""
SkinGuide MCP Server — Python Example Client
=============================================
Spawns the MCP stdio server (node stdio.js) as a child process and
communicates over stdin/stdout using the MCP JSON-RPC 2.0 protocol.

Usage
    python3 examples/python_client.py

Requirements
    Node.js >= 18  (to run stdio.js)
    Python >= 3.9  (stdlib only, no pip install needed)
"""

import json
import subprocess
import shutil
import sys
from pathlib import Path

SERVER = Path(__file__).resolve().parent.parent / "stdio.js"


# ── Preflight checks ───────────────────────────────────────────────────────

def check_preflight() -> None:
    if not shutil.which("node"):
        print("[ERROR] 'node' not found in PATH. Install Node.js >= 18.", file=sys.stderr)
        sys.exit(1)
    node_modules = SERVER.parent / "node_modules"
    if not node_modules.is_dir():
        print(f"[ERROR] node_modules not found. Run:\n  cd {SERVER.parent} && npm install", file=sys.stderr)
        sys.exit(1)


# ── MCP stdio client ───────────────────────────────────────────────────────

class McpClient:
    def __init__(self):
        self._proc   = None
        self._next_id = 1

    def start(self):
        self._proc = subprocess.Popen(
            ["node", str(SERVER)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        return self

    def _send(self, method: str, params: dict) -> dict:
        msg_id = self._next_id
        self._next_id += 1
        line = json.dumps({"jsonrpc": "2.0", "id": msg_id, "method": method, "params": params})
        self._proc.stdin.write(line + "\n")
        self._proc.stdin.flush()
        # Read lines until we get the response for this id
        while True:
            raw = self._proc.stdout.readline()
            if not raw:
                self._proc.wait()
                stderr_out = self._proc.stderr.read().strip()
                hint = ""
                if "Cannot find module" in stderr_out or "MODULE_NOT_FOUND" in stderr_out:
                    hint = f"\n  Hint: run 'npm install' in {SERVER.parent}"
                raise RuntimeError(
                    f"Server process exited (code {self._proc.returncode}).{hint}"
                    + (f"\n  stderr: {stderr_out[:400]}" if stderr_out else "")
                )
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get("id") == msg_id:
                if "error" in msg:
                    raise RuntimeError(msg["error"]["message"])
                return msg["result"]

    def _notify(self, method: str, params: dict = {}) -> None:
        line = json.dumps({"jsonrpc": "2.0", "method": method, "params": params})
        self._proc.stdin.write(line + "\n")
        self._proc.stdin.flush()

    def initialize(self) -> dict:
        result = self._send("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities":    {},
            "clientInfo":      {"name": "python-client", "version": "1.0.0"},
        })
        self._notify("notifications/initialized")
        return result

    def call_tool(self, name: str, arguments: dict = {}) -> dict:
        result = self._send("tools/call", {"name": name, "arguments": arguments})
        if result.get("isError"):
            raise RuntimeError(result["content"][0]["text"])
        return json.loads(result["content"][0]["text"])

    def stop(self) -> None:
        if self._proc:
            self._proc.stdin.close()
            self._proc.wait()


# ── Helpers ───────────────────────────────────────────────────────────────────

def section(title: str) -> None:
    print(f"\n{'═' * 60}")
    print(f"  {title}")
    print('═' * 60)


# ── Demos ─────────────────────────────────────────────────────────────────────

def demo_list_skin_types(client: McpClient) -> None:
    section("list_skin_types — all 16 Baumann skin types")
    data = client.call_tool("list_skin_types")
    for t in data["skinTypes"]:
        stars = "★" * t["difficulty"] + "☆" * (5 - t["difficulty"])
        print(f"  {t['code']}  {t['name']:<44} {stars}")
    print(f"\n  Total: {data['total']} types")


def demo_get_product_types(client: McpClient) -> None:
    section("get_product_types — available categories")
    data  = client.call_tool("get_product_types")
    ids   = [pt["id"] for pt in data["productTypes"]]
    for i in range(0, len(ids), 3):
        row = ids[i:i+3]
        print("  " + "".join(s.ljust(28) for s in row))
    print(f"\n  Total: {data['total']} categories")


def demo_get_skin_type_info(client: McpClient) -> None:
    section("get_skin_type_info — OSPT")
    info = client.call_tool("get_skin_type_info", {"skinType": "OSPT"})
    print(f"  Code       : {info['code']}")
    print(f"  Name       : {info['name']}")
    print(f"  Category   : {info['category']}")
    d = info['difficulty']
    print(f"  Difficulty : {'★' * d}{'☆' * (5-d)} ({d}/5)")
    print(f"  Description: {info['description']}")


def demo_search_products_us(client: McpClient) -> None:
    section("search_products — oily + sensitive (od=O, sr=S), budget $30, US")
    data = client.call_tool("search_products", {
        "od": "O", "sr": "S", "budget": 30, "limit": 5,
    })
    print(f"  {data['total']} products found\n")
    for p in data["products"]:
        print(f"  [{p['type']:<28}]  ${p['price']:>6.2f}")
        print(f"    {p['brand']}  —  {p['name'][:70]}")


def demo_search_products_uae(client: McpClient) -> None:
    section("search_products — Moisturizer, country=UAE, limit 5")
    data = client.call_tool("search_products", {
        "type": "Moisturizer", "country": "UAE", "limit": 5,
    })
    print(f"  {data['total']} products found\n")
    for p in data["products"]:
        print(f"  {p['brand']:<20}  ${p['price']:>6.2f}  {p['name'][:50]}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    check_preflight()
    print(f"\nSkinGuide MCP Server — Python client demo")
    print(f"Server: {SERVER}")

    client = McpClient().start()
    client.initialize()

    try:
        demo_list_skin_types(client)
        demo_get_product_types(client)
        demo_get_skin_type_info(client)
        demo_search_products_us(client)
        demo_search_products_uae(client)
        print("\n✅  All demos complete.\n")
    except Exception as e:
        print(f"\n[FATAL] {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        client.stop()


if __name__ == "__main__":
    main()
