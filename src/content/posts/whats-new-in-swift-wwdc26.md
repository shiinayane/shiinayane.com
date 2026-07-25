---
title: "What's New in Swift — WWDC26 Notes"
published: 2026-06-11
description: "My notes from WWDC26's What's New in Swift session, covering Swift 6.3 and 6.4."
tags: [Swift, WWDC, Programming]
category: Engineering
draft: false
lang: en
translationKey: whats-new-in-swift-wwdc26
---

I watched this year's *What's New in Swift* session and wrote down the parts I will probably need later. Becca and Evan covered Swift 6.3 and 6.4, with quite a lot packed into one session: small syntax changes, library additions, Android and Wasm, and more ownership work.

This is a reference note, so I have kept the examples instead of trying to turn everything into one big takeaway.

## Everyday Swift

### Optional parentheses around `some` and `any`

An optional `some` or `any` type no longer needs another pair of parentheses:

```swift
// Before
func delegate() -> (any Renderer)?

// After
func delegate() -> any Renderer?
```

Small change, but definitely easier to read.

### `weak let`

A weak reference previously had to be a `var`. That was awkward for `Sendable` types and sometimes led to `@unchecked Sendable` just to get around it.

Swift 6.4 allows immutable weak references to use `weak let`, so this case can express real `Sendable` conformance without the escape hatch.

### `~Sendable`

`~Sendable` explicitly marks a type as non-`Sendable` without preventing its subclasses from becoming `Sendable`.

### Task errors now get a warning

Ignoring an error thrown from a `Task` now produces a warning. Silently losing an error from an unstructured task is very easy to miss, so I am glad the compiler finally points it out.

### Async work in `defer`

An `async` function can now be called from a `defer` block.

### Two memberwise initializers

For a struct containing both `internal` and `private` stored properties, Swift can synthesize two memberwise initializers at the corresponding access levels. There is no need to write one manually just because the properties have mixed visibility.

### `@diagnose`

`@diagnose` controls one diagnostic on one declaration:

```swift
@diagnose(DeprecatedDeclaration, as: ignored, reason: "Flying with surplus hardware")
func makeApolloSoyuzMission() -> Mission { ... }

@diagnose(StrictMemorySafety, as: warning)
func uplinkCommand(from receiver: inout Receiver, to computer: inout Computer) { ... }

@diagnose(ErrorInFutureSwiftVersion, as: error)
func fetchPosition() -> (x: Double, y: Double, z: Double) { ... }
```

This is probably my favorite small addition in the session. A special call site no longer requires changing the warning level for the whole project, and `reason:` leaves an explanation next to the exception.

### Module selectors with `::`

Swift 6.3 added `::` for resolving symbols with the same name in different modules:

```swift
import Rocket
import GiftShopToys

let r1 = SaturnV()          // ambiguous
let r2 = Rocket::SaturnV()  // the type from Rocket
```

It also works on members. For example, `technician.HumanResources::fire()` selects the member from a particular module.

## Library updates

### Standard library

- `withTaskCancellationShield { ... }` runs a critical section even when the surrounding task is cancelled. The session uses sending a final SOS packet as an example.
- `Dictionary.mapKeyedValues` transforms values while also giving the closure access to each key:

  ```swift
  missions.mapKeyedValues { mission, window in
      makeDisplayName(for: mission, in: window)
  }
  ```

- `FilePath` is a cross-platform path type with structured components:

  ```swift
  var path: FilePath = "/var/www/static"
  path.components.append("WWDC")
  // [ "var", "www", "static", "WWDC" ]
  ```

### Swift Testing

- `Issue.record(..., severity: .warning)` records a warning without failing the test.
- `try Test.cancel("reason")` stops a parameterized case when it does not apply.
- `swift test` can repeat a test until it passes or fails, with a configurable maximum. This should be useful when tracking down a flaky test.
- `#expect` now works inside `XCTestCase`, while XCTest assertion failures appear as Swift Testing issues. Existing XCTest suites can therefore migrate gradually.

### Subprocess 1.0

The `Subprocess` package reached 1.0. It has a cleaner API, improved error handling, and cross-platform line-by-line output streaming:

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

The package handles differences such as platform file descriptors and termination statuses.

### Foundation `ProgressManager`

`ProgressManager` is a new progress API designed for `async`/`await`. A parent assigns part of its total with `subprogress(assigningCount:)`; the child reports its own local stages without needing to know the parent's total:

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

Foundation's move to pure Swift also continues. The session mentions faster `Data` operations and bridging, plus one unified Swift implementation behind `NSURL` and `CFURL`.

## Swift outside Apple platforms

### `anyAppleOS`

The new availability shortcut replaces a long list of Apple platforms:

```swift
// Before
@available(macOS 27, iOS 27, watchOS 27, tvOS 27, visionOS 27, *)
func showStatus() { ... }

// After
@available(anyAppleOS 27, *)
func showStatus() { ... }
```

`anyAppleOS` also works in `#if os(anyAppleOS)`.

### `@C`

`@C` exposes a Swift function to C, and can also be used when Swift implements a C function. The signature must use C-compatible types such as integers, pointers, imported C structs, and raw-value enums:

```swift
@C
func averageLaunchWindowLength(_ windows: Span<LaunchWindow>) -> TimeInterval { ... }
```

### Java and Android

Java can call Swift functions that are `async` or throwing, and Java classes can conform to Swift protocols. There is also an official Swift SDK for Android on swift.org.

### WebAssembly

Swift compiles to Wasm with an open-source toolchain. JavaScriptKit's type-safe bridge is now 35–40 times faster than its dynamic path. Goodnotes was the example in the session: it moved Swift code from the native iOS app to the web through Wasm.

### Embedded Swift

Embedded Swift now supports existential types, untyped `throws`, and DWARF debug information for inspecting coredumps on constrained hardware. The new `EmbeddedRestrictions` warning group reports features that will not work in an embedded environment.

### Editor support

The Swift VS Code extension integrates Swiftly for toolchain management and is available through OpenVSX, which also makes it available in editors such as Cursor and VSCodium. It now includes a getting-started checklist as well.

## Performance and ownership

### Optimizer hints

- `@inline(always)` is now a supported attribute. Class methods should use it together with `final`.
- Swift 6.3's `@specialized` can pre-specialize a generic function for a known hot type:

  ```swift
  @specialized(where Values == [UInt8])
  func histogram<Values>(of values: Values) -> [256 of Int]
      where Values: Sequence<UInt8> { ... }
  ```

### Ownership in the standard library

`Equatable`, `Comparable`, and `Hashable` now work with noncopyable types. `Equatable` and `Comparable` also work with non-escapable types, and associated types may be `~Copyable` or `~Escapable`.

The new `Iterable` protocol borrows elements in a `for` loop instead of copying them.

Custom `borrow` and `mutate` accessors make it possible to expose these semantics from a container:

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

- `UniqueBox` and `UniqueArray` provide noncopyable storage without reference-counting overhead.
- `Continuation` checks single resumption at compile time, with the safety of `CheckedContinuation` and the cost of `UnsafeContinuation`.
- `Ref` and `MutableRef` provide safe borrowed references into a collection slot:

  ```swift
  var countRef = MutableRef(&counts[key, default: 0])
  countRef.value += 1
  ```

- `withTemporaryAllocation` now gives its closure an `OutputSpan` instead of an `UnsafeMutableBufferPointer`.

I will probably use `@diagnose`, the ignored-Task-error warning, and the Swift Testing additions first. The ownership types are more interesting, but I need an actual project with the right problem before they become useful.

> Full session: [What's new in Swift — WWDC26](https://developer.apple.com/videos/play/wwdc2026/262/).
