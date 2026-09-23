"""Loopback-only server for a private listening pack or source-only arranger."""
from pathlib import Path
import argparse,functools,http.server,socketserver,urllib.parse,webbrowser

def main():
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]/'web');p.add_argument('--port',type=int,default=0);p.add_argument('--open',action='store_true');a=p.parse_args();root=a.root.expanduser().resolve();assert root.is_dir()
 class Handler(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
  def list_directory(self,path):self.send_error(403,'Directory listing disabled');return None
  def do_GET(self):
   host=self.headers.get('Host','').split(':')[0]
   if host not in ('127.0.0.1','localhost'):return self.send_error(403,'Loopback host required')
   path=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
   dest=(root/path.lstrip('/')).resolve()
   if not dest.is_relative_to(root) or any(part.startswith('.') for part in Path(path).parts if part not in ('/','')):return self.send_error(403,'Path not allowed')
   super().do_GET()
  def end_headers(self):
   self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer');super().end_headers()
 with http.server.ThreadingHTTPServer(('127.0.0.1',a.port),functools.partial(Handler,directory=str(root))) as server:
  entry='/web/index.html' if (root/'web/index.html').exists() else '/index.html';url='http://127.0.0.1:'+str(server.server_port)+entry
  print('Local private workbench: '+url,flush=True)
  if a.open:webbrowser.open(url)
  try:server.serve_forever()
  except KeyboardInterrupt:pass
if __name__=='__main__':main()
