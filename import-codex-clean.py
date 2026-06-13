import os
import re
import json
import time
import sqlite3
import hashlib
import shutil
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

HOME = Path.home()
CODEX_HOME = Path(os.environ.get("CODEX_HOME", str(HOME / ".codex")))
VAULT_PATH = Path(os.environ.get("OBSIDIAN_VAULT", str(HOME / "Documents" / "ObsidianVault")))
STATE_DB = CODEX_HOME / "state_5.sqlite"
OUT_ROOT = VAULT_PATH / "AI-Agent-Graph" / "Codex"

MAX_CHATS = int(os.environ.get("CODEX_MAX_CHATS", "25"))
MAX_CONVOS = int(os.environ.get("CODEX_MAX_CONVOS", "200"))
ENRICH = os.environ.get("ENRICH", "0") == "1"
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
FORCE_CLEAN = os.environ.get("FORCE_CLEAN", "1") == "1"
DEBUG_RAW = os.environ.get("DEBUG_RAW", "0") == "1"

UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)
TS_RE = re.compile(r"\b20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z\b")
BLOB_RE = re.compile(r"^(?:gAAAA|[A-Za-z0-9_-]{180,}={0,2}$)")
DATA_URL_RE = re.compile(r"data:image/[a-zA-Z0-9.+-]+;base64,", re.I)

SKIP_KEY_PARTS = ("token", "secret", "authorization", "password", "api_key", "apikey", "auth.json")
SKIP_RECORD_TYPES = {
    "session_meta",
    "token_count",
    "task_started",
    "turn_context",
    "session_config",
    "rate_limit",
}
NOISE_WORDS = {
    "response_item", "event_msg", "input_text", "output_text", "message", "user", "assistant",
    "commentary", "reasoning", "codex", "plus", "completed", "function_call", "function_call_output",
}


def clean(text: Any, max_len: int = 12000) -> str:
    text = str(text or "")
    text = text.replace("\r", "")
    text = DATA_URL_RE.sub("[image-data-removed]", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{4,}", "\n\n", text)
    return text.strip()[:max_len]


def slug(text: Any, max_len: int = 80) -> str:
    text = str(text or "untitled").lower()
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text[:max_len] or "untitled"


def sha(text: Any) -> str:
    return hashlib.sha256(str(text).encode("utf-8", errors="ignore")).hexdigest()


def node_id(seed: str) -> str:
    return "convo_" + sha(seed + str(time.time()))[:10]


def is_blob(text: str) -> bool:
    s = str(text or "").strip()
    if not s:
        return True
    if DATA_URL_RE.search(s):
        return True
    if BLOB_RE.match(s):
        return True
    if len(s) > 220 and re.fullmatch(r"[A-Za-z0-9_\-+=/]+", s):
        return True
    return False


def sanitize_text(text: str, max_len: int = 12000) -> str:
    lines = []
    for raw_line in str(text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if is_blob(line):
            continue
        if UUID_RE.fullmatch(line):
            continue
        if TS_RE.fullmatch(line):
            continue
        if line.lower() in NOISE_WORDS:
            continue
        if line.startswith("ws_") and len(line) > 20:
            continue
        lines.append(line)

    out = "\n".join(lines)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return clean(out, max_len)


def read_jsonl(path: Path) -> List[Tuple[int, Dict[str, Any]]]:
    rows = []
    if not path.exists():
        return rows
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    rows.append((line_no, obj))
            except Exception:
                continue
    return rows


def get_type(obj: Dict[str, Any]) -> str:
    for key in ("type", "event", "kind", "msg_type", "name"):
        val = obj.get(key)
        if isinstance(val, str) and val:
            return val
    return ""


def find_roles(value: Any, roles: Optional[List[str]] = None) -> List[str]:
    if roles is None:
        roles = []
    if isinstance(value, dict):
        role = value.get("role")
        if role in ("user", "assistant", "tool", "system"):
            roles.append(role)
        for v in value.values():
            find_roles(v, roles)
    elif isinstance(value, list):
        for item in value:
            find_roles(item, roles)
    return roles


def extract_message_text(obj: Dict[str, Any]) -> str:
    chunks: List[str] = []

    def visit(v: Any) -> None:
        if isinstance(v, dict):
            typ = str(v.get("type") or "").lower()
            if typ in {"input_text", "output_text", "text"} and isinstance(v.get("text"), str):
                chunks.append(v["text"])
            elif typ in {"message", "agent_message", "user_message"}:
                for k in ("text", "content", "message", "output_text", "input_text"):
                    if isinstance(v.get(k), str):
                        chunks.append(v[k])
            for x in v.values():
                visit(x)
        elif isinstance(v, list):
            for x in v:
                visit(x)

    visit(obj)

    for key in ("text", "content", "message", "output_text", "input_text", "output", "stdout", "stderr"):
        val = obj.get(key)
        if isinstance(val, str):
            chunks.append(val)

    raw = json.dumps(obj, ensure_ascii=False)
    if any(x in raw.lower() for x in ("shell_command", "apply_patch", "function_call", "custom_tool_call")):
        if len(raw) < 30000:
            chunks.append(raw)

    seen = set()
    useful = []
    for c in chunks:
        c = sanitize_text(c, 10000)
        if not c or c in seen:
            continue
        seen.add(c)
        useful.append(c)
    return clean("\n".join(useful), 12000)


def is_system_noise(obj: Dict[str, Any], text: str) -> bool:
    typ = get_type(obj).lower()
    raw = json.dumps(obj, ensure_ascii=False).lower()
    low = (text or "").lower()

    if typ in SKIP_RECORD_TYPES:
        return True
    if "<environment_context>" in low:
        return True
    if "you are codex" in low and "editing constraints" in low:
        return True
    if "# personality" in low and "# general" in low and "editing constraints" in low:
        return True
    if "available skills" in low and "skill.md" in low:
        return True
    if "response_item" in raw and "reasoning" in raw and "gaaaa" in raw:
        return True
    if text and is_blob(text):
        return True
    return False


def classify(obj: Dict[str, Any], text: str) -> str:
    if is_system_noise(obj, text):
        return "skip"

    raw = json.dumps(obj, ensure_ascii=False).lower()
    typ = get_type(obj).lower()
    roles = find_roles(obj)

    if "user" in roles and ("input_text" in raw or "user_message" in raw or typ in {"response_item", "message"}):
        return "user"
    if "assistant" in roles and ("output_text" in raw or "agent_message" in raw or typ in {"response_item", "message"}):
        return "assistant"
    if "tool" in roles:
        return "tool"

    if "agent_message" in raw or typ == "agent_message":
        return "assistant"
    if "function_call_output" in raw or "custom_tool_call_output" in raw or "patch_apply_end" in raw:
        return "tool_output"
    if "apply_patch" in raw or "custom_tool_call" in raw:
        return "file_edit"
    if "shell_command" in raw or "function_call" in raw:
        return "tool_call"
    if "web_search" in raw or "search_call" in raw or "search_end" in raw:
        return "research"

    low = (text or "").lower()
    if re.search(r"^(npm|pnpm|yarn|node|python|py|git|npx|tsc|next|bun|pip|cargo|supabase)\b", low, re.M):
        return "command"
    if any(x in low for x in ("error", "traceback", "exception", "failed", "runtime error")):
        return "error"

    return "event"


def load_threads() -> List[Dict[str, Any]]:
    if not STATE_DB.exists():
        raise FileNotFoundError(f"Missing {STATE_DB}")
    con = sqlite3.connect(str(STATE_DB))
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute(
        """
        SELECT id, rollout_path, created_at, updated_at, title, first_user_message,
               cwd, model, preview
        FROM threads
        WHERE rollout_path IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT ?
        """,
        (MAX_CHATS,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    con.close()
    return rows


def resolve_rollout_path(raw_path: Any) -> Optional[Path]:
    if not raw_path:
        return None
    raw = str(raw_path)
    candidates = []
    p = Path(raw)
    if p.is_absolute():
        candidates.append(p)
    candidates += [CODEX_HOME / raw, CODEX_HOME / "sessions" / raw, HOME / raw]
    norm = raw.replace("\\", "/")
    candidates += [CODEX_HOME / norm, CODEX_HOME / "sessions" / norm]
    for c in candidates:
        if c.exists():
            return c
    return None


def events_from_rollout(path: Path) -> List[Dict[str, Any]]:
    events = []
    for line_no, obj in read_jsonl(path):
        text = extract_message_text(obj)
        role = classify(obj, text)
        if role == "skip":
            continue
        if not text:
            continue
        events.append({"line": line_no, "role": role, "text": text, "type": get_type(obj)})
    return events


def normalize_prompt(text: str) -> str:
    text = sanitize_text(text, 5000)
    text = re.sub(r"^# Context from my IDE setup:\s*", "", text, flags=re.I)
    text = re.sub(r"## Active file:.*?(?=## My request for Codex:|$)", "", text, flags=re.S | re.I)
    text = re.sub(r"## Open tabs:.*?(?=## My request for Codex:|$)", "", text, flags=re.S | re.I)
    text = re.sub(r"## My request for Codex:\s*", "", text, flags=re.I)
    return sanitize_text(text, 5000)


def same_prompt(a: str, b: str) -> bool:
    return sha(normalize_prompt(a)[:1000]) == sha(normalize_prompt(b)[:1000])


def group_convos(thread: Dict[str, Any], events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    convos = []
    current = None
    first_user = normalize_prompt(thread.get("first_user_message") or "")

    for ev in events:
        role = ev["role"]
        text = ev["text"]

        if role == "user":
            prompt = normalize_prompt(text)
            if not prompt:
                continue
            if current and same_prompt(prompt, current["user"]):
                continue
            if current:
                convos.append(current)
            current = {"user": prompt, "user_line": ev["line"], "events": []}
            continue

        if current is None:
            if first_user:
                current = {"user": first_user, "user_line": "state_5.sqlite:first_user_message", "events": []}
            else:
                continue

        current["events"].append(ev)

    if current:
        convos.append(current)

    merged = []
    index_by_prompt = {}
    for convo in convos:
        key = sha(normalize_prompt(convo["user"])[:1200])
        if key in index_by_prompt:
            merged[index_by_prompt[key]]["events"].extend(convo["events"])
        else:
            index_by_prompt[key] = len(merged)
            merged.append(convo)

    good = []
    for c in merged:
        combined = c["user"] + "\n" + "\n".join(e["text"] for e in c["events"])
        if len(combined.strip()) >= 20:
            good.append(c)
    return good[:MAX_CONVOS]


def title_from_user(text: str) -> str:
    t = normalize_prompt(text)
    lines = [x.strip() for x in t.splitlines() if len(x.strip()) > 4]
    title = lines[0] if lines else "Codex conversation"
    title = re.sub(r"^(please|can you|could you|okay|ok|bro|ehm)\s+", "", title, flags=re.I)
    title = re.sub(r"[^\w\s.-]", " ", title)
    title = re.sub(r"\s+", " ", title).strip()
    return title[:75] or "Codex conversation"


def extract_files(text: str) -> List[str]:
    pattern = r"(?:[\w.@() -]+[/\\])*[\w.@() -]+\.(?:ts|tsx|js|jsx|json|md|css|scss|html|py|cpp|c|h|rs|go|java|toml|yml|yaml|env|sql|txt)"
    found = []
    seen = set()
    for m in re.findall(pattern, text or ""):
        item = m.strip().replace("\\", "/")
        if not item or "node_modules" in item or len(item) > 160:
            continue
        if item not in seen:
            seen.add(item)
            found.append(item)
    return found[:35]


def extract_commands(text: str) -> List[str]:
    found = []
    seen = set()
    for line in str(text or "").splitlines():
        l = line.strip().strip('"')
        if re.match(r"^(npm|pnpm|yarn|node|python|py|git|npx|tsc|next|bun|pip|cargo|supabase|curl)\b", l, re.I):
            if l not in seen and len(l) < 220:
                seen.add(l)
                found.append(l)
    return found[:25]


def extract_errors(text: str) -> List[str]:
    found = []
    seen = set()
    for line in str(text or "").splitlines():
        l = line.strip()
        if re.search(r"\b(error|failed|exception|traceback|runtime error|typeerror|syntaxerror|referenceerror)\b", l, re.I):
            l = l[:260]
            if l not in seen and not is_blob(l):
                seen.add(l)
                found.append(l)
    return found[:20]


def summarize_events(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    assistant_msgs = []
    tool_msgs = []
    edits = []
    outputs = []
    seen = set()

    for ev in events:
        text = sanitize_text(ev["text"], 9000)
        if not text:
            continue
        key = sha(text[:1000])
        if key in seen:
            continue
        seen.add(key)

        role = ev["role"]
        if role == "assistant":
            assistant_msgs.append(text)
        elif role == "file_edit":
            edits.append(text)
        elif role in {"tool_call", "tool_output", "command", "research", "tool"}:
            tool_msgs.append(text)
        elif role == "error":
            outputs.append(text)
        elif role == "event":
            if len(text) < 1000:
                outputs.append(text)

    all_text = "\n\n".join(assistant_msgs + edits + tool_msgs + outputs)
    return {
        "assistant_msgs": assistant_msgs,
        "tool_msgs": tool_msgs,
        "edits": edits,
        "outputs": outputs,
        "all_text": clean(all_text, 30000),
        "files": extract_files(all_text),
        "commands": extract_commands(all_text),
        "errors": extract_errors(all_text),
    }


def call_ollama(prompt: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    if not ENRICH:
        return fallback
    try:
        payload = json.dumps({
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json",
        }).encode("utf-8")
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=180) as res:
            data = json.loads(res.read().decode("utf-8", errors="ignore"))
        parsed = json.loads(data.get("response", "{}"))
        if isinstance(parsed, dict):
            return {**fallback, **parsed}
    except Exception:
        pass
    return fallback


def build_convo_summary(user: str, events: List[Dict[str, Any]]) -> Dict[str, Any]:
    evsum = summarize_events(events)
    fallback = {
        "title": title_from_user(user),
        "user_request": normalize_prompt(user),
        "codex_summary": clean("\n\n".join(evsum["assistant_msgs"][:6]), 3000) or "No visible Codex answer was found for this turn.",
        "work_done": [],
        "outcome": "Unknown.",
        "files": evsum["files"],
        "commands": evsum["commands"],
        "errors": evsum["errors"],
    }

    if evsum["edits"]:
        fallback["work_done"].append("Applied code changes or file patches.")
    if evsum["tool_msgs"]:
        fallback["work_done"].append("Ran tools, shell commands, searches, or validation steps.")
    if evsum["assistant_msgs"]:
        fallback["work_done"].append("Explained the approach and reported progress to the user.")
    if not fallback["work_done"] and evsum["all_text"]:
        fallback["work_done"].append("Recorded Codex activity for this turn.")

    prompt = f"""
Turn this cleaned Codex turn into a readable Obsidian note.
Do not include timestamps, internal event names, encrypted strings, base64, UUIDs, or raw JSON.
Return only valid JSON with these keys:
{{
  "title": "short human title, max 8 words",
  "user_request": "plain summary of what the user asked",
  "codex_summary": "plain summary of what Codex answered or did",
  "work_done": ["short bullet", "short bullet"],
  "outcome": "completed / partial / failed / unknown with one sentence",
  "files": ["paths only"],
  "commands": ["commands only"],
  "errors": ["real errors only"]
}}

USER REQUEST:
{normalize_prompt(user)[:4000]}

CODEX ACTIVITY:
{evsum['all_text'][:12000]}
"""
    return call_ollama(prompt, fallback)


def md_list(items: List[str], empty: str = "None detected") -> str:
    clean_items = []
    seen = set()
    for item in items or []:
        item = sanitize_text(str(item), 400)
        if not item or item in seen:
            continue
        if is_blob(item):
            continue
        seen.add(item)
        clean_items.append(item)
    if not clean_items:
        return f"- {empty}"
    return "\n".join(f"- `{x}`" if re.search(r"[./\\]", x) else f"- {x}" for x in clean_items)


def write_convo_note(path: Path, data: Dict[str, Any], debug_raw: Optional[str] = None) -> None:
    lines = []
    lines.append("---")
    lines.append(f"id: {data['id']}")
    lines.append(f"chat: {json.dumps(data['chat_title'])}")
    lines.append(f"number: {data['number']}")
    lines.append(f"previous: {json.dumps(data.get('previous') or '')}")
    lines.append(f"next: {json.dumps(data.get('next') or '')}")
    lines.append("---")
    lines.append("")
    lines.append(f"# {data['title']}")
    lines.append("")
    lines.append("## User request")
    lines.append("")
    lines.append(data["user_request"] or "No request text detected.")
    lines.append("")
    lines.append("## Codex response")
    lines.append("")
    lines.append(data["codex_summary"] or "No visible Codex response detected.")
    lines.append("")
    lines.append("## Work performed")
    lines.append("")
    lines.append(md_list(data.get("work_done", []), "No work details detected"))
    lines.append("")
    lines.append("## Files changed or referenced")
    lines.append("")
    lines.append(md_list(data.get("files", []), "None detected"))
    lines.append("")
    lines.append("## Commands or checks")
    lines.append("")
    lines.append(md_list(data.get("commands", []), "None detected"))
    lines.append("")
    lines.append("## Problems or errors")
    lines.append("")
    lines.append(md_list(data.get("errors", []), "None detected"))
    lines.append("")
    lines.append("## Outcome")
    lines.append("")
    lines.append(data.get("outcome") or "Unknown.")
    lines.append("")
    lines.append("## Related")
    lines.append("")
    prev_link = f"[[{data['previous']}]]" if data.get("previous") else "None"
    next_link = f"[[{data['next']}]]" if data.get("next") else "None"
    lines.append(f"Previous: {prev_link}")
    lines.append(f"Next: {next_link}")
    if DEBUG_RAW and debug_raw:
        lines.append("")
        lines.append("## Debug raw cleaned activity")
        lines.append("")
        lines.append("~~~txt")
        lines.append(debug_raw[:30000])
        lines.append("~~~")
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def write_canvas(chat_dir: Path, graph: Dict[str, Any]) -> None:
    canvas = {"nodes": [], "edges": []}
    for i, n in enumerate(graph["nodes"]):
        canvas["nodes"].append({
            "id": n["id"],
            "type": "file",
            "file": n["file"],
            "x": i * 460,
            "y": 0,
            "width": 400,
            "height": 230,
        })
    for edge in graph["edges"]:
        canvas["edges"].append({
            "id": "edge_" + edge["from"] + "_" + edge["to"],
            "fromNode": edge["from"],
            "toNode": edge["to"],
        })
    (chat_dir / "graph.canvas").write_text(json.dumps(canvas, indent=2), encoding="utf-8")


def chat_title(thread: Dict[str, Any], convos: List[Dict[str, Any]]) -> str:
    title = thread.get("title") or ""
    if title and len(str(title).strip()) > 3:
        return sanitize_text(str(title), 80)
    if convos:
        return title_from_user(convos[0]["user"])
    return "Codex Chat"


def write_overview(chat_dir: Path, title: str, thread: Dict[str, Any], graph: Dict[str, Any], all_files: List[str]) -> None:
    lines = []
    lines.append(f"# {title}")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    if graph["nodes"]:
        first = graph["nodes"][0]["title"]
        last = graph["nodes"][-1]["title"]
        lines.append(f"This Codex chat contains {len(graph['nodes'])} cleaned conversation turns, from **{first}** to **{last}**.")
    else:
        lines.append("No conversation turns were imported.")
    lines.append("")
    lines.append("## Conversation timeline")
    lines.append("")
    for n in graph["nodes"]:
        lines.append(f"{n['number']}. [[{Path(n['file']).stem}]] — {n['title']}")
    lines.append("")
    lines.append("## Important files")
    lines.append("")
    lines.append(md_list(all_files[:40], "None detected"))
    lines.append("")
    lines.append("## Graph")
    lines.append("")
    lines.append("Open [[graph.canvas]]")
    lines.append("")
    lines.append("## Source")
    lines.append("")
    lines.append(f"- Thread ID: `{thread.get('id')}`")
    lines.append(f"- Model: `{thread.get('model')}`")
    lines.append(f"- Project path: `{thread.get('cwd')}`")
    lines.append("")
    (chat_dir / "overview.md").write_text("\n".join(lines), encoding="utf-8")


def import_thread(thread: Dict[str, Any]) -> Optional[Tuple[str, int]]:
    rollout = resolve_rollout_path(thread.get("rollout_path"))
    if not rollout:
        print("Missing rollout:", thread.get("rollout_path"))
        return None

    events = events_from_rollout(rollout)
    convos = group_convos(thread, events)
    if not convos:
        print("No convos:", rollout)
        return None

    title = chat_title(thread, convos)
    chat_slug = slug(title, 70) + "-" + sha(thread.get("id", title))[:8]
    chat_dir = OUT_ROOT / chat_slug
    convos_dir = chat_dir / "convos"

    if FORCE_CLEAN and chat_dir.exists():
        shutil.rmtree(chat_dir)
    convos_dir.mkdir(parents=True, exist_ok=True)

    summaries = []
    for idx, convo in enumerate(convos, 1):
        summary = build_convo_summary(convo["user"], convo["events"])
        summary["title"] = sanitize_text(summary.get("title") or title_from_user(convo["user"]), 80)
        summaries.append((convo, summary))

    graph = {"title": title, "thread_id": thread.get("id"), "nodes": [], "edges": []}
    all_files = []

    previous_stem = None
    previous_id = None
    note_infos = []

    for idx, (convo, summary) in enumerate(summaries, 1):
        nid = node_id(f"{thread.get('id')}:{idx}:{summary.get('title')}")
        note_title = sanitize_text(summary.get("title") or title_from_user(convo["user"]), 75)
        filename = f"{idx:03d}-{slug(note_title, 70)}.md"
        stem = Path(filename).stem
        rel_file = (Path("AI-Agent-Graph") / "Codex" / chat_slug / "convos" / filename).as_posix()
        note_infos.append({
            "idx": idx,
            "id": nid,
            "filename": filename,
            "stem": stem,
            "rel_file": rel_file,
            "convo": convo,
            "summary": summary,
            "previous_stem": previous_stem,
        })
        previous_stem = stem

    for i, info in enumerate(note_infos):
        next_stem = note_infos[i + 1]["stem"] if i + 1 < len(note_infos) else None
        summary = info["summary"]
        convo = info["convo"]
        evsum = summarize_events(convo["events"])
        files = summary.get("files") or evsum["files"]
        commands = summary.get("commands") or evsum["commands"]
        errors = summary.get("errors") or evsum["errors"]
        work_done = summary.get("work_done") or []
        if isinstance(work_done, str):
            work_done = [work_done]

        for f in files:
            if f not in all_files:
                all_files.append(f)

        note_data = {
            "id": info["id"],
            "chat_title": title,
            "number": info["idx"],
            "previous": info["previous_stem"],
            "next": next_stem,
            "title": sanitize_text(summary.get("title") or title_from_user(convo["user"]), 80),
            "user_request": sanitize_text(summary.get("user_request") or normalize_prompt(convo["user"]), 4000),
            "codex_summary": sanitize_text(summary.get("codex_summary") or "No visible Codex response detected.", 6000),
            "work_done": work_done,
            "files": files,
            "commands": commands,
            "errors": errors,
            "outcome": sanitize_text(summary.get("outcome") or "Unknown.", 1000),
        }
        debug_raw = summarize_events(convo["events"])["all_text"]
        write_convo_note(convos_dir / info["filename"], note_data, debug_raw)

        graph["nodes"].append({
            "id": info["id"],
            "number": info["idx"],
            "title": note_data["title"],
            "file": info["rel_file"],
        })
        if previous_id:
            graph["edges"].append({"from": previous_id, "to": info["id"]})
        previous_id = info["id"]

    (chat_dir / "graph.json").write_text(json.dumps(graph, indent=2), encoding="utf-8")
    write_canvas(chat_dir, graph)
    write_overview(chat_dir, title, thread, graph, all_files)
    return title, len(convos)


def main() -> None:
    print("Codex home:", CODEX_HOME)
    print("Output:", OUT_ROOT)
    print("AI enrichment:", ENRICH, OLLAMA_MODEL if ENRICH else "")
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    threads = load_threads()
    print("Threads found:", len(threads))

    imported = 0
    for thread in threads:
        result = import_thread(thread)
        if result:
            imported += 1
            print(f"Imported: {result[0]} ({result[1]} convos)")

    print("Done.")
    print("Imported chats:", imported)
    print("Open: AI-Agent-Graph/Codex")


if __name__ == "__main__":
    main()