#!/usr/bin/env python3
"""
SkinGuide — Direct API Client (Python)
======================================
Calls the live SkinGuide API directly via HTTP POST.
No Node.js or MCP server required — just Python (stdlib only).

Usage
    python3 examples/direct_api_client.py
"""

import json
import urllib.request
import urllib.error

API_URL = "https://skinguide.beauty/api/products"


def section(title: str) -> None:
    print(f"\n{'═' * 60}")
    print(f"  {title}")
    print('═' * 60)


def search_products(
    type: str = None,
    country: str = "US",
    od: str = None,
    sr: str = None,
    pn: str = None,
    wt: str = None,
    budget: int = None,
    limit: int = 20,
) -> dict:
    """Search products via the live API (POST with JSON body)."""
    payload = {"country": country, "limit": limit}
    if type:   payload["type"] = type
    if od:     payload["od"] = od
    if sr:     payload["sr"] = sr
    if pn:     payload["pn"] = pn
    if wt:     payload["wt"] = wt
    if budget: payload["budget"] = budget

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    print("\nSkinGuide API — Direct Python client demo")
    print(f"API: {API_URL}")

    # Example 1: Dry + Sensitive skin, budget $20
    section("Dry + Sensitive skin (od=D, sr=S), budget $20, US")
    data = search_products(od="D", sr="S", budget=20, limit=5)
    print(f"  {data['total']} products found\n")
    for p in data.get("products", [])[:5]:
        print(f"  [{p['type']:<28}]  ${p['price']:>6.2f}")
        print(f"    {p['brand']}  —  {p['name'][:60]}")

    # Example 2: Moisturizer Day in UAE
    section("Moisturizer Day, country=UAE")
    data = search_products(type="Moisturizer Day", country="UAE", limit=5)
    print(f"  {data['total']} products found\n")
    for p in data.get("products", [])[:5]:
        print(f"  {p['brand']:<20}  ${p['price']:>6.2f}  {p['name'][:50]}")

    # Example 3: Oily + Pigmented sunscreens
    section("Oily + Pigmented (od=O, pn=P), Sunscreen, budget $50")
    data = search_products(type="Sunscreen", od="O", pn="P", budget=50, limit=5)
    print(f"  {data['total']} products found\n")
    for p in data.get("products", [])[:5]:
        skin_types = ", ".join(p.get("skinTypes", [])[:3])
        print(f"  ${p['price']:>6.2f}  {p['brand']:<18}  Skin: {skin_types}")
        print(f"           {p['name'][:55]}")

    print("\n✅  All demos complete.\n")


if __name__ == "__main__":
    main()
