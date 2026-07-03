#!/usr/bin/env python3
"""ローカル用 HTTP サーバー（BGM プリロード時の BrokenPipe を黙らせる）"""
import argparse
import http.server
import os
import socketserver


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, format, *args):
        # 404 favicon はログを減らす
        if args and "favicon.ico" in str(args[0]):
            return
        super().log_message(format, *args)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("port", nargs="?", type=int, default=8765)
    args = parser.parse_args()
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.ThreadingTCPServer(("", args.port), QuietHandler) as httpd:
        print(f"Serving HTTP on port {args.port} (http://localhost:{args.port}/)")
        print("止める: Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n停止しました。")


if __name__ == "__main__":
    main()
