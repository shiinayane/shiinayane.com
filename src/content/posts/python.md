---
title: "Making mise and uv Agree on Python"
published: 2026-05-30
description: "uv had installed a Python that mise did not know about. Setting python-preference to only-system restored one clear owner, with a few consequences for existing projects."
tags: [macos, python, uv, mise]
category: Engineering
series: "sovereign-tools"
seriesOrder: 4
draft: false
lang: en
translationKey: python
---

I noticed the problem because the same command returned different versions in two directories:

```bash
$ cd ~/project && uv run python --version
Python 3.12.7
$ cd ~ && uv run python --version
Python 3.13.1
```

The project result was expected: each project can pin its own runtime. The result in my home directory was not. I did not remember installing Python 3.13.1, and `mise`—which I use as the sole owner of runtime versions, as described in the [first article in this series](/posts/manifesto/)—did not know about it.

## Finding the other Python

I first checked what `python` referred to in each context. The shell and `uv run` were using different binaries:

```bash
$ which python
/Users/me/.local/share/mise/installs/python/3.12.7/bin/python
$ uv run python -c 'import sys; print(sys.executable)'
/Users/me/.local/share/uv/python/cpython-3.13.1-macos-aarch64-none/bin/python3.13
```

The shell found the interpreter installed by `mise` and exposed on `PATH`. Outside a pinned project, however, `uv run` selected an interpreter under `~/.local/share/uv/python`, a directory I had never intentionally populated.

`uv`'s own list made the split explicit:

```bash
$ uv python list --only-installed
cpython-3.13.1-macos-aarch64-none    /Users/me/.local/share/uv/python/cpython-3.13.1-.../bin/python3.13
cpython-3.12.7-macos-aarch64-none    /Users/me/.local/share/mise/installs/python/3.12.7/bin/python3.12
```

There were two separate CPython builds. `readlink -f` confirmed that these were not two paths to the same binary: one belonged to `mise`, while the other had been downloaded and stored by `uv`.

This is normal `uv` behavior, not a bug. Its `python-preference` setting defaults to `managed`: prefer a uv-managed Python and, when no available interpreter satisfies a project's `requires-python`, download one. That is convenient when `uv` owns both the runtime and the packages. It conflicts with my setup because `mise` is supposed to be the only tool deciding which Python versions exist.

## Interpreter, virtual environment, and cache

Before changing the setting, I needed to separate three things that all look like “Python files in hidden directories” but have different lifetimes and owners.

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

I think of a version installed by `mise install python@3.14` as a **blueprint**: one complete interpreter identified by a version number. Several versions can coexist in `mise`'s install directory, so 3.12.7 and 3.14.0 are simply two independent blueprints.

A project's **`.venv`** is a **sample unit** made from one of them. A virtual environment is mostly symlinks; its `bin/python` points back to the source interpreter instead of containing another copy. Its genuinely project-private part is `site-packages`. This makes a `.venv` small and quick to create, but it also means that removing a `mise`-managed Python breaks every environment whose `bin/python` points to it.

The **uv cache** is the shared library. It is content-addressable: a package version is stored once, then linked into each project's `site-packages` rather than repeatedly copied. If ten projects use the same version of `numpy`, they can refer to the same cached copy. Much of `uv`'s speed comes from creating these links instead of downloading and unpacking the same files again.

In this model, `mise` supplies interpreters. `uv` creates project environments from them and fills those environments from its package cache. I did not need `uv` to provision another interpreter as well.

## Restricting uv to system Python

`uv` reads global configuration from `~/.config/uv/uv.toml`. I added one setting:

```toml
# ~/.config/uv/uv.toml
python-preference = "only-system"
```

The four possible values matter:

- `only-managed` uses only uv-managed Pythons and ignores system interpreters. It provides the strongest isolation from the system and is the furthest from a `mise`-owned setup.
- `managed`, the default, prefers uv-managed Pythons, falls back to system Pythons, and downloads a managed interpreter if neither satisfies `requires-python`. This was the source of my unexpected installation.
- `system` prefers an interpreter already on `PATH`, but can still download a managed one when no suitable system interpreter exists.
- `only-system` uses only system Pythons, including those that `mise` places on `PATH`, and never downloads one. If none satisfies the requirement, the command fails.

For my setup, that final failure mode is useful: a missing version remains visible until I install it through `mise`. Someone who wants to prefer `mise` without giving up `uv`'s fallback can choose `system` instead.

After changing the setting, I removed `uv`'s copy of Python 3.13.1 and rebuilt the affected environment:

```bash
$ uv python uninstall 3.13.1
$ cd ~/project && rm -rf .venv && uv sync
```

`uv run python` and the shell's `python` then agreed because both resolved to an interpreter owned by `mise`.

## Existing projects can fail after the change

Changing a global selection rule also affects environments created under the old rule. I had older projects whose `mise.toml` requested Python versions that I had since removed from `mise`. Previously, `uv sync` could download the missing interpreter and continue. With `only-system`, it stopped:

```text
error: No interpreter found for Python 3.11 in system path
```

That error means the project requests a Python that is not currently installed. The explicit repair is:

```bash
$ mise install python@3.11   # provision the blueprint, deliberately
$ uv sync                    # now succeeds, using mise's Python
```

When reopening an older project, I now:

1. Check `requires-python` in `pyproject.toml` and any version pinned in `mise.toml`.
2. Run `mise install` if that interpreter is missing.
3. Run `rm -rf .venv && uv sync` so the environment points to the installed interpreter.
4. Confirm the result with `uv run python --version`.

This adds a deliberate `mise install` step where the default configuration might have fixed the mismatch silently. I prefer seeing the missing runtime, but it is a real trade-off rather than free strictness.

I also keep `uv.toml` in my chezmoi source repository, alongside the files discussed in the [dotfiles article](/posts/dotfiles/), so the same rule follows me to another machine.

## Small scripts do not need full projects

For a 40-line script that needs `httpx`, creating `pyproject.toml`, a `.venv`, and a lockfile is unnecessary. `uv` offers smaller paths that still obey `only-system`.

For a throwaway run, `--with` adds dependencies to a temporary environment:

```bash
$ uv run --with httpx --with rich script.py
```

For a script worth keeping, PEP 723 metadata records the Python requirement and dependencies in the file:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "rich"]
# ///
import httpx
from rich import print
print(httpx.get("https://example.com").status_code)
```

Running `uv run script.py` makes `uv` read that metadata, assemble an environment from its cache, and execute the script without a project `.venv`. With a `uv` shebang, `chmod +x`, and a location such as `~/.local/bin`, the script can also act like any other command on `PATH` while keeping its dependencies in the file. This has been much cleaner than the personal utilities I used to install into a global interpreter with `pip install` and later forget about.

Actual command-line tools belong in isolated tool environments. `uv tool install` handles persistent installations, while `uvx` runs a tool once; both fit utilities such as `ruff` or `httpie` better than a global `pip install`.

If `mise` is absent, letting `uv` own both Python and its packages is internally consistent, and the default `managed` behavior may be exactly right. My conflict existed only because two tools were making runtime decisions. The [next article](/posts/sovereignty/) looks at how I decide when the official tool should own that layer instead.
