# Agra Nagar Nigam OTS 2026-27 Portal

Production reporting and reconciliation portal for Nagar Nigam Agra OTS 2026-27. The embedded baseline snapshot is reconciled through **15 September 2026**.

## Reporting coverage

The portal provides city, zone, RI/TC, ward, cashier, application and receipt views. It calculates previous-day/latest-day/cumulative collection, approval rate, approval-to-paid conversion, average receipt, collection-to-demand ratio, exact/provisional/unresolved allocation, in-process accountability and TS final approvals.

## Accuracy safeguards

Replacement master workbooks are accepted only after reconciliation checks. The portal validates application rows, approved rows, unique paying applications, receipt amount, duplicate receipt numbers, daily recomputation, cashier recomputation and zone allocation recomputation.

Unresolved mappings stay unresolved. The portal does not infer an RI from cashier identity, amount similarity or property-number prefixes. Tajganj/Lohamandi joint allocation remains joint when the source does not provide a defensible split.

## Updating data

Use **Manage reports** and upload the reconciled master workbook containing these sheets:

`Dashboard`, `Zone and RI`, `Ward Summary`, `Daily Cashiers`, `Applications`, `Payments`

Processing happens locally in the browser. Uploaded workbooks are not uploaded to GitHub. The accepted state is persisted in that browser and can be exported/imported as a JSON backup.

## GitHub Pages

Publish from the repository root of the `main` branch.
