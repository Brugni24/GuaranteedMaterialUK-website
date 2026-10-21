#!/usr/bin/env python3
"""
Lightweight local preview server for Guaranteed Material UK.
Supports Jekyll-style layouts, includes, and clean URLs with zero dependencies.
Run with: python3 serve.py
"""

import http.server
import socketserver
import os
import re
import mimetypes

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def parse_front_matter(content):
    if not content.startswith("---"):
        return {}, content
    end_fm = content.find("---", 3)
    if end_fm == -1:
        return {}, content
    fm_raw = content[3:end_fm].strip()
    body = content[end_fm + 3:].strip()
    
    meta = {}
    for line in fm_raw.split("\n"):
        line = line.strip()
        if ":" in line:
            key, val = line.split(":", 1)
            val = val.strip().strip('"').strip("'")
            meta[key.strip()] = val
    return meta, body

def render_jekyll_page(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        raw_content = f.read()

    meta, body = parse_front_matter(raw_content)
    
    # Read layout
    layout_name = meta.get("layout", "default")
    layout_path = os.path.join(BASE_DIR, "_layouts", f"{layout_name}.html")
    if os.path.exists(layout_path):
        with open(layout_path, "r", encoding="utf-8") as f:
            template = f.read()
    else:
        template = "{{ content }}"

    # Replace content
    rendered = template.replace("{{ content }}", body)

    # Process includes
    def include_replacer(match):
        inc_file = match.group(1).strip()
        inc_path = os.path.join(BASE_DIR, "_includes", inc_file)
        if os.path.exists(inc_path):
            with open(inc_path, "r", encoding="utf-8") as f:
                inc_content = f.read()
            return inc_content
        return ""

    rendered = re.sub(r"\{%\s*include\s+([^\s%]+)\s*%\}", include_replacer, rendered)

    # Replace metadata variables
    title = meta.get("title", "Guaranteed Material UK")
    desc = meta.get("description", "")
    page_url = meta.get("url", "/")
    active_nav = meta.get("active_nav", "")
    preload_image = meta.get("preload_image", "")

    rendered = rendered.replace("{{ page.title | default: site.title }}", title)
    rendered = rendered.replace("{{ page.description | default: site.description }}", desc)
    rendered = rendered.replace("{{ page.robots | default: 'index, follow' }}", "index, follow")
    rendered = rendered.replace("{{ site.url }}{{ page.url }}", f"http://localhost:{PORT}{page_url}")
    rendered = rendered.replace("{{ page.og_title | default: page.title | default: site.title }}", title)
    rendered = rendered.replace("{{ page.og_description | default: page.description | default: site.description }}", desc)
    rendered = rendered.replace("{{ page.twitter_title | default: page.title | default: site.title }}", title)
    rendered = rendered.replace("{{ page.twitter_description | default: page.description | default: site.description }}", desc)
    rendered = rendered.replace("{{ site.baseurl }}", "")
    rendered = rendered.replace("{{ site.url }}{{ page.og_image | default: '/assets/images/hero/gemini_hero_bg.jpg' }}", f"http://localhost:{PORT}/assets/images/hero/gemini_hero_bg.jpg")
    rendered = rendered.replace("{{ site.url }}{{ page.twitter_image | default: page.og_image | default: '/assets/images/hero/gemini_hero_bg.jpg' }}", f"http://localhost:{PORT}/assets/images/hero/gemini_hero_bg.jpg")

    if preload_image:
        preload_tag = f'<link rel="preload" as="image" href="{preload_image}" fetchpriority="high">'
        rendered = re.sub(r"\{%\s*if page\.preload_image\s*%\}.*?\{%\s*endif\s*%\}", preload_tag, rendered, flags=re.DOTALL)
    else:
        rendered = re.sub(r"\{%\s*if page\.preload_image\s*%\}.*?\{%\s*endif\s*%\}", "", rendered, flags=re.DOTALL)

    # Handle active nav highlights in navbar
    for nav_item in ["systems", "services", "download", "references", "about"]:
        pattern = re.compile(r'\{%\s*if page\.active_nav == [\'"]' + nav_item + r'[\'"]\s*%\}([^%]+)\{%\s*else\s*%\}([^%]+)\{%\s*endif\s*%\}')
        if active_nav == nav_item:
            rendered = pattern.sub(r'\1', rendered)
        else:
            rendered = pattern.sub(r'\2', rendered)

    return rendered

class JekyllPreviewHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        clean_path = self.path.split("?")[0].split("#")[0]
        if clean_path.endswith("/"):
            target_file = os.path.join(BASE_DIR, clean_path.lstrip("/"), "index.html")
        else:
            rel = clean_path.lstrip("/")
            target_file = os.path.join(BASE_DIR, rel)
            if os.path.isdir(target_file):
                self.send_response(301)
                self.send_header("Location", clean_path + "/")
                self.end_headers()
                return

        if os.path.exists(target_file) and target_file.endswith(".html"):
            try:
                html = render_jekyll_page(target_file)
                data = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            except Exception as e:
                self.send_error(500, f"Error rendering page: {e}")
                return

        return super().do_GET()

if __name__ == "__main__":
    os.chdir(BASE_DIR)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), JekyllPreviewHandler) as httpd:
        print(f"Server started at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
