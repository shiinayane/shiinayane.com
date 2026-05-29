---
title: "Python, mise, and uv: A Reconciliation"
published: 2026-05-30
description: "uv quietly prefers its own managed Python, which conflicts with mise owning runtime versions. One setting — python-preference = only-system — makes them agree."
tags: [macos, python, uv, mise]
category: Engineering
series: "sovereign-tools"
seriesOrder: 4
draft: false
---

It started with a discrepancy I could not explain. I ran the same command in two directories and got two different answers:

```bash
$ cd ~/project && uv run python --version
Python 3.12.7
$ cd ~ && uv run python --version
Python 3.13.1
```

The second one bothered me more than the first. The version difference between projects was expected — each project pins its own runtime. But in my home directory, with no project around, `uv` produced a Python 3.13.1 that I had no memory of installing. I run `mise` as the single owner of runtime versions, the way the [first article](/posts/manifesto/) describes, and 3.13.1 was not a version `mise` knew about. Something else had put a Python on my machine without asking.

This article is the investigation that followed, the mental model that finally made it make sense, and the one-line setting that resolved it. It is the most detailed piece in the series because the underlying lesson — what to do when a tool's defaults quietly contradict your architecture — is the one I reach for most often.

## The investigation

The first thing to check is what `python` even means in each context. The shell's `python` and `uv`'s `python` turned out to be different binaries:

```bash
$ which python
/Users/me/.local/share/mise/installs/python/3.12.7/bin/python
$ uv run python -c 'import sys; print(sys.executable)'
/Users/me/.local/share/uv/python/cpython-3.13.1-macos-aarch64-none/bin/python3.13
```

So the shell's `python` is the one `mise` installed and put on `PATH`. But `uv run`, in the absence of a project pin, reached for something under `~/.local/share/uv/python` — a directory I had never deliberately populated. Asking `uv` to list what it considered installed confirmed it:

```bash
$ uv python list --only-installed
cpython-3.13.1-macos-aarch64-none    /Users/me/.local/share/uv/python/cpython-3.13.1-.../bin/python3.13
cpython-3.12.7-macos-aarch64-none    /Users/me/.local/share/mise/installs/python/3.12.7/bin/python3.12
```

There were two Pythons. One that `mise` owned, in `mise`'s install directory, and one that `uv` had quietly downloaded and tucked away in its own. Tracing the real file with `readlink -f` showed they were genuinely distinct CPython builds, not two names for one binary. `uv` had, at some point, decided I needed a Python, found that `PATH` did not offer one it liked, and fetched its own without a word.

## The root cause: a sane default that is wrong for me

This is not a bug. It is `uv` doing exactly what it is configured to do by default. `uv` has a setting called `python-preference`, and its default value is `managed`, which means: *prefer a uv-managed Python, and if none satisfies the project's `requires-python`, download one.*

For `uv`'s intended audience this is a thoughtful default. If you have just installed `uv` and nothing else, you want `uv run` to simply work — to produce a Python without making you go install one first. Auto-downloading a managed interpreter is the friendliest possible behavior for a user who has no other version manager.

It is hostile, though, to an architecture where `mise` is the single source of truth for **Layer 1 — Runtime version**. In that world there is supposed to be exactly one tool responsible for which Python exists, and it is `mise`. When `uv` silently provisions its own Python, two tools now own Layer 1, and the symptom is precisely the mystery I started with: a Python on my machine that the supposed owner of Pythons did not install. The default is not wrong in general. It is wrong *for this design*, and the two are not the same thing.

Before fixing it, I needed to actually understand what these Pythons, the virtual environments built on them, and `uv`'s cache are to each other. Otherwise the fix is cargo-cult.

## A mental model: blueprint, sample unit, shared library

The piece that made everything click was realizing these three things play completely different roles, even though they are all "Python stuff in hidden directories."

<figure class="my-6">
<svg viewBox="0 0 640 300" role="img" aria-labelledby="diagram-factory-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-factory-title">Blueprint, sample unit, and shared library: mise install, .venv, and the uv cache</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <!-- Blueprint -->
    <rect x="10" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="100" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">Blueprint</text>
    <text x="100" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">mise install</text>
    <text x="100" y="116" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.6">python 3.14.0</text>
    <text x="100" y="150" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">one full interpreter</text>
    <text x="100" y="168" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">per version number</text>
    <text x="100" y="200" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">many versions</text>
    <text x="100" y="218" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.5">coexist</text>
    <!-- Sample unit -->
    <rect x="230" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="320" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">Sample unit</text>
    <text x="320" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">project/.venv</text>
    <text x="320" y="124" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">bin/python → symlink</text>
    <text x="320" y="142" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">to the blueprint</text>
    <text x="320" y="186" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">site-packages =</text>
    <text x="320" y="204" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">the only private part</text>
    <!-- Shared library -->
    <rect x="450" y="60" width="180" height="180" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="540" y="40" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">Shared library</text>
    <text x="540" y="92" font-size="13" font-weight="600" text-anchor="middle" fill="currentColor">uv cache</text>
    <text x="540" y="124" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">content-addressable</text>
    <text x="540" y="160" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">one copy of a package</text>
    <text x="540" y="178" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">shared across all</text>
    <text x="540" y="196" font-size="11.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">projects</text>
    <!-- arrows -->
    <text x="210" y="135" font-size="18" text-anchor="middle" fill="currentColor" fill-opacity="0.4">←</text>
    <text x="210" y="152" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.5">symlink</text>
    <text x="430" y="135" font-size="18" text-anchor="middle" fill="currentColor" fill-opacity="0.4">→</text>
    <text x="430" y="152" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.5">link in</text>
  </g>
</svg>
</figure>

A **version** — what `mise install python@3.14` produces — is a *blueprint*. It is one complete interpreter, identified by its version number. You can have as many blueprints as you have version numbers, and they coexist without interfering; `3.12.7` and `3.14.0` are simply two different blueprints in `mise`'s install directory.

A **`.venv`** is a *sample unit* stamped from a blueprint. The crucial and under-appreciated fact is that a virtual environment is mostly symlinks. Its `bin/python` points back to the blueprint interpreter; it does not contain a copy of Python. The only genuinely project-private part of a `.venv` is `site-packages`, where this project's installed libraries live. This is why a `.venv` is small and fast to create, and it is also why deleting a `mise`-managed Python breaks every `.venv` built on it: you removed the blueprint, and all the sample units were pointing at it.

The **uv cache** is a *shared software library*. It is content-addressable: each version of each package is stored once, and when a project needs it, `uv` links it into that project's `site-packages` rather than copying it. Ten projects depending on the same version of `numpy` reference one cached copy. This is the bulk of why `uv` is fast and why its installs feel nearly free — most of the time it is making links, not downloading and unpacking.

Hold these three together and the architecture is obvious: `mise` makes blueprints, `uv` stamps sample units from them and fills their `site-packages` from the shared library. There is no reason for `uv` to also be making blueprints. That is `mise`'s job. The whole problem is that `uv`'s default has it making blueprints on the side.

## The fix is one setting

`uv` reads a global config from `~/.config/uv/uv.toml`. The entire fix is to tell it not to manage Pythons:

```toml
# ~/.config/uv/uv.toml
python-preference = "only-system"
```

`python-preference` has four values, and the trade-off between them is the whole decision:

- `only-managed` — only ever use uv-managed Pythons; ignore anything on the system. The most isolated, and the furthest from a mise architecture.
- `managed` (the default) — prefer uv-managed, fall back to system, and download one if neither satisfies `requires-python`. The silent-download behavior I hit.
- `system` — prefer a Python already on `PATH`, but still fall back to downloading a managed one if nothing fits.
- `only-system` — use only Pythons found on the system (`PATH`), and never download one. If no suitable Python exists, that is an error.

`only-system` is the one that restores single ownership. With it set, `uv` treats the Python that `mise` put on `PATH` as the only Python that exists. It can no longer reach into Layer 1; it is confined to Layer 2 — package management — which is exactly the boundary the architecture wants. The cost is the last clause: if no installed Python satisfies a project, `uv` errors instead of silently fixing it. I will argue in a moment that this cost is actually the feature.

With the setting in place, I removed the Python `uv` had downloaded behind my back and rebuilt the affected environment from the blueprint `mise` owns:

```bash
$ uv python uninstall 3.13.1
$ cd ~/project && rm -rf .venv && uv sync
```

After that, `uv run python` and the shell's `python` agreed everywhere, because there was once again exactly one source of Pythons.

## Changing a global rule means re-examining existing state

Here is the part most write-ups skip, and it is the most important. Flipping `python-preference` to `only-system` is a change to a *global rule*. Global rules apply to *existing state*, not just future actions, and that existing state was created under the old rule.

Concretely: I had old projects whose `mise.toml` requested a Python version I had since removed from `mise`. Under the old default, `uv sync` in those projects would have silently downloaded the missing version and carried on. Under `only-system`, the same `uv sync` now *errors*:

```text
error: No interpreter found for Python 3.11 in system path
```

It is tempting to read that error as a regression — something that used to work now does not. It is the opposite. The error is the architecture telling the truth: this project asks for a Python that is not installed, and rather than papering over that with a surprise download, it stops and makes me decide. The fix is explicit and one line:

```bash
$ mise install python@3.11   # provision the blueprint, deliberately
$ uv sync                    # now succeeds, using mise's Python
```

So onboarding an old project under this regime has a small checklist:

1. Read the project's required Python (`requires-python` in `pyproject.toml`, or the `mise.toml` pin).
2. `mise install` that version if it is not already a blueprint on the machine.
3. `rm -rf .venv && uv sync` to rebuild the sample unit from the now-present blueprint.
4. Confirm `uv run python --version` reports what you expect.

The friction is real and it is the point. A silent auto-download is convenient exactly because it hides a decision you should be making. Trading that convenience for an error you resolve in one deliberate command is how the machine stays free of Pythons you never chose.

To make the fix permanent and portable, `uv.toml` goes into the chezmoi source repo like every other dotfile from the [dotfiles article](/posts/dotfiles/). The correction then travels to any machine I set up, so I never re-derive it.

## The escape hatches for one-off scripts

A fair objection: the full project dance — `pyproject.toml`, a `.venv`, `uv sync` — is far too heavy when all I want is to run a 40-line script that happens to need `httpx`. `uv` has lighter tools for exactly this, and they respect the same `only-system` rule, so they do not reintroduce the problem.

For a throwaway invocation, `--with` adds dependencies for that run only, in a temporary environment:

```bash
$ uv run --with httpx --with rich script.py
```

Better, for a script I want to keep, is PEP 723 inline script metadata: the dependencies are declared in a comment block at the top of the file itself, so the script is self-describing and needs no surrounding project:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "rich"]
# ///
import httpx
from rich import print
print(httpx.get("https://example.com").status_code)
```

Run it with `uv run script.py` and `uv` reads the metadata, assembles the environment from the cache, and executes — no `.venv` to manage. Pair this with a `uv` shebang and `chmod +x`, drop the file in `~/.local/bin`, and a personal Python script becomes a first-class command on `PATH` again, with its dependencies pinned in the file rather than installed globally. After years of `pip install`-ing utilities into a global interpreter and forgetting about them, this is what brought my small personal scripts back from the dead without polluting anything.

For installing actual command-line *tools* written in Python, `uv tool install` (and its run-once form `uvx`) keep each tool in its own isolated environment, which is the right home for things like `ruff` or `httpie` — never a global `pip install`.

## The general lesson

The specific outcome is narrow: one TOML key. The transferable part is the shape of the problem. A capable tool shipped a default tuned for its standalone audience, and that default quietly contradicted an assumption my architecture depended on — that `mise` alone owns runtime versions. The work was not to fight the tool but to (1) notice the contradiction, usually via a symptom that does not add up, (2) understand the model well enough to know which behavior I actually wanted, and (3) correct it with a single declarative setting, then track that setting so the correction is permanent.

Two honest caveats. `only-system` does add a step whenever `mise` lacks a version you need — you run `mise install` before `uv sync`, where the default would have done it for you; if that friction annoys you, `system` is the looser choice that still prefers your existing Pythons but will fall back to downloading. And if you do not use `mise` at all — if your world is pure Python — then none of this applies, and letting `uv` own both the runtime and the packages is a perfectly coherent single-source design in its own right. The conflict only exists because two tools both wanted Layer 1. The next article, on [when to let the official tool win](/posts/sovereignty/), is about deciding who that single owner should be in the first place.
