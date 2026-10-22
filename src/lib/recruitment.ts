import type { Qualification } from "./validation";

/** Recruitment details exactly as published on the HL Mando / EduforCareer poster. */
export const POSTER = {
  company: "HL Mando Anand India Private Limited",
  plant: "Plant 1",
  partner: "EduforCareer",
  partnerTagline: "Growth Beyond Limit",
  headline: "We are hiring — Apprenticeship Trainee",
  tagline: "Learn | Grow | Build Your Tomorrow",
  qualifications: "Diploma, BE, Any Degree",
  gender: "Male & Female",
  ageLimit: "18 – 26 Years",
  salary: [
    { label: "Diploma", value: "₹17,500/-" },
    { label: "BE", value: "₹21,500/-" },
    { label: "Any Degree", value: "₹19,250/-" },
  ] as { label: string; value: string }[],
  facilities: [
    { title: "Free Accommodation", icon: "home" },
    { title: "Free Food", icon: "food" },
    { title: "Free Transportation", icon: "bus" },
  ],
  jobLocationLines: [
    "HL Mando Anand India Private Limited (Plant 1),",
    "Plot No. S1A & S5, SIPCOD Industrial Park,",
    "Vengadu Village, Pillaiapakkam Post,",
    "Sriperumbudur Taluk, Kanchipuram District,",
    "Chennai, Tamil Nadu – 602105.",
  ],
  contactPhone: "+91 9108753999",
  website: "www.eduforcareer.com",
  websiteUrl: "https://www.eduforcareer.com/",
  email: "placements@eduforcareer.com",
};

export const QUALIFICATION_LABELS: Record<Qualification, string> = {
  diploma: "Diploma",
  be: "BE",
  any_degree: "Any Degree",
};

export const SALARY_BY_QUALIFICATION: Record<Qualification, string> = {
  diploma: "₹17,500/-",
  be: "₹21,500/-",
  any_degree: "₹19,250/-",
};

export const DOC_KIND_LABELS: Record<string, string> = {
  resume: "Resume / CV",
  marks_card: "Marks card / semester certificate",
  certificate: "Certificate (course, internship, etc.)",
  photo: "Passport photograph",
  other: "Other supporting document",
};

export type ApplicationStatus =
  | "applied"
  | "under_review"
  | "shortlisted"
  | "interview_scheduled"
  | "selected"
  | "rejected"
  | "joined";

export const STATUS_FLOW: ApplicationStatus[] = [
  "applied",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "selected",
  "joined",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  selected: "Selected",
  rejected: "Rejected",
  joined: "Joined",
};

/** Allowed forward transitions for the status workflow. */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ["under_review", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["interview_scheduled", "selected", "rejected"],
  interview_scheduled: ["selected", "rejected"],
  selected: ["joined", "rejected"],
  rejected: ["under_review"],
  joined: [],
};

export const REJECTION_REASONS = [
  "Does not meet age criteria",
  "Qualification not relevant",
  "Below academic threshold",
  "Not reachable / no response",
  "Did not attend interview",
  "Interview performance",
  "Duplicate application",
  "Other",
];
