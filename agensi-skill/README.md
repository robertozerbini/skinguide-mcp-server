# Agensi skill

This folder is the source of the **SkinGuide skincare finder** skill listed on
[Agensi](https://agensi.io). Agensi lists skills, not MCP servers, so this skill
teaches AI agents when and how to use this repository's MCP server.

- `SKILL.md` - the skill itself (frontmatter + instructions)
- `references/tools.md` - per-tool parameter reference, condensed from the root README

It is text only - no scripts. To package it for upload:

```bash
cd agensi-skill && zip -r ../skinguide-skill.zip .
```

Do not commit the zip.
