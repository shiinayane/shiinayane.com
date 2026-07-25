---
title: "Configuration Is Easy; Maintenance Is the Work"
published: 2026-05-30
description: "A clean development environment drifts quietly. These small checks make that drift visible before cleanup becomes a project of its own."
tags: [macos, mise, maintenance]
category: Engineering
series: "sovereign-tools"
seriesOrder: 7
draft: false
lang: en
translationKey: maintenance
---

Every clean environment I have built has stayed clean for about six months. The last time I looked closely, I found three Python versions where I expected one, a Brewfile that no longer described the machine, and a `mise list` full of runtimes installed for experiments I could no longer remember. Nothing was broken. The machine had simply drifted while I was using it.

This is the last article in the series. The previous six covered configuration—layers, settings, and dotfiles—but that is the part I can finish in an afternoon. Whether the setup is still clean a year later depends on a much smaller, recurring job: noticing drift and removing what no longer belongs.

## What drift looks like

I usually find one of three things.

**Silent auto-install.** A tool provisions something without asking, as `uv` did with its own Python in the [Python article](/posts/python/). The machine gains state I did not choose, and there may be no warning at all, which makes this the easiest kind of drift to miss. Declarative settings prevent some of it: `python-preference = only-system`, for example, turns that silent download into a visible error. They do not catch every tool, so I still need a way to inspect the result.

**Forgotten sync.** I install something deliberately but forget to declare it. The Brewfile from the [apps article](/posts/apps/) then falls behind the actual machine. This rarely matters day to day; it matters during a migration, when every missing entry becomes “oh, I forgot I had that.” The fix is to reconcile the two states before I need the file for recovery.

**Accumulated cruft.** A runtime, global tool, or package was installed intentionally, used once, and never removed. This is the hardest kind to clean up: each item is valid on its own, so nothing reports an error. Only the accumulated list reveals the problem.

## A health check should only make drift visible

I keep a few shell functions for this. Earlier articles introduced `brewdiff`, which compares the installed applications with the Brewfile, and `zhealth`, which finds stray zsh files in the home directory. Python needs a similar check because it is particularly easy for several tools to acquire different interpreters without making the disagreement obvious:

```zsh
# 30-functions.zsh — surface Python version drift across tools
pyversions() {
  echo "shell PATH   : $(command -v python)"
  echo "  reports    : $(python --version 2>&1)"
  echo "mise current : $(mise current python 2>/dev/null || echo '—')"
  echo "uv would use : $(uv run python --version 2>&1)"
  echo "mise list    :"
  mise list python 2>/dev/null | sed 's/^/  /'
}
```

`pyversions` puts the shell's `python`, `mise current`, `uv run python`, and the installed `mise` versions in one view. If the first three agree, the Python layer is healthy. If they do not, some tool owns a Python I did not expect, and I can repeat the investigation from the Python article without first rediscovering all the commands.

The same pattern covers the other layers:

- compare `mise list` with the `mise.toml` files I actually use;
- compare the machine with the Brewfile through `brew bundle check`;
- compare the contents of `$HOME` with the expectation that it contains one zsh file.

These checks do not repair anything. That is intentional. A small reporting command is easy to trust and easy to run; it turns drift from a surprise into a decision.

## The 30-day test

For me, a mature setup is one with very few tools that are no longer used. That makes maintenance mostly a matter of subtraction.

For anything questionable, I ask whether I have actually used it in the last 30 days. A runtime, global tool, or application that has gone untouched for a month becomes a candidate for removal—not an automatic deletion, but something that now needs a reason to stay.

For `mise` runtimes, the pass is concrete:

```bash
$ mise list                 # what's installed
$ mise uninstall python@3.11 # remove a version no project uses
$ mise prune                 # drop versions nothing references
```

The [Ruby decision](/posts/polyglot/) in the previous article applies the same test before installation. An old system Ruby is not, by itself, a reason to add a `mise`-managed Ruby to a machine with no Ruby projects. Waiting until a project needs it avoids creating another runtime to audit and eventually remove.

I do this as a periodic cleanup instead of waiting until I feel motivated. Installing a new tool feels productive; removing one feels like losing something or admitting the original installation was a mistake. Sunk cost makes leaving it alone even easier. A schedule is less dramatic: run the checks, review what has not been used for 30 days, and remove what I cannot justify.

An empty line in `mise list`, a short Brewfile, or a home directory with one dotfile is not missing configuration. Sometimes it is the desired result.

## Do not turn maintenance into another system

The cleanup itself can drift into over-engineering. It would be easy to build a dashboard, scheduled jobs, and a collection of checks elaborate enough to require their own maintenance.

That defeats the point. A `brewdiff` that takes two seconds gets used. A monitoring system that needs attention does not. Reconciliation only remains useful while its cost is lower than the mess it prevents, so I keep these tools small and let them report rather than automate every decision.

The [manifesto](/posts/manifesto/) started this series with four layers: System, Runtime version, Package manager, and Project dependencies. There is a fifth part that none of those layers can provide: occasionally looking at the machine, comparing it with the declared state, and bringing the two back together before something breaks.

On a machine I have not checked recently, I start with `which python` and `uv run python --version`, then look through `mise list` for anything untouched in a month. That is usually enough to show whether the environment I remember is still the one I have.

---

*This is the final article in the Sovereign Tools series. The full set, in reading order, is on the [series index](/series/sovereign-tools).*
