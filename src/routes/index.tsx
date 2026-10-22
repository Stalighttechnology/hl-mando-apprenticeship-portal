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
  Wallet,
  Calendar,
  FileText,
  Gift,
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
  consentDataProcessing: true,
  privacyNoticeAccepted: true,
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

  const handleQualificationChange = (qual: Qualification) => {
    setFormData((prev) => ({ ...prev, qualification: qual }));
  };

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


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-yellow-400 selection:text-slate-950">


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

      {/* Hero Section — Modern Corporate Career Hero with Handshake Meeting Background */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        {/* Background Image Container — Modern Corporate Handshake Banner */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src="/Modern%20Corporate%20Handshake%20Banner.png"
            alt="HL Mando Apprenticeship Career Banner"
            className="w-full h-full object-cover object-center lg:object-[center_top]"
          />
          {/* Subtle directional fade over the left text area to ensure high contrast text readability while showcasing the banner */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent lg:from-white/80 lg:via-white/40 lg:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
        </div>

        {/* Hero Top Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-10 sm:pt-16 sm:pb-14">
          <div className="max-w-2xl lg:max-w-xl space-y-5">
            {/* Company & Core Typography */}
            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500">
                HL MANDO ANAND INDIA PRIVATE LIMITED (PLANT 1)
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-slate-950">
                WE ARE HIRING — <br />
                <span className="text-blue-950">APPRENTICESHIP</span>{" "}
                <span className="text-amber-500">TRAINEE</span>
              </h1>
              <div className="pt-1">
                <div className="inline-flex items-center gap-3 text-xs sm:text-sm text-slate-800 font-black uppercase tracking-widest bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span>Learn</span>
                  <span className="text-amber-500 font-black">•</span>
                  <span>Grow</span>
                  <span className="text-amber-500 font-black">•</span>
                  <span>Build Your Tomorrow</span>
                </div>
              </div>
            </div>

            {/* Lead Paragraph */}
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal bg-white/85 backdrop-blur-xs p-3.5 rounded-2xl border border-white/80 shadow-2xs">
              Start your automotive manufacturing career at <strong className="text-slate-900 font-bold">HL Mando Anand India (Plant 1)</strong>, Sriperumbudur, Chennai. 
              Get practical hands-on technical training on advanced robotic production lines with approved monthly stipends and full living amenities.
            </p>

            {/* Action Buttons — Pill with White Circular Arrow matching reference image */}
            <div className="pt-2">
              <a
                href="#apply-form"
                className="inline-flex items-center gap-3.5 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 hover:from-blue-900 hover:to-blue-700 text-white font-black text-sm sm:text-base px-7 sm:px-8 py-3.5 sm:py-4 rounded-full shadow-xl shadow-blue-950/30 border border-blue-500/40 hover:scale-[1.02] transition-all group"
              >
                <span>Register Application Now</span>
                <span className="text-yellow-400 font-bold">&gt;</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-blue-950 flex items-center justify-center font-black shadow-xs group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* 4 Feature Metric Cards — Bloomfield Innovations Sharp-Edge & Animated Style */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-10 sm:pb-14 -mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Monthly Stipend (Amber/Gold Theme) */}
            <div className="group relative bg-gradient-to-b from-[#FFFDF0] via-[#FFF9DC] to-[#FDF3B8] rounded-lg p-4 sm:p-5 border border-amber-300/80 shadow-md shadow-amber-500/10 hover:shadow-2xl hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between min-h-[185px] overflow-hidden before:absolute before:top-0 before:left-0 before:h-1 before:w-full before:bg-amber-500">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Wallet className="w-4 h-4 text-slate-900" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    MONTHLY STIPEND
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                  FIXED
                </span>
              </div>

              {/* Big Number & Subtext (Centered) */}
              <div className="my-auto py-2.5 text-center">
                <div className="text-2xl sm:text-[28px] font-black text-slate-950 tracking-tight leading-none group-hover:scale-105 transition-transform duration-300">
                  ₹21,500
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-1.5">
                  Up to for BE / B.Tech
                </p>
              </div>

              {/* Bottom Row */}
              <div className="pt-2.5 border-t border-amber-200/70 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Per Month</span>
                </div>
                <div className="w-7 h-7 rounded-md bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs group-hover:translate-x-1.5 group-hover:bg-amber-300 transition-all duration-300">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Card 2: Age Criteria (Cool Sky Blue Theme) */}
            <div className="group relative bg-gradient-to-b from-white via-white to-[#EAF2FD] rounded-lg p-4 sm:p-5 border border-blue-200/80 shadow-md shadow-blue-500/10 hover:shadow-2xl hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between min-h-[185px] overflow-hidden before:absolute before:top-0 before:left-0 before:h-1 before:w-full before:bg-blue-600">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    AGE CRITERIA
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  ELIGIBILITY
                </span>
              </div>

              {/* Big Number & Subtext (Centered) */}
              <div className="my-auto py-2.5 text-center">
                <div className="text-2xl sm:text-[28px] font-black text-slate-950 tracking-tight leading-none group-hover:scale-105 transition-transform duration-300">
                  18 – 26 <span className="text-xs sm:text-sm font-semibold text-slate-600 ml-0.5">Years</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-1.5">
                  Male &amp; Female
                </p>
              </div>

              {/* Bottom Row */}
              <div className="pt-2.5 border-t border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Male &amp; Female</span>
                </div>
                <span className="text-[11px] font-black text-blue-600 group-hover:translate-x-0.5 transition-transform">Both Eligible</span>
              </div>
            </div>

            {/* Card 3: Accepted Degrees (Purple/Lavender Theme) */}
            <div className="group relative bg-gradient-to-b from-white via-white to-[#F3EEFE] rounded-lg p-4 sm:p-5 border border-purple-200/80 shadow-md shadow-purple-500/10 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between min-h-[185px] overflow-hidden before:absolute before:top-0 before:left-0 before:h-1 before:w-full before:bg-purple-600">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    ACCEPTED DEGREES
                  </span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-purple-200/80 text-purple-700 border border-purple-200">
                  STREAMS
                </span>
              </div>

              {/* Big Number & Subtext (Centered) */}
              <div className="my-auto py-2.5 text-center">
                <div className="text-xl sm:text-[24px] font-black text-slate-950 tracking-tight leading-none group-hover:scale-105 transition-transform duration-300">
                  Diploma / BE
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-1.5">
                  &amp; Any Degree
                </p>
              </div>

              {/* Bottom Row */}
              <div className="pt-2.5 border-t border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 truncate mr-1">
                  <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="truncate">All Branches Acceptable</span>
                </div>
                <div className="w-7 h-7 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold group-hover:translate-x-1.5 group-hover:bg-purple-200 transition-all duration-300 shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Card 4: Facilities (Mint/Emerald Theme) */}
            <div className="group relative bg-gradient-to-b from-[#F2FBF7] via-[#E9F8F1] to-[#DDF5EB] rounded-lg p-4 sm:p-5 border border-emerald-200/80 shadow-md shadow-emerald-500/10 hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between min-h-[185px] overflow-hidden before:absolute before:top-0 before:left-0 before:h-1 before:w-full before:bg-emerald-600">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <Gift className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    FACILITIES
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  COMPANY PAID
                </span>
              </div>

              {/* Big Number & Subtext (Centered) */}
              <div className="my-auto py-2.5 text-center">
                <div className="text-2xl sm:text-[28px] font-black text-[#006644] tracking-tight leading-none group-hover:scale-105 transition-transform duration-300">
                  100% FREE
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-1.5">
                  Stay, Food &amp; Bus
                </p>
              </div>

              {/* Bottom Row — Accommodation, Food, Transportation */}
              <div className="pt-2 border-t border-emerald-200/70 grid grid-cols-3 gap-1 items-center text-center">
                <div className="flex flex-col items-center group-hover:-translate-y-0.5 transition-transform duration-200">
                  <Home className="w-3.5 h-3.5 text-emerald-700 mb-0.5 shrink-0" />
                  <span className="text-[9px] font-bold text-slate-700 leading-tight">Accommodation</span>
                </div>
                <div className="flex flex-col items-center border-x border-emerald-200/70 px-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-700 mb-0.5 shrink-0" />
                  <span className="text-[9px] font-bold text-slate-700 leading-tight">Food</span>
                </div>
                <div className="flex flex-col items-center group-hover:-translate-y-0.5 transition-transform duration-200">
                  <Bus className="w-3.5 h-3.5 text-emerald-700 mb-0.5 shrink-0" />
                  <span className="text-[9px] font-bold text-slate-700 leading-tight">Transportation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Section: Plant 1 Highlights — Technical Operations & Welfare Overview */}
      <section className="py-16 sm:py-20 bg-slate-50/60 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-950 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-blue-700" />
                Plant 1 Highlights • Drive 2026
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                Automotive Systems Manufacturing Training
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium mt-1.5">
                Sriperumbudur Industrial Corridor, Chennai
              </p>
            </div>

            {/* Plant 1 Location Badge */}
            <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs self-start lg:self-auto">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0 border border-blue-100">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Plant Location</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>SIPCOT Industrial Park, Sriperumbudur</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-blue-950 text-white px-2 py-0.5 rounded-md">
                    Plant 1
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Feature Cards Grid — Bloomfield Innovations Sharp-Edge & Animated Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Automated Robotic Lines */}
            <div className="group bg-white rounded-lg p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-0 group-hover:before:w-full before:h-1 before:bg-blue-600 before:transition-all before:duration-300 before:ease-out">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-md bg-blue-50 text-blue-950 flex items-center justify-center font-bold border border-blue-100 group-hover:scale-110 group-hover:rotate-2 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs font-black flex items-center justify-center group-hover:bg-blue-950 group-hover:text-white group-hover:border-blue-950 transition-colors">
                    01
                  </div>
                </div>
                <h3 className="font-black text-slate-950 text-lg tracking-tight group-hover:text-blue-900 transition-colors">
                  Automated Robotic Lines
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-2.5 font-normal">
                  Hands-on training in Steering, Brake Calipers, Suspension, and precision assembly lines.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Precision Robotics
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>

            {/* 2. Complete Trainee Welfare */}
            <div className="group bg-white rounded-lg p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-0 group-hover:before:w-full before:h-1 before:bg-emerald-600 before:transition-all before:duration-300 before:ease-out">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-md bg-emerald-50 text-emerald-900 flex items-center justify-center font-bold border border-emerald-100 group-hover:scale-110 group-hover:rotate-2 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs font-black flex items-center justify-center group-hover:bg-emerald-950 group-hover:text-white group-hover:border-emerald-950 transition-colors">
                    02
                  </div>
                </div>
                <h3 className="font-black text-slate-950 text-lg tracking-tight group-hover:text-emerald-900 transition-colors">
                  Complete Trainee Welfare
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-2.5 font-normal">
                  Free company-managed hostel accommodation, nutritious food, and plant transportation.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  100% Free Amenities
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>

            {/* 3. Govt. Recognized Certification */}
            <div className="group bg-white rounded-lg p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-0 group-hover:before:w-full before:h-1 before:bg-amber-500 before:transition-all before:duration-300 before:ease-out">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-md bg-amber-50 text-amber-900 flex items-center justify-center font-bold border border-amber-100 group-hover:scale-110 group-hover:rotate-2 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs font-black flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-500 transition-colors">
                    03
                  </div>
                </div>
                <h3 className="font-black text-slate-950 text-lg tracking-tight group-hover:text-amber-900 transition-colors">
                  Govt. Recognized Certification
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-2.5 font-normal">
                  National Apprenticeship Training Scheme (NATS) certification upon successful completion.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  NATS Certified
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>

            {/* 4. Direct Plant Onboarding */}
            <div className="group bg-white rounded-lg p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-indigo-400 transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-0 group-hover:before:w-full before:h-1 before:bg-indigo-600 before:transition-all before:duration-300 before:ease-out">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-md bg-indigo-50 text-indigo-950 flex items-center justify-center font-bold border border-indigo-100 group-hover:scale-110 group-hover:rotate-2 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs font-black flex items-center justify-center group-hover:bg-indigo-950 group-hover:text-white group-hover:border-indigo-950 transition-colors">
                    04
                  </div>
                </div>
                <h3 className="font-black text-slate-950 text-lg tracking-tight group-hover:text-indigo-900 transition-colors">
                  Direct Plant Onboarding
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-2.5 font-normal">
                  100% Free registration with zero placement charges at any stage of recruitment.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  Zero Fees / Direct
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Salary & Stipend Breakdown Cards */}
      <section id="salary-packages" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-blue-900 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200 shadow-2xs">
              Clear Monthly Compensation
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 mt-4 tracking-tight">
              Monthly Stipend by Qualification
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
              Monthly stipend rates authorized for the 2026 Apprenticeship Batch at HL Mando Anand India (Plant 1):
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* BE Package — Top Package */}
            <div className="relative rounded-lg border-2 border-yellow-400 bg-gradient-to-b from-yellow-50/50 via-white to-white p-6 sm:p-7 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between overflow-hidden before:absolute before:top-0 before:left-0 before:h-1 before:w-full before:bg-yellow-400">
              <div className="absolute top-3.5 right-6 bg-yellow-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-sm uppercase tracking-wider shadow-xs">
                Top Package
              </div>

              <div>
                <div className="flex items-start justify-between mt-2">
                  <div>
                    <h3 className="font-black text-xl text-slate-950">Bachelor of Engineering</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">BE / B.Tech (All Engineering Streams)</p>
                  </div>
                  <div className="w-11 h-11 rounded-md bg-yellow-400/20 text-slate-950 flex items-center justify-center font-bold shrink-0 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-6 h-6 text-slate-900" />
                  </div>
                </div>

                <div className="my-6">
                  <div className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight">
                    ₹21,500<span className="text-lg font-bold text-slate-400">/-</span>
                  </div>
                  <div className="text-xs text-amber-700 font-bold mt-1">Fixed Approved Monthly Stipend</div>
                </div>

                <div className="space-y-2.5 border-t border-slate-200/90 pt-5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Accommodation (Hostel)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Food in Canteen</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Company Transportation</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <a
                  href="#apply-form"
                  onClick={() => handleQualificationChange("be")}
                  className="w-full py-3.5 rounded-md bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider text-center block transition-all shadow-sm shadow-yellow-400/20 hover:scale-[1.02]"
                >
                  Apply as BE Graduate →
                </a>
              </div>
            </div>

            {/* Any Degree Package */}
            <div className="group relative rounded-lg border border-slate-200 bg-white p-6 sm:p-7 shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between overflow-hidden before:absolute before:top-0 before:left-0 before:w-0 group-hover:before:w-full before:h-1 before:bg-blue-900 before:transition-all before:duration-300 before:ease-out">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-xl text-slate-950 group-hover:text-blue-900 transition-colors">Any Degree</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">B.Sc, B.Com, B.A, BBA, BCA, etc.</p>
                  </div>
                  <div className="w-11 h-11 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                <div className="my-6">
                  <div className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight">
                    ₹19,250<span className="text-lg font-bold text-slate-400">/-</span>
                  </div>
                  <div className="text-xs text-slate-500 font-bold mt-1">Fixed Approved Monthly Stipend</div>
                </div>

                <div className="space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Accommodation (Hostel)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Food in Canteen</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Company Transportation</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <a
                  href="#apply-form"
                  onClick={() => handleQualificationChange("any_degree")}
                  className="w-full py-3.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider text-center block transition-all shadow-xs hover:scale-[1.02]"
                >
                  Apply as Degree Graduate →
                </a>
              </div>
            </div>

            {/* Diploma Package */}
            <div className="group relative rounded-lg border border-slate-200 bg-white p-6 sm:p-7 shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col justify-between overflow-hidden before:absolute before:top-0 before:left-0 before:w-0 group-hover:before:w-full before:h-1 before:bg-slate-700 before:transition-all before:duration-300 before:ease-out">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-xl text-slate-950 group-hover:text-slate-800 transition-colors">Diploma</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Mechanical, Automobile, EEE, ECE, etc.</p>
                  </div>
                  <div className="w-11 h-11 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                <div className="my-6">
                  <div className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight">
                    ₹17,500<span className="text-lg font-bold text-slate-400">/-</span>
                  </div>
                  <div className="text-xs text-slate-500 font-bold mt-1">Fixed Approved Monthly Stipend</div>
                </div>

                <div className="space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Accommodation (Hostel)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Food in Canteen</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-sm bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Free Company Transportation</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <a
                  href="#apply-form"
                  onClick={() => handleQualificationChange("diploma")}
                  className="w-full py-3.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider text-center block transition-all shadow-xs hover:scale-[1.02]"
                >
                  Apply as Diploma Trainee →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complimentary Facilities Section */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-lg bg-white border border-slate-200/90 p-6 sm:p-7 flex items-start gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-md bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0 font-bold border border-amber-200/50">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Free Accommodation</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Clean, furnished hostel accommodation with 24/7 security, purified water, and hygienic facilities provided at zero cost.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white border border-slate-200/90 p-6 sm:p-7 flex items-start gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-md bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0 font-bold border border-emerald-200/50">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Free Food &amp; Canteen</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Wholesome, hot and hygienic meals and shift refreshments served at the plant canteen with zero salary deduction.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white border border-slate-200/90 p-6 sm:p-7 flex items-start gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-md bg-blue-100/70 text-blue-800 flex items-center justify-center shrink-0 font-bold border border-blue-200/50">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Free Transportation</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Complimentary company buses covering major pick-up routes across Sriperumbudur, Kanchipuram, and Chennai.
                </p>
              </div>
            </div>
          </div>

          {/* Plant Location Card — Bloomfield Sharp-Edge Architectural Design */}
          <div className="relative rounded-lg bg-slate-900 text-white p-7 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl border border-slate-800 overflow-hidden before:absolute before:top-0 before:left-0 before:h-1 before:w-full before:bg-yellow-400">
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
                className="px-5 py-3 rounded-md bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-all hover:scale-105"
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
                className="px-4 py-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all"
              >
                Copy Address
              </button>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-3">
              <img
                src="/ms-logo.jpg"
                alt="HL Mando"
                className="h-10 w-auto object-contain bg-white px-2 py-1 rounded-md"
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
              <h5 className="font-bold text-white mb-2 text-sm">Zero Fee Compliance</h5>
              <p className="leading-relaxed text-slate-400">
                Authorized apprenticeship program under Apprenticeship Act 1961. No recruitment fees or registration charges are ever collected.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>© {new Date().getFullYear()} HL Mando Anand India Private Limited. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
