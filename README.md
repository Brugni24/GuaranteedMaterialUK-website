# Guaranteed Material UK - Website

Official website for Guaranteed Material UK Ltd, hosted on GitHub Pages with custom domain support.

## Architecture

* **Static Site Engine:** Jekyll (natively compiled by GitHub Pages)
* **CSS & Design:** Tailwind CSS (via CDN) + Custom responsive utility layers & micro-animations
* **Clean URLs:** Organized in semantic directories with `index.html` (e.g. `/systems/mercury-10/`, `/about/`, `/contact/`)
* **Tracking & GDPR:** Cookie Consent Banner with Google Analytics Consent Mode v2

## Project Structure

```text
website/
├── _config.yml             # Jekyll configuration (domain, permalinks, excludes)
├── CNAME                   # GitHub Pages custom domain (www.guaranteedmaterial.co.uk)
├── robots.txt              # Search engine directives & sitemap reference
├── sitemap.xml             # XML sitemap with clean URLs
├── serve.py                # Zero-dependency local preview server
│
├── _layouts/
│   └── default.html        # Main HTML layout wrapper
│
├── _includes/
│   ├── head.html           # Meta tags, favicons, fonts, Tailwind & consent script
│   ├── navbar.html         # Header and mobile slide-down menu
│   └── footer.html         # Footer with contact details and legal links
│
├── index.html              # Homepage (/)
├── about/index.html        # /about/
├── contact/index.html      # /contact/
├── services/index.html     # /services/
├── download/index.html     # /download/
├── references/index.html   # /references/
│
├── systems/                # Roofing Systems
│   ├── index.html          # /systems/
│   ├── mercury-10/
│   ├── mercury-20/
│   ├── saturn-30/
│   ├── halley-20/
│   ├── phoenix-super-25/
│   └── phoenix-super-35/
│
├── legal/                  # Compliance & Legal
│   ├── privacy/            # /legal/privacy/
│   ├── cookies/            # /legal/cookies/
│   └── terms/              # /legal/terms/
│
└── assets/
    ├── js/                 # cookie-consent.js
    ├── icons/              # favicons, logos, UI arrows
    └── images/             # hero, systems, services, references, team
```

## Local Development & Preview

You can preview the entire site locally with zero installations (no Node/npm or Ruby gems required):

```bash
python3 serve.py
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Deployment to GitHub Pages

Pushing changes to the `main` branch automatically triggers GitHub Pages to build and publish the site with custom domain SSL.