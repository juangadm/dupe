# Dupe Testing Playbook: Ramp + Airbnb

## The Problem

The dupe skill produces clones that look wrong (layout off, content missing) but its own verification says PASS. Two problems: extraction/build quality is low AND verification is miscalibrated. Goal: iterative test-and-fix until publish-ready.

---

## Setup: Before Every Test Session

Open terminal. Run these commands every time you start a new session.

```bash
# 1. Go to the dupe repo
cd "/Users/juangabrieldelgadomontes/My Drive/4. Gen AI/dupe"

# 2. Make sure you're on latest main
git pull origin main

# 3. Clean any stale test output from previous runs
rm -rf /tmp/dupe-test-* /tmp/dupe-extraction-*

# 4. Start Claude Code with the plugin loaded locally
claude --plugin-dir .
```

That last command opens Claude Code with the dupe plugin loaded from your local checkout. Every SKILL.md change you committed is now live — no reinstall needed.

---

## How To Run A Test

Once inside Claude Code (from step 4 above), type:

```
/dupe:dupe https://try.ramp.com
```

or

```
/dupe:dupe https://www.airbnb.com
```

The agent will run the full pipeline (extract → build → verify). When it finishes:

```bash
# In a separate terminal tab, serve the clone
cd /tmp/dupe-test-try.ramp.com   # or /tmp/dupe-test-www.airbnb.com
npx serve -l 8787
```

Open `http://localhost:8787` in your browser. Open the real site in another tab. Compare side-by-side.

---

## How To Grade (Your Job, JuanGa)

Score each page on these 3 dimensions (1-5):

| Dimension | 1 | 3 | 5 |
|-----------|---|---|---|
| **Visual** | Clearly different layout | Right structure, wrong spacing | Looks like the real site |
| **Content** | Missing sections | Most content, some gaps | Everything present |
| **Interactions** | Nothing works | Some work | Tabs/dropdowns/nav all work |

Write specific notes. "Sidebar is too wide" is useful. "Looks off" is not.

Then check: did the agent's verification report match your assessment? If it said PASS and you say it's bad → that's a **false positive** we need to fix.

---

## The Fix Loop

After grading, come back to Claude Code (new session if needed) and say:

```
Read the testing playbook at /Users/juangabrieldelgadomontes/My Drive/4. Gen AI/dupe/tasks/testing-playbook.md

I just ran Round [N] on [Ramp/Airbnb]. Here are my grades and notes:
[paste your grades and specific issues]

The agent's verification report said: [paste summary]

Diagnose the root causes and fix SKILL.md / scripts.
```

Claude will:
1. Read the playbook for context
2. Trace each issue to a root cause (extraction gap, build bug, or verification calibration)
3. Fix the right files
4. Add lessons to `lessons.md`
5. Commit

Then you re-run the test (back to "How To Run A Test" above).

---

## Round-by-Round Plan

### Day 1: Ramp Round 1 (Baseline)

1. Setup (commands above)
2. Run `/dupe:dupe https://try.ramp.com`
3. Grade all 3 pages: overview, expenses, travel
4. Note every issue
5. Paste grades into Claude → get fixes
6. Commit fixes, push

### Day 1-2: Ramp Round 2 (Fix & Retest)

1. `git pull` to get the fixes
2. Clean tmp: `rm -rf /tmp/dupe-test-* /tmp/dupe-extraction-*`
3. Re-run `/dupe:dupe https://try.ramp.com`
4. Grade again — what improved? What's still broken?
5. If all pages score 4+ → move to Airbnb
6. If not → fix top issues, Round 3

### Day 2-3: Airbnb Round 1 (New Architecture)

1. Run `/dupe:dupe https://www.airbnb.com`
2. Expect new failure modes: lazy loading, carousels, heavy images
3. Grade homepage only (1 page to start)
4. Fix Airbnb-specific gaps (these likely generalize)

### Day 3: Airbnb Round 2 + Regression

1. Re-run Airbnb with fixes
2. Grade again
3. **Also re-run Ramp** to check fixes didn't break it
4. Final grades on both sites

---

## Per-Round Documentation

After each round, tell Claude to save results to `tests/{site}/round-{N}.md`:

```markdown
# Round {N} — {site} — {date}

## Human grades
| Page | Visual | Content | Interactions | Notes |
|------|--------|---------|-------------|-------|
| overview | 2 | 3 | 2 | sidebar too wide, missing budget bars |

## Agent verification said
- Color grid: 87% PASS
- Structural: PASS
- Interactions: 4/5 PASS

## False positives
- Color grid said 87% PASS but layout is clearly wrong — sidebar column is off
- Structural said PASS but 3 table columns are missing

## Root causes identified
1. extract-structure.js doesn't capture grid template column widths
2. ...

## Fixes applied
1. Updated extract-structure.js to include grid-template-columns
2. ...
```

---

## Diagnosis Cheat Sheet

| What you see | Root cause | Fix where |
|-------------|-----------|-----------|
| Wrong spacing/widths | Extraction JSON missing that CSS value | `extract-structure.js` or `extract-visual.js` |
| Missing sections entirely | Page not scrolled far enough, section skipped | `extract-scroll-to-bottom.js` or extraction checklist in SKILL.md |
| Content present but wrong text | Agent fabricated instead of extracting | SKILL.md extraction rules |
| Dead tabs/dropdowns | Interaction extraction too shallow | `extract-interaction.js` or Interaction Depth Matrix |
| Verification says PASS but clone is bad | Threshold too lenient or metric doesn't cover the gap | `verify-*.js` thresholds in SKILL.md Phase 5 |
| Huge scary Bash prompt | Agent wrote inline script (banned) | Ban table in SKILL.md ABSOLUTE RULE |

---

## Exit Criteria (Publish-Ready)

- [ ] Ramp: all pages score 4+ on visual, content, interactions
- [ ] Airbnb: homepage scores 4+ on all dimensions
- [ ] Zero false positives in verification reports
- [ ] No inline script violations during any run
- [ ] Extraction JSON > 20KB per site
- [ ] All fixes documented as lessons and flowed back to SKILL.md
- [ ] Both test clones archived in `tests/`
- [ ] README updated with before/after screenshots
