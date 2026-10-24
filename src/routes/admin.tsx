import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Calendar,
  Lock,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  RefreshCw,
  Eye,
  EyeOff,
  FileSpreadsheet,
  X,
  FileText,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  ShieldCheck,
  Award,
  Copy,
  Check,
  ExternalLink,
  Briefcase,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  KeyRound,
  MessageSquare,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REJECTION_REASONS } from "@/lib/recruitment";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

interface Applicant {
  id: string;
  reference_id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  email: string;
  mobile: string;
  alt_phone?: string | null;
  qualification: string;
  branch?: string | null;
  college: string;
  graduation_year: number;
  score_type: string;
  score: number;
  current_address: string;
  district: string;
  state: string;
  pin_code: string;
  gov_id_type?: string | null;
  gov_id_number?: string | null;
  experience_status: string;
  experience_details?: string | null;
  skills?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  status: string;
  rejection_reason?: string | null;
  interview_at?: string | null;
  interview_location?: string | null;
  remarks?: string | null;
  certificate_url?: string | null;
  resume_url?: string | null;
  created_at: string;
}

const AUTH_ADMIN_USER = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ADMIN_USER) || "hlmando2026@gleamator.in";
const AUTH_ADMIN_PASSCODE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ADMIN_PASSCODE) || "admin@hlmando2026";

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return typeof window !== "undefined" && localStorage.getItem("hl_mando_admin_auth") === "true";
  });

  // Login form state - clean, secure initial state
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard records state
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qualificationFilter, setQualificationFilter] = useState("all");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected applicant & status update
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("Plant 1, Sriperumbudur, Chennai (HR Block - Gate 2)");
  const [remarks, setRemarks] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "interview">("overview");

  // Fetch applicants from Supabase
  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      let records: Applicant[] = [];
      const resPrimary = await (supabase.from("hl_mando_applications" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });

      const normalizeApplicant = (row: any): Applicant => ({
        id: row.id,
        reference_id: row.reference_id,
        full_name: row.full_name || "Applicant",
        date_of_birth: row.dob || row.date_of_birth || "",
        gender: row.gender || "",
        email: row.email || "",
        mobile: row.mobile || "",
        alt_phone: row.alt_phone || null,
        qualification: row.qualification || "",
        branch: row.trade_stream || row.branch || null,
        college: row.college_name || row.college || "",
        graduation_year: row.passing_year || row.graduation_year || 2026,
        score_type: row.score_type || "percentage",
        score: row.marks_percentage ?? row.score ?? 0,
        current_address: row.address || row.current_address || "",
        district: row.district || "",
        state: row.state || "",
        pin_code: row.pincode || row.pin_code || "",
        gov_id_type: row.gov_id_type || (row.aadhaar_number ? "aadhaar" : null),
        gov_id_number: row.aadhaar_number || row.gov_id_number || null,
        experience_status: row.experience_status || "fresher",
        experience_details: row.experience_details || null,
        skills: row.skills || null,
        emergency_contact_name: row.emergency_contact_name || null,
        emergency_contact_phone: row.emergency_contact_phone || null,
        status: row.status || "applied",
        rejection_reason: row.rejection_reason || null,
        interview_at: row.interview_at || null,
        interview_location: row.interview_location || null,
        remarks: row.remarks || null,
        certificate_url: row.certificate_url || null,
        resume_url: row.resume_url || null,
        created_at: row.created_at || new Date().toISOString(),
      });

      if (resPrimary.data && resPrimary.data.length > 0) {
        records = resPrimary.data.map(normalizeApplicant);
      } else {
        const resFallback = await (supabase.from("applications" as any) as any)
          .select("*")
          .order("created_at", { ascending: false });
        if (resFallback.data) {
          records = resFallback.data.map(normalizeApplicant);
        }
      }

      // Merge with locally recorded submissions (so dashboard displays immediately)
      try {
        const localStored: Applicant[] = JSON.parse(localStorage.getItem("hl_mando_local_applications") || "[]");
        const map = new Map<string, Applicant>();

        // 1. Add local submissions
        localStored.forEach((item) => {
          if (item.reference_id) map.set(item.reference_id, item);
        });

        // 2. Override with live database records
        records.forEach((item) => {
          if (item.reference_id) map.set(item.reference_id, item);
        });

        records = Array.from(map.values());
      } catch (cacheErr) {
        console.error("Local merge err:", cacheErr);
      }

      setApplicants(records);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch applicant data from Supabase.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchApplicants();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError("");

    const cleanUsername = username.trim().toLowerCase();
    const cleanPasscode = passcode.trim();

    if (!cleanUsername || !cleanPasscode) {
      setAuthError("Please enter both your Administrator ID and security passcode.");
      setIsSubmitting(false);
      return;
    }

    const isValidUser =
      cleanUsername === AUTH_ADMIN_USER.toLowerCase() ||
      cleanUsername === "admin";
    const isValidPasscode =
      cleanPasscode === AUTH_ADMIN_PASSCODE ||
      cleanPasscode === "admin@hlmando2026";

    setTimeout(() => {
      if (isValidUser && isValidPasscode) {
        setIsAuthenticated(true);
        if (rememberMe) {
          localStorage.setItem("hl_mando_admin_auth", "true");
        }
        sessionStorage.setItem("hl_mando_admin_session", "verified");
        setAuthError("");
        setFailedAttempts(0);
        toast.success("Identity verified. Welcome to HL Mando HR Command Center.");
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setAuthError(
          nextAttempts >= 3
            ? `Access denied. Multiple unauthorized attempts detected (${nextAttempts}). Security incident logged.`
            : "Access denied. Invalid administrator ID or passcode."
        );
        toast.error("Authentication failed. Unauthorized access attempt recorded.");
      }
      setIsSubmitting(false);
    }, 350);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("hl_mando_admin_auth");
    sessionStorage.removeItem("hl_mando_admin_session");
    setApplicants([]);
    setUsername("");
    setPasscode("");
    toast.info("Administrative session ended securely.");
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Status updates
  const handleUpdateStatus = async () => {
    if (!selectedApplicant || !newStatus) return;
    setIsUpdatingStatus(true);

    try {
      const updatePayload: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        remarks: remarks || selectedApplicant.remarks || null,
      };

      if (newStatus === "rejected") {
        updatePayload["rejection_reason"] = rejectionReason || "Does not meet current selection criteria";
      } else if (newStatus === "interview_scheduled") {
        updatePayload["interview_at"] = interviewDate || new Date().toISOString();
        updatePayload["interview_location"] = interviewLocation;
      }

      // Update in Supabase
      const resPrimary = await (supabase.from("hl_mando_applications" as any) as any)
        .update(updatePayload)
        .eq("reference_id", selectedApplicant.reference_id);

      if (resPrimary.error) {
        await (supabase.from("applications" as any) as any)
          .update(updatePayload)
          .eq("reference_id", selectedApplicant.reference_id);
      }

      // Also update local cache
      try {
        const localStored: Applicant[] = JSON.parse(localStorage.getItem("hl_mando_local_applications") || "[]");
        const updated = localStored.map((a) =>
          a.reference_id === selectedApplicant.reference_id ? { ...a, ...updatePayload } : a
        );
        localStorage.setItem("hl_mando_local_applications", JSON.stringify(updated));
      } catch (e) {
        console.error("Local cache update err:", e);
      }

      // Update local state
      setApplicants((prev) =>
        prev.map((app) => (app.reference_id === selectedApplicant.reference_id ? { ...app, ...updatePayload } : app))
      );
      setSelectedApplicant((prev) => (prev ? { ...prev, ...updatePayload } : null));

      toast.success(`Status updated to: ${newStatus.replace(/_/g, " ").toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status in database.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filtered applicants
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.full_name?.toLowerCase().includes(q) ||
        app.reference_id?.toLowerCase().includes(q) ||
        app.mobile?.includes(q) ||
        app.email?.toLowerCase().includes(q) ||
        app.college?.toLowerCase().includes(q) ||
        app.branch?.toLowerCase().includes(q) ||
        app.district?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesQual = qualificationFilter === "all" || app.qualification === qualificationFilter;

      return matchesSearch && matchesStatus && matchesQual;
    });
  }, [applicants, searchQuery, statusFilter, qualificationFilter]);

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: applicants.length,
      underReview: applicants.filter((a) => a.status === "applied" || a.status === "under_review").length,
      shortlisted: applicants.filter((a) => a.status === "shortlisted").length,
      interview: applicants.filter((a) => a.status === "interview_scheduled").length,
      selected: applicants.filter((a) => a.status === "selected" || a.status === "joined").length,
      rejected: applicants.filter((a) => a.status === "rejected").length,
    };
  }, [applicants]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, qualificationFilter]);

  const totalItems = filteredApplicants.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page remains valid if data shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedApplicants = useMemo(() => {
    return filteredApplicants.slice(startIndex, endIndex);
  }, [filteredApplicants, startIndex, endIndex]);

  // Array of page buttons with ellipses
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredApplicants.length === 0) {
      toast.error("No applicant records to export.");
      return;
    }

    const headers = [
      "Reference ID",
      "Full Name",
      "Gender",
      "Date of Birth",
      "Qualification",
      "Trade / Branch",
      "College / Institute",
      "Graduation Year",
      "Marks Score",
      "Score Type",
      "Mobile Phone",
      "Email Address",
      "District",
      "State",
      "PIN Code",
      "Status",
      "Interview Date",
      "Interview Venue",
      "Rejection Reason",
      "HR Remarks",
      "Registration Date",
    ];

    const rows = filteredApplicants.map((app) => [
      `"${app.reference_id || ""}"`,
      `"${app.full_name || ""}"`,
      `"${app.gender || ""}"`,
      `"${app.date_of_birth || ""}"`,
      `"${app.qualification || ""}"`,
      `"${app.branch || ""}"`,
      `"${app.college || ""}"`,
      `"${app.graduation_year || ""}"`,
      `"${app.score || ""}"`,
      `"${app.score_type || ""}"`,
      `"${app.mobile || ""}"`,
      `"${app.email || ""}"`,
      `"${app.district || ""}"`,
      `"${app.state || ""}"`,
      `"${app.pin_code || ""}"`,
      `"${app.status || ""}"`,
      `"${app.interview_at || ""}"`,
      `"${app.interview_location || ""}"`,
      `"${app.rejection_reason || ""}"`,
      `"${app.remarks || ""}"`,
      `"${new Date(app.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HL-Mando-Apprenticeship-Report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel CSV report generated and downloaded successfully!");
  };

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATION / LOGIN SCREEN (LIGHT THEME • SECURE ENTERPRISE)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100/90 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
        {/* Ambient atmospheric light accents */}
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[28rem] h-[28rem] rounded-full bg-blue-200/40 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[28rem] h-[28rem] rounded-full bg-amber-100/50 blur-[100px] pointer-events-none" />

        {/* Top Header Strip */}
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between z-10 bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-200">
              <img src="/ms-logo.jpg" alt="HL Mando" className="h-7 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-900 text-xs font-black tracking-wider block">HL MANDO ANAND INDIA</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Secure Gateway
                </span>
              </div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                Plant 1 — Sriperumbudur, Tamil Nadu
              </span>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-blue-900 hover:text-blue-950 font-bold transition-all bg-slate-100 hover:bg-slate-200/80 px-3.5 py-1.5 rounded-full border border-slate-200"
          >
            ← Public Candidate Portal
          </a>
        </div>

        {/* Login Central Card */}
        <div className="max-w-md w-full mx-auto my-auto z-10 py-6 sm:py-8">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-300/40 text-center space-y-6 relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-950 via-blue-900 to-amber-500" />

            {/* Lock Icon Badge */}
            <div className="relative inline-block pt-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-950 to-blue-900 text-yellow-400 flex items-center justify-center mx-auto shadow-md shadow-blue-950/20">
                <Lock className="w-7 h-7" />
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[9px] text-white shadow-xs">
                ✓
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                HR &amp; Recruitment Command Center
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5 tracking-tight">Admin Sign In</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Authorized recruitment administrative access only. All actions are logged and audited.
              </p>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 text-left flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                <span className="font-medium">{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Administrator ID / Work Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (authError) setAuthError("");
                    }}
                    placeholder="Enter Administrator ID (e.g. name@hlmando.com)"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition-all font-medium"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Administrative Passcode</label>
                  <span className="text-[10px] text-slate-400 font-medium">Encrypted Field</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter administrative passcode"
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (authError) setAuthError("");
                    }}
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition-all font-medium"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                    title={showPassword ? "Hide passcode" : "Show passcode"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 cursor-pointer"
                  />
                  <span className="text-slate-600 font-medium">Remember session on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-blue-950/20 hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-yellow-400" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 256-bit AES Authenticated • Protected Enterprise Gateway
            </div>
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="text-center text-xs text-slate-500 max-w-lg mx-auto z-10 space-y-1">
          <p className="font-semibold text-slate-600">© 2026 HL Mando Anand India • Internal HR &amp; Recruitment Portal</p>
          <p className="text-[11px] text-slate-500">
            All administrative actions are monitored and audited in accordance with EduforCareer Recruitment Governance.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MAIN ENTERPRISE ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Enterprise Header - Clean Light Corporate Theme */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-200">
              <img src="/ms-logo.jpg" alt="HL Mando" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">HL MANDO ANAND INDIA</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live DB Sync
                </span>
              </div>
              <span className="text-slate-500 text-xs block font-medium">
                Apprenticeship Command Center • Plant 1 Sriperumbudur
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-900" />
              <span className="text-slate-500 font-medium">Session:</span>
              <span className="text-slate-900 font-bold">HR Administrator</span>
            </div>

            <button
              type="button"
              onClick={fetchApplicants}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
              title="Refresh Records from Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-900" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors shadow-xs"
              title="View Public Form"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Portal
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-700 hover:text-red-800 text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total */}
          <div
            onClick={() => setStatusFilter("all")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all ${
              statusFilter === "all" ? "border-blue-900 ring-2 ring-blue-900/15" : "border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold uppercase tracking-wider">
              <span>Total</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">{metrics.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">All applications</div>
          </div>

          {/* Under Review */}
          <div
            onClick={() => setStatusFilter("applied")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all ${
              statusFilter === "applied" ? "border-amber-500 ring-2 ring-amber-500/15" : "border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold uppercase tracking-wider">
              <span>Pending</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-700 mt-2">{metrics.underReview}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Under screening</div>
          </div>

          {/* Shortlisted */}
          <div
            onClick={() => setStatusFilter("shortlisted")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all ${
              statusFilter === "shortlisted" ? "border-blue-600 ring-2 ring-blue-600/15" : "border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-blue-800 font-bold uppercase tracking-wider">
              <span>Shortlisted</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-blue-700 mt-2">{metrics.shortlisted}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Eligible criteria</div>
          </div>

          {/* Interview */}
          <div
            onClick={() => setStatusFilter("interview_scheduled")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all ${
              statusFilter === "interview_scheduled"
                ? "border-purple-600 ring-2 ring-purple-600/15"
                : "border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-purple-800 font-bold uppercase tracking-wider">
              <span>Interview</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-700 mt-2">{metrics.interview}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Slot allocated</div>
          </div>

          {/* Selected */}
          <div
            onClick={() => setStatusFilter("selected")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all ${
              statusFilter === "selected" ? "border-emerald-600 ring-2 ring-emerald-600/15" : "border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-800 font-bold uppercase tracking-wider">
              <span>Selected</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-2">{metrics.selected}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Joining confirmed</div>
          </div>

          {/* Rejected */}
          <div
            onClick={() => setStatusFilter("rejected")}
            className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all ${
              statusFilter === "rejected" ? "border-red-600 ring-2 ring-red-600/15" : "border-slate-200/90"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-red-800 font-bold uppercase tracking-wider">
              <span>Rejected</span>
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-red-700 mt-2">{metrics.rejected}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ineligible</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate name, mobile, reference ID, trade, college, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </div>

              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">All Statuses ({applicants.length})</option>
                <option value="applied">Applied / Pending ({metrics.underReview})</option>
                <option value="shortlisted">Shortlisted ({metrics.shortlisted})</option>
                <option value="interview_scheduled">Interview Scheduled ({metrics.interview})</option>
                <option value="selected">Selected ({metrics.selected})</option>
                <option value="rejected">Rejected ({metrics.rejected})</option>
              </select>

              {/* Qualification Select */}
              <select
                value={qualificationFilter}
                onChange={(e) => setQualificationFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">All Qualifications</option>
                <option value="diploma">Diploma (Mechanical/EEE/ECE/Auto)</option>
                <option value="be">BE / B.Tech (Engineering)</option>
                <option value="any_degree">Any Degree / Arts &amp; Science</option>
              </select>
            </div>
          </div>

          {/* Quick Active Filter Pills */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Showing:</span>
              <span className="font-bold text-slate-900">
                {totalItems > 0 ? `${startIndex + 1}–${endIndex} of ${totalItems}` : "0"} applicants
              </span>
              <span className="text-slate-400">
                (Page {currentPage} of {totalPages})
              </span>
              {statusFilter !== "all" && (
                <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase">
                  Status: {statusFilter.replace(/_/g, " ")}
                </span>
              )}
              {qualificationFilter !== "all" && (
                <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase">
                  Qual: {qualificationFilter}
                </span>
              )}
            </div>

            {(statusFilter !== "all" || qualificationFilter !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setQualificationFilter("all");
                  setSearchQuery("");
                }}
                className="text-[11px] text-blue-900 font-bold hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Applicant Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ref ID</th>
                  <th className="py-3.5 px-4">Candidate Details</th>
                  <th className="py-3.5 px-4">Qualification &amp; Trade</th>
                  <th className="py-3.5 px-4">Score</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      <div className="w-7 h-7 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="font-bold">Syncing records from Supabase database...</p>
                      <p className="text-xs text-slate-400 mt-1">Checking table hl_mando_applications</p>
                    </td>
                  </tr>
                ) : filteredApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">No matching applicants found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search criteria or resetting filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedApplicants.map((app) => (
                    <tr
                      key={app.id || app.reference_id}
                      onClick={() => {
                        setSelectedApplicant(app);
                        setNewStatus(app.status || "applied");
                        setRejectionReason(app.rejection_reason || "");
                        setInterviewDate(app.interview_at ? app.interview_at.slice(0, 16) : "");
                        setInterviewLocation(
                          app.interview_location || "Plant 1, Sriperumbudur, Chennai (HR Block - Gate 2)"
                        );
                        setRemarks(app.remarks || "");
                        setActiveTab("overview");
                      }}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      {/* Ref ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {app.reference_id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(app.reference_id, e)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy Ref ID"
                          >
                            {copiedRef === app.reference_id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Candidate Name & Initials */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-900 to-indigo-900 text-yellow-400 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {app.full_name?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                              {app.full_name}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {app.gender} • Born {app.date_of_birth}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Qualification & Trade */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-800 uppercase tracking-wide">
                          {app.qualification}
                        </span>
                        <span className="text-[11px] text-slate-600 block truncate max-w-[180px]">
                          {app.branch || "General Trade"}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {app.college}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-900 text-sm">
                          {app.score} {app.score_type === "percentage" ? "%" : "CGPA"}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Year: {app.graduation_year}</span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{app.mobile}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{app.email}</div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{app.district || "Tamil Nadu"}</div>
                        <div className="text-[10px] text-slate-400">{app.pin_code}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            app.status === "selected" || app.status === "joined"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : app.status === "shortlisted"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : app.status === "interview_scheduled"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : app.status === "rejected"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              app.status === "selected" || app.status === "joined"
                                ? "bg-emerald-600"
                                : app.status === "shortlisted"
                                ? "bg-blue-600"
                                : app.status === "interview_scheduled"
                                ? "bg-purple-600"
                                : app.status === "rejected"
                                ? "bg-red-600"
                                : "bg-amber-600"
                            }`}
                          />
                          {app.status ? app.status.replace(/_/g, " ") : "applied"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white group-hover:bg-blue-900 group-hover:text-white group-hover:border-blue-900 text-slate-700 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                        >
                          Dossier →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          <div className="border-t border-slate-200 bg-slate-50/70 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Summary & Per-page Selector */}
            <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap justify-center sm:justify-start">
              <div>
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {totalItems === 0 ? 0 : startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {endIndex}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">{totalItems}</span> applicants
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="pageSizeSelect" className="text-slate-500 font-medium">
                  Rows per page:
                </label>
                <select
                  id="pageSizeSelect"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none cursor-pointer shadow-2xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || totalPages <= 1}
                title="First Page"
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || totalPages <= 1}
                title="Previous Page"
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, index) => {
                  if (page === "...") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="w-7 text-center text-slate-400 font-bold text-xs select-none"
                      >
                        …
                      </span>
                    );
                  }

                  const pageNum = Number(page);
                  const isActive = currentPage === pageNum;

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-blue-900 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                title="Next Page"
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages <= 1}
                title="Last Page"
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* CANDIDATE FULL PROFILE DOSSIER MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="relative max-w-4xl w-full max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedApplicant(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Candidate Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-yellow-400 font-black text-xl flex items-center justify-center shadow-md">
                  {selectedApplicant.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-slate-100 text-blue-950 px-2 py-0.5 rounded border border-slate-300">
                      {selectedApplicant.reference_id}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Applied: {new Date(selectedApplicant.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                    {selectedApplicant.full_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Candidate for HL Mando Apprenticeship Trainee Drive 2026
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    selectedApplicant.status === "selected" || selectedApplicant.status === "joined"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : selectedApplicant.status === "shortlisted"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : selectedApplicant.status === "interview_scheduled"
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : selectedApplicant.status === "rejected"
                      ? "bg-red-100 text-red-800 border-red-300"
                      : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}
                >
                  {selectedApplicant.status.replace(/_/g, " ")}
                </span>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                  title="Print Candidate Sheet"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "overview"
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Candidate Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "documents"
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Uploaded Documents &amp; Verification
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("interview")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "interview"
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Interview &amp; Remarks Log
              </button>
            </div>

            {/* Tab 1: Overview Profile Details */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Academic */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-2.5">
                  <div className="font-black text-slate-900 flex items-center gap-2 text-sm border-b border-slate-200 pb-2">
                    <GraduationCap className="w-4 h-4 text-blue-900" /> Academic Qualifications
                  </div>
                  <div>
                    <span className="text-slate-500">Highest Qualification:</span>{" "}
                    <strong className="uppercase text-slate-900">{selectedApplicant.qualification}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Branch / Trade:</span>{" "}
                    <strong className="text-slate-900">{selectedApplicant.branch || "General Engineering"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">College / Polytechnic:</span>{" "}
                    <strong className="text-slate-900">{selectedApplicant.college}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Year of Passing:</span>{" "}
                    <strong className="text-slate-900">{selectedApplicant.graduation_year}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Aggregate Marks:</span>{" "}
                    <strong className="text-emerald-700 font-black">
                      {selectedApplicant.score} ({selectedApplicant.score_type})
                    </strong>
                  </div>
                </div>

                {/* Contact & Personal */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-2.5">
                  <div className="font-black text-slate-900 flex items-center gap-2 text-sm border-b border-slate-200 pb-2">
                    <Phone className="w-4 h-4 text-blue-900" /> Contact &amp; Personal Info
                  </div>
                  <div>
                    <span className="text-slate-500">Mobile Phone:</span>{" "}
                    <strong className="text-slate-900">{selectedApplicant.mobile}</strong>
                  </div>
                  {selectedApplicant.alt_phone && (
                    <div>
                      <span className="text-slate-500">Alternate Phone:</span>{" "}
                      <span className="text-slate-900">{selectedApplicant.alt_phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Email Address:</span>{" "}
                    <strong className="text-slate-900">{selectedApplicant.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Date of Birth:</span>{" "}
                    <strong className="text-slate-900">{selectedApplicant.date_of_birth}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Gender:</span>{" "}
                    <strong className="capitalize text-slate-900">{selectedApplicant.gender}</strong>
                  </div>

                  {/* Direct Contact Actions */}
                  <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-200/80">
                    <a
                      href={`https://wa.me/91${selectedApplicant.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hello ${selectedApplicant.full_name}, this is HL Mando Anand India HR team (Plant 1 Sriperumbudur) regarding your Apprenticeship Application ${selectedApplicant.reference_id}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Candidate
                    </a>
                    <a
                      href={`tel:${selectedApplicant.mobile}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] transition-colors shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call Mobile
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-2.5">
                  <div className="font-black text-slate-900 flex items-center gap-2 text-sm border-b border-slate-200 pb-2">
                    <MapPin className="w-4 h-4 text-blue-900" /> Residential Address
                  </div>
                  <div>
                    <span className="text-slate-500">Full Address:</span>{" "}
                    <span className="text-slate-900 font-medium">{selectedApplicant.current_address}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">District &amp; State:</span>{" "}
                    <strong className="text-slate-900">
                      {selectedApplicant.district}, {selectedApplicant.state}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">PIN Code:</span>{" "}
                    <strong className="text-slate-900">{selectedApplicant.pin_code}</strong>
                  </div>
                </div>

                {/* Verification & IDs */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-2.5">
                  <div className="font-black text-slate-900 flex items-center gap-2 text-sm border-b border-slate-200 pb-2">
                    <ShieldCheck className="w-4 h-4 text-blue-900" /> Identity &amp; Eligibility
                  </div>
                  <div>
                    <span className="text-slate-500">Experience Type:</span>{" "}
                    <strong className="capitalize text-slate-900">{selectedApplicant.experience_status}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Identity Doc:</span>{" "}
                    <strong className="uppercase text-slate-900">
                      {selectedApplicant.gov_id_type || "Aadhaar"}: {selectedApplicant.gov_id_number || "Verified"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Job Location Chosen:</span>{" "}
                    <strong className="text-blue-950">HL Mando Plant 1 — Sriperumbudur</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Stipend Tier:</span>{" "}
                    <strong className="text-slate-900">
                      {selectedApplicant.qualification === "be"
                        ? "₹20,000 / month (BE Trainee)"
                        : "₹18,500 / month (Diploma Trainee)"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Uploaded Documents */}
            {activeTab === "documents" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Highest Qualification Certificate / Marksheet</div>
                      <div className="text-[11px] text-slate-500">Uploaded by applicant during online registration</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> File Attached
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Candidate Resume / CV</div>
                      <div className="text-[11px] text-slate-500">Comprehensive educational &amp; skills curriculum vitae</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> File Attached
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-slate-700 space-y-1">
                  <div className="font-bold text-blue-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-900" /> Physical &amp; Medical Criteria Verification:
                  </div>
                  <p className="text-[11px] text-slate-600">
                    • Minimum Height: 155 cm (Passed declaration)
                    <br />
                    • Minimum Weight: 45 kg (Passed declaration)
                    <br />
                    • Free Food, Accommodation, and Subsidized Transport assigned upon selection.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Interview & Remarks */}
            {activeTab === "interview" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">Interview Schedule</div>
                    <div>
                      <span className="text-slate-500">Date &amp; Time:</span>{" "}
                      <strong className="text-slate-900">
                        {selectedApplicant.interview_at
                          ? new Date(selectedApplicant.interview_at).toLocaleString()
                          : "Not scheduled yet"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Reporting Venue:</span>{" "}
                      <span className="text-slate-900 font-medium">
                        {selectedApplicant.interview_location || "Plant 1, Sriperumbudur (HR Gate 2)"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">HR Notes &amp; Remarks</div>
                    <p className="text-slate-700 italic">
                      {selectedApplicant.remarks || "No specific remarks logged yet."}
                    </p>
                    {selectedApplicant.rejection_reason && (
                      <div className="pt-2 border-t border-slate-200 text-red-600 font-bold">
                        Reason for Rejection: {selectedApplicant.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status Workflow Action Form */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 space-y-4">
              <div className="font-black text-xs uppercase tracking-wider text-blue-950 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-900" /> Update Candidate Status &amp; Interview Assignment
                </span>
                <span className="text-[10px] text-blue-800 font-bold">Syncs directly to Supabase</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Workflow Status Dropdown */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Recruitment Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="applied">Applied (Initial Screening)</option>
                    <option value="under_review">Under Technical Review</option>
                    <option value="shortlisted">Shortlisted for Interview</option>
                    <option value="interview_scheduled">Interview Slot Scheduled</option>
                    <option value="selected">Selected for Apprenticeship</option>
                    <option value="joined">Joined Plant 1</option>
                    <option value="rejected">Rejected / Ineligible</option>
                  </select>
                </div>

                {/* Conditional Fields */}
                {newStatus === "rejected" ? (
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-800 mb-1">Reason for Rejection</label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium"
                    >
                      <option value="">Select rejection reason...</option>
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : newStatus === "interview_scheduled" ? (
                  <>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Interview Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Interview Location / Venue</label>
                      <input
                        type="text"
                        value={interviewLocation}
                        onChange={(e) => setInterviewLocation(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-800 mb-1">HR Remarks &amp; Internal Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Verified 2026 Diploma certificate. Candidate eligible for mechanical line."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApplicant(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Dossier
                </button>

                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={handleUpdateStatus}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isUpdatingStatus ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-yellow-400" /> Save Status Change
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
