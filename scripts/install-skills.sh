#!/usr/bin/env bash
# Reinstalează skill-urile de design folosite la construirea acestui site.
# Ele nu sunt urcate în depozit (sunt proiecte terțe, cu licențele lor),
# dar se pot reface oricând cu acest script.
#
#   bash scripts/install-skills.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS="$ROOT/.claude/skills"
REGISTRY="$ROOT/.claude/design-registry"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$SKILLS" "$REGISTRY"

echo "→ frontend-design (anthropics/claude-code)"
git clone --depth 1 --filter=blob:none --sparse https://github.com/anthropics/claude-code.git "$TMP/cc" >/dev/null 2>&1
git -C "$TMP/cc" sparse-checkout set plugins/frontend-design >/dev/null
cp -r "$TMP/cc/plugins/frontend-design/skills/frontend-design" "$SKILLS/"

echo "→ shadcn (shadcn-ui/ui)"
git clone --depth 1 --filter=blob:none --sparse https://github.com/shadcn-ui/ui.git "$TMP/shadcn" >/dev/null 2>&1
git -C "$TMP/shadcn" sparse-checkout set skills >/dev/null
cp -r "$TMP/shadcn/skills/shadcn" "$SKILLS/"

echo "→ gsap-skills (greensock)"
git clone --depth 1 https://github.com/greensock/gsap-skills.git "$TMP/gsap" >/dev/null 2>&1
cp -r "$TMP"/gsap/skills/*/ "$SKILLS/"

echo "→ ui-ux-pro-max (nextlevelbuilder)"
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git "$TMP/uiux" >/dev/null 2>&1
cp -r "$TMP"/uiux/.claude/skills/*/ "$SKILLS/"

echo "→ awesome-design-skills (bergside)"
git clone --depth 1 https://github.com/bergside/awesome-design-skills.git "$TMP/awesome" >/dev/null 2>&1
cp -r "$TMP"/awesome/skills/* "$REGISTRY/"
cp "$TMP/awesome/README.md" "$REGISTRY/README.md"

# Stilul vizual activ. Schimbă-l cu alt folder din design-registry dacă vrei
# altă direcție (de ex. dramatic, retro, editorial).
cp -r "$REGISTRY/bold" "$SKILLS/bold"

echo
echo "Gata. Skill-uri în $SKILLS"
ls "$SKILLS"
