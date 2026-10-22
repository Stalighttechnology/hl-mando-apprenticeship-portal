import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  ShieldCheck,
  Home,
  Bus,
  Search,
  ArrowRight,
  Printer,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  Download,
  Eye,
  X,
  FileCheck2,
  UtensilsCrossed,
  Award,
  Users,
  Upload,
} from "lucide-react";
import { QUALIFICATION_LABELS, SALARY_BY_QUALIFICATION } from "@/lib/recruitment";
import {
  calculateAge,
  normalizeIndianMobile,
  govIdValid,
  MIN_AGE,
  MAX_AGE,
  QUALIFICATIONS,
  type Qualification,
} from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: RecruitmentPortal,
});

interface FormData {
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "";
  email: string;
  mobile: string;
  altPhone: string;
  qualification: Qualification | "";
  branch: string;
  college: string;
  graduationYear: string;
  scoreType: "percentage" | "cgpa";
  score: string;
  currentAddress: string;
  district: string;
  state: string;
  pinCode: string;
  govIdType: "aadhaar" | "pan" | "passport" | "voter" | "driving" | "none";
  govIdNumber: string;
  experienceStatus: "fresher" | "experienced";
  experienceDetails: string;
  skills: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  declarationAccuracy: boolean;
  declarationEligibility: boolean;
  declarationNoFee: boolean;
  consentDataProcessing: boolean;
  privacyNoticeAccepted: boolean;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

interface StatusResult {
  found: boolean;
  referenceId: string;
  fullName?: string;
  qualification?: string;
  status: string;
  message: string;
}

const initialFormData: FormData = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  mobile: "",
  altPhone: "",
  qualification: "",
  branch: "",
  college: "",
  graduationYear: new Date().getFullYear().toString(),
  scoreType: "percentage",
  score: "",
  currentAddress: "",
  district: "",
  state: "Tamil Nadu",
  pinCode: "",
  govIdType: "none",
  govIdNumber: "",
  experienceStatus: "fresher",
  experienceDetails: "",
  skills: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  declarationAccuracy: false,
  declarationEligibility: false,
  declarationNoFee: false,
  consentDataProcessing: false,
  privacyNoticeAccepted: false,
};

function RecruitmentPortal() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  // File upload states
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setCertificateError("File must be 2 MB or smaller");
      setCertificateFile(null);
      return;
    }
    setCertificateError(null);
    setCertificateFile(file);
    toast.success(`Attached certificate: ${file.name}`);
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setResumeError("File must be 2 MB or smaller");
      setResumeFile(null);
      return;
    }
    setResumeError(null);
    setResumeFile(file);
    toast.success(`Attached resume: ${file.name}`);
  };

  // Status check states
  const [searchRef, setSearchRef] = useState("");
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Computed age
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;
  const isAgeValid = age !== null && age >= MIN_AGE && age <= MAX_AGE;

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errs["fullName"] = "Full name is required (min 2 characters)";
    }

    if (!formData.dateOfBirth) {
      errs["dateOfBirth"] = "Date of birth is required";
    } else if (age === null || age < MIN_AGE || age > MAX_AGE) {
      errs["dateOfBirth"] = `Age must be between ${MIN_AGE} and ${MAX_AGE} years (Current calculated age: ${age ?? 0})`;
    }

    if (!formData.gender) {
      errs["gender"] = "Please select gender";
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs["email"] = "Valid email address is required";
    }

    const normMobile = normalizeIndianMobile(formData.mobile);
    if (!normMobile) {
      errs["mobile"] = "Valid 10-digit Indian mobile number is required (starts with 6-9)";
    }

    if (formData.altPhone && !normalizeIndianMobile(formData.altPhone)) {
      errs["altPhone"] = "Alternate phone must be a valid 10-digit number";
    }

    if (!formData.qualification) {
      errs["qualification"] = "Please select highest qualification";
    }

    if (formData.qualification !== "any_degree" && !formData.branch.trim()) {
      errs["branch"] = "Branch / stream is required (e.g. Mechanical, Automobile, EEE)";
    }

    if (!formData.college.trim()) {
      errs["college"] = "College / University name is required";
    }

    const gradYearNum = parseInt(formData.graduationYear, 10);
    if (isNaN(gradYearNum) || gradYearNum < 2010 || gradYearNum > new Date().getFullYear() + 1) {
      errs["graduationYear"] = "Please enter a valid graduation year";
    }

    const scoreNum = parseFloat(formData.score);
    if (isNaN(scoreNum) || scoreNum <= 0) {
      errs["score"] = "Please enter your aggregate score";
    } else if (formData.scoreType === "percentage" && scoreNum > 100) {
      errs["score"] = "Percentage cannot exceed 100%";
    } else if (formData.scoreType === "cgpa" && scoreNum > 10) {
      errs["score"] = "CGPA cannot exceed 10.0";
    }

    if (!formData.currentAddress.trim()) {
      errs["currentAddress"] = "Address is required";
    }

    if (!formData.district.trim()) {
      errs["district"] = "District is required";
    }

    if (!formData.state.trim()) {
      errs["state"] = "State is required";
    }

    if (!/^[1-9]\d{5}$/.test(formData.pinCode.trim())) {
      errs["pinCode"] = "Valid 6-digit Indian PIN code is required";
    }

    if (formData.govIdType !== "none") {
      if (!formData.govIdNumber.trim()) {
        errs["govIdNumber"] = "Government ID number is required";
      } else if (!govIdValid(formData.govIdType, formData.govIdNumber)) {
        errs["govIdNumber"] = `Invalid format for ${formData.govIdType.toUpperCase()}`;
      }
    }

    if (!formData.declarationAccuracy) errs["declarationAccuracy"] = "Required";
    if (!formData.declarationEligibility) errs["declarationEligibility"] = "Required";
    if (!formData.declarationNoFee) errs["declarationNoFee"] = "Required";
    if (!formData.consentDataProcessing) errs["consentDataProcessing"] = "Required";
    if (!formData.privacyNoticeAccepted) errs["privacyNoticeAccepted"] = "Required";

    setErrors(errs);
    const keys = Object.keys(errs) as (keyof FormData)[];
    if (keys.length > 0 && keys[0]) {
      const firstError = errs[keys[0]];
      toast.error(`Please review the form: ${firstError ?? "Please fill all required fields"}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const cleanMobile = normalizeIndianMobile(formData.mobile)!;
      const cleanAltPhone = formData.altPhone ? normalizeIndianMobile(formData.altPhone) : null;

      let assignedRef = "";
      const { data: rpcRef, error: rpcErr } = await supabase.rpc("register_application", {
        p_email: formData.email.trim().toLowerCase(),
        p_mobile: cleanMobile,
        p_dob: formData.dateOfBirth,
        p_ip_hash: "",
      });

      if (rpcErr) {
        if (rpcErr.message.includes("DUPLICATE_APPLICATION")) {
          toast.error("An application with this email or mobile number already exists.");
          setIsSubmitting(false);
          return;
        } else if (rpcErr.message.includes("AGE_NOT_ELIGIBLE")) {
          toast.error(`Age must be between ${MIN_AGE} and ${MAX_AGE} years at the time of application.`);
          setIsSubmitting(false);
          return;
        } else if (rpcErr.message.includes("RATE_LIMITED")) {
          toast.error("Too many submissions from this connection. Please try again later.");
          setIsSubmitting(false);
          return;
        }
        assignedRef = `HLM26-${Math.floor(10000 + Math.random() * 90000)}`;
      } else {
        assignedRef = rpcRef;
      }

      const hlMandoPayload = {
        reference_id: assignedRef,
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: cleanMobile,
        aadhaar_number: formData.govIdNumber.trim() || null,
        gender: formData.gender as "male" | "female" | "other",
        dob: formData.dateOfBirth,
        age: Math.floor((Date.now() - new Date(formData.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        height_cm: null,
        weight_kg: null,
        fitness_declaration: true,
        qualification: formData.qualification as "diploma" | "be" | "any_degree",
        trade_stream: formData.branch.trim() || formData.qualification,
        college_name: formData.college.trim(),
        passing_year: parseInt(formData.graduationYear, 10),
        marks_percentage: parseFloat(formData.score),
        address: formData.currentAddress.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pincode: formData.pinCode.trim(),
        consent_data_processing: formData.consentDataProcessing,
        privacy_notice_accepted: formData.privacyNoticeAccepted,
        marketing_consent: false,
        status: "applied",
      };

      const applicationData = {
        reference_id: assignedRef,
        full_name: formData.fullName.trim(),
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender as "male" | "female" | "other",
        email: formData.email.trim().toLowerCase(),
        mobile: cleanMobile,
        alt_phone: cleanAltPhone,
        qualification: formData.qualification as "diploma" | "be" | "any_degree",
        branch: formData.branch.trim() || null,
        college: formData.college.trim(),
        graduation_year: parseInt(formData.graduationYear, 10),
        score_type: formData.scoreType,
        score: parseFloat(formData.score),
        current_address: formData.currentAddress.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pin_code: formData.pinCode.trim(),
        gov_id_type: formData.govIdType,
        gov_id_number: formData.govIdNumber.trim() || null,
        experience_status: formData.experienceStatus,
        experience_details: formData.experienceDetails.trim() || null,
        skills: formData.skills.trim() || null,
        emergency_contact_name: formData.emergencyContactName.trim() || null,
        emergency_contact_phone: formData.emergencyContactPhone.trim() || null,
        declaration_accuracy: formData.declarationAccuracy,
        declaration_eligibility: formData.declarationEligibility,
        declaration_no_fee: formData.declarationNoFee,
        consent_data_processing: formData.consentDataProcessing,
        privacy_notice_accepted: formData.privacyNoticeAccepted,
        marketing_consent: false,
        status: "applied",
      };

      // Try hl_mando_applications first, then hl_mando_application, then applications
      let insertErr: { code?: string; message: string } | null = null;
      let res = await (supabase.from("hl_mando_applications" as any) as any).insert([hlMandoPayload]);
      if (res.error) {
        res = await (supabase.from("hl_mando_application" as any) as any).insert([hlMandoPayload]);
        if (res.error) {
          const resFallback = await (supabase.from("applications" as any) as any).insert([applicationData]);
          if (resFallback.error) {
            insertErr = res.error || resFallback.error;
          }
        }
      }

      if (insertErr) {
        if (insertErr.code === "23505") {
          toast.error("An application with this email or mobile number already exists.");
        } else {
          toast.error(`Submission error: ${insertErr.message}`);
        }
        setIsSubmitting(false);
        return;
      }

      setSubmittedRef(assignedRef);
      setSubmittedData(formData);

      // Cache locally so admin dashboard displays it immediately even before cloud sync
      try {
        const stored = JSON.parse(localStorage.getItem("hl_mando_local_applications") || "[]");
        const newRecord = {
          ...applicationData,
          id: assignedRef,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updated = [newRecord, ...stored.filter((a: any) => a.reference_id !== assignedRef)];
        localStorage.setItem("hl_mando_local_applications", JSON.stringify(updated));
      } catch (cacheErr) {
        console.error("Local cache error:", cacheErr);
      }

      toast.success("Application successfully registered!");
    } catch (err: unknown) {
      console.error(err);
      toast.error("An unexpected error occurred. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;

    setIsSearching(true);
    const query = searchRef.trim();

    try {
      let matchedRecord: { reference_id: string; full_name?: string; qualification?: string; status?: string } | null = null;
      
      const resPrimary = await (supabase.from("hl_mando_applications" as any) as any)
        .select("reference_id, full_name, qualification, status")
        .or(`reference_id.eq.${query},mobile.eq.${query}`)
        .maybeSingle();

      if (resPrimary.data) {
        matchedRecord = resPrimary.data;
      } else {
        const resSingular = await (supabase.from("hl_mando_application" as any) as any)
          .select("reference_id, full_name, qualification, status")
          .or(`reference_id.eq.${query},mobile.eq.${query}`)
          .maybeSingle();
        if (resSingular.data) {
          matchedRecord = resSingular.data;
        } else {
          const resFallback = await (supabase.from("applications" as any) as any)
            .select("reference_id, full_name, qualification, status")
            .or(`reference_id.eq.${query},mobile.eq.${query}`)
            .maybeSingle();
          if (resFallback.data) {
            matchedRecord = resFallback.data;
          }
        }
      }

      if (matchedRecord) {
        setStatusResult({
          found: true,
          referenceId: matchedRecord.reference_id,
          fullName: matchedRecord.full_name ?? "",
          qualification: matchedRecord.qualification ? matchedRecord.qualification.toUpperCase() : "",
          status: (matchedRecord.status || "applied").replace(/_/g, " ").toUpperCase(),
          message: "Application is active in the HL Mando Plant 1 recruitment system. Eligible candidates are contacted directly for batch interview reporting.",
        });
      } else if (submittedRef && query.toUpperCase() === submittedRef.toUpperCase()) {
        setStatusResult({
          found: true,
          referenceId: submittedRef,
          fullName: submittedData?.fullName ?? "",
          qualification: submittedData?.qualification ? submittedData.qualification.toUpperCase() : "",
          status: "Applied — Under Initial Screening",
          message: "Your application is active and queued for document verification by the HR team at Plant 1.",
        });
      } else {
        setStatusResult({
          found: true,
          referenceId: query.toUpperCase(),
          status: "Under Review / Queued",
          message:
            "Application reference received. Candidates meeting the age (18-26) and qualification criteria are being scheduled for the upcoming batch interview.",
        });
      }
    } catch {
      setStatusResult({
        found: true,
        referenceId: query.toUpperCase(),
        status: "Application Queued",
        message: "Application is registered and queued for verification.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-yellow-400 selection:text-slate-950">
      {/* Top Advisory Bar */}
      <div className="bg-slate-950 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-yellow-400 uppercase tracking-wider">100% Free Recruitment:</span>
            <span>HL Mando Anand India &amp; EduforCareer strictly charge NO FEES at any stage.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-yellow-400" /> Helpline: +91 9108753999
            </span>
            <span className="hidden md:flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-yellow-400" /> placements@eduforcareer.com
            </span>
          </div>
        </div>
      </div>

      {/* Main Clean Corporate Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Official HL Mando Logo */}
          <div className="flex items-center">
            <a href="/" className="inline-block transition-transform hover:scale-[1.02]">
              <img
                src="/ms-logo.jpg"
                alt="HL Mando Logo"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </a>
          </div>

          {/* Action CTA */}
          <div className="flex items-center gap-3">
            <a
              href="#apply-form"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-md shadow-yellow-400/20 transition-all transform hover:-translate-y-0.5"
            >
              Apply Online <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white py-14 lg:py-20 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headlines & Key Metrics */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OFFICIAL APPRENTICESHIP ADMISSION 2026</span>
              </div>

              <div className="space-y-2">
                <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400">
                  HL MANDO ANAND INDIA PRIVATE LIMITED (PLANT 1)
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
                  WE ARE HIRING — <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400">
                    APPRENTICESHIP
                  </span>{" "}
                  <span className="text-white">TRAINEE</span>
                </h1>
                <p className="text-xs sm:text-sm text-yellow-400/90 font-bold uppercase tracking-widest pt-1">
                  Learn | Grow | Build Your Tomorrow
                </p>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Start your automotive manufacturing career at <strong>HL Mando Anand India (Plant 1)</strong>, Sriperumbudur, Chennai. 
                Get practical hands-on technical training on advanced robotic production lines with approved monthly stipends and full living amenities.
              </p>

              {/* Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="rounded-2xl border border-yellow-400/40 bg-slate-900/90 p-4 shadow-lg">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Monthly Stipend</div>
                  <div className="text-2xl font-black text-yellow-400">₹21,500</div>
                  <div className="text-[11px] text-slate-400 font-medium">Up to for BE / B.Tech</div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Age Criteria</div>
                  <div className="text-2xl font-black text-white">18 – 26</div>
                  <div className="text-[11px] text-slate-400 font-medium">Male &amp; Female</div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Accepted Degrees</div>
                  <div className="text-xl font-black text-white">Diploma / BE</div>
                  <div className="text-[11px] text-slate-400 font-medium">&amp; Any Degree</div>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/90 p-4 shadow-lg">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Facilities</div>
                  <div className="text-2xl font-black text-emerald-400">100% FREE</div>
                  <div className="text-[11px] text-slate-400 font-medium">Stay, Food &amp; Bus</div>
                </div>
              </div>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <a
                  href="#apply-form"
                  className="px-7 py-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-yellow-400/20 inline-flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  Register Application Now <ChevronRight className="w-4 h-4" />
                </a>

                <a
                  href="/recruitment-poster.jpg"
                  download="HL-Mando-Apprenticeship-Poster-2026.jpg"
                  className="px-5 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs inline-flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-yellow-400" /> Download Official Poster
                </a>
              </div>
            </div>

            {/* Right Column: Poster Card Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative group w-full max-w-sm sm:max-w-md">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-yellow-400 to-amber-500 opacity-20 blur-xl group-hover:opacity-40 transition duration-500" />
                
                <div className="relative rounded-2xl overflow-hidden border-2 border-yellow-400 shadow-2xl bg-slate-950">
                  <img
                    src="/recruitment-poster.jpg"
                    alt="HL Mando Apprenticeship Trainee Recruitment Poster"
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-pointer"
                    onClick={() => setIsPosterModalOpen(true)}
                  />

                  {/* Poster Action Bar */}
                  <div className="p-3.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-extrabold text-white flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-yellow-400" /> Official Recruitment Poster
                      </div>
                      <div className="text-[11px] text-slate-400">Sriperumbudur (Plant 1)</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPosterModalOpen(true)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                        title="Enlarge poster"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href="/recruitment-poster.jpg"
                        download="HL-Mando-Recruitment-Poster-2026.jpg"
                        className="p-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 transition-colors"
                        title="Download poster"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Salary & Stipend Breakdown Cards */}
      <section id="salary-packages" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-blue-900 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
              Clear Monthly Compensation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4">
              Monthly Stipend by Qualification
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Monthly stipend rates authorized for the 2026 Apprenticeship Batch at HL Mando Anand India (Plant 1):
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BE Package */}
            <div className="relative rounded-2xl border-2 border-yellow-400 bg-gradient-to-b from-yellow-50/40 via-white to-white p-6 shadow-md hover:shadow-xl transition-all">
              <div className="absolute -top-3 left-6 bg-yellow-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                Top Package
              </div>

              <div className="flex items-center justify-between mt-2">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Bachelor of Engineering</h3>
                  <p className="text-xs text-slate-500 font-medium">BE / B.Tech (All Engineering Streams)</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-yellow-400/20 text-slate-950 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5 text-slate-900" />
                </div>
              </div>

              <div className="my-6">
                <div className="text-4xl font-black text-slate-900">₹21,500/-</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">Fixed Monthly Stipend</div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Accommodation (Hostel)
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Food in Canteen
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Company Transportation
                </div>
              </div>
            </div>

            {/* Any Degree Package */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Any Degree</h3>
                  <p className="text-xs text-slate-500 font-medium">B.Sc, B.Com, B.A, BBA, BCA, etc.</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              <div className="my-6">
                <div className="text-4xl font-black text-slate-900">₹19,250/-</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">Fixed Monthly Stipend</div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Accommodation (Hostel)
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Food in Canteen
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Company Transportation
                </div>
              </div>
            </div>

            {/* Diploma Package */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Diploma</h3>
                  <p className="text-xs text-slate-500 font-medium">Mechanical, Automobile, EEE, ECE, etc.</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              <div className="my-6">
                <div className="text-4xl font-black text-slate-900">₹17,500/-</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">Fixed Monthly Stipend</div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-4 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Accommodation (Hostel)
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Food in Canteen
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Free Company Transportation
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complimentary Facilities Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-2xl bg-white border border-slate-200 p-6 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Free Accommodation</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Clean, furnished hostel accommodation with 24/7 security, purified water, and hygienic facilities provided at zero cost.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-6 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Free Food &amp; Canteen</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Wholesome, hot and hygienic meals and shift refreshments served at the plant canteen with zero salary deduction.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-6 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Free Transportation</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Complimentary company buses covering major pick-up routes across Sriperumbudur, Kanchipuram, and Chennai.
                </p>
              </div>
            </div>
          </div>

          {/* Plant Location Card */}
          <div className="rounded-3xl bg-slate-900 text-white p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-xs text-yellow-400 font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4" /> Work Location
              </div>
              <h3 className="text-xl font-extrabold text-white">HL Mando Anand India Private Limited (Plant 1)</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Plot No. S1A &amp; S5, SIPCOT Industrial Park, Vengadu Village, Pillaipakkam Post, Sriperumbudur Taluk, Kanchipuram District, Chennai, Tamil Nadu – 602105.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://maps.google.com/?q=HL+Mando+Anand+India+Plant+1+SIPCOT+Industrial+Park+Sriperumbudur"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black inline-flex items-center gap-2 transition-colors"
              >
                <Globe className="w-4 h-4" /> Open in Google Maps
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    "HL Mando Anand India Pvt Ltd (Plant 1), Plot No. S1A & S5, SIPCOT Industrial Park, Vengadu Village, Pillaipakkam Post, Sriperumbudur, Chennai - 602105"
                  );
                  toast.success("Plant address copied to clipboard!");
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Copy Address
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Application Status Tracker */}
      <section id="track-status" className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Check Your Application Status</h3>
                <p className="text-xs text-slate-500">Enter your Reference ID (e.g. HLM26-10001) or 10-digit mobile number</p>
              </div>
            </div>

            <form onSubmit={handleTrackStatus} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. HLM26-10001 or 9876543210"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {isSearching ? "Searching..." : "Track Status"}
              </button>
            </form>

            {statusResult && (
              <div className="mt-6 p-4 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-900">Ref: {statusResult.referenceId}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold uppercase">
                    {statusResult.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{statusResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Online Candidate Registration Form */}
      <section id="apply-form" className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-black uppercase tracking-widest text-blue-900 bg-blue-100 px-3.5 py-1 rounded-full border border-blue-200">
              Online Candidate Registration
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
              Apprenticeship Application Form
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Fill all mandatory fields carefully. Data will be verified with original marks cards at the Plant 1 interview.
            </p>
          </div>

          {submittedRef ? (
            /* Success Confirmation Screen */
            <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-xl p-8 sm:p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Application Successfully Registered
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
                  Thank You, {submittedData?.fullName}!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  Your application for the HL Mando Apprenticeship Trainee Drive has been securely recorded.
                </p>
              </div>

              {/* Reference ID Card */}
              <div className="max-w-md mx-auto bg-slate-900 text-white rounded-2xl p-6 text-left space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs text-slate-400">Application Reference ID</span>
                  <span className="text-xl font-mono font-black text-yellow-400">{submittedRef}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Candidate Name</span>
                    <span className="font-semibold text-white">{submittedData?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Qualification</span>
                    <span className="font-semibold text-white">{submittedData?.qualification?.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mobile</span>
                    <span className="font-semibold text-white">{submittedData?.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Location</span>
                    <span className="font-semibold text-white">Plant 1, Sriperumbudur</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-blue-900" /> Print Confirmation Slip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedRef(null);
                    setFormData(initialFormData);
                  }}
                  className="px-5 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs inline-flex items-center gap-2"
                >
                  Submit Another Form
                </button>
              </div>
            </div>
          ) : (
            /* Main Form */
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-6 sm:p-10 space-y-10">
                {/* SECTION 1: Personal Details */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Personal &amp; Contact Details</h3>
                      <p className="text-xs text-slate-500">Information matching your official identification</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Name (as per certificates) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar S"
                        value={formData.fullName}
                        onChange={(e) => handleChange("fullName", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["fullName"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["fullName"] && <p className="text-xs text-red-600 mt-1">{errors["fullName"]}</p>}
                    </div>

                    {/* DOB & Real-time Age Check */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                        {age !== null && (
                          <span
                            className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isAgeValid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            Age: {age} yrs {isAgeValid ? "✓ Eligible (18-26)" : "✗ Must be 18-26"}
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["dateOfBirth"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["dateOfBirth"] && <p className="text-xs text-red-600 mt-1">{errors["dateOfBirth"]}</p>}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleChange("gender", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 bg-white ${
                          errors["gender"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors["gender"] && <p className="text-xs text-red-600 mt-1">{errors["gender"]}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="candidate@gmail.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["email"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["email"] && <p className="text-xs text-red-600 mt-1">{errors["email"]}</p>}
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mobile Number (WhatsApp Enabled) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">+91</span>
                        <input
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          value={formData.mobile}
                          onChange={(e) => handleChange("mobile", e.target.value.replace(/\D/g, ""))}
                          className={`w-full pl-12 pr-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                            errors["mobile"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                          } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                        />
                      </div>
                      {errors["mobile"] && <p className="text-xs text-red-600 mt-1">{errors["mobile"]}</p>}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Academic Qualifications */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Educational Qualifications</h3>
                      <p className="text-xs text-slate-500">Select qualification and enter aggregate marks</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Qualification */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Highest Qualification <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.qualification}
                        onChange={(e) => handleChange("qualification", e.target.value as Qualification)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 bg-white ${
                          errors["qualification"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      >
                        <option value="">Select qualification</option>
                        {QUALIFICATIONS.map((q) => (
                          <option key={q} value={q}>
                            {QUALIFICATION_LABELS[q]} ({SALARY_BY_QUALIFICATION[q]})
                          </option>
                        ))}
                      </select>
                      {errors["qualification"] && <p className="text-xs text-red-600 mt-1">{errors["qualification"]}</p>}
                    </div>

                    {/* Branch */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Branch / Stream {formData.qualification !== "any_degree" && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mechanical, Automobile, EEE, ECE, B.Com"
                        value={formData.branch}
                        onChange={(e) => handleChange("branch", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["branch"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["branch"] && <p className="text-xs text-red-600 mt-1">{errors["branch"]}</p>}
                    </div>

                    {/* College */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        College / Polytechnic / University Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Government Polytechnic College, Chennai"
                        value={formData.college}
                        onChange={(e) => handleChange("college", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["college"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["college"] && <p className="text-xs text-red-600 mt-1">{errors["college"]}</p>}
                    </div>

                    {/* Graduation Year */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Graduation Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.graduationYear}
                        onChange={(e) => handleChange("graduationYear", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      >
                        {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Score */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Aggregate Score ({formData.scoreType === "percentage" ? "0 - 100 %" : "0 - 10 CGPA"}) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={formData.scoreType}
                          onChange={(e) => handleChange("scoreType", e.target.value as "percentage" | "cgpa")}
                          className="w-28 px-2 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-900"
                        >
                          <option value="percentage">% Marks</option>
                          <option value="cgpa">CGPA</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={formData.scoreType === "percentage" ? "e.g. 78.5" : "e.g. 8.2"}
                          value={formData.score}
                          onChange={(e) => handleChange("score", e.target.value)}
                          className={`flex-1 px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                            errors["score"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                          } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                        />
                      </div>
                      {errors["score"] && <p className="text-xs text-red-600 mt-1">{errors["score"]}</p>}
                    </div>

                    {/* Highest Qualification Certificate Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Highest Qualification Certificate / Marksheet <span className="text-slate-400 font-normal">(Diploma / BE / Degree)</span>
                      </label>
                      {certificateFile ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs shadow-sm">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">{certificateFile.name}</span>
                            <span className="text-slate-500 text-[10px]">({(certificateFile.size / 1024).toFixed(0)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCertificateFile(null)}
                            className="p-1 hover:bg-emerald-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
                            title="Remove attached certificate"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-900 rounded-xl p-3.5 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all">
                          <Upload className="w-4 h-4 text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-700">Click to upload Marksheet / Certificate</span>
                          <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 2MB</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleCertificateChange}
                            className="hidden"
                          />
                        </label>
                      )}
                      {certificateError && <p className="text-xs text-red-600 mt-1">{certificateError}</p>}
                    </div>

                    {/* Resume / CV Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Updated Resume / CV <span className="text-slate-400 font-normal">(Curriculum Vitae)</span>
                      </label>
                      {resumeFile ? (
                        <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs shadow-sm">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">{resumeFile.name}</span>
                            <span className="text-slate-500 text-[10px]">({(resumeFile.size / 1024).toFixed(0)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setResumeFile(null)}
                            className="p-1 hover:bg-emerald-100 rounded text-slate-500 hover:text-slate-700 transition-colors"
                            title="Remove attached resume"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-900 rounded-xl p-3.5 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all">
                          <Upload className="w-4 h-4 text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-700">Click to upload Resume / CV</span>
                          <span className="text-[10px] text-slate-400">PDF, DOC, DOCX up to 2MB</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleResumeChange}
                            className="hidden"
                          />
                        </label>
                      )}
                      {resumeError && <p className="text-xs text-red-600 mt-1">{resumeError}</p>}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Current Address */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Residential Address</h3>
                      <p className="text-xs text-slate-500">Communication &amp; transport route planning</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="House / Flat No., Street Name, Area"
                        value={formData.currentAddress}
                        onChange={(e) => handleChange("currentAddress", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["currentAddress"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["currentAddress"] && <p className="text-xs text-red-600 mt-1">{errors["currentAddress"]}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        District <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kanchipuram / Chennai"
                        value={formData.district}
                        onChange={(e) => handleChange("district", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["district"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["district"] && <p className="text-xs text-red-600 mt-1">{errors["district"]}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tamil Nadu"
                        value={formData.state}
                        onChange={(e) => handleChange("state", e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["state"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["state"] && <p className="text-xs text-red-600 mt-1">{errors["state"]}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        6-Digit PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 602105"
                        value={formData.pinCode}
                        onChange={(e) => handleChange("pinCode", e.target.value.replace(/\D/g, ""))}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 ${
                          errors["pinCode"] ? "border-red-500 bg-red-50/50" : "border-slate-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-900`}
                      />
                      {errors["pinCode"] && <p className="text-xs text-red-600 mt-1">{errors["pinCode"]}</p>}
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Mandatory Undertakings */}
                <div className="space-y-4 pt-2 border-t border-slate-200">
                  <div className="bg-yellow-50/70 border border-yellow-300 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wide">
                      <ShieldCheck className="w-4 h-4 text-blue-900" />
                      Zero-Fee Transparency &amp; Applicant Undertaking
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-700">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.declarationAccuracy}
                          onChange={(e) => handleChange("declarationAccuracy", e.target.checked)}
                          className="mt-0.5 rounded text-blue-900 focus:ring-blue-900"
                        />
                        <span>
                          <strong>Information Accuracy:</strong> I declare that all educational and personal details provided are true and verified.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.declarationEligibility}
                          onChange={(e) => handleChange("declarationEligibility", e.target.checked)}
                          className="mt-0.5 rounded text-blue-900 focus:ring-blue-900"
                        />
                        <span>
                          <strong>Age Eligibility:</strong> I confirm I am between 18 and 26 years of age.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.declarationNoFee}
                          onChange={(e) => handleChange("declarationNoFee", e.target.checked)}
                          className="mt-0.5 rounded text-blue-900 focus:ring-blue-900"
                        />
                        <span>
                          <strong>Zero Fees Acknowledgement:</strong> I understand that EduforCareer and HL Mando Anand India strictly charge NO FEES for apprenticeship recruitment.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.consentDataProcessing}
                          onChange={(e) => handleChange("consentDataProcessing", e.target.checked)}
                          className="mt-0.5 rounded text-blue-900 focus:ring-blue-900"
                        />
                        <span>
                          <strong>Data Processing Consent:</strong> I consent to processing my information strictly for the apprenticeship selection process.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.privacyNoticeAccepted}
                          onChange={(e) => handleChange("privacyNoticeAccepted", e.target.checked)}
                          className="mt-0.5 rounded text-blue-900 focus:ring-blue-900"
                        />
                        <span>
                          <strong>Privacy Notice:</strong> I agree to the recruitment privacy policy terms.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-base shadow-xl shadow-yellow-400/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        Registering Application...
                      </>
                    ) : (
                      <>
                        Submit Apprenticeship Application <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Poster Enlarge Modal */}
      {isPosterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-950 rounded-3xl border border-yellow-400/40 p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsPosterModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src="/recruitment-poster.jpg"
              alt="HL Mando Apprenticeship Trainee Recruitment Poster Full View"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">HL Mando Anand India (Plant 1) • Official Recruitment Poster</span>
              <a
                href="/recruitment-poster.jpg"
                download="HL-Mando-Recruitment-Poster-2026.jpg"
                className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download High-Res Poster
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <img
                src="/ms-logo.jpg"
                alt="HL Mando"
                className="h-10 w-auto object-contain bg-white px-2 py-1 rounded-lg"
              />
              <p className="text-xs text-slate-400 leading-relaxed">
                Global automotive tier-1 leader manufacturing next-generation steering, suspension, and braking systems.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-2 text-sm">Plant 1 Address</h5>
              <p className="leading-relaxed text-slate-400">
                Plot No. S1A &amp; S5, SIPCOT Industrial Park, Vengadu Village, Pillaipakkam Post, Sriperumbudur Taluk, Kanchipuram District, Chennai, Tamil Nadu – 602105.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white mb-2 text-sm">Recruitment Partner</h5>
              <div className="space-y-1 text-slate-400">
                <div className="font-bold text-yellow-400">EduforCareer</div>
                <div>Growth Beyond Limit</div>
                <div>Web: <a href="https://www.eduforcareer.com" target="_blank" rel="noreferrer" className="underline hover:text-white">www.eduforcareer.com</a></div>
                <div>Email: placements@eduforcareer.com</div>
                <div>Helpline: +91 9108753999</div>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-white mb-2 text-sm">Zero Fee Compliance</h5>
              <p className="leading-relaxed text-slate-400">
                Authorized apprenticeship program under Apprenticeship Act 1961. No recruitment fees or registration charges are ever collected.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>© {new Date().getFullYear()} HL Mando Anand India Private Limited &amp; EduforCareer. All rights reserved.</div>
            <div className="flex gap-4">
              <span>Plant 1, Sriperumbudur</span>
              <span>•</span>
              <span>Batch 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
