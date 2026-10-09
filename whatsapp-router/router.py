#!/usr/bin/env python3
"""WhatsApp -> project inbox router (Twilio webhook, stdlib only).

Message starting with a tag (e.g. "#podcast ...") is saved, with its media,
into that project's inbox folder. Local Claude sessions read the folder.
"""
import base64, hashlib, hmac, json, os, re, shutil, subprocess, sys, threading
import urllib.error, urllib.parse, urllib.request
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
CONFIG = json.loads(Path(os.environ.get("ROUTER_CONFIG", HERE / "config.json")).read_text("utf-8"))
AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]
ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
PUBLIC_URL = os.environ["PUBLIC_URL"].rstrip("/")  # exact URL Twilio calls, e.g. https://xxx.ngrok.app/whatsapp
PORT = int(os.environ.get("PORT", "8080"))
PROJECTS = {k.lower().lstrip("#"): Path(v).expanduser() for k, v in CONFIG["projects"].items()}
ALLOWED = set(CONFIG.get("allowed_senders", []))  # e.g. ["whatsapp:+2126XXXXXXXX"]
STATE_FILE = HERE / "state.json"
LOCK = threading.Lock()
TAG_RE = re.compile(r"^\s*#(\w+)\s*", re.UNICODE)


def valid_signature(url, params, signature):
    data = url + "".join(k + v for k, v in sorted(params.items()))
    digest = hmac.new(AUTH_TOKEN.encode(), data.encode(), hashlib.sha1).digest()
    return hmac.compare_digest(base64.b64encode(digest).decode(), signature or "")


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def download(url, dest):
    """Twilio media: authenticated first hop, then redirect to storage WITHOUT credentials."""
    auth = base64.b64encode(f"{ACCOUNT_SID}:{AUTH_TOKEN}".encode()).decode()
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        resp = opener.open(urllib.request.Request(url, headers={"Authorization": "Basic " + auth}), timeout=60)
    except urllib.error.HTTPError as e:
        if e.code not in (301, 302, 303, 307, 308):
            raise
        resp = urllib.request.urlopen(e.headers["Location"], timeout=120)
    with resp, open(dest, "wb") as f:
        shutil.copyfileobj(resp, f)


def load_state():
    try:
        return json.loads(STATE_FILE.read_text("utf-8"))
    except Exception:
        return {}


def save_state(s):
    STATE_FILE.write_text(json.dumps(s), "utf-8")


EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4",
       "video/3gpp": ".3gp", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "application/pdf": ".pdf"}


def video_extras(path):
    """If ffmpeg exists: extract 1 frame / 5s (max 12) + mono 16k audio, so Claude can 'see' the video."""
    if not shutil.which("ffmpeg"):
        return []
    out = []
    frames = path.with_name(path.stem + "_frames")
    frames.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-vf", "fps=1/5,scale=768:-1",
                    "-frames:v", "12", str(frames / "f%02d.jpg")], check=False)
    out += sorted(p.name for p in frames.glob("*.jpg"))
    audio = path.with_suffix(".wav")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000",
                    str(audio)], check=False)
    if audio.exists():
        out.append(audio.name)
    return [f"{frames.name}/{n}" if n.endswith(".jpg") else n for n in out]


def handle(params):
    sender = params.get("From", "")
    body = params.get("Body", "")
    with LOCK:
        state = load_state()
        m = TAG_RE.match(body)
        tag = m.group(1).lower() if m else None
        if tag and tag in PROJECTS:
            body = body[m.end():]
            state[sender] = tag  # sticky: following untagged messages (photos/video) go to same project
            save_state(state)
        elif tag:
            return "Tag #%s makaynch. Tags: %s" % (tag, " ".join("#" + t for t in PROJECTS))
        else:
            tag = state.get(sender)
            if not tag:
                return "Bda b tag: " + " ".join("#" + t for t in PROJECTS)
    inbox = PROJECTS[tag] / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S_%f")
    files = []
    for i in range(int(params.get("NumMedia", "0") or 0)):
        ctype = params.get(f"MediaContentType{i}", "")
        path = inbox / f"{stamp}_{i}{EXT.get(ctype, '.bin')}"
        download(params[f"MediaUrl{i}"], path)
        files.append(path.name)
        if ctype.startswith("video/"):
            files += video_extras(path)
    lines = [f"# Message {stamp}", f"- tag: #{tag}", f"- from: {sender}", "", "## Text", body.strip() or "(no text)"]
    if files:
        lines += ["", "## Files (relative to this inbox folder)"] + [f"- {f}" for f in files]
    (inbox / f"{stamp}.md").write_text("\n".join(lines) + "\n", "utf-8")
    return f"OK #{tag}: msg + {len(files)} fichier(s) tsjlo."


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        params = {k: v[0] for k, v in urllib.parse.parse_qs(raw.decode(), keep_blank_values=True).items()}
        if not valid_signature(PUBLIC_URL, params, self.headers.get("X-Twilio-Signature")):
            return self._send(403, "forbidden", "text/plain")
        if ALLOWED and params.get("From") not in ALLOWED:
            return self._send(403, "forbidden", "text/plain")
        try:
            reply = handle(params)
        except Exception as e:
            print("ERROR", repr(e), file=sys.stderr)
            reply = "Khata2 f router, chouf terminal."
        self._send(200, f"<Response><Message>{escape(reply)}</Message></Response>", "text/xml")

    def _send(self, code, text, ctype):
        data = text.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print("%s %s" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    print(f"Router on :{PORT} | projects: {', '.join('#'+t for t in PROJECTS)}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
