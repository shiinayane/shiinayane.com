---
title: "Every swift-format Option, and What It Actually Changes"
published: 2026-09-21
description: "A walk through every swift-format configuration key and rule, each with a minimal before/after, plus the values I settled on for my own iOS project."
tags: [Swift, swift-format, Xcode, Tooling]
category: Engineering
draft: false
lang: en
translationKey: swift-format-configuration
---

While writing `.swift-format` for Atofolio, my own iOS project, I noticed that the official documentation gives each option exactly one sentence. For a name like `prioritizeKeepingFunctionOutputTogether`, that sentence left me no idea what the formatter would actually do to my code.

So I ran all of them. Format once with the default value, format again with the changed value, and read the diff. This article is the record of that experiment.

Every output below comes from the swift-format bundled with Xcode 27 (`xcrun --find swift-format`, which reports its version as `main`), on macOS 27 with Swift 6.4. swift-format's behavior is tightly coupled to its version; if you installed a standalone copy through Swift Package Manager, individual rules may produce different output.

## The result first

Here is the same code formatted under two configurations. The first is the default (2 spaces, explicit `return`, arguments packed onto as few lines as possible); the second is mine:

```swift
// Default configuration
private struct LibraryRow: View {
  var title: String {
    return item.displayName
  }

  var body: some View {
    return HStack(spacing: 12) {
      Text(title)
      Spacer()
    }
  }

  func rebuild(from items: [LibraryItem], selection: Set<LibraryItem.ID>, sorted: Bool)
    -> [LibraryRow]
  {
    var rows = [LibraryRow]()
    for item in items {
      if selection.contains(item.id) {
        rows.append(LibraryRow(item: item, isSelected: true, onSelect: onSelect))
      }
    }
    return rows
  }
}
```

```swift
// My configuration
private struct LibraryRow: View {
    var title: String {
        item.displayName
    }

    var body: some View {
        HStack(spacing: 12) {
            Text(title)
            Spacer()
        }
    }

    func rebuild(
        from items: [LibraryItem],
        selection: Set<LibraryItem.ID>,
        sorted: Bool
    ) -> [LibraryRow] {
        var rows: [LibraryRow] = []
        for item in items where selection.contains(item.id) {
            rows.append(LibraryRow(item: item, isSelected: true, onSelect: onSelect))
        }
        return rows
    }
}
```

The two snippets are semantically identical. Every difference comes from configuration. Let's take it apart.

## How to reproduce this

If you want to check any of it yourself, the method is simple. Export the defaults as a baseline:

```bash
xcrun swift-format dump-configuration > default.json
```

Then change one key with `jq` and diff the two outputs:

```bash
jq '.indentation.spaces = 4' default.json > patched.json
diff <(xcrun swift-format format --configuration default.json a.swift) \
     <(xcrun swift-format format --configuration patched.json a.swift)
```

One thing that trips people up: **swift-format's rules come in two kinds**. Some rewrite your code (format rules), others only report problems (lint-only rules). If you only run `format`, a rule like `NeverForceUnwrap` appears to do nothing, and it is easy to conclude that it is broken. Those rules only show up under `swift-format lint`:

```bash
xcrun swift-format lint --configuration patched.json a.swift
```

Below, every rule is marked with which kind it is.

---

## 1. Layout options

### lineLength

The maximum number of characters on a line. Exceeding it triggers the line-breaking strategy.

```diff
+// lineLength: 80
-let view = makeRow(title: "Title", subtitle: "Subtitle", icon: iconName, action: handler)
+let view = makeRow(
+  title: "Title", subtitle: "Subtitle", icon: iconName, action: handler)
```

**My choice: 100 (the default).** Swift type names and argument labels are long to begin with, and 80 shreds SwiftUI view code. 100 is the value in the Google Swift Style Guide and swift-format's own default.

### indentation

What one level of indentation is made of. Either `{"spaces": N}` or `{"tabs": N}`.

```diff
 struct Point {
-  var x: Int
-  func move() {
-    x += 1
-  }
+    var x: Int
+    func move() {
+        x += 1
+    }
 }
```

**My choice: `{"spaces": 4}`.** swift-format defaults to 2, but Xcode's default editor setting is 4, and Apple's own sample code uses 4. I don't want the indentation I type by hand in Xcode to disagree with the indentation I get after formatting.

### tabWidth

This name is misleading. It is not "indent width" — it is **how many columns one tab character counts as when measuring line length**.

If `indentation` uses spaces, this value has no effect on output at all. It only matters with tab indentation. The two snippets below are the same code, the same `lineLength: 60`, the same tab indentation, differing only in `tabWidth`:

```swift
// tabWidth: 8 — two levels of tabs count as 16 columns, leaving too little room, so it wraps
func outer() {
	func inner() {
		let r = compute(
			alpha: 1, beta: 2, gamma: 3,
			delta: 44)
	}
}

// tabWidth: 4 — two levels count as 8 columns, and the call fits on one line
func outer() {
	func inner() {
		let r = compute(alpha: 1, beta: 2, gamma: 3, delta: 44)
	}
}
```

**My choice: 4, though honestly this key does nothing in my configuration.** I indent with spaces, so swift-format never encounters a tab whose width it needs to convert. I keep it only so it matches my editor setting; removing it would change nothing.

### indentBlankLines

Whether blank lines get the current level of indentation added to them (that is, a run of trailing spaces).

```diff
 func f() {
     let a = 1
-
+    ⎵⎵⎵⎵
     let b = 2
 }
```

(The `⎵` marks are the actual spaces produced.)

**My choice: false (the default).** Turning it on manufactures trailing whitespace, which fights both the "strip trailing spaces on save" setting in most editors and the way git diffs are read.

### maximumBlankLines

How many consecutive blank lines are allowed; anything more is collapsed.

```diff
 let a = 1
 
-
 let b = 2
```

(That is the effect of going from `2` back to the default `1`.)

**My choice: 1 (the default).** I use blank lines to separate logical blocks, but I don't need two or more of them to express a "bigger" separation — that is what a heading comment is for.

### spacesBeforeEndOfLineComments

How many spaces sit before an end-of-line `//` comment.

```diff
-let a = 1  // one
-let bb = 22  // two
+let a = 1 // one
+let bb = 22 // two
```

(That is the effect of setting it to `1`.) Note that it does not align anything; it only guarantees a fixed number of spaces.

**My choice: 2 (the default).** With one space, the comment sits too close to the code; two spaces separate them visually.

### spacesAroundRangeFormationOperators

Whether `...` and `..<` get spaces around them.

```diff
-let r = 0..<10
-let c = 1...5
+let r = 0 ..< 10
+let c = 1 ... 5
```

**My choice: false (the default).** I read `0..<10` as a single unit; adding spaces makes it look like three separate words.

### indentConditionalCompilationBlocks

Whether the body of an `#if` / `#endif` block is indented one more level.

```diff
 func f() {
   #if DEBUG
-  let a = 1
-  print(a)
+    let a = 1
+    print(a)
   #endif
 }
```

(The default, true, produces the right-hand side.)

**My choice: true (the default).** `#if` is a structure with an opening and a closing, so indenting its contents matches intuition.

### indentSwitchCaseLabels

Whether `case` is indented relative to `switch`.

```diff
 switch v {
-case 1:
-  print(1)
-default:
-  break
+  case 1:
+    print(1)
+  default:
+    break
 }
```

**My choice: false (the default).** This is how the Swift community writes it and how Apple's documentation lays it out. Turning it on pushes the entire switch two levels to the right, which is expensive in already-nested code.

---

## 2. Line-breaking strategy

This group decides where the formatter breaks when a line doesn't fit.

### respectsExistingLineBreaks

Whether the line breaks you wrote by hand are honored.

```diff
-let a = compute(
-  x: 1,
-  y: 2
-)
+let a = compute(x: 1, y: 2)
 let b = 1 + 2
```

(That is the effect of setting it to false: anything that can be joined is joined.)

**My choice: true (the default).** I think this is the most important key in the file. Turn it off and swift-format becomes a line-density maximizer: an argument list you split by hand to express grouping gets mercilessly rejoined. Leave it on and your line breaks survive as long as they don't violate a rule — the formatter enforces a floor, and you handle expression.

### lineBreakBeforeEachArgument

When an argument list doesn't fit on one line: pack each line as full as possible, or give every argument its own line.

```diff
 let view = makeRow(
-  title: "Title", subtitle: "Subtitle", icon: iconName, action: handler, isEnabled: true)
+  title: "Title",
+  subtitle: "Subtitle",
+  icon: iconName,
+  action: handler,
+  isEnabled: true
+)
```

Function declarations behave the same way:

```diff
 func makeRow(
-  title: String, subtitle: String, iconName: String, action: @escaping () -> Void, isEnabled: Bool,
+  title: String,
+  subtitle: String,
+  iconName: String,
+  action: @escaping () -> Void,
+  isEnabled: Bool,
   badgeCount: Int
 ) -> Row {
```

**My choice: true.** The default packing has a practical problem: adding one argument reflows every argument after it, so the diff looks like five changed lines when you only added one. With one argument per line, adding an argument adds a line. SwiftUI initializers have many long parameters, and the difference is visible in code review.

The cost is more vertical lines. I'll take it.

### lineBreakBeforeEachGenericRequirement

The same idea, applied to `where` clauses.

```diff
 func merge<A, B>(_ a: A, _ b: B) -> [A.Element]
 where
-  A: Sequence, B: Sequence, A.Element == B.Element, A.Element: Hashable, B.Element: Comparable,
-  A: Codable, B: Codable, A: Sendable
+  A: Sequence,
+  B: Sequence,
+  A.Element == B.Element,
+  A.Element: Hashable,
+  B.Element: Comparable,
+  A: Codable,
+  B: Codable,
+  A: Sendable
 {
```

Note that it only kicks in when the `where` clause is long enough to need wrapping; short ones are untouched.

**My choice: true.** Same reasoning as the previous key, kept consistent. In practice my project has no `where` clause long enough to wrap yet, so for now this one is written for the future.

### lineBreakBeforeControlFlowKeywords

Whether keywords like `else` and `catch` start a new line.

```diff
   if condition {
     print(a)
-  } else {
+  }
+  else {
     print(0)
   }
 }
```

**My choice: false (the default).** `} else {` is the universal Swift spelling; switching to Allman style would make the code look out of place in any Swift project.

### lineBreakBetweenDeclarationAttributes

Whether multiple attributes each get their own line.

```diff
-@MainActor @preconcurrency final class Store {
+@MainActor
+@preconcurrency
+final class Store {
   var value = 0
 }
```

**My choice: false (the default).** Combinations like `@State private var` are everywhere in SwiftUI, and forcing a break turns the property section into a vertical stripe. The option is also global — there is no way to apply it only to long attributes.

### lineBreakAroundMultilineExpressionChainComponents

When a method chain doesn't fit: break between method names, or break inside the argument parentheses.

```diff
-let names = people.filter { $0.age > 18 }.map { $0.name.uppercased() }.sorted().joined(
-  separator: ", ")
+let names = people.filter { $0.age > 18 }.map { $0.name.uppercased() }.sorted()
+  .joined(separator: ", ")
```

**My choice: false (the default).** I went back and forth on this one. Turning it on gives semantically better break points (at the `.`), but its actual behavior is "force a break before and after every component of a multiline chain" — once a chain is judged multiline, the whole thing fans out. The default output is good enough in my code, so I left it alone.

### prioritizeKeepingFunctionOutputTogether

When a function signature doesn't fit, which part gets protected. This is my favorite key in the file.

```diff
-func loadConfiguration(from url: URL, using decoder: JSONDecoder, strict: Bool) throws
-  -> Configuration
-{
+func loadConfiguration(
+  from url: URL, using decoder: JSONDecoder, strict: Bool
+) throws -> Configuration {
   try decoder.decode(Configuration.self, from: Data(contentsOf: url))
 }
```

The default (false) throws the return type onto the next line, and because the signature now spans lines, the opening brace is forced onto a line of its own — three lines of signature plus a lonely `{`. Turned on, the parameter list gets split instead, and `) throws -> Configuration {` stays together.

**My choice: true.** The return type is one of the most informative parts of a signature, and there is no reason to cut it away from the parameter list. The orphaned `{` is also unusually conspicuous in code indented with 4 spaces.

---

## 3. Trailing commas

Two options, where the second overrides the first.

### multiElementCollectionTrailingCommas

Whether a multi-element array or dictionary literal gets a comma after its last element.

```diff
 let colors = [
   "red",
   "green",
-  "blue"
+  "blue",
 ]
```

Single-element collections are unaffected — `["only"]` split across lines gets no comma.

**My choice: true (the default), but it no longer does anything in my configuration.** See the next key for why.

### multilineTrailingCommaBehavior

A wider scope: argument lists, tuples, every "symmetrically delimited comma-separated list", including collection literals. Three values:

- `keptAsWritten` (default): keep what you wrote, add nothing, and leave collection literals to the previous key
- `alwaysUsed`: add one to every multiline list
- `neverUsed`: remove them all

```diff
 let view = makeRow(
   title: "Title",
   subtitle: "Subtitle",
-  icon: iconName,
+  icon: iconName
 )
```

**My choice: `neverUsed`.**

I originally set `alwaysUsed`. The reasoning was that a trailing comma makes the last element as easy to add, remove, or reorder as any other, so adding an argument touches one line of diff. That reasoning is sound, but it has a gap: as the name says, `multilineTrailingCommaBehavior` only governs **multiline** lists. A single-line `makeRow(title: "a", subtitle: "b")` will never have a comma added.

So what `alwaysUsed` actually produces is a split rule — commas on multiline lists, none on single-line ones. The same call switches style depending on whether it crosses 100 columns. `neverUsed` is one rule for every case: no trailing commas anywhere. I switched.

The cost is giving up that small diff benefit. What I get back is never having to think about whether a given list is currently single-line or multiline.

**Two knock-on effects.**

First, `neverUsed` overrides `multiElementCollectionTrailingCommas`. Even with that key still set to `true`, trailing commas in collection literals are removed:

```swift
// multiElementCollectionTrailingCommas: true + multilineTrailingCommaBehavior: neverUsed
let colors = [
    "red",
    "green",
    "blue"
]
```

In other words, the `multiElementCollectionTrailingCommas` line in my configuration is now inert. I keep it so that switching back to `keptAsWritten` later requires no thinking, but it genuinely affects no output.

Second, the compiler requirement disappears. Trailing commas in argument lists are syntax introduced by [SE-0439](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0439-trailing-comma-lists.md) and **require a Swift 6.1 or newer compiler** (I tested this: it is not gated by language mode — `-swift-version 5` compiles fine as long as the compiler is new enough). Choosing `alwaysUsed` means producing code that older toolchains can't build; `neverUsed` sidesteps the question.

**A bug, incidentally.** A hand-written single-line trailing comma is legal syntax (`makeRow(title: "a", subtitle: "b",)` and `[1, 2, 3,]` both compile), but swift-format doesn't clean up after itself. `neverUsed` removes the comma and leaves a space behind; it takes a second pass to converge:

```swift
// input
let v = makeRow(title: "a", subtitle: "b",)

// first pass
let v = makeRow(title: "a", subtitle: "b" )

// second pass
let v = makeRow(title: "a", subtitle: "b")
```

The default `keptAsWritten` is worse: it preserves `("b", )` exactly, no matter how many times you run it. Collection literals don't have this problem. You are unlikely to type a single-line trailing comma yourself, but if you are migrating code in from another project, it is worth running the formatter twice before committing.

### reflowMultilineStringLiterals

Whether overlong lines inside a multiline string literal are rewrapped using `\` continuations.

```swift
// never (default)
let message = """
  This line is short.
  This particular line is quite long and definitely goes past the configured maximum line length limit of one hundred columns.
  """

// onlyLinesOverLength
let message = """
  This line is short.
  This particular line is quite long and definitely goes past the configured maximum line length \
  limit of one hundred columns.
  """
```

The third value, `always`, is documented as "always reflow, ignoring existing escaped newlines". In the cases I tried it produced output identical to `onlyLinesOverLength` — it does not join short lines together. The difference presumably only shows up in literals that already contain `\` continuations.

**My choice: `onlyLinesOverLength`.** I don't want string literals to be the one place that can break past 100 columns (that would make `lineLength` decorative), but I also don't want the formatter touching short text I laid out line by line. This middle value is exactly right.

---

## 4. The three options that take parameters

### fileScopedDeclarationPrivacy

Whether file-scoped private declarations use `private` or `fileprivate`. Backs the `FileScopedDeclarationPrivacy` rule.

```diff
-fileprivate let cache = 1
-fileprivate func helper() {}
+private let cache = 1
+private func helper() {}
```

At file scope the two keywords mean exactly the same thing, so this is purely about consistency.

**My choice: `private` (the default).** Shorter, and visually consistent with `private` inside a type.

### noAssignmentInExpressions

The allowlist for the `NoAssignmentInExpressions` rule: which functions may contain an assignment in their arguments.

The default is `["XCTAssertNoThrow"]`, because `XCTAssertNoThrow(x = try compute())` is a common pattern in tests. Empty the allowlist and that line gets reported:

```text
warning: [NoAssignmentInExpressions] move this assignment expression into its own statement
```

**My choice: keep the default `["XCTAssertNoThrow"]`.** My project uses Swift Testing rather than XCTest, so the allowlist is currently idling. Leaving the default costs nothing.

### orderedImports

Two switches for the `OrderedImports` rule.

`shouldGroupImports` (default true): group different kinds of import, separated by a blank line.

```diff
 import Foundation
+import UIKit
+
+import enum Swift.Optional
+
 @testable import MyApp
-import UIKit
```

The order is: plain imports → single-symbol imports (`import enum Swift.Optional`) → `@testable` imports, alphabetized within each group. Turn it off and everything is merged into one alphabetized list.

`includeConditionalImports` (default false): whether imports inside `#if` blocks are sorted too.

```diff
 #if canImport(Combine)
-  import Combine
   import Accelerate
+  import Combine
 #endif
```

**My choice: both at their defaults (grouping = true, conditional = false).** Grouping makes `@testable` visible at a glance. The order of imports inside a conditional block is sometimes meaningful (dependencies, for instance), and I'd rather the tool left it alone.

---

## 5. The ten rules I turned on

These rules are off by default. I enabled them.

### AlwaysUseLiteralForEmptyCollectionInit (rewrites)

```diff
-var names = [String]()
-var lookup = [String: Int]()
+var names: [String] = []
+var lookup: [String: Int] = [:]
```

**Why:** The two spellings are equivalent, but the second puts the type where types go. Annotation on the left of the declaration, value on the right — the same shape as `var x: Int = 0`.

### BeginDocumentationCommentWithOneLineSummary (reports only)

Requires the first sentence of a doc comment to stand alone as a one-line summary.

```swift
/// Returns the sum of two integers. This function is very simple. It adds them.
func add(_ a: Int, _ b: Int) -> Int { a + b }
```

```text
warning: [BeginDocumentationCommentWithOneLineSummary]
add a blank comment line after this sentence: "Returns the sum of two integers."
```

**Why:** Xcode's Quick Help and DocC both take only the first paragraph as the summary. Write a three-sentence summary and you get a wall of text in Quick Help.

### NeverForceUnwrap / NeverUseForceTry / NeverUseImplicitlyUnwrappedOptionals (all report only)

```text
warning: [NeverForceUnwrap] do not force unwrap 'Int(s!)'
warning: [NeverUseForceTry] do not use force try
warning: [NeverUseImplicitlyUnwrappedOptionals] use 'String' or 'String?' instead of 'String!'
```

**Why:** Atofolio is an archive app that imports external data — fields from Bangumi, Steam, and Apple Music can go missing or change shape at any time. The project's first principle is that missing information is never invented, and unknown stays unknown. `!` is the syntax that conflicts with that principle most directly: it converts "there may be no value here" into "crash if there is no value here".

These three only report under `lint`; they never rewrite code — and they shouldn't, because the correct fix (`guard let`, `do/catch`, changing the type) depends on context.

The cost is a certain number of unavoidable reports. UIKit's `@IBOutlet` is implicitly unwrapped by design, and calls like `Bundle.main.url(forResource:)`, where the resource is certainly inside the app bundle, are hard to write without `!`. For those, a one-line comment grants a local exemption:

```swift
// swift-format-ignore: NeverUseImplicitlyUnwrappedOptionals
var label: String!
```

The directive applies only to the declaration immediately following it; later declarations are checked as usual. To exempt an entire file, use `// swift-format-ignore-file`.

### NoEmptyLinesOpeningClosingBraces (rewrites)

```diff
 struct S {
-
   var x = 1
-
 }
```

**Why:** A blank line pressed against a brace expresses no grouping. It is just a leftover keystroke.

### OmitExplicitReturns (rewrites)

```diff
 func double(_ x: Int) -> Int {
-  return x * 2
+  x * 2
 }
 var squared: Int {
-  return 4
+  4
 }
```

**Why:** SwiftUI's `body` and a great many computed properties are single expressions. Since the language already allows omitting `return`, let the tool omit it uniformly rather than leaving it to each person's habit. Together with the default rule `UseSingleLinePropertyGetter` below (which strips the redundant `get { }`), a computed property simplifies all the way down to the expression itself.

I hold some doubt about this one: without `return`, single-expression functions and closures are harder to tell apart visually. But in SwiftUI code the payoff is larger.

### UseEarlyExits (rewrites)

```diff
 func f(_ x: Int?) {
-  if let x = x {
-    print(x)
-  } else {
+  guard let x = x else {
     return
   }
+  print(x)
   print("done")
 }
```

**Why:** `guard` puts "leave if the condition fails" up front and keeps the main logic at the outermost indentation. This is one of the rare semantic-level rewrites a tool can perform reliably in Swift.

Note that it only handles the case where the `else` branch contains a single exit statement; it won't meddle with complex branches.

### UseWhereClausesInForLoops (rewrites)

```diff
 func f(_ xs: [Int]) {
-  for x in xs {
-    if x > 0 {
-      print(x)
-    }
+  for x in xs where x > 0 {
+    print(x)
   }
 }
```

**Why:** One less level of indentation, and `where` separates filtering from processing at the syntax level.

### ValidateDocumentationComments (reports only)

Checks that a doc comment's parameter list matches the actual signature.

```swift
/// Returns the sum.
///
/// - Parameters:
///   - a: first
///   - c: wrong name
/// - Returns: the sum
func add(a: Int, b: Int) -> Int { a + b }
```

```text
warning: [ValidateDocumentationComments]
change the parameters of the documentation of 'add' to match its parameters
```

**Why:** A doc comment out of sync with its signature is one of the hardest classes of error to notice, because it affects neither compilation nor runtime. It only misleads the next person reading the code, which is usually me.

---

## 6. The rules that are on by default

swift-format enables these by default and I kept all of them. Grouped by what they do, one minimal example each.

### Rewriting rules

**DoNotUseSemicolons** — semicolons become line breaks.

```diff
-let a = 1; let b = 2;
+let a = 1
+let b = 2
```

**FullyIndirectEnum** — when every case is `indirect`, hoist it to the enum.

```diff
-enum Tree {
-  indirect case node(Tree, Tree)
-  indirect case leaf(Tree)
+indirect enum Tree {
+  case node(Tree, Tree)
+  case leaf(Tree)
 }
```

**GroupNumericLiterals** — underscore grouping in long numeric literals.

```diff
-let big = 1000000
-let hex = 0xFFFFFFFF
+let big = 1_000_000
+let hex = 0xFFFF_FFFF
 let bin = 0b11110000
```

Note the last line is untouched: an 8-bit binary literal is under the threshold.

**NoAccessLevelOnExtensionDeclaration** — move the access level from the extension to its members.

```diff
-public extension String {
-  func shout() -> String { uppercased() }
+extension String {
+  public func shout() -> String { uppercased() }
 }
```

**NoAssignmentInExpressions** — split an assignment out of an expression into its own statement.

```diff
 func f() -> Int {
   var x = 0
-  return x = 5
+  x = 5
+  return
 }
```

(The original code in this example was already suspicious, and the rewritten version won't necessarily compile. The value of the rule is that it forces you to look at that line.)

**NoCasesWithOnlyFallthrough** — merge cases that only fall through.

```diff
-  case 1:
-    fallthrough
-  case 2:
+  case 1, 2:
     print("small")
```

**NoEmptyTrailingClosureParentheses** — empty parentheses before a trailing closure.

```diff
-  UIView.animate() {
+  UIView.animate {
```

**NoLabelsInCasePatterns** — redundant labels in case patterns.

```diff
-  case .a(x: let x, y: let y):
+  case .a(let x, let y):
```

**NoParensAroundConditions** — parentheses around conditions.

```diff
-  if (x > 0) {
+  if x > 0 {
-  while (x < 10) { break }
+  while x < 10 { break }
```

**NoVoidReturnOnFunctionSignature** — an explicit `-> Void` on a function signature.

```diff
-func f() -> Void {}
-func g() -> () {}
+func f() {}
+func g() {}
```

**ReturnVoidInsteadOfEmptyTuple** — `()` becomes `Void` in closure types.

```diff
-let handler: (Int) -> () = { _ in }
+let handler: (Int) -> Void = { _ in }
```

The opposite direction from the previous rule, but not a contradiction: on a function signature the return type is deleted outright, while in a type annotation it is spelled `Void`.

**OneCasePerLine** — cases with associated or raw values get their own line.

```diff
 enum E {
-  case a, b, c(Int)
-  case d = 1, e = 2
+  case a, b
+  case c(Int)
+  case d = 1
+  case e = 2
 }
```

Note that the valueless `case a, b` is kept on one line.

**OneVariableDeclarationPerLine** — one variable per line.

```diff
-let a = 1, b = 2, c = 3
+let a = 1
+let b = 2
+let c = 3
```

**UseExplicitNilCheckInConditions** — `if let _`, which discards the bound value, becomes a nil comparison.

```diff
-  if let _ = x {
+  if x != nil {
```

**UseLetInEveryBoundCaseVariable** — `case let .a(x, y)` becomes a `let` on each binding.

```diff
-  case let .a(x, y):
+  case .a(let x, let y):
```

**UseShorthandTypeNames** — generic spellings become shorthand.

```diff
-var a: Array<Int> = []
-var b: Optional<String> = nil
-var c: Dictionary<String, Int> = [:]
+var a: [Int] = []
+var b: String? = nil
+var c: [String: Int] = [:]
```

**UseSingleLinePropertyGetter** — the redundant `get { }` in a read-only property.

```diff
   var x: Int {
-    get {
-      return 1
-    }
+    return 1
   }
```

**UseTripleSlashForDocumentationComments** — block-comment docs become `///`.

```diff
-/**
- * A documented function.
- */
+/// A documented function.
 func f() {}
```

**FileScopedDeclarationPrivacy** and **OrderedImports** were covered earlier, since each has its own configuration key.

### Reporting rules

These never change code; they only report under `lint`.

| Rule | Example that triggers it | What it reports |
| --- | --- | --- |
| AlwaysUseLowerCamelCase | `let Max_Count = 10` | rename the constant 'Max_Count' using lowerCamelCase |
| TypeNamesShouldBeCapitalized | `struct myStruct {}` | rename the struct 'myStruct' using UpperCamelCase |
| DontRepeatTypeInStaticProperties | `static let redColor = Color()` | remove the suffix 'Color' from the name of the variable 'redColor' |
| IdentifiersMustBeASCII | `let café = 1` | remove non-ASCII characters from 'café': é |
| AmbiguousTrailingClosureOverload | two overloads differing only in closure label | rename 'f(a:)' so it is no longer ambiguous when called with a trailing closure |
| AvoidRetroactiveConformances | `extension URL: @retroactive Identifiable` | do not declare retroactive conformances |
| NoBlockComments | `/* comment */` | replace this block comment with line comments |
| NoPlaygroundLiterals | `#colorLiteral(...)` | replace '#colorLiteral' with a call to an initializer on 'NSColor' or 'UIColor' |
| OnlyOneTrailingClosureArgument | closure arguments and a trailing closure together | revise this function call to avoid using both closure arguments and a trailing closure |
| ReplaceForEachWithForLoop | `xs.forEach { ... }` | replace use of '.forEach { ... }' with for-in loop |
| UseSynthesizedInitializer | an init identical to the synthesized one | remove this explicit initializer |

I have no strong opinions about this group; everything they report is a real problem. The one worth a note is `ReplaceForEachWithForLoop`: you can't use `break` or `continue` inside `forEach`, and `return` doesn't mean what it looks like (it exits only that one closure call), so `for-in` really is safer.

## 7. The two I left off

swift-format ships these disabled, and I did not turn them on.

**AllPublicDeclarationsHaveDocumentation** — requires a doc comment on every public declaration.

```text
warning: [AllPublicDeclarationsHaveDocumentation] add a documentation comment for 'S'
```

**Why not:** Atofolio is an app, not a library. Most `public` in an app target is a cross-module technical necessity, not API for outside consumers. Enforcing documentation would only produce comments like `/// The title.` that restate the name. If I ever split the data layer into its own package, I'll turn this on inside that package.

**NoLeadingUnderscores** — forbids identifiers that begin with an underscore.

```text
warning: [NoLeadingUnderscores] remove the leading '_' from the name '_internalValue'
```

**Why not:** A leading underscore carries syntactic meaning in Swift. `@State var x` generates a property wrapper instance named `_x`, and when implementing a property wrapper yourself, `_`-prefixed names for the underlying storage are common. Turning this on picks a fight with a language feature.

---

## 8. Practical gotchas

**How the configuration file is found.** Run without `--configuration` and swift-format walks up from the directory of the file being formatted, looking for `.swift-format`, and uses the first one it finds. I verified that a file several directories deep still finds the configuration at the repository root, so one copy at the root is enough. (Whether Xcode's built-in formatting uses exactly the same lookup, I have no scriptable way to verify, so I'm not claiming it does.)

**Unknown keys are not errors.** Misspell a top-level key (`lineLenght`, say) and swift-format silently ignores it; you'll believe the setting took effect when it didn't. Misspelling a **rule** name does produce a warning:

```text
warning: Configuration contains an unrecognized rule: BogusRule
```

So generate the file with `dump-configuration` and edit values in it, rather than writing it by hand.

**The rule list is tied to the toolchain.** The rule list in my configuration matches the swift-format bundled with Xcode 27 exactly. But swift-format's `main` branch already has newer rules (`SwiftTestingNamingConventions`, for one) that aren't in this file — missing rules fall back to their defaults. After changing toolchains it is worth running `dump-configuration` again and diffing for new entries.

**`format` and `lint` are two commands.** As noted repeatedly above: rewriting rules take effect under `format`, while reporting rules are only visible under `lint`. CI needs both, or rules like `NeverForceUnwrap` may as well be off.

```bash
xcrun swift-format lint --strict --recursive --parallel Sources
xcrun swift-format format --in-place --recursive --parallel Sources
```

---

## The full configuration

```json
{
  "version": 1,
  "lineLength": 100,
  "indentation": { "spaces": 4 },
  "tabWidth": 4,
  "maximumBlankLines": 1,
  "indentBlankLines": false,
  "spacesBeforeEndOfLineComments": 2,
  "spacesAroundRangeFormationOperators": false,
  "indentConditionalCompilationBlocks": true,
  "indentSwitchCaseLabels": false,

  "respectsExistingLineBreaks": true,
  "lineBreakBeforeEachArgument": true,
  "lineBreakBeforeEachGenericRequirement": true,
  "lineBreakBeforeControlFlowKeywords": false,
  "lineBreakBetweenDeclarationAttributes": false,
  "lineBreakAroundMultilineExpressionChainComponents": false,
  "prioritizeKeepingFunctionOutputTogether": true,

  "multiElementCollectionTrailingCommas": true,
  "multilineTrailingCommaBehavior": "neverUsed",
  "reflowMultilineStringLiterals": "onlyLinesOverLength",

  "fileScopedDeclarationPrivacy": { "accessLevel": "private" },
  "noAssignmentInExpressions": { "allowedFunctions": ["XCTAssertNoThrow"] },
  "orderedImports": { "includeConditionalImports": false, "shouldGroupImports": true },

  "rules": {
    "AlwaysUseLiteralForEmptyCollectionInit": true,
    "BeginDocumentationCommentWithOneLineSummary": true,
    "NeverForceUnwrap": true,
    "NeverUseForceTry": true,
    "NeverUseImplicitlyUnwrappedOptionals": true,
    "NoEmptyLinesOpeningClosingBraces": true,
    "OmitExplicitReturns": true,
    "UseEarlyExits": true,
    "UseWhereClausesInForLoops": true,
    "ValidateDocumentationComments": true,

    "AllPublicDeclarationsHaveDocumentation": false,
    "NoLeadingUnderscores": false
  }
}
```

That is only the part I changed. The complete file also contains the other 31 rules that are on by default, all set to `true`; generate them with `xcrun swift-format dump-configuration` and merge.

Summarizing, my criteria come down to three:

First, **keep diffs stable** — one argument per line, one variable per line, both so that changing one thing touches one line. Trailing commas belonged in this category too, and in the end they didn't make it, because they couldn't be consistent across all cases.

Second, **let the tool enforce the floor and let people handle expression** — `respectsExistingLineBreaks: true` is the heart of this one. I don't want a formatter that flattens every hand-written line break.

Third, **encode the project's principles in the configuration** — Atofolio's principle is that missing information is never invented, so the `NeverForceUnwrap` group should be on. A configuration file is an executable project convention, not just a layout preference.

These three occasionally conflict. The trailing comma is exactly that case: stable diffs collided with a consistent rule, and I chose the rule.
