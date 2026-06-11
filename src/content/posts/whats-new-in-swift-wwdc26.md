---
title: "What's New in Swift — WWDC26 Notes"
published: 2026-06-11
description: "A digest of the WWDC26 'What's New in Swift' session: the ergonomics, library, cross-platform, and performance changes that land in Swift 6.3 and 6.4."
tags: [Swift, WWDC, Programming]
category: Engineering
draft: false
lang: en
---

Every year the *What's New in Swift* session is the one talk I watch twice. The first pass is for the headline features; the second is for the small ergonomic changes that quietly remove friction I had stopped noticing. WWDC26's session — presented by Becca and Evan from the Swift team — covers **Swift 6.3 and 6.4**, and it splits cleanly into four buckets: everyday language ergonomics, library updates, cross-platform reach, and performance.

Here are my notes, reorganized the way I'd actually want to remember them.

---

## 1. Everyday Ergonomics

These are the changes you feel on day one — none of them are headline-grabbing, but collectively they shave a lot of noise off ordinary code.

### Optional parentheses around `some` / `any`

You can now drop the parentheses when wrapping `some` or `any` types in an `Optional`:

```swift
// Before
func delegate() -> (any Renderer)?

// After
func delegate() -> any Renderer?
```

A tiny thing, but it removes a paper cut that every Swift programmer has hit.

### `weak let` instead of `@unchecked Sendable`

Previously a `weak` reference had to be a `var`, which made `Sendable` conformance awkward and often pushed people toward `@unchecked Sendable`. Swift 6.4 allows `weak let` for immutable weak references, so the type can be genuinely `Sendable` without the escape hatch.

### `~Sendable`

A new way to explicitly mark a type as *non*-`Sendable` — without that decision blocking subclasses from being `Sendable`. It makes intent legible instead of relying on the absence of a conformance.

### Don't silently swallow task errors

Swift Concurrency now **warns when you ignore an error thrown out of a `Task`**. This is one of those "how did this not already warn" fixes — silently dropped task errors have caused real bugs.

### `defer` can call async functions

The old restriction on calling `async` functions inside a `defer` block is gone.

### Two memberwise initializers

A struct that mixes `internal` and `private` stored properties now synthesizes *two* memberwise initializers — one for each access level — instead of forcing you to hand-write one.

### `@diagnose` — per-declaration warning control

This is my favorite of the ergonomic batch. You can dial a specific diagnostic up or down on a single declaration:

```swift
@diagnose(DeprecatedDeclaration, as: ignored, reason: "Flying with surplus hardware")
func makeApolloSoyuzMission() -> Mission { ... }

@diagnose(StrictMemorySafety, as: warning)
func uplinkCommand(from receiver: inout Receiver, to computer: inout Computer) { ... }

@diagnose(ErrorInFutureSwiftVersion, as: error)
func fetchPosition() -> (x: Double, y: Double, z: Double) { ... }
```

No more flipping a warning project-wide just to handle one stubborn call site. And the `reason:` string doubles as documentation for the next person.

### Module selectors `::` (Swift 6.3)

When two imported modules export the same name, you've historically had to play games with type aliases. Swift 6.3 adds a `::` selector to name a symbol's *module* unambiguously:

```swift
import Rocket
import GiftShopToys

let r1 = SaturnV()          // ambiguous
let r2 = Rocket::SaturnV()  // unambiguously the Rocket module's type
```

It works on members too — `technician.HumanResources::fire()` reaches past the collision.

---

## 2. Library Updates

### Standard library

- **`withTaskCancellationShield { ... }`** — run a critical section that must complete even if the surrounding task is cancelled (think: sending a final SOS packet).
- **`Dictionary.mapKeyedValues`** — transform values while keeping access to the key:

  ```swift
  missions.mapKeyedValues { mission, window in
      makeDisplayName(for: mission, in: window)
  }
  ```
- **`FilePath`** — a real, cross-platform path type with structured `components`:

  ```swift
  var path: FilePath = "/var/www/static"
  path.components.append("WWDC")
  // [ "var", "www", "static", "WWDC" ]
  ```

### Swift Testing

- **Issue severity** — `Issue.record(..., severity: .warning)` records a concern without failing the test.
- **`try Test.cancel("reason")`** — bail out of a parameterized case cleanly when it doesn't apply.
- **Flaky-test repetition** — `swift test` can now repeat a test until it passes or fails, up to a configurable maximum, which is exactly what you want when chasing intermittent failures.
- **XCTest interop** — `#expect` works inside `XCTestCase`, and XCTest assertion failures surface as Swift Testing issues. Migration no longer has to be all-or-nothing.

### Subprocess 1.0

The `Subprocess` package hit **1.0** with a cleaner API, better error handling, and line-by-line streaming output that's cross-platform (it abstracts over platform file descriptors and termination statuses):

```swift
let result = try await Subprocess.run(
    .name("ls"),
    input: .none,
    output: .sequence,
    error: .string(limit: 4096)
) { execution in
    execution.standardOutput.strings().filter { $0.hasSuffix(".obj") }
}
```

### Foundation: `ProgressManager`

A new progress type built for `async`/`await` that **separates composition from reporting**. A parent allocates a slice of the total to a child via `subprogress(assigningCount:)`, and the child reports against its own local stages without knowing the whole:

```swift
let manager = ProgressManager(totalCount: 100)
try await rocket.launch(manager.subprogress(assigningCount: 100))

extension Rocket {
    func launch(_ progress: consuming Subprogress? = nil) async throws {
        let stage = progress?.start(totalCount: 3)
        try await ignite();          stage?.complete(count: 1)
        try await liftoff();         stage?.complete(count: 1)
        try await stageSeparation(); stage?.complete(count: 1)
    }
}
```

Foundation also continues its migration to pure Swift: faster `Data` operations and bridging, and a single unified Swift implementation behind `NSURL`/`CFURL`.

---

## 3. Cross-Platform Reach

This is the part of the session that has grown the most over the last few years. Swift is increasingly serious about life outside Apple's OSes.

### `anyAppleOS` — collapse availability boilerplate

If you've ever written a six-platform `@available` line, this is for you:

```swift
// Before
@available(macOS 27, iOS 27, watchOS 27, tvOS 27, visionOS 27, *)
func showStatus() { ... }

// After
@available(anyAppleOS 27, *)
func showStatus() { ... }
```

It works in `#if os(anyAppleOS)` conditions too.

### `@C` — call Swift from C

The `@C` attribute exposes a Swift function directly to C (and lets Swift *implement* a C function), as long as the signature uses C-compatible types — integers, pointers, imported C structs, raw-value enums:

```swift
@C
func averageLaunchWindowLength(_ windows: Span<LaunchWindow>) -> TimeInterval { ... }
```

### Swift–Java and Android

`async` and `throwing` Swift functions are now callable from Java, Java classes can conform to Swift protocols, and — the big one — there's an **official Swift SDK for Android** on swift.org.

### WebAssembly

Swift compiles to Wasm through an open-source toolchain, and **JavaScriptKit's type-safe bridging is now 35–40× faster** than the dynamic path. Apple cited Goodnotes moving Swift code from native iOS straight to the web via Wasm.

### Embedded Swift

The embedded subset keeps growing without sacrificing binary size: existential types, untyped `throws`, and DWARF debug info for coredump debugging on constrained hardware. A new `EmbeddedRestrictions` warning group flags features that won't survive in embedded contexts.

### Editor support

The Swift VSCode extension now integrates **Swiftly** for toolchain management and ships on OpenVSX, so Cursor, VSCodium, and friends get first-class Swift support — with a getting-started checklist for newcomers.

---

## 4. Performance

The performance story is mostly about giving you *control* and extending Swift's ownership model into more of the standard library.

### Optimizer hints

- **`@inline(always)`** is now a supported attribute (pair it with `final` on class methods).
- **`@specialized`** (Swift 6.3) lets you pre-specialize a generic function for a concrete type you know is hot:

  ```swift
  @specialized(where Values == [UInt8])
  func histogram<Values>(of values: Values) -> [256 of Int]
      where Values: Sequence<UInt8> { ... }
  ```

### Ownership reaches the standard library

`Equatable`, `Comparable`, and `Hashable` now work with **noncopyable** types, and `Equatable`/`Comparable` extend to **non-escapable** types. Associated types can be `~Copyable` or `~Escapable`. There's also a new `Iterable` protocol whose `for` loops *borrow* elements instead of copying them.

New custom accessors make this practical to build on:

```swift
public struct UniqueBox<Value: ~Copyable>: ~Copyable {
    private let valuePointer: UnsafeMutablePointer<Value>

    public var value: Value {
        borrow { valuePointer.pointee }
        mutate { &valuePointer.pointee }
    }
}
```

### New low-overhead types

- **`UniqueBox` / `UniqueArray`** — noncopyable storage with no reference-counting overhead.
- **`Continuation`** — verifies single resumption at compile time: as safe as `CheckedContinuation`, as cheap as `UnsafeContinuation`.
- **`Ref` / `MutableRef`** — safe borrowed references into a collection slot:

  ```swift
  var countRef = MutableRef(&counts[key, default: 0])
  countRef.value += 1
  ```
- **`withTemporaryAllocation`** now hands you an `OutputSpan` instead of a raw `UnsafeMutableBufferPointer`.

---

## The Through-Line

Watching the whole session back, the theme is consistent with where Swift has been heading for a while: **make the safe, explicit thing the easy thing.**

`@diagnose` makes warning intent explicit. `~Sendable` and `weak let` make concurrency intent explicit. The ownership additions push compile-time guarantees into everyday types instead of leaving them to `Unsafe*` escape hatches. And the cross-platform work — Android, Wasm, `@C`, `anyAppleOS` — is Swift quietly insisting it's a general-purpose systems language, not just the language you write iOS apps in.

None of it is flashy. All of it removes a reason to reach for something less safe. That's the kind of release I like.

> Watch the full session: [What's new in Swift — WWDC26](https://developer.apple.com/videos/play/wwdc2026/262/).
