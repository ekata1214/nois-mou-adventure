#!/usr/bin/env python3
"""Quiet static file server — suppresses BrokenPipeError on cancelled requests."""
from __future__ import annotations

import argparse
import http.server
import os
import socketserver
import sys


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        if args and len(args) >= 2:
            code = str(args[1])
            if code.startswith(("2", "304")):
                sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))
                sys.stdout.flush()

    def copyfile(self, source, outputfile) -> None:
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def handle_one_request(self) -> None:
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve static files quietly")
    parser.add_argument("port", nargs="?", type=int, default=8765)
    parser.add_argument(
        "--lan",
        action="store_true",
        help="Listen on all interfaces (phone on same Wi-Fi)",
    )
    args = parser.parse_args()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    host = "0.0.0.0" if args.lan else "127.0.0.1"
    with socketserver.ThreadingTCPServer((host, args.port), QuietHandler) as httpd:
        httpd.allow_reuse_address = True
        print(f"Serving HTTP on {host} port {args.port}")
        print(f"  → http://localhost:{args.port}/")
        if args.lan:
            try:
                import socket

                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                lan_ip = s.getsockname()[0]
                s.close()
                print(f"  → http://{lan_ip}:{args.port}/  (same Wi‑Fi)")
            except OSError:
                pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
