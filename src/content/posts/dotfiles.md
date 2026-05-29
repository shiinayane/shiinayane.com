---
title: "Dotfiles Without .zshrc: ZDOTDIR and chezmoi"
published: 2026-05-30
description: "Move zsh config out of the home directory with ZDOTDIR, split it into modules, and manage it declaratively with chezmoi so drift becomes visible."
tags: [macos, dotfiles, zsh, chezmoi]
category: Engineering
series: "sovereign-tools"
seriesOrder: 2
draft: false
---

Here is a question I could not answer about my own machine for an embarrassingly long time: which lines in my `~/.zshrc` did I write, and which did an installer write for me?

Installers append to your shell startup file as a matter of routine. You run an install script, it prints a cheerful "added initialization to `~/.zshrc`", and that line is now load-bearing config you did not author and will not remember. Do this for two years and your `~/.zshrc` becomes an archaeological dig: strata of half-remembered tools, some still installed, some long gone, none commented. The file works, so you never touch it, so it only grows.

This article is about refusing that outcome. The goal is a home directory that is almost empty of configuration, a zsh setup split into pieces small enough to understand at a glance, and a system where the difference between what I declared and what is actually on disk — the **drift** (divergence between declared state and actual machine state) — is something I can *see* rather than discover by accident.

This builds directly on the [first article](/posts/manifesto/): the home directory is a resource, and right now nothing owns it. We are going to give it an owner.

## ZDOTDIR is zsh's own escape hatch

The first instinct when a home directory is cluttered is to delete things and hope. The better move is to learn what zsh actually reads, and in what order, because the clutter is not arbitrary — it follows zsh's startup sequence.

When zsh starts, it sources files in a fixed order. For an interactive login shell on macOS it is roughly:

```text
/etc/zshenv      →  ~/.zshenv      (always, every shell)
/etc/zprofile    →  ~/.zprofile    (login shells)
/etc/zshrc       →  ~/.zshrc       (interactive shells)
/etc/zlogin      →  ~/.zlogin      (login shells)
```

The detail that changes everything is what `~/.zshenv` is allowed to do. It runs first, for *every* invocation of zsh, and it is the one place you can set an environment variable that the rest of the startup sequence will respect. One of those variables is `ZDOTDIR`. If you set it, zsh reads `.zprofile`, `.zshrc`, and the rest not from `$HOME` but from `$ZDOTDIR`.

This is the official mechanism, not a hack. I call the result **ZDOTDIR mode**: set `ZDOTDIR=~/.config/zsh` in `~/.zshenv` so zsh reads all of its configuration from `~/.config/zsh/`, leaving the home directory with only `~/.zshenv`.

So the entire contents of `~/.zshenv` are one line:

```zsh
# ~/.zshenv — the only zsh file allowed to live in $HOME
export ZDOTDIR="${XDG_CONFIG_HOME:-$HOME/.config}/zsh"
```

From here on, every other zsh file lives under `~/.config/zsh/`. The home directory holds exactly one dotfile that zsh cares about, and its job is to point at where the real configuration lives.

<figure class="my-6">
<svg viewBox="0 0 600 300" role="img" aria-labelledby="diagram-home-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-home-title">Home directory before and after ZDOTDIR mode</title>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
    <!-- Before -->
    <text x="20" y="28" font-size="13" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">Before</text>
    <rect x="20" y="40" width="250" height="240" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="36" y="66" font-size="13" fill="currentColor" fill-opacity="0.85">~/</text>
    <g font-size="12.5" fill="currentColor" fill-opacity="0.6">
      <text x="48" y="90">.zshenv</text>
      <text x="48" y="110">.zshrc</text>
      <text x="48" y="130">.zprofile</text>
      <text x="48" y="150">.bash_profile</text>
      <text x="48" y="170">.npmrc</text>
      <text x="48" y="190">.gitconfig</text>
      <text x="48" y="210">.python_history</text>
      <text x="48" y="230">.zsh_history</text>
      <text x="48" y="250">.cargo/  .rustup/  …</text>
      <text x="48" y="270" fill-opacity="0.4">(it keeps growing)</text>
    </g>
    <!-- After -->
    <text x="330" y="28" font-size="13" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif" fill="currentColor">After (ZDOTDIR mode)</text>
    <rect x="330" y="40" width="250" height="70" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="346" y="66" font-size="13" fill="currentColor" fill-opacity="0.85">~/</text>
    <text x="358" y="90" font-size="12.5" fill="var(--primary)">.zshenv  → sets ZDOTDIR</text>
    <rect x="330" y="125" width="250" height="155" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="346" y="151" font-size="13" fill="currentColor" fill-opacity="0.85">~/.config/zsh/</text>
    <g font-size="12.5" fill="currentColor" fill-opacity="0.6">
      <text x="358" y="173">.zshrc</text>
      <text x="358" y="193">00-env.zsh</text>
      <text x="358" y="213">20-aliases.zsh</text>
      <text x="358" y="233">30-functions.zsh</text>
      <text x="358" y="253">35-tools.zsh  …</text>
    </g>
  </g>
</svg>
</figure>

A caveat worth stating early, because it is the usual objection: this is well-supported, but not universally. The VS Code integrated terminal honors `~/.zshenv` and therefore picks up `ZDOTDIR` without any extra setup, which covers the editor most readers will care about. A small number of older tools assume your configuration is literally in `~/.zshrc` and will not find it. When that happens you will know — the tool fails loudly rather than silently — and you can decide case by case whether to humor it. In two years it has come up rarely enough that I have not regretted the move.

## A modular layout instead of one long file

Moving the file is half the work. The other half is not recreating the same monolith at the new address. Instead of one `~/.config/zsh/.zshrc`, I keep a directory of numbered fragments, and the `.zshrc` does nothing but load them in order:

```zsh
# ~/.config/zsh/.zshrc — loads every fragment in numeric order
for _file in "${ZDOTDIR}"/conf.d/*.zsh(N); do
  source "$_file"
done
unset _file
```

The `(N)` is a zsh glob qualifier that makes the pattern expand to nothing if the directory is empty, instead of erroring. The fragments live in `conf.d/` with a numeric prefix that encodes load order:

```text
~/.config/zsh/conf.d/
├── 00-env.zsh          # exported env vars, PATH base
├── 10-completion.zsh   # compinit and completion styles
├── 20-aliases.zsh      # short renames of existing commands
├── 30-functions.zsh    # shell functions that do real work
├── 35-tools.zsh        # eval-hooks for external CLIs (mise, zoxide, …)
├── 40-lang.zsh         # language/runtime-specific setup
├── 50-plugins.zsh      # zsh-ecosystem plugins
└── 90-local.zsh        # machine-specific, not tracked in git
```

The split is not cosmetic. Each prefix corresponds to a *kind* of thing, and the kinds have genuinely different lifecycles and ordering needs:

- **Aliases** (`20`) only rename commands you already have. They are cheap and order-independent.
- **Functions** (`30`) do actual work and may depend on env being set, so they come after `00-env`.
- **Tools** (`35`) are external CLIs that print a block of shell code for you to `eval` — `mise activate`, `zoxide init`, and so on. These are separated because they are not your code; they are generated hooks, and isolating them makes it obvious what is yours versus what a tool injected. This is the same instinct that started the article: keep authored config distinguishable from generated config.
- **Lang** (`40`) is runtime-specific setup that needs the tool hooks from `35` already in place.
- **Plugins** (`50`) are third-party zsh scripts, and they have the strictest ordering constraints.

Two ordering rules matter enough to call out. Plugins load *after* the language and tool setup, because a prompt plugin that shows your current runtime version needs `mise` to have been activated first — otherwise the prompt renders before the information it wants to display exists. And syntax-highlighting, if you use it, must be sourced *last*; it works by wrapping the line editor, and anything that touches the line editor afterward will fight it. The numeric prefixes make these rules visible in the directory listing rather than buried as a comment somewhere in a 400-line file.

## Building PATH so it does not accumulate

There is one specific bug this layout invites, and it is worth fixing deliberately. `~/.zshenv` runs on *every* shell, including nested ones. The naive way to add a directory to `PATH` is:

```zsh
export PATH="$HOME/.local/bin:$PATH"
```

Run that in `~/.zshenv`, open a shell, then open a shell inside that shell, and `~/.local/bin` now appears in `PATH` twice. Tmux, subshells, and `exec zsh` all compound it. The list grows, lookups get slower, and reasoning about precedence gets harder.

The fix is to make the prepend idempotent — adding a directory that is already present should be a no-op:

```zsh
# Prepend to PATH only if not already present.
path_prepend() {
  case ":$PATH:" in
    *":$1:"*) ;;            # already there — do nothing
    *) PATH="$1:$PATH" ;;
  esac
}

path_prepend "$HOME/.local/bin"
```

The `case ":$PATH:"` trick wraps `PATH` in colons on both ends so that even the first and last entries are bounded by colons, which means the `*":$1:"*` pattern matches them too. It reads as a small thing, and it is, but it is the difference between a `PATH` that is stable across re-sourcing and one that quietly bloats. Belonging in `00-env.zsh`, it runs before anything that depends on `PATH`.

## chezmoi: the source repo is not the target

So far everything is local files. To make them portable and version-controlled without symlinking a git repo straight into `$HOME`, I use [chezmoi](https://www.chezmoi.io/), which keeps a *source* directory under version control and renders it into your home directory. The piece worth understanding is that chezmoi encodes target-file metadata in the source *filename* through prefixes, so the source repo deliberately does not look like your home directory.

The prefixes I rely on:

- `dot_` — renders to a leading dot. `dot_zshenv` becomes `~/.zshenv`. This exists because a source repo full of literal dotfiles would have everything hidden.
- `private_` — sets `0600` permissions on the result. Used for anything that should not be world-readable.
- `executable_` — sets the executable bit. Used for scripts in `~/.local/bin`.
- `exact_` — on a directory, means "this is the complete contents; remove anything here that I did not declare." Powerful for enforcing that a directory holds *only* what you tracked.
- `run_onchange_` — not a file at all but a script chezmoi runs whenever its content changes. The mechanism behind "re-run the Brewfile when the Brewfile changed", which the [apps article](/posts/apps/) leans on.

So a slice of the source repo maps to target paths like this:

```text
chezmoi source repo            →  rendered into $HOME
├── dot_zshenv                 →  ~/.zshenv
├── dot_config/
│   └── zsh/
│       ├── dot_zshrc          →  ~/.config/zsh/.zshrc
│       └── conf.d/
│           ├── 00-env.zsh     →  ~/.config/zsh/conf.d/00-env.zsh
│           └── 20-aliases.zsh →  ~/.config/zsh/conf.d/20-aliases.zsh
└── dot_local/
    └── bin/
        └── executable_zhealth →  ~/.local/bin/zhealth  (chmod +x)
```

The prefixes are declarative metadata: the filename states the intent (hidden, private, executable, exact) and chezmoi enforces it on every apply. This is the same single-source-of-truth idea from the manifesto, applied to dotfiles — the source repo is the one place the desired state of your home directory is written down, and `chezmoi apply` reconciles the machine to it.

## The final form, and how to tell when it breaks

When this is in place, the home directory holds exactly one zsh file: `~/.zshenv`. That fact is useful precisely because it is checkable. If a `~/.zshrc` ever appears in `$HOME`, it did not come from me — some installer wrote it, and it is a pollution signal worth investigating, not ignoring.

Rather than remember to check, I make the check a command. This is a **health-check function** — a shell function that surfaces drift — and for the home directory I call it `zhealth`:

```zsh
# 30-functions.zsh — flag stray zsh files in $HOME
zhealth() {
  local stray=(~/.zshrc(N) ~/.zprofile(N) ~/.zlogin(N) ~/.zshrc.*(N))
  if (( ${#stray} )); then
    print -u2 "zhealth: unexpected zsh files in \$HOME:"
    printf '  %s\n' "${stray[@]}" >&2
    return 1
  fi
  print "zhealth: \$HOME is clean — only ~/.zshenv expected"
}
```

Running `zhealth` after installing a new tool is how I catch an installer that decided to "helpfully" drop a `~/.zshrc` back into my home directory. The point is not the function itself; it is that *drift becomes visible on demand* instead of accumulating silently. The [maintenance article](/posts/maintenance/) is entirely about this idea — turning cleanliness from a one-time setup into something a few small functions keep honest.

## What not to track

A declarative dotfiles repo invites a tempting mistake: tracking everything. Some files should stay out of version control on purpose.

- `~/.zsh_history` is state, not configuration. It is also private, and it changes on every command, so tracking it would mean an endless stream of meaningless diffs. Leave it local.
- Caches and generated completion dumps (`~/.config/zsh/.zcompdump*`) are derived. They rebuild themselves; tracking them just creates churn.
- Credentials, tokens, and anything secret do not belong in a plain dotfiles repo at all. chezmoi has template and secret-manager integration for the rare config file that must contain a secret, but the default answer is "do not put it here".

In practice this means a couple of ignore rules. `.gitignore` in the source repo keeps cruft out of git, and `.chezmoiignore` tells chezmoi not to manage specific target paths even if they exist:

```text
# .chezmoiignore
.config/zsh/.zcompdump*
.zsh_history
```

The machine-specific fragment, `90-local.zsh`, is the designated place for anything that should differ per machine or stay off the network — a work proxy, a local-only alias. It loads last so it can override, and it is the one fragment I deliberately do not track.

That is the whole shape: one file in `$HOME`, a directory of small ordered fragments, a source repo whose filenames declare intent, and a health check that tells me the moment something drifts. None of it is about having fewer tools. It is about the home directory finally having an owner, so that the question I opened with — which lines did I write — has an answer I can trust.
