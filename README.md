# HL Mando Apprenticeship Portal

Build a **fully responsive, production-ready Apprenticeship Recruitment Portal for HL Mando Anand India Private Limited (Plant 1)**, based on the attached recruitment poster. Use a professional corporate design with **navy blue, royal blue, white, and yellow accents**, clean typography, modern cards, and a mobile-first layout.

### 1. Public Candidate Registration
Create a shareable public registration URL with a professional recruitment landing page displaying the company name, apprenticeship opening, salary details, eligibility, facilities, job location, and contact information from the poster.

Include these fields:
- Full name, date of birth, gender, email, mobile number, and alternate phone (optional).
- Highest qualification: Diploma, BE, or Any Degree; branch/stream; college/university; graduation year; percentage/CGPA.
- Current address, district, state, and PIN code.
- Aadhaar or other government ID: collect only if genuinely required, with appropriate privacy safeguards.
- Resume/CV upload and supporting documents (marks cards, certificates, photograph, etc., as required).
- Experience status and relevant skills.
- Emergency contact, optional.
- undertaking also that eduforcarrer (trueblend) will not collect any money from the cadidates or collect anything from them like that 
- Mandatory declarations confirming information accuracy, eligibility, consent to process personal data for recruitment, and acceptance of the privacy notice. Keep marketing consent separate and optional.
- Submit button, clear validation messages, success confirmation, and a unique application/reference ID.

### 2. Validation and Security
Implement client-side and server-side validation. Validate email format, Indian mobile numbers (+91 support), required fields, date of birth and 18–26 age eligibility, qualification, percentage/CGPA ranges, PIN code, and duplicate applications. Restrict uploads to approved formats (PDF, DOC, DOCX, JPG, PNG), **maximum 2 MB per file**, with file-signature/MIME validation, secure storage, malware scanning where available, and clear upload errors. Prevent executable files, unauthorized access, and common web attacks. Never trust client-side validation alone.

### 3. Secure Admin Dashboard
Build an authenticated admin panel with role-based access control, secure login, logout, password reset, and session management. Provide:
- Overview cards for total applications, new, under review, shortlisted, rejected, selected, and joined candidates.
- A searchable, sortable, paginated candidate table with **debounced search**, filters for qualification, branch, age, graduation year, application date, and status.
- Candidate detail pages with submitted information, consent records, uploaded-document previews/downloads, and application history.
- Status workflow: Applied → Under Review → Shortlisted → Interview Scheduled → Selected/Rejected → Joined.
- Admin notes, rejection reasons, interview date/time, status-change timestamps, and activity/audit logs.
- Bulk selection, CSV export, and safe document access restricted to authorized admins.
- Configurable status updates and candidate notifications via email, with delivery/error tracking.


### 5. Technical and UI Requirements
Use a reliable database and backend with proper server-side validation, secure file storage, environment-managed secrets,  . Use reusable components, loading states, empty states, error handling, accessible forms, and responsive layouts for mobile, tablet, and desktop.

Deliver a functional end-to-end application, not just a UI prototype. Implement database schema, migrations, authentication, storage policies, validation, and authorization. Test all critical flows.

**Important:** Keep candidate registration public but restrict all candidate data, uploaded documents, exports, and administrative operations to authorized personnel. Do not expose applicant information through public APIs or URLs. Use the company branding and recruitment details from the supplied poster, and make all administrative settings configurable.   make ui and all correctly alo   make correctly orking    alo  https://www.eduforcareer.com/

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ad020c0b-db66-4ce9-ad77-d21bd4856505).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
