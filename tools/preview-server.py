#!/usr/bin/env python3
"""Serve the app with COOP/COEP so onnxruntime-web can use WASM threads.
GitHub Pages does not send these headers; first-read time there is single-thread.
Usage: python3 tools/preview-server.py [port] [root]
"""
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT=int(sys.argv[1]) if len(sys.argv)>1 else 8080
ROOT=sys.argv[2] if len(sys.argv)>2 else '.'

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt%args))

if __name__=='__main__':
    httpd=ThreadingHTTPServer(('0.0.0.0', PORT), H)
    print('serving %s on %s with COOP/COEP' % (ROOT, PORT), flush=True)
    httpd.serve_forever()
