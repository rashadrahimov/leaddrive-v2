# Translation Gaps — To Fix

## Missing Nav Keys (az.json)
- `reportBuilder` — "Hesabat qurucusu"
- `landingPages` — "Landing səhifələr"
- `fieldPermissions` — "Sahə icazələri"
- `voip` — "VoIP"
- `financeNotifications` — "Maliyyə bildirişləri"

## Report Builder Page (src/app/(dashboard)/reports/builder/page.tsx)
Entire page is in English:
- "Report Builder", "Create custom reports with filters, grouping, and visualizations"
- "Export", "Save Report"
- "Total Records", "Columns", "Filters"
- "Preview", "Table", "Deals"
- "Filters", "+ Add", "No filters applied"
- "Group By", "None"
- Column headers: "Deal Name", "Value", "Stage", "Probability", "Company Name", "Expected Close", "Created", "Assigned To"

## Condition Builder — Already Fixed
- segment-condition-builder.tsx — translated in Phase 3

## Priority
- Nav keys: quick fix (5 min)
- Report Builder: medium (~30 min, ~40 strings)
