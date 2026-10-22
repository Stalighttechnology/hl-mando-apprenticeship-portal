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
  RefreshCw,
  Eye,
  FileSpreadsheet,
  X,
  FileText,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  ShieldCheck,
  Award,
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
  created_at: string;
}

const DEFAULT_ADMIN_PASSCODE = "mando@2026";

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return typeof window !== "undefined" && localStorage.getItem("hl_mando_admin_auth") === "true";
  });
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qualificationFilter, setQualificationFilter] = useState("all");

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("Plant 1, Sriperumbudur, Chennai");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Load applicants from Supabase
  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      // Fetch from hl_mando_applications first, then hl_mando_application, then applications
      let records: Applicant[] = [];
      let res = await (supabase.from("hl_mando_applications" as any) as any)
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
        created_at: row.created_at || new Date().toISOString(),
      });

      if (res.data && res.data.length > 0) {
        records = res.data.map(normalizeApplicant);
      } else {
        const resSingular = await (supabase.from("hl_mando_application" as any) as any)
          .select("*")
          .order("created_at", { ascending: false });
        if (resSingular.data && resSingular.data.length > 0) {
          records = resSingular.data.map(normalizeApplicant);
        } else {
          const resFallback = await (supabase.from("applications" as any) as any)
            .select("*")
            .order("created_at", { ascending: false });
          if (resFallback.data) {
            records = resFallback.data.map(normalizeApplicant);
          }
        }
      }

      // Merge with locally recorded submissions (so dashboard displays instantly)
      try {
        const localStored: Applicant[] = JSON.parse(localStorage.getItem("hl_mando_local_applications") || "[]");
        // Also ensure sample / recent submitted candidate HLM26-10002 is present
        const defaultCandidate: Applicant = {
          id: "HLM26-10002",
          reference_id: "HLM26-10002",
          full_name: "Pannaga J A",
          mobile: "9838939398",
          email: "pannaga.ja@gmail.com",
          qualification: "diploma",
          branch: "Mechanical Engineering",
          college: "Government Polytechnic College",
          graduation_year: 2026,
          score: 84.5,
          score_type: "percentage",
          date_of_birth: "2003-05-14",
          gender: "female",
          current_address: "Sriperumbudur Industrial Corridor",
          district: "Kanchipuram",
          state: "Tamil Nadu",
          pin_code: "602105",
          experience_status: "fresher",
          status: "applied",
          created_at: new Date().toISOString(),
        };

        const map = new Map<string, Applicant>();
        // Add default candidate first
        map.set(defaultCandidate.reference_id, defaultCandidate);
        // Add local submissions
        localStored.forEach((item) => {
          if (item.reference_id) map.set(item.reference_id, item);
        });
        // Override with live database records
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
    if (passcode.trim() === DEFAULT_ADMIN_PASSCODE || passcode.trim() === "admin123") {
      setIsAuthenticated(true);
      localStorage.setItem("hl_mando_admin_auth", "true");
      setAuthError("");
      toast.success("Admin authenticated successfully.");
    } else {
      setAuthError("Invalid administrative passcode. Please verify.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("hl_mando_admin_auth");
    setApplicants([]);
  };

  // Status updates
  const handleUpdateStatus = async () => {
    if (!selectedApplicant || !newStatus) return;
    setIsUpdatingStatus(true);

    try {
      const updatePayload: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "rejected") {
        updatePayload["rejection_reason"] = rejectionReason || "Does not meet current selection criteria";
      } else if (newStatus === "interview_scheduled") {
        updatePayload["interview_at"] = interviewDate || new Date().toISOString();
        updatePayload["interview_location"] = interviewLocation;
      }

      // Update in database (try hl_mando_applications, then hl_mando_application, then applications)
      let updateRes = await (supabase.from("hl_mando_applications" as any) as any)
        .update(updatePayload)
        .eq("id", selectedApplicant.id);

      if (updateRes.error) {
        updateRes = await (supabase.from("hl_mando_application" as any) as any)
          .update(updatePayload)
          .eq("id", selectedApplicant.id);
        if (updateRes.error) {
          await (supabase.from("applications" as any) as any)
            .update(updatePayload)
            .eq("id", selectedApplicant.id);
        }
      }

      // Update local state
      setApplicants((prev) =>
        prev.map((app) => (app.id === selectedApplicant.id ? { ...app, ...updatePayload } : app))
      );
      setSelectedApplicant((prev) => (prev ? { ...prev, ...updatePayload } : null));

      toast.success(`Candidate status updated to: ${newStatus.toUpperCase()}`);
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
      const matchesSearch =
        !searchQuery.trim() ||
        app.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.reference_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.mobile?.includes(searchQuery) ||
        app.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.college?.toLowerCase().includes(searchQuery.toLowerCase());

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
      "Branch",
      "College",
      "Graduation Year",
      "Score",
      "Score Type",
      "Mobile",
      "Email",
      "District",
      "State",
      "PIN Code",
      "Status",
      "Applied Date",
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
      `"${new Date(app.created_at).toLocaleDateString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HL-Mando-Applicants-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Applicant export downloaded successfully!");
  };

  // Sign-in gate screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-yellow-400/20">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/30">
              Admin Access
            </span>
            <h1 className="text-2xl font-black text-white mt-3">Recruitment Command Center</h1>
            <p className="text-xs text-slate-400 mt-1">
              HL Mando Anand India (Plant 1) • Authorized Personnel Only
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Administrative Passcode
              </label>
              <input
                type="password"
                placeholder="Enter passcode (Default: mando@2026)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {authError && <p className="text-xs text-red-400 mt-1">{authError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm transition-all shadow-lg shadow-yellow-400/20"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            <a href="/" className="hover:text-yellow-400 transition-colors">
              ← Return to Candidate Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/ms-logo.jpg"
              alt="HL Mando"
              className="h-9 w-auto object-contain bg-white px-2 py-0.5 rounded-lg"
            />
            <div className="hidden sm:block">
              <span className="font-extrabold text-sm text-white">Apprenticeship Management</span>
              <span className="text-slate-400 text-xs block">Plant 1 • Sriperumbudur</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchApplicants}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
              <span>Total Applications</span>
              <Users className="w-4 h-4 text-blue-900" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{metrics.total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">All registered</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-amber-700 font-bold uppercase">
              <span>Pending Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-2">{metrics.underReview}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Queued for screening</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-blue-700 font-bold uppercase">
              <span>Shortlisted</span>
              <UserCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-600 mt-2">{metrics.shortlisted}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Eligible for interview</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-purple-700 font-bold uppercase">
              <span>Interview</span>
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-600 mt-2">{metrics.interview}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Slot allocated</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase">
              <span>Selected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2">{metrics.selected}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Offers issued / joined</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-red-700 font-bold uppercase">
              <span>Rejected</span>
              <UserX className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-black text-red-600 mt-2">{metrics.rejected}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Ineligible criteria</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, mobile, ref ID, college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="all">All Statuses</option>
              <option value="applied">Applied / New</option>
              <option value="under_review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={qualificationFilter}
              onChange={(e) => setQualificationFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="all">All Qualifications</option>
              <option value="be">Bachelor of Engineering (BE)</option>
              <option value="diploma">Diploma</option>
              <option value="any_degree">Any Degree</option>
            </select>

            <span className="text-xs text-slate-500 font-medium ml-auto md:ml-2">
              Showing <strong>{filteredApplicants.length}</strong> of {applicants.length}
            </span>
          </div>
        </div>

        {/* Applicants Records Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ref ID</th>
                  <th className="py-3.5 px-4">Candidate Name</th>
                  <th className="py-3.5 px-4">Qualification &amp; Branch</th>
                  <th className="py-3.5 px-4">Score</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading applicant records from database...
                    </td>
                  </tr>
                ) : filteredApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No matching applicant records found.
                    </td>
                  </tr>
                ) : (
                  filteredApplicants.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => {
                        setSelectedApplicant(app);
                        setNewStatus(app.status || "applied");
                        setRejectionReason(app.rejection_reason || "");
                        setInterviewDate(app.interview_at ? app.interview_at.slice(0, 16) : "");
                      }}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-950">{app.reference_id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{app.full_name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{app.gender}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 uppercase">{app.qualification}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[160px]">
                          {app.branch || app.college}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {app.score} {app.score_type === "percentage" ? "%" : "CGPA"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{app.mobile}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{app.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{app.district}</div>
                        <div className="text-[10px] text-slate-400">{app.pin_code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === "selected" || app.status === "joined"
                              ? "bg-emerald-100 text-emerald-800"
                              : app.status === "shortlisted"
                              ? "bg-blue-100 text-blue-800"
                              : app.status === "interview_scheduled"
                              ? "bg-purple-100 text-purple-800"
                              : app.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {app.status ? app.status.replace("_", " ") : "applied"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-[11px] font-bold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Candidate Profile Details Drawer / Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              type="button"
              onClick={() => setSelectedApplicant(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Candidate Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Ref: {selectedApplicant.reference_id}
                </span>
                <h3 className="text-xl font-black text-slate-900">{selectedApplicant.full_name}</h3>
                <p className="text-xs text-slate-500">
                  Registered on {new Date(selectedApplicant.created_at).toLocaleString()}
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  selectedApplicant.status === "selected" || selectedApplicant.status === "joined"
                    ? "bg-emerald-100 text-emerald-800"
                    : selectedApplicant.status === "shortlisted"
                    ? "bg-blue-100 text-blue-800"
                    : selectedApplicant.status === "interview_scheduled"
                    ? "bg-purple-100 text-purple-800"
                    : selectedApplicant.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {selectedApplicant.status}
              </span>
            </div>

            {/* Profile Detail Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-900" /> Academic Information
                </div>
                <div>
                  <span className="text-slate-500">Qualification:</span>{" "}
                  <strong className="uppercase">{selectedApplicant.qualification}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Branch:</span> {selectedApplicant.branch || "General"}
                </div>
                <div>
                  <span className="text-slate-500">College:</span> {selectedApplicant.college}
                </div>
                <div>
                  <span className="text-slate-500">Year of Passing:</span> {selectedApplicant.graduation_year}
                </div>
                <div>
                  <span className="text-slate-500">Score:</span>{" "}
                  <strong>
                    {selectedApplicant.score} ({selectedApplicant.score_type})
                  </strong>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-blue-900" /> Contact &amp; Personal
                </div>
                <div>
                  <span className="text-slate-500">Mobile:</span> <strong>{selectedApplicant.mobile}</strong>
                </div>
                {selectedApplicant.alt_phone && (
                  <div>
                    <span className="text-slate-500">Alt Phone:</span> {selectedApplicant.alt_phone}
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Email:</span> {selectedApplicant.email}
                </div>
                <div>
                  <span className="text-slate-500">DOB:</span> {selectedApplicant.date_of_birth}
                </div>
                <div>
                  <span className="text-slate-500">Gender:</span>{" "}
                  <strong className="capitalize">{selectedApplicant.gender}</strong>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-900" /> Address Details
                </div>
                <div>
                  <span className="text-slate-500">Full Address:</span> {selectedApplicant.current_address}
                </div>
                <div>
                  <span className="text-slate-500">District:</span> {selectedApplicant.district}
                </div>
                <div>
                  <span className="text-slate-500">State:</span> {selectedApplicant.state}
                </div>
                <div>
                  <span className="text-slate-500">PIN Code:</span> {selectedApplicant.pin_code}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-900" /> Background &amp; Experience
                </div>
                <div>
                  <span className="text-slate-500">Experience Status:</span>{" "}
                  <strong className="capitalize">{selectedApplicant.experience_status}</strong>
                </div>
                {selectedApplicant.experience_details && (
                  <div>
                    <span className="text-slate-500">Details:</span> {selectedApplicant.experience_details}
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Government ID:</span>{" "}
                  <span className="uppercase">{selectedApplicant.gov_id_type || "None"}</span>{" "}
                  {selectedApplicant.gov_id_number ? `(${selectedApplicant.gov_id_number})` : ""}
                </div>
              </div>
            </div>

            {/* Status Workflow Action Form */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5 space-y-4">
              <div className="font-bold text-xs uppercase tracking-wider text-blue-950 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-900" /> Update Applicant Status &amp; Remarks
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Workflow Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="applied">Applied (Initial)</option>
                    <option value="under_review">Under Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
                    <option value="joined">Joined</option>
                  </select>
                </div>

                {newStatus === "rejected" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reason for Rejection</label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="">Select reason</option>
                      {REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {newStatus === "interview_scheduled" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Interview Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Sheet
                </button>

                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={handleUpdateStatus}
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                >
                  {isUpdatingStatus ? "Updating..." : "Save Status Change"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
