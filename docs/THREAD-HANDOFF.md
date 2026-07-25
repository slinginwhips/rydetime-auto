# Wrong repo — the handoff lives in the DMS

This is the **website** repo (`rydetime-auto`, the public rydetimeauto.com site).

The rolling thread handoff and `AGENTS.md` are in the **DMS** repo. On this
computer:

```
C:\Users\RydeTime Auto\Desktop\rydetime-dms\docs\THREAD-HANDOFF.md
C:\Users\RydeTime Auto\Desktop\rydetime-dms\AGENTS.md
```

Read those. If the DMS folder isn't there, clone it:
`gh repo clone slinginwhips/rydetime-dms`.

Work on the website repo is tracked from the DMS handoff too — see the parking
lot item on vehicle descriptions. Its `.env.local` points at the **live**
website database, so anything run here is production.
