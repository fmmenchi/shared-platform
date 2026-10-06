# Review record — `@fmmenchi/share`

Revision 1 is commit `4d5806d`. Revision 2 is the commit that carries this record. Two fresh
contexts read revision 1, each from its own brief and neither told what the other owned.

## 2026-10-06-share-adversarial-r1.md

A reviewer in an isolated worktree, allowed to build, run and mutate.

| #   | Disposition | Note                                                                                                                                                                                                                                                                                                          |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `accepted`  | `query()` runs each value through `toWellFormed()` before encoding; `es2024.string` added to the package's `lib`. A spec cuts an emoji in half across all eight channels.                                                                                                                                     |
| 2   | `reduced`   | The stray space is gone (`withUrl` joins only what is there) and the empty-url result is now stated in the docs. The link is still produced: `shareHref` cannot throw from a render, and a `''` return would be an `href=""` — a link to the current page, which is worse than a link with words.             |
| 3   | `accepted`  | Fixed one level up from the suggested `\|\|`: `given()` decides once that absent, empty and blank are the same, so the `??` in the builders now sees `undefined`.                                                                                                                                             |
| 4   | `accepted`  | The abort is read by `name`, not `instanceof`. The PLAUSIBLE half was settled by fetching the specification: `share()` rejects with `AbortError` for "no share targets available" as well as for the reader's choice, so `cancelled` is now documented as both.                                               |
| 5   | `accepted`  | Every surviving mutant is now killed, and so are eight more written against revision 2 (fourteen run, fourteen caught, each read before the next). The two "on a server" tests gained an unstubbed twin; the stubbed ones are renamed for what they stub.                                                     |
| 6   | `reduced`   | The platform is handed `url`, `title`, `text` and nothing else. An empty url is LEFT OUT rather than answered with `failed`: words without an address are a valid share, and it is what the links do. Fact fetched: the specification parses `url` against the document base, and `''` is "the current page". |
| 7   | `reduced`   | The example imports React, uses `native`, and announces a refusal. A second copy inside the 2.5 s still changes no text and so is not re-announced: making a live region repeat itself is the app's announcer, not a line to add to a sketch. The example was compiled with `tsc --strict`.                   |
| 8   | `accepted`  | By `given()`, same as finding 3.                                                                                                                                                                                                                                                                              |
| 9   | `reduced`   | "No dependencies" is removed from the manifest, the README and the docs page. The `tslib` entry stays: the workspace compiles with `importHelpers` and `@nx/dependency-checks` requires it, as in `@fmmenchi/formatting`. AGENTS.md now says why.                                                             |
| 10  | `accepted`  | Both rows carry the `www.` host the code emits.                                                                                                                                                                                                                                                               |

What this review changed: the package stopped having two definitions of "given" (`??` in the
builders, falsiness in `query()`), which is where findings 2, 3 and 8 all came from, and it stopped
trusting the caller's object on its way to the platform. The spec suite went from 21 tests to 32,
and from "four mutants caught" — the author's own four — to a suite that catches the reviewer's.

## 2026-10-06-share-platform-r1.md

A reviewer with web access, briefed as someone who checks the channels' own documentation and the
specifications rather than memory.

| #   | Disposition | Note                                                                                                                                                                                                                                                                             |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `accepted`  | Re-read on MDN by the author: on Windows the promise resolves when the popup launches. `shared` is now documented as "the sheet took the content", with the instruction not to count on it. No code can recover the dismissal.                                                   |
| 2   | `accepted`  | Re-read on X's page by the author: it gives `x.com/intent/tweet` and never mentions `/intent/post`. The builder, the spec, the README and the docs table now use the documented path. Whether `/intent/post` is served was not settled by anyone, and no longer needs to be.     |
| 3   | `accepted`  | Same fact as adversarial finding 4; the wording of `cancelled` covers "no target to offer".                                                                                                                                                                                      |
| 4   | `accepted`  | Re-read in RFC 6068 §5 by the author. The email body is normalised to CRLF. Text and url stay separated by a space, which the RFC allows and the reviewer calls a preference.                                                                                                    |
| 5   | `accepted`  | `clipboard.ts` and a new "Copying" section say to call it from the click with the string in hand, and show the form that breaks in Safari and Firefox. "Denied by permission" is gone.                                                                                           |
| 6   | `settled`   | The fact was fetched by the reviewer, not re-fetched by the author: Meta and LinkedIn publish no share url. Each builder now names the page its address came from, the docs table has the same column, and the two undocumented rows say so.                                     |
| 7   | `accepted`  | Same defect as adversarial finding 3; fixed by `given()`.                                                                                                                                                                                                                        |
| 8   | `rejected`  | No app offers Threads. The eight channels are the union of what two apps link to today, and ADR-0008's bar is reuse that exists, not reuse that could. The docs now say a channel joins when an app offers it; the Threads address is on record here for that day.               |
| 9   | `rejected`  | The defect is in the brief, not the artefact. The brief said the docs state why Instagram, TikTok and Mastodon are not offered; that sentence is a comment in dev-blog's own `ShareBar`, which the author had read and misattributed. The package makes no such claim to remove. |

What this review changed: the package no longer promises more than the platform reports. Revision 1
said a dismissal is always told apart from a share; on Windows it cannot be, and `AbortError` means
two things by specification. It also moved one address from "what an app was using" to "what the
channel documents", and wrote down, per channel, which of the two each address is.

Correction to the record of this review: finding 9 answers a question the brief should not have
asked. It is counted, and rejected, rather than dropped, because the next brief for this package
would otherwise repeat it.
