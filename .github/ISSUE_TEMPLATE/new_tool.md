---
name: New tool proposal
about: Propose a new CLI tool for the nix ecosystem
title: '[TOOL] '
labels: new-tool
assignees: ''

---

**Tool name**
What would you call this tool? (e.g., `nix habit`)

**What does it do?**
Describe the functionality in one sentence.

**Proposed commands**
```
nix toolname <command> [args]
```

**Example usage**
```bash
nix toolname add "something"  # Add item
nix toolname list             # Show all
nix toolname stats            # Show analytics
```

**Data storage**
- [ ] New JSON file in `data/`
- [ ] Existing file (which?)
- [ ] No persistence needed

**Why this tool?**
What problem does it solve? How does it fit the nix philosophy?

**Prior art**
Are there similar tools? How is this different?
