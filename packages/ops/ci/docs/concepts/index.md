---
title: Concepts
sidebar_label: 🏗 Concepts
sidebar_position: 3
---

# Core Concepts

Three decisions, each of them a thing this package deliberately does not do.

---

## 💡 The Philosophy

### 1. No affected pre-filter, because `nx release` is already right

The obvious design is to compute the affected projects first and release only those. It is
unnecessary and it is worse.

`nx release` versions from **conventional commits per project**: a docs- or config-only push
releases nothing, and a change that legitimately affects everything — `nx.json`, the lockfile —
releases everything. A pre-filter would be a second opinion about the same question, and the only
thing it can add is a disagreement.

### 2. A package tag is not a toolkit tag

A project can be versioned and tagged without being an npm package. This workspace's `gh-actions`
toolkit is one: `private`, tagged `gh-actions/v{version}`, consumed by reference rather than
installed.

Everything downstream of the release parses `{project}@{version}` to derive a project name. Handed
`gh-actions/v0.0.2` it derives a project that does not exist, and the step fails on a package nobody
released. So the classification is explicit and tested, rather than the `*@*` glob it replaced —
which was right by accident and untestable by construction.

### 3. The logic is separated from the side effects

`isPackageTag`, `toReleaseRecords` and `publishableProjects` take values
and return values. Every `git` call and every
file write lives in the two scripts.

That split is the whole reason any of this has tests. The interesting failures are all in the pure
half — a lexical sort that puts `v0.9.0` above `v0.10.0`, a glob that matches a toolkit tag — and
none of them needs a repository to reproduce.

---

## 🔁 What the release job actually is

A green push to `main` runs the gate, then `nx release`, then the per-package steps that read the new
tags. The important structural fact is that the release job **needs** the gate job: when the gate
fails, the release job is `skipped`, not `failed`.

That distinction matters when something looks wrong. A red gate produces no tags, no GitHub
Releases, no publish and no announcement — and none of it appears as an error. The failure to look
for is upstream, in the job that was supposed to be green.

---

## 🚫 Not here

**Message building.** `fmmenchi-notify` delivers and counts; `@fmmenchi/notify` builds. One
implementation. Adding a second here would mean two things to keep in step for one message.
