---
title: "The Brewfile Compromise: Eventual Consistency for Mac Apps"
published: 2026-05-30
description: "Not every layer deserves strict declarative management. The app layer is fine with eventual consistency, as long as the drift stays visible."
tags: [macos, homebrew, brewfile]
category: Engineering
series: "sovereign-tools"
seriesOrder: 3
draft: false
---

I do not keep my Brewfile strictly in sync with what is installed on my machine, and that is a deliberate choice rather than laziness I have failed to fix.

This sounds like it contradicts the rest of the series. The [Python article](/posts/python/) was an argument for tight, single-owner control. The [dotfiles article](/posts/dotfiles/) was about making every stray file accountable. And now I am admitting that my list of installed applications is allowed to drift away from the file that is supposed to declare it. The resolution is the point of this article: strict consistency is the right discipline for some layers and the wrong discipline for others, and applying maximum rigor everywhere is its own kind of mess.

## Consistency is not one-size-fits-all

The reason **Layer 3 — Project dependencies** needs strict consistency is that its drift is immediate and breaking. If your lockfile says one version of a library and your machine has another, a build fails or, worse, behaves differently than it does in CI. The cost of drift is paid now, loudly, and often by someone other than you. So that layer earns the full ceremony of lock files and exact reproduction.

**Layer 0 — System** — the applications and command-line tools Homebrew installs — has a completely different cost structure. If I `brew install` a tool today and forget to write it into my Brewfile, nothing breaks. The tool works. My current machine is fine. The drift only has a cost much later, at the next migration, when I rebuild from the Brewfile and discover the tool is missing. The cost is real but *deferred*, and it is small — I notice the tool is gone, I install it, I add the line I forgot.

When the cost of drift is deferred and small, paying a constant tax to prevent it is a bad trade. So this layer gets **eventual consistency**: I allow drift day-to-day and converge periodically via a reconcile step, rather than the strict consistency that Layer 3 requires. The same author, the same machine, two layers, two deliberately different disciplines. The skill is matching the discipline to the cost, not maximizing discipline.

## Three channels, in priority order

Before automating anything, it helps to decide *where* an application should come from, because macOS offers several channels and choosing consistently is most of the battle.

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

**Homebrew first.** A formula (command-line tool) or cask (graphical app) is the default, because Homebrew is already the owner of Layer 0 and a `brew` install is trivially expressible in a Brewfile.

**The Mac App Store second**, via `mas-cli`. The decision between a cask and the App Store comes down to one question: is the app coupled to the Apple ecosystem? Apps that rely on iCloud sync, Family Sharing, or App Store receipts — and apps that are *only* distributed through the store — should come from `mas`. Everything else is cleaner as a cask, because casks update through the same `brew` command as the rest and do not depend on being signed into a store account.

**A `.dmg` last**, and documented. Some apps ship only as a disk image from the vendor's site. These cannot go in the Brewfile, so they become the one place manual tracking is unavoidable. I keep a `manual-installs.md` listing each one and where it came from, so that "what is on this machine that the Brewfile does not capture" has a written answer instead of living only in my memory.

## One declarative surface

The reason to prefer `mas` over clicking around the App Store by hand is that `mas-cli` lets App Store apps share the Brewfile with everything else. A Brewfile then looks like:

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

Now `brew bundle` can install formulae, casks, and App Store apps in one pass, and a single file declares the intended state of the whole layer. This is the [first article's](/posts/manifesto/) single-source-of-truth idea: one file, one owner for "what applications belong on this machine". The difference from Layer 3 is only in *how strictly* that file and the machine are kept equal — not in whether there is a single source.

## The reconcile step

Eventual consistency is only honest if convergence actually happens. Allowing drift without ever reconciling is not a discipline; it is just drift. So the layer needs a low-friction, periodically-triggered action that brings the declared state back in line with the actual state — **the reconcile step**.

The core of it is a **health-check function** that shows drift in both directions: what is installed but not declared, and what is declared but not installed. I call it `brewdiff`:

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

The function does not *change* anything. It reports. Seeing drift is what lets me decide, item by item, whether an undeclared tool was a deliberate keeper I forgot to write down or an experiment I should remove.

To stop the undeclared list from growing in the first place, a little sugar makes declaring as cheap as installing. `brewadd` installs a package and appends it to the Brewfile in the same motion, so the honest path is also the fast one:

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

And because the reconcile step only works if I am actually reminded to run it, a small function nudges me roughly monthly when a shell starts, based on the age of a timestamp file:

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

(Running `brewdiff` would `touch` that stamp at the end, resetting the clock.) None of this is sophisticated. It is deliberately not sophisticated, because a reconcile step that is any harder than this simply will not happen, and an unused reconcile step is the same as none.

Applying the Brewfile itself fits the chezmoi pattern from the [dotfiles article](/posts/dotfiles/): a `run_onchange_` script re-runs `brew bundle` whenever the Brewfile's contents change, so installing on a new machine — or after editing the Brewfile — is automatic:

```bash
# run_onchange_brew-bundle.sh.tmpl
#!/bin/sh
# Brewfile hash: {{ include "dot_config/homebrew/Brewfile" | sha256sum }}
brew bundle --file="$HOME/.config/homebrew/Brewfile"
```

The hash comment is the mechanism: chezmoi re-runs the script only when that line changes, and embedding the Brewfile's checksum means the script fires exactly when the Brewfile is edited.

## Reconciling with an agent: auditor, not executor

I do use an AI agent to help with the monthly reconcile, but the framing matters more than the fact. I give it the `brewdiff` output and ask it to act as an *auditor*: for each undeclared package, tell me what it is and offer a keep-or-drop judgment with a reason. What I do not do is let it rewrite my Brewfile directly.

The distinction is not superstition. The Brewfile is a source of truth, and a source of truth should only change through a decision I made and can see. An auditor that says "`pngquant` is an image compressor, probably a one-off, consider dropping" hands me a faster decision while leaving the decision mine. An executor that silently edits the file reintroduces exactly the failure the whole series fights — a second actor mutating an owned resource, so that the file no longer reflects only my intent. The agent compresses the *judgment*, not the *authority*.

## The reframe

The honest caveat on all of this is about a sharp tool: `brew bundle cleanup` (and the `--cleanup` flag) will uninstall everything not in the Brewfile, which is genuinely useful once your Brewfile is complete — and genuinely destructive before then, when half your real tools are still undeclared. I do not run it with `--force` until `brewdiff` shows a short, well-understood undeclared list. Reaching for strict enforcement before the declaration is trustworthy is how people delete tools they actually wanted.

Which is the whole point, stated one more way. The [manifesto](/posts/manifesto/) defined cleanliness as single-source-of-truth layering. This article adds the dimension the manifesto left implicit: each layer also has a *right amount of strictness*, and it is not always "maximum". Layer 3 gets strict consistency because its drift breaks things now. Layer 0 gets eventual consistency because its drift bites only later and cheaply. Choosing the discipline that fits each domain — rather than reflexively maximizing it everywhere — is itself part of what makes an environment clean. The [maintenance article](/posts/maintenance/) extends this into a habit: the reconcile step here is one instance of a more general practice of making drift visible and converging on a schedule instead of pretending it never happens.
