---
title: "Configuration Is Easy; Maintenance Is the Work"
published: 2026-05-30
description: "Setting up a clean environment is the easy part. Keeping it clean is the real work — and most of that work is subtraction."
tags: [macos, mise, maintenance]
category: Engineering
series: "sovereign-tools"
seriesOrder: 7
draft: false
---

Every clean environment I have ever built was clean for about six months. Then I looked closely and found three Python versions where I expected one, a Brewfile that no longer matched the machine, and a `mise list` full of runtimes I had installed for some experiment I could not even remember. Nothing had broken. It had just drifted, quietly, the way every system does the moment you stop watching it.

This is the last article in the series, and it is the one I think matters most, because it corrects the impression the other six might leave. Those articles were about configuration: the layers, the settings, the dotfiles. Configuration is a one-time act, and it is the easy part. Keeping the environment clean afterward is a continuous one, and that is the actual work. The good news is that the work is small and mostly consists of *removing* things — if you build the habit of seeing drift before it accumulates.

## Three kinds of drift

The **drift** (divergence between declared state and actual machine state) that erodes a clean setup comes in three recognizable forms, and each was foreshadowed by an earlier article.

The first is **silent auto-install**: a tool provisions something behind your back, the way `uv` downloaded its own Python in the [Python article](/posts/python/). This is the most insidious kind because nothing prompts you — the machine simply gains state you did not choose. The defense is mostly the declarative settings from earlier (`python-preference = only-system` turns a silent download into a visible error), but no set of settings catches everything, so you also need to be able to look.

The second is **forgotten sync**: you install something deliberately and forget to declare it, so the Brewfile from the [apps article](/posts/apps/) slowly falls behind reality. This drift is benign until a migration, at which point it becomes a pile of "oh, I forgot I had that". The defense is the reconcile step.

The third is **accumulated cruft**: runtimes, tools, and packages you genuinely installed on purpose, used once, and never removed. This is the hardest because nothing is wrong with any individual item. It is the accumulation itself that is the problem, and accumulation has no error message.

## Make drift visible

You cannot maintain what you cannot see, so the foundation of upkeep is a small set of **health-check functions** — shell functions that surface drift on demand. The series has already introduced two: `brewdiff` for the Brewfile, and `zhealth` for stray zsh files in the home directory. The Python layer deserves its own, because the silent-install drift is so easy to miss. I call it `pyversions`, and it lines up every answer to "which Python" so a disagreement is obvious at a glance:

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

When `mise current`, the shell's `python`, and `uv run python` all agree, the layer is healthy. When they diverge, something owns a Python it should not, and I go find it — exactly the investigation the Python article walked through, now reduced to one command I can run any time I am suspicious.

The point generalizes past Python. A health check is just a function that compares declared state to actual state and prints the difference. `mise list` audited against the `mise.toml` files I actually use, `brew bundle check` against the Brewfile, `zhealth` against the expectation that `$HOME` holds one zsh file — each makes a category of drift visible in seconds. None of them fix anything. They report, and reporting is what turns drift from something you discover by accident into something you can choose to act on.

## The work is mostly subtraction

Here is the part that took me longest to learn. A mature clean environment is not the one with the most carefully configured tools. It is the one with the *fewest tools that are not actually used*. The defining move of maintenance is removal, not addition.

I run a simple test against anything questionable: **have I actually used this in the last 30 days?** If a runtime, a global tool, or an installed application has not been touched in a month, it is a candidate for removal — not an automatic deletion, but a thing I now have to justify keeping. `mise` makes this concrete for runtimes:

```bash
$ mise list                 # what's installed
$ mise uninstall python@3.11 # remove a version no project uses
$ mise prune                 # drop versions nothing references
```

The [Ruby decision](/posts/polyglot/) from the previous article is the same instinct applied earlier, before installation rather than after. The system Ruby being old is not a reason to install a `mise`-managed Ruby on a machine with no Ruby projects. Installing on demand instead of preemptively is just subtraction performed in advance — the tool you never install is the easiest one to keep clean.

## Why removal is hard, and how to make it happen

If subtraction is so clearly right, why is every developer's machine a museum of unused tools? Because we are wired against it. Adding a tool feels like progress — there is a small reward in installing something new and imagining the problems it will solve. Removing one feels like loss, and worse, it can feel like admitting the original install was a mistake. Sunk cost and the discomfort of being wrong both push toward keeping things, and neither pushes back.

The counter is to not rely on feeling like removing things in the moment, because you never will. Instead, schedule it. A periodic subtraction pass — run the health checks, look at what has not been used in 30 days, remove what you cannot justify — turns removal from an emotional decision into a routine one. It helps to reframe the goal, too: an empty line in `mise list`, a short Brewfile, a home directory with one dotfile are not gaps waiting to be filled. They are the target. A machine that does less is not under-provisioned; it is clean.

There is an irony to guard against, and it is the honest caveat for this whole article. It is entirely possible to over-engineer the maintenance itself — to build an elaborate dashboard of health checks and scheduled jobs that becomes its own maintenance burden, a new thing to keep clean. The reconcile steps only work if they stay low-friction; a `brewdiff` you run in two seconds gets run, and a monitoring system you have to maintain does not. If keeping the environment clean starts to cost more than the mess would have, the cure has become the disease. Keep the tools small enough that using them is never the hard part.

## The sixth layer

The [manifesto](/posts/manifesto/) opened this series with four layers: System, Runtime version, Package manager, Project dependencies. After living with them, I think there is a fifth thing holding the stack up that none of the four can supply, and it is not a tool you install. It is the discipline to keep looking — to run the health check, to do the subtraction pass, to treat drift as something you converge on a schedule rather than something you notice when it finally breaks.

That is the real conclusion. Cleanliness is not a state you reach and then possess. It is a process you keep running, at low cost, indefinitely. The configuration articles in this series describe a machine you can set up in an afternoon. This one describes the habit that determines whether it is still clean a year later, and the habit is worth more than any of the settings.

So the closing suggestion is not to install anything. It is to run one health check on your machine right now — `which python` and `uv run python --version`, or just look at how many things are in your `mise list` that you have not touched in a month. See how far your environment has already drifted while you were not watching. That gap, between what you think is on your machine and what actually is, is the work. The whole series has only ever been about making it small, and keeping it that way.

---

*This is the final article in the Sovereign Tools series. The full set, in reading order, is on the [series index](/series/sovereign-tools).*
