// Entity field definitions for field-level permissions
// Field names MUST match actual Prisma schema column names

export const ENTITY_FIELDS: Record<string, { name: string; label: string; sensitive?: boolean }[]> = {
  company: [
    { name: "name", label: "Company Name" },
    { name: "industry", label: "Industry" },
    { name: "phone", label: "Phone", sensitive: true },
    { name: "email", label: "Email", sensitive: true },
    { name: "website", label: "Website" },
    { name: "address", label: "Address" },
    { name: "city", label: "City" },
    { name: "country", label: "Country" },
    { name: "annualRevenue", label: "Annual Revenue", sensitive: true },
    { name: "employeeCount", label: "Employee Count" },
    { name: "leadScore", label: "Lead Score" },
    { name: "leadTemperature", label: "Lead Temperature" },
    { name: "description", label: "Description" },
    { name: "voen", label: "VOEN", sensitive: true },
  ],
  contact: [
    { name: "fullName", label: "Full Name" },
    { name: "email", label: "Email", sensitive: true },
    { name: "phone", label: "Phone", sensitive: true },
    { name: "position", label: "Position" },
    { name: "department", label: "Department" },
    { name: "source", label: "Source" },
    { name: "tags", label: "Tags" },
    { name: "engagementScore", label: "Engagement Score" },
  ],
  deal: [
    { name: "name", label: "Deal Name" },
    { name: "valueAmount", label: "Value", sensitive: true },
    { name: "currency", label: "Currency" },
    { name: "stage", label: "Stage" },
    { name: "probability", label: "Probability" },
    { name: "expectedClose", label: "Expected Close Date" },
    { name: "notes", label: "Notes" },
    { name: "lostReason", label: "Loss Reason" },
    { name: "confidenceLevel", label: "Confidence Level" },
  ],
  lead: [
    { name: "contactName", label: "Lead Name" },
    { name: "email", label: "Email", sensitive: true },
    { name: "phone", label: "Phone", sensitive: true },
    { name: "companyName", label: "Company" },
    { name: "estimatedValue", label: "Estimated Value", sensitive: true },
    { name: "score", label: "Score" },
    { name: "source", label: "Source" },
    { name: "notes", label: "Notes" },
  ],
  ticket: [
    { name: "subject", label: "Subject" },
    { name: "description", label: "Description" },
    { name: "priority", label: "Priority" },
    { name: "category", label: "Category" },
    { name: "tags", label: "Tags" },
    { name: "satisfactionRating", label: "CSAT Rating" },
  ],
}

export const ENTITY_TYPES = Object.keys(ENTITY_FIELDS)
