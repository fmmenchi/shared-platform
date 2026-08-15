---
title: Publish tokens to Figma
sidebar_label: Publish tokens to Figma
sidebar_position: 1
---

# Publish tokens to Figma

The whole loop: stylesheet → payload → Figma variables → a verified round trip.

## Intent

Mirror the design system's token contract into a Figma file, so a designer picks
`color/primary/default` rather than a hex somebody remembered. **One direction only** — code is the
source of truth. The contract is `as const` in TypeScript, validated by tests; Figma cannot be the
source for something the compiler already checks.

## Step 1: Build the payload

```ts
import { buildPayload, FM_CONTRACT } from '@fmmenchi/figma-tokens';
import { readFileSync } from 'node:fs';

const payload = buildPayload(
  readFileSync('packages/client/tokens/src/styles/vars.css', 'utf8'),
  FM_CONTRACT,
);
if (payload.problems.length) throw new Error(payload.problems.join('\n'));
```

If `problems` is non-empty, **stop**. A token has been added to the contract that nobody has decided
about. Add a rule or an exclusion to `fm-contract.ts` — never a catch-all to make it quiet.

## Step 2: Write them into Figma

This package does not talk to Figma. The write is a Figma Plugin API call, made through the Figma
MCP (`use_figma`) by an agent holding the payload.

What the script must do, and why:

- **Find the collection before creating it.** Re-running must update, not fork a second collection.
- **Write the variable at `variable.path`**, `/`-separated — Figma reads the slashes as groups.
- **Set `scopes` from the payload.** The API default (`ALL_SCOPES`) offers every variable for every
  property, which at 129 variables makes the picker useless.
- **Put `variable.cssVar` in the Figma variable's `description`.** This is the reverse mapping:
  `color/primary/default` → `--fm-color-primary`, recoverable from Figma alone, without this
  package. It is what makes drift checkable instead of arguable.

:::note One mode, not two

The contract ships a `dark` preset overriding every colour role — in Figma that is exactly a second
variable **mode**. Variable modes need a paid plan; on Starter the collection carries one mode and
dark stays in code.

:::

## Step 3: Verify the round trip

Do not trust the write's own count — it reports what was sent, not what landed. Read the collection
back and diff it against the payload: name, value, description, and no extras.

The result to want:

```json
{
  "expectedCount": 129,
  "actualCount": 129,
  "mismatches": [],
  "verdict": "IN SYNC"
}
```

## Step 4: Never edit the variables in Figma

A value changed by hand in Figma is drift that no test can see — the code has no idea it happened,
and the next publish silently overwrites it. Change `vars.css`, run the loop again.

## Troubleshooting

| Symptom                                           | Cause                                                         |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `problems: ["unaccounted: --fm-…"]`               | A token was added to the contract. Decide: rule or exclusion. |
| `problems: ["path collision: …"]`                 | Two properties map to one Figma path — a rule is too broad.   |
| A variable is offered for every property in Figma | Its rule has no deliberate `scopes` list.                     |
| The write succeeds but the file looks unchanged   | The script created a second collection. Find by name first.   |
