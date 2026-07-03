#!/usr/bin/env python3
"""Quiet static file server — suppresses BrokenPipeError on cancelled requests."""
from __future__ import annotations

import argparse
import http.server
import os
import socket
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


def pick_bind_address(preferred: str) -> str:
    """Mac では :: が失敗することがあるのでフォールバックする。"""
    for addr in (preferred, "", "0.0.0.0", "127.0.0.1"):
        if not addr and preferred:
            continue
        try:
            probe = socket.socket(socket.AF_INET6 if ":" in addr else socket.AF_INET, socket.SOCK_STREAM)
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            family = socket.AF_INET6 if ":" in addr else socket.AF_INET
            if addr == "":
                probe.bind(("", 0))
            else:
                probe.bind((addr, 0))
            probe.close()
            return addr if addr else ""
        except OSError:
            try:
                probe.close()
            except Exception:
                pass
    return "127.0.0.1"


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve static files quietly")
    parser.add_argument("port", nargs="?", type=int, default=8765)
    parser.add_argument("--bind", default="")
    args = parser.parse_args()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    bind = pick_bind_address(args.bind)
    handler = QuietHandler

    class ReuseServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True

    with ReuseServer((bind, args.port), handler) as httpd:
        host = bind or "localhost"
        print(f"Serving HTTP on {host} port {args.port} (http://localhost:{args.port}/) ...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
