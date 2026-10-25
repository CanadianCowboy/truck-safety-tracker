# Product Roadmap

This roadmap tracks selected initiatives and their delivery status.

## Near-term group

The order below reflects priority; defect and repair follow-up remains deferred.

1. **Complete VIN profiles — implemented**
   - Preserve and present the full set of values returned by the NHTSA VIN decoder, not only values already represented by the current truck fields.
   - Make the source and completeness of decoded values clear, including which values are unavailable or manually maintained.
   - Implemented: reviewed NHTSA values are preserved per unit, searchable, and shown as an expandable source-labelled record; editable fields remain independently reviewable.

2. **Fleet backup and restore — implemented**
   - Let an authorized fleet operator export and restore fleet records and associated metadata.
   - Define how private inspection certificates are included or excluded, and ensure a backup cannot make private files publicly accessible.
   - Implemented: versioned JSON format, strict schema/record/size validation, explicit file inclusion, merge-by-ID, unit-number conflict rejection, confirmation, and no delete semantics.

3. **Inspection history timeline — implemented**
   - Present each unit's inspections and related certificates in chronological order.
   - Implemented with the existing chronological inspection history; metadata-only restored certificates are marked unavailable and cannot be opened as files.

4. **Per-unit reminder settings — implemented**
   - Allow reminder preferences to vary by unit while preserving current fleet-wide defaults and daily reminder behavior.
   - Implemented: blank inherits fleet defaults, supported days are 30/14/7/1/0/overdue, `none` opts out, and scheduled delivery remains at 7:00 AM Winnipeg time.

## Later

5. **Defect and repair follow-up**
   - Track reported issues from open through resolution, with notes, dates, and related documents.
   - Explicitly deferred until after the near-term group; do not include in that implementation scope.

## Planning guardrails

- This order is the requested priority, not a claim that dependencies or effort have been fully assessed.
- Preserve the application's existing passcode, path-scoping, mobile accessibility, and private-file invariants.
- Do not silently change fleet-wide reminders, delete records, or overwrite existing unit values during imports/restores.
