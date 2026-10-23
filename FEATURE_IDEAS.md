# Truck Safety Tracker — Future Ideas

Planning notes. Features remain suggestions unless marked implemented below.

## Owner preferences

- Inspections are handled in a private shop; no appointment booking feature is needed.
- The current filters are good as they are; no additional filter work is requested.

## Ideas saved at the owner's request

### Printable shop checklist
- Print the units coming due, with due dates, checkboxes and space for handwritten notes.
- Useful as a paper checklist on the shop wall.

### CSV export
- Download fleet data for Excel, recordkeeping or sharing.
- Optionally export only the currently filtered list.

### Recover deleted units (trash bin)
- Allow accidentally deleted units and their inspection records to be restored.
- Keep associated certificates during the recovery period; delete files permanently only when records are purged.

## Additional suggestions to consider

### Inspection due-date override reason
- When changing a due date manually, optionally record why it changed.
- Helps distinguish a correction from a newly completed inspection.

### Quick unit notes
- Add a timestamped note to a truck or trailer without editing the whole unit.
- Examples: certificate missing, check brake work, sticker needs replacing.
- Notes are not a replacement for legally required defect or inspection records.

### Certificate missing indicator
- Show which units have no certificate attached to their latest inspection.
- An older certificate should not count as proof for a newer inspection.

### Unit QR labels — implemented
- Optional Scan / Paste UUID, plus Details / QR and a manual Print QR label link per unit.
- QR contains only the permanent unit UUID, for reuse by future apps. Each app decides what to do with it; it is not a website link.
- Print QR-only labels at 1.5 × 1.5 inches including the white quiet zone, on paper for cutting/laminating. Print at 100% / Actual size with browser headers/footers disabled.
- Camera scanning is in-app with UUID paste fallback. Scanning while locked selects the unit but requires the passcode before any unit data loads.
- QR features are quality-of-life only; manual workflows remain available. No labels or records are created automatically by scanning.

### Duplicate unit details
- Copy common make/model, vehicle type, GVWR and inspection interval into a new-unit form.
- Leave unit number, VIN, plate, dates and certificate identifiers blank to avoid copying incorrect identity or safety information.

### Fleet data backup download
- Export units and inspection history in a restorable format.
- Clearly state whether attachments are included; a data-only export is not a complete certificate backup.
- Restore and full attachment backups would need separate design and testing.

### Remember dismissed reminders
- Avoid repeatedly showing the same in-app warning after it has been acknowledged.
- Acknowledging must not change a unit's due date or make an overdue unit look up to date.
