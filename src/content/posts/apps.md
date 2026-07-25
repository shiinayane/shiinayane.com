---
title: "The Brewfile Compromise: Eventual Consistency for Mac Apps"
published: 2026-05-30
description: "Not every layer deserves strict declarative management. The app layer is fine with eventual consistency, as long as the drift stays visible."
tags: [macos, homebrew, brewfile]
category: Engineering
series: "sovereign-tools"
seriesOrder: 3
draft: false
lang: en
translationKey: apps
---

My Brewfile is often slightly out of sync with the applications installed on my Mac. I am fine with that.

This is looser than the setup in the [Python article](/posts/python/), where one owner controls the environment, or the [dotfiles article](/posts/dotfiles/), where stray configuration files are something to account for. Applications have a different failure mode, so I do not think they need the same enforcement.

## Why I tolerate drift here

**Layer 3 — Project dependencies** needs strict consistency. When a lockfile specifies one version but a developer machine has another, the build may fail or behave differently from CI. The failure is immediate, and somebody else may have to pay for it. Exact versions and reproducible installs are worth the ceremony.

**Layer 0 — System** contains the applications and command-line tools installed by Homebrew. Suppose I run `brew install` today and forget to add the tool to my Brewfile. The current machine still works. I usually discover the omission much later, during a migration, when I restore from the Brewfile and the tool is missing. Then I install it and add the forgotten line.

That is a real cost, but it is deferred and usually small. For this layer, I accept day-to-day drift and reconcile it periodically: **eventual consistency** instead of the strict consistency I use for project dependencies.

## Choosing an installation channel

On macOS I use three channels, in this order:

<figure class="my-6">
<svg viewBox="0 0 600 120" role="img" aria-labelledby="diagram-channels-title" style="width:100%;height:auto;color:inherit">
  <title id="diagram-channels-title">Install channel priority: brew, then mas, then dmg</title>
  <g font-family="ui-sans-serif, system-ui, sans-serif">
    <rect x="20" y="35" width="150" height="50" rx="10" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.2"/>
    <text x="95" y="58" font-size="13" font-weight="700" text-anchor="middle" fill="var(--primary)">brew</text>
    <text x="95" y="75" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.6">formula / cask</text>
    <text x="200" y="65" font-size="16" text-anchor="middle" fill="currentColor" fill-opacity="0.4">→</text>
    <rect x="225" y="35" width="150" height="50" rx="10" fill="currentColor" fill-opacity="0.05" stroke="currentColor" stroke-opacity="0.15"/>
    <text x="300" y="58" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">mas</text>
    <text x="300" y="75" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.6">App Store</text>
    <text x="405" y="65" font-size="16" text-anchor="middle" fill="currentColor" fill-opacity="0.4">→</text>
    <rect x="430" y="35" width="150" height="50" rx="10" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.12"/>
    <text x="505" y="58" font-size="13" font-weight="700" text-anchor="middle" fill="currentColor">dmg</text>
    <text x="505" y="75" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.6">last resort</text>
  </g>
</svg>
</figure>

I try **Homebrew first**. Formulae cover command-line tools and casks cover graphical applications. Homebrew already owns Layer 0 in this setup, and either kind of `brew` installation is easy to record in a Brewfile.

The **Mac App Store comes second**, through `mas-cli`. I use `mas` when an application depends on the Apple ecosystem—iCloud sync, Family Sharing, or App Store receipts—or is available only from the store. Otherwise I prefer a cask: it updates with the same `brew` command as everything else and does not require a signed-in App Store account.

A vendor-provided **`.dmg` is the last resort**. These installations cannot be expressed in the Brewfile, so I keep a `manual-installs.md` with the application name and its source. Without that file, the only record of what the Brewfile missed would be my memory.

## One file for the intended state

`mas-cli` is useful because a `mas` entry lets App Store applications live in the same Brewfile as formulae and casks:

```ruby
# Brewfile
tap "homebrew/bundle"

brew "ripgrep"
brew "mas"

cask "visual-studio-code"
cask "rectangle"

# App Store apps, by their numeric ID (mas list to find them)
mas "Things 3", id: 904280696
mas "Xcode", id: 497799835
```

With that file, `brew bundle` installs formulae, casks, and App Store applications in one pass. It is the single source of truth for what belongs on the machine, following the ownership model from the [first article](/posts/manifesto/). The file may temporarily lag behind the machine, but there is still only one declared state.

## How I reconcile it

Eventual consistency needs an actual convergence step. Mine starts with a read-only health check called `brewdiff`. It shows drift in both directions: installed but undeclared, and declared but missing.

```zsh
# 30-functions.zsh — show drift between the Brewfile and the machine
brewdiff() {
  local brewfile="${HOMEBREW_BUNDLE_FILE:-$HOME/.config/homebrew/Brewfile}"
  echo "== Installed but NOT in Brewfile (undeclared) =="
  brew bundle cleanup --file="$brewfile" 2>/dev/null \
    | grep -E '^(Would uninstall|brew|cask|mas)' || echo "  (none)"
  echo
  echo "== In Brewfile but NOT installed (missing) =="
  brew bundle check --file="$brewfile" --verbose 2>/dev/null \
    | grep -v '^The Brewfile' || echo "  (all installed)"
}
```

This function only reports; it does not change the machine. I can inspect each undeclared item and decide whether it is a tool I meant to keep or an experiment I should remove.

For ordinary formulae, `brewadd` makes the common case cheaper by installing a package and appending it to the Brewfile in the same operation:

```zsh
# install AND declare in one step
brewadd() {
  local brewfile="${HOMEBREW_BUNDLE_FILE:-$HOME/.config/homebrew/Brewfile}"
  brew install "$@" || return 1
  for pkg in "$@"; do
    grep -q "\"$pkg\"" "$brewfile" || echo "brew \"$pkg\"" >> "$brewfile"
  done
}
```

I also need a reminder, because a reconcile command that I forget to run is not much of a system. When a shell starts, this function checks the age of a timestamp file and nudges me if more than 30 days have passed:

```zsh
# remind me to reconcile if it has been > 30 days
_brewdiff_reminder() {
  local stamp="$HOME/.cache/brewdiff-last"
  if [[ ! -f "$stamp" ]] || \
     [[ $(find "$stamp" -mtime +30 2>/dev/null) ]]; then
    print -P "%F{yellow}brewdiff:%f it's been a while — run 'brewdiff' to reconcile"
  fi
}
_brewdiff_reminder
```

Running `brewdiff` would `touch` the timestamp at the end and reset the clock. I have kept this deliberately small; any more friction would make the monthly check easy to postpone.

The Brewfile itself follows the chezmoi setup from the [dotfiles article](/posts/dotfiles/). A `run_onchange_` script runs `brew bundle` on a new machine and whenever the Brewfile changes:

```bash
# run_onchange_brew-bundle.sh.tmpl
#!/bin/sh
# Brewfile hash: {{ include "dot_config/homebrew/Brewfile" | sha256sum }}
brew bundle --file="$HOME/.config/homebrew/Brewfile"
```

The hash in the comment is what triggers the script. Chezmoi sees the line change when the Brewfile checksum changes, so it reruns the command after an edit.

## Letting an agent audit the list

For the monthly check, I sometimes give the `brewdiff` output to an AI agent. Its job is to explain each undeclared package and suggest keeping or dropping it, with a reason. It does not edit the Brewfile.

For example, an answer such as “`pngquant` is an image compressor and looks like a one-off; consider dropping it” saves me research time while leaving the decision visible. If the agent rewrote the file directly, a second actor would be changing the source of truth and the Brewfile would no longer represent only my intent. The useful delegation here is judgment, not authority.

## The command I do not automate

`brew bundle cleanup`, including the `--cleanup` flag, uninstalls everything that is not in the Brewfile. That is convenient after the declaration is complete and dangerous while half of the tools I use are still undeclared. I do not run it with `--force` until `brewdiff` produces a short list whose contents I understand.

The monthly review is one case of the broader maintenance routine in the [maintenance article](/posts/maintenance/): make drift visible, inspect it, and converge on a schedule. For Mac applications, that has been enough. I do not need every installation to update the Brewfile immediately; I need omissions to remain visible and cheap to repair.
