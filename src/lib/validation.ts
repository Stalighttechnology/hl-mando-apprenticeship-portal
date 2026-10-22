import { z } from "zod";

export const QUALIFICATIONS = ["diploma", "be", "any_degree"] as const;
export type Qualification = (typeof QUALIFICATIONS)[number];

export const DOC_KINDS = ["resume", "marks_card", "certificate", "photo", "other"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const ALLOWED_FILE_EXT = ["pdf", "doc", "docx", "jpg", "jpeg", "png"] as const;
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export const MIN_AGE = 18;
export const MAX_AGE = 26;

/** Normalize an Indian mobile number to 10 digits, or return null when invalid. */
export function normalizeIndianMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let n = digits;
  if (n.length === 12 && n.startsWith("91")) n = n.slice(2);
  else if (n.length === 11 && n.startsWith("0")) n = n.slice(1);
  if (n.length === 10 && /^[6-9]/.test(n)) return n;
  return null;
}

/** Age in whole years at a given reference date. */
export function calculateAge(dobIso: string, at: Date = new Date()): number {
  const dob = new Date(dobIso + "T00:00:00Z");
  if (Number.isNaN(dob.getTime())) return -1;
  const ref = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    ref.getUTCMonth() < dob.getUTCMonth() ||
    (ref.getUTCMonth() === dob.getUTCMonth() && ref.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const isValidIsoDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + "T00:00:00Z").getTime());

const AADHAAR_RE = /^\d{4}\s?\d{4}\s?\d{4}$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

export function govIdValid(type: string, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  switch (type) {
    case "aadhaar":
      return AADHAAR_RE.test(v);
    case "pan":
      return PAN_RE.test(v.toUpperCase());
    default:
      return v.length >= 4 && v.length <= 24;
  }
}

export const applicationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is required")
      .max(120, "Name is too long")
      .regex(/^[A-Za-z][A-Za-z .'-]*$/, "Name may contain letters, spaces and . ' - only"),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .refine(isValidIsoDate, "Enter a valid date")
      .refine(
        (d) => {
          if (!isValidIsoDate(d)) return false;
          const age = calculateAge(d);
          return age >= MIN_AGE && age <= MAX_AGE;
        },
        `Applicants must be ${MIN_AGE}\u2013${MAX_AGE} years old`,
      ),
    gender: z.enum(["male", "female", "other"], { message: "Select gender" }),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
    mobile: z
      .string()
      .trim()
      .min(1, "Mobile number is required")
      .refine((v) => normalizeIndianMobile(v) !== null, "Enter a valid Indian mobile number"),
    altPhone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || normalizeIndianMobile(v) !== null, "Enter a valid Indian mobile number"),
    qualification: z.enum(QUALIFICATIONS, { message: "Select your highest qualification" }),
    branch: z.string().trim().max(120).optional(),
    college: z.string().trim().min(2, "College / university is required").max(200),
    graduationYear: z.coerce
      .number({ message: "Enter graduation year" })
      .int("Enter a valid year")
      .gte(2005, "Year looks too early")
      .lte(new Date().getUTCFullYear() + 1, "Year cannot be in the future"),
    scoreType: z.enum(["percentage", "cgpa"], { message: "Choose percentage or CGPA" }),
    score: z.coerce
      .number({ message: "Enter your score" })
      .min(0, "Score cannot be negative")
      .max(100, "Percentage must be 0\u2013100"),
    currentAddress: z
      .string()
      .trim()
      .min(5, "Address is required")
      .max(400, "Address is too long"),
    district: z.string().trim().min(2, "District is required").max(80),
    state: z.string().trim().min(2, "State is required").max(80),
    pinCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
    govIdType: z.enum(["aadhaar", "pan", "passport", "voter", "driving", "none"]),
    govIdNumber: z.string().trim().max(24).optional(),
    experienceStatus: z.enum(["fresher", "experienced"]),
    experienceDetails: z.string().trim().max(500).optional(),
    skills: z.string().trim().max(500).optional(),
    emergencyContactName: z.string().trim().max(120).optional(),
    emergencyContactPhone: z.string().trim().optional(),
    declarationAccuracy: z.boolean().refine(Boolean, "This declaration is required"),
    declarationEligibility: z.boolean().refine(Boolean, "This declaration is required"),
    declarationNoFee: z.boolean().refine(Boolean, "This acknowledgement is required"),
    consentDataProcessing: z.boolean().optional().default(true),
    privacyNoticeAccepted: z.boolean().optional().default(true),
    marketingConsent: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    // CGPA range differs from percentage range
    if (data.scoreType === "cgpa" && (data.score < 0 || data.score > 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["score"],
        message: "CGPA must be between 0 and 10",
      });
    }
    // Branch required for diploma / BE
    if (data.qualification !== "any_degree" && !(data.branch ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branch"],
        message: "Branch / stream is required",
      });
    }
    // Government ID details when an ID type is chosen
    if (data.govIdType !== "none") {
      const value = (data.govIdNumber ?? "").trim();
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["govIdNumber"],
          message: "ID number is required",
        });
      } else if (!govIdValid(data.govIdType, value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["govIdNumber"],
          message: "Enter a valid ID number",
        });
      }
    }
    // Experience details when experienced
    if (data.experienceStatus === "experienced" && !(data.experienceDetails ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["experienceDetails"],
        message: "Briefly describe your experience",
      });
    }
    // Emergency phone validity when a name is given
    if ((data.emergencyContactName ?? "").trim() && (data.emergencyContactPhone ?? "").trim()) {
      if (normalizeIndianMobile(data.emergencyContactPhone!) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emergencyContactPhone"],
          message: "Enter a valid Indian mobile number",
        });
      }
    }
  });

export type ApplicationFormValues = z.input<typeof applicationSchema>;
export type ApplicationData = z.output<typeof applicationSchema>;

export function govIdNumberValid(schemaData: ApplicationData): string | null {
  if (schemaData.govIdType === "none") return null;
  return (schemaData.govIdNumber ?? "").trim() || null;
}

/* ------------------------------------------------------------------ */
/* File validation (magic bytes / MIME)                                */
/* ------------------------------------------------------------------ */

const MAGIC: Record<string, string[]> = {
  pdf: ["25504446"], // %PDF
  doc: ["d0cf11e0", "504b0304"], // OLE2 (legacy .doc) or ZIP (modern .doc container)
  docx: ["504b0304"], // ZIP container
  jpg: ["ffd8ff"],
  jpeg: ["ffd8ff"],
  png: ["89504e470d0a1a0a"],
};

export const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export function fileExtension(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
}

export async function fileMagicHex(file: File, bytes = 8): Promise<string> {
  const buf = await file.slice(0, bytes).arrayBuffer();
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Validate a candidate upload; returns an error message or null when valid. */
export async function validateUploadFile(file: File): Promise<string | null> {
  const ext = fileExtension(file.name);
  if (!ALLOWED_FILE_EXT.includes(ext as (typeof ALLOWED_FILE_EXT)[number])) {
    return "Only PDF, DOC, DOCX, JPG or PNG files are allowed";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Each file must be 2 MB or smaller";
  }
  if (file.size === 0) {
    return "File is empty";
  }
  const magic = await fileMagicHex(file);
  const allowed = MAGIC[ext] ?? [];
  if (!allowed.some((prefix) => magic.startsWith(prefix))) {
    return "File content does not match its type. Please upload a genuine PDF, DOC, DOCX, JPG or PNG file";
  }
  return null;
}
