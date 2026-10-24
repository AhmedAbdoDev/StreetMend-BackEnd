# StreetMend — Civic Issue Reporting Platform Backend

[![Node.js](https://img.shields.io/badge/Node.js-v22.17.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-v5.1.0-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-emerald.svg)](https://mongoosejs.com/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-purple.svg)](https://vitest.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

StreetMend is a production-grade, backend-first Civic Issue Reporting Platform designed to bridge communication between citizens and municipal authorities. The platform enables citizens to report public-area defects—such as potholes, water main leaks, broken streetlights, sewage overflows, and illegal waste dumping—and track them through an auditable, status-driven lifecycle, while municipal department owners and field staff triage, assign, and resolve reports.

---

## 🌟 Key Features

- **Department-Based Civic Routing**: Each issue category automatically routes to a responsible municipal department (Roads, Water, Electricity, Sanitation).
- **Stateless High-Performance Authentication**: Custom JWT authentication middleware that verifies signatures and claims with **ZERO database queries** per protected request.
- **Enterprise Refresh Token Lifecycle**: SHA-256 hashed refresh tokens stored in MongoDB with 7-day TTL index, token rotation on every refresh, reuse detection for compromise containment, and instant logout revocation.
- **Email Verification & Account Recovery**: Nodemailer integration with branded HTML templates for email verification, resending verification links, and a secure 15-minute password reset lifecycle that invalidates all active sessions.
- **Staff Onboarding & Isolated Department Approval**: Public staff registration requiring department selection, remaining inactive and pending until explicitly reviewed and approved by the designated Department Owner. Includes automated Nodemailer notifications for pending applications, welcome emails on approval, and rejection reason notices.
- **Clean Citizen Registration**: Citizens register with strictly citizen-relevant fields, completely decoupling them from municipal department IDs or positions.
- **Strict Role-Based Access Control (RBAC)**: Distinct authorization boundaries for Citizens, Field Staff, Department Owners, and Platform Administrators.
- **Auditable Status State Machine**: Enforces valid status transitions (`SUBMITTED` -> `UNDER_REVIEW` -> `ACCEPTED` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`), recording mandatory justification reasons and before/after photo evidence.
- **Geospatial Issue Indexing**: MongoDB GeoJSON Point indexing with `2dsphere` spatial coordinates `[longitude, latitude]` for geographic search and mapping.
- **Cloudinary Media Streaming**: Concurrent multi-image uploads via Multer memory storage with compensation cleanup to prevent orphaned media assets.
- **Community Upvoting & Flagging**: Citizens can support issues to prioritize municipal attention or flag fraudulent/abusive reports for administrative moderation.
- **Municipal Analytics Engine**: Real-time aggregation of total volume, status breakdowns, category distributions, and average resolution time metrics overall and per department.

---

## 🏗️ Architecture & Modular Organization

StreetMend follows a **Feature-Based Modular Architecture** derived from enterprise best practices (adapted from `LeoClinic_nodejs` modularity and `e-commerce` TypeScript typing and session models):

```
backend/
├── docs/                          # Detailed architecture & workflow specifications
│   ├── requirements-analysis.md   # Functional requirements & SRS mapping
│   ├── architecture-overview.md   # Structural patterns & module boundaries
│   ├── authentication-design.md   # Stateless JWT, Refresh Token & RBAC design
│   ├── endpoint-inventory.md      # Comprehensive 41-endpoint reference table
│   ├── database-models.md         # MongoDB collection schemas & indexes
│   ├── request-flows/             # Sequence flows & execution order
│   ├── environment-setup.md       # Environment configuration & fail-fast startup
│   ├── seed-instructions.md       # Seed credentials & idempotent setup
│   ├── testing-guide.md           # Vitest execution guide & Git ignore policy
│   ├── cloudinary-integration.md  # Multi-image upload & compensation cleanup
│   └── final-audit-report.md      # Final verification & audit report
├── postman/                       # Ready-to-import Postman test collection
│   ├── StreetMend.postman_collection.json
│   └── StreetMend.postman_environment.json
├── src/
│   ├── config/                    # Shared configuration (env, database, cloudinary)
│   ├── error/                     # AppError custom operational error class
│   ├── middlewares/               # auth, validate, upload, errorHandler
│   ├── models/                    # Mongoose models (User, Department, Issue, Session, VerificationCode, etc.)
│   ├── modules/                   # Domain feature modules
│   │   ├── auth/                  # Register, Staff Register, Email Verify, Password Reset, Refresh, Logout, Me
│   │   ├── department/            # Staff Requests, Approvals, Member Management
│   │   ├── issues/                # Issue CRUD, Supports, Flags, History
│   │   ├── users/                 # User management, role changes, deactivations
│   │   └── analytics/             # Municipal analytics and KPIs
│   ├── services/                  # Email (Nodemailer) and Media (Cloudinary) services
│   ├── utils/                     # JWT signing, token hashing, response helpers, report number generator
│   ├── seeds/                     # Idempotent development seed runner
│   ├── app.ts                     # Express app setup & route mounting
│   └── server.ts                  # Server entrypoint with graceful shutdown
├── .env.example                   # Environment configuration template
├── package.json                   # Project scripts and dependencies
├── tsconfig.json                  # TypeScript compiler settings
└── vitest.config.ts               # Unit testing configuration
```

---

## 🛠️ Technology Stack

| Layer              | Technology                                               |
| :----------------- | :------------------------------------------------------- |
| **Runtime**        | Node.js (v22.x LTS)                                      |
| **Language**       | TypeScript (v5.9.2) in strict mode                       |
| **Framework**      | Express.js (v5.1.0)                                      |
| **Database**       | MongoDB with Mongoose (v8.24.4)                          |
| **Validation**     | Zod (v3.24.2)                                            |
| **Authentication** | JSON Web Token (jsonwebtoken v9.0.2) + bcryptjs (v3.0.2) |
| **Email Delivery** | Nodemailer (v6.10.0) with HTML templates & dev fallback  |
| **File Uploads**   | Multer (v2.0.2) memory storage + Cloudinary SDK (v2.7.0) |
| **Testing**        | Vitest (v3.0.7) + Supertest (v7.0.0)                     |

---

## 📋 Prerequisites

- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- **MongoDB**: Local MongoDB community service (`mongodb://127.0.0.1:27017`) or MongoDB Atlas connection URI

---

## 🚀 Quick Start & Installation

### 1. Clone & Navigate to Backend

```bash
git clone <repository_url>
cd StreetMind/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure your MongoDB connection string is set (default: `mongodb://127.0.0.1:27017/streetmend`). For SMTP email delivery, populate `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` (if unset, the email service logs emails locally in mock mode for development).

### 4. Seed Development Database

Populate municipal departments, department owners, staff, verified citizens, categories, and sample issues:

```bash
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start with hot-reloading at `http://localhost:5000/api/v1`.

---

## 🧪 Testing

StreetMend features 58 automated unit and integration tests covering the complete authentication lifecycle, department isolation, staff approvals, and state machine transitions:

```bash
npm run test
```

### Verified Test Results:

```
 Test Files  10 passed (10)
      Tests  58 passed (58)
   Duration  7.14s
```

---

## 🔑 Seed Development Credentials

| Role                             | Email                              | Password         | Department               |
| :------------------------------- | :--------------------------------- | :--------------- | :----------------------- |
| **Platform Administrator**       | `admin@streetmend.gov`             | `Admin@123456`   | Global                   |
| **Roads Department Owner**       | `owner.roads@streetmend.gov`       | `Staff@123456`   | Roads & Infrastructure   |
| **Water Department Owner**       | `owner.water@streetmend.gov`       | `Staff@123456`   | Water & Sewage Authority |
| **Electricity Department Owner** | `owner.electricity@streetmend.gov` | `Staff@123456`   | Electricity & Lighting   |
| **Sanitation Department Owner**  | `owner.sanitation@streetmend.gov`  | `Staff@123456`   | Sanitation & Waste       |
| **Roads Field Tech**             | `staff.roads@streetmend.gov`       | `Staff@123456`   | Roads & Infrastructure   |
| **Water Field Tech**             | `staff.water@streetmend.gov`       | `Staff@123456`   | Water & Sewage Authority |
| **Pending Staff Applicant**      | `applicant.roads@streetmend.gov`   | `Staff@123456`   | Roads (Pending Approval) |
| **Citizen (John Doe)**           | `john.doe@citizen.org`             | `Citizen@123456` | Citizen                  |
| **Citizen (Jane Smith)**         | `jane.smith@citizen.org`           | `Citizen@123456` | Citizen                  |

---

## 📮 Postman Collection

Import the pre-configured Postman resources located in `postman/`:

- **Collection**: `postman/StreetMend.postman_collection.json`
- **Environment**: `postman/StreetMend.postman_environment.json`

**Features Included**:

- **Full API Coverage (57 Requests across 6 Folders)**: Complete coverage for System Health, Authentication & Account, Department Owner Operations, Citizen & Public Issues, Staff & Department Operations, and Platform Administration & Analytics.
- **Complete Auth Lifecycle**: Citizen registration, Staff registration, Email verification, Resend verification, Login (Admin/Citizen/Owner/Staff), Refresh Token rotation, Forgot Password, Verify Password Reset Token, Reset Password, Get Current Profile (`/me`), and Logout.
- **Automatic Token & ID Chaining**: Authenticating automatically captures both `accessToken` and `refreshToken` into environment variables. Browsing departments, categories, issues, users, and staff requests dynamically captures `sampleDepartmentId`, `sampleCategoryId`, `sampleIssueId`, `sampleStaffId`, `sampleRequestId`, and `sampleUserId` so subsequent requests execute seamlessly without manual copy-pasting.
- **Preconfigured Variables**: Includes `baseUrl`, `baseUrlRoot`, `accessToken`, `refreshToken`, `verificationToken`, `resetToken`, `sampleDepartmentId`, `sampleCategoryId`, `sampleIssueId`, `sampleStaffId`, `sampleRequestId`, and `sampleUserId`.

---

## 🔒 Security & Authorization Highlights

1. **Stateless JWT Middleware**: Does not hit MongoDB on every request, providing high throughput while preserving verified claims (`userId`, `role`, `departmentId`, `departmentPosition`, `sessionId`).
2. **Refresh Token Rotation & Reuse Detection**: SHA-256 hashed refresh tokens with automatic single-use rotation. If a revoked refresh token is presented, all active sessions for that user are revoked immediately.
3. **Email Verification vs. Staff Approval**: Email verification activates citizen accounts, but does NOT bypass the department approval requirement for staff accounts.
4. **Isolated Department Boundaries**: Department Owners can only review and transition issues or staff requests belonging to their assigned department. Cross-department modifications are rejected with `403 Forbidden`.
5. **Input Sanitation & Strict Validation**: All bodies, route parameters, and query strings are strictly parsed and validated using Zod schemas before any business logic executes.
