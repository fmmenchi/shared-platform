---
title: Announce an Error
sidebar_label: Announce an error
sidebar_position: 2
---

# Announce an Error

Raise a Slack alert with a link back to the run, using the `announce-error` executor.

## Intent

When a scheduled job fails and there is no PR check to turn red, someone needs to hear about it. This
guide wires `announce-error` into a workflow so a failure posts a message with a link back to the
run — and, like its release sibling, stays silent when Slack was never configured.

## Step 1: Add the target

```jsonc
// project.json
"targets": {
  "announce-error": {
    "executor": "@fmmenchi/nx-notify:announce-error"
  }
}
```

`appName` defaults to the project the target runs on. Pass `--appName` to override it.

## Step 2: Provide the Slack secrets

As with `announce-release`, `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` come from the environment. A
missing pair skips green.

## Step 3: Fire the alert on failure

Give the executor a `message` and a run `url`. Both fall back to `ERROR_MESSAGE` / `ERROR_URL`:

```bash
SLACK_BOT_TOKEN=… SLACK_CHANNEL_ID=… \
ERROR_MESSAGE='The weekly audit found new vulnerabilities.' \
ERROR_URL="$RUN_URL" \
  pnpm nx run myproject:announce-error --appName=myproject
```

An empty `message` means there is nothing to send, and the run skips green.

## Step 4: Wire it into CI

Run it only when the job actually broke, and only on the scheduled run — a PR already shows a red
check, and an alert that arrives on every push is one nobody opens. This mirrors the
`shared-platform` security workflow:

```yaml
- name: Alert Slack on findings
  if: ${{ failure() && github.event_name == 'schedule' }}
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
    SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
    ERROR_MESSAGE: 'The weekly Trivy audit found CRITICAL/HIGH dependency vulnerabilities.'
    ERROR_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
  run: pnpm nx run @fmmenchi/nx-notify:announce-error --appName=shared-platform
```

:::tip[Test the wiring without a failure]

To confirm the bot is invited to the channel and the secrets resolve, run the executor with a
throwaway `ERROR_MESSAGE` on demand — if the message arrives, the real alert can reach you too.

:::

## Related

- [Announce a release](./announce-a-release) — the release counterpart.
- [Executors reference](../reference/executors) — every option and its env fallback.
- [Concepts](../concepts) — the shared skip-green contract.
