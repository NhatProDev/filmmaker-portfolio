# ADR-0005 — Insert-at-position semantics for blocks and block media

- **Status:** Approved
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Affects:** `openapi.yaml` (`CreateBlockRequest`, `AddBlockMediaRequest`, `createBlock`, `addMediaToBlock`) · CLAUDE.md §3, §7, §14, §15, §17
- **Change class:** DTO semantics change (CLAUDE.md §20)

## Problem

`position` was a **required** integer on both creation requests:

```yaml
CreateBlockRequest:    required: [type, position]
AddBlockMediaRequest:  required: [mediaId, position]
```

The contract defined the field's type but never its meaning. Three questions had
no answer anywhere in CLAUDE.md, `openapi.yaml` or `db/schema.ts`:

1. **What happens at an occupied position?** Shift siblings right, overwrite, or
   create a duplicate position? All three are consistent with the schema, since
   `project_blocks` and `block_media` carry no uniqueness constraint on
   `(parent_id, position)` — only `position >= 0`.
2. **What happens out of range?** Clamp, append, or reject?
3. **How does a client append** without first reading the collection to learn
   its length?

Meanwhile CLAUDE.md §7 requires contiguous integer positions `0, 1, 2, …` and
§17 test 6 requires that invariant be tested. A contract that permits duplicate
or gapped positions on insert cannot satisfy an invariant that forbids them.

This was raised as an open ambiguity during repository reconnaissance and left
unresolved through ADR-0002 and ADR-0003.

## Current behaviour before this decision

Undefined. Every implementer would have had to invent one of the three
behaviours above, and any two implementers could reasonably have chosen
differently. The builder UI would have had to issue a read before every insert
just to append.

## Decision

Let **`N`** be the number of existing siblings **before** the insert — blocks in
the project for `createBlock`, media items in the block for `addMediaToBlock`.

| Rule | Behaviour |
|---|---|
| `position` omitted | Append to end. Equivalent to `position = N`. |
| `position` in `0..N` | Insert at that position. `position = N` appends. |
| Existing siblings at `position >= p` | Shift right by one. |
| Atomicity | Bounds check, shift and insert occur in one transaction. |
| Invariant | Final positions contiguous from 0 — no gaps, no duplicates. |
| `position < 0` | `422 VALIDATION_ERROR` |
| `position > N` | `422 VALIDATION_ERROR` |

`position` becomes **optional** on both request schemas. `required` narrows to
`[type]` and `[mediaId]` respectively.

An out-of-range position is an **error, not a silent append**. Clients that mean
"append" omit the field.

## Why

- **Makes the §7 contiguity invariant achievable.** Shift-right on insert is the
  only one of the three candidate behaviours that preserves contiguity without
  a follow-up repair pass.
- **Removes a mandatory read-before-write.** Appending is the overwhelmingly
  common case in a builder — every "add block" button press. Requiring
  `position` forced the client to know `N`, which it can only learn by reading
  the collection first, creating a race it cannot win.
- **Fails loudly on stale client state.** If the builder's cached `N` is stale —
  another tab added a block — an out-of-range insert returns 422 rather than
  silently landing the block somewhere the user did not intend. Clamping or
  silently appending would hide the staleness and produce a wrong-looking page
  with no error.
- **`position = N` appending is deliberate.** It makes the explicit and implicit
  append forms agree, so a client that does track `N` need not special-case the
  end of the list.

## Compatibility impact

No client code exists, so no runtime breakage.

Making a required field optional **widens** the set of accepted requests — any
payload valid before is still valid, provided its `position` is in range.

The one behavioural narrowing: a client that previously sent a deliberately
large `position` (e.g. `9999`) as an "append" idiom now receives `422`. That
idiom was never specified, so nothing depended on it.

`ProjectBlock.position` and `BlockMedia.position` remain **required in
responses**. Only the request side became optional.

## Migration impact

None. No schema change.

`project_blocks.position` and `block_media.position` are `integer NOT NULL` with
`CHECK (position >= 0)` and no uniqueness constraint. The shift is therefore a
plain statement:

```sql
UPDATE project_blocks
   SET position = position + 1
 WHERE project_id = $1 AND position >= $2;
```

No deferred constraints and no descending-order update are needed. This works
**because** no unique constraint exists.

## Implementation constraints

Binding on whoever implements this:

1. **`N` cannot be validated by the request schema.** Its upper bound depends on
   database state. Zod enforces `integer >= 0` at the HTTP boundary per §14; the
   service enforces `position <= N` inside the transaction and raises
   `VALIDATION_ERROR` (422).
2. **Check the bound inside the transaction, not before it.** Reading `N` in a
   separate statement and then inserting leaves a window in which a concurrent
   insert invalidates the bound. Lock the sibling rows (`SELECT … FOR UPDATE` on
   the parent or its children) or use `SERIALIZABLE`. Two concurrent inserts at
   the same position must not both succeed and produce duplicate positions —
   §17 test 12 exists to catch exactly that.
3. **Do not add a unique constraint on `(parent_id, position)` to enforce this.**
   It would break the plain shift statement above and require deferred
   constraints. Uniqueness and contiguity are service-enforced inside the
   transaction, consistent with ADR-0002's treatment of project ordering.
4. **A failed insert commits nothing** — no partially shifted siblings (§15).

## Alternatives considered

**Keep `position` required.** Rejected: forces a read-before-write for the most
common operation, and does not by itself answer what an occupied or out-of-range
position means.

**Clamp out-of-range to the end.** Rejected: silently hides stale client state.
The user sees a block appear somewhere they did not choose, with a `201` and no
error to explain it.

**Treat `position` as a sort hint and renumber afterwards.** Rejected: makes the
result of an insert unpredictable from the request alone, and turns every insert
into a full-collection rewrite.

**Allow gaps and renumber lazily.** Rejected: directly contradicts §7's
contiguity requirement, and would make `PUT …/order` payload-completeness checks
(ADR-0002) unverifiable.

**Fractional positions to avoid the shift entirely.** Rejected: §7 forbids
LexoRank/fractional indexing in V1 absent a demonstrated concurrency or
performance need. A project has tens of blocks, not thousands.
