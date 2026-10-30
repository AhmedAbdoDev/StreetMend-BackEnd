import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import env from "../config/env.js";
import User from "../models/user.model.js";
import Department from "../models/department.model.js";
import IssueCategory from "../models/issueCategory.model.js";
import Issue from "../models/issue.model.js";
import IssueStatusHistory from "../models/issueStatusHistory.model.js";
import IssueSupport from "../models/issueSupport.model.js";
import IssueFlag from "../models/issueFlag.model.js";
import StaffRequest from "../models/staffRequest.model.js";
import Counter from "../models/counter.model.js";

export async function runSeed(): Promise<void> {
  console.log("Starting idempotent database seed for StreetMend...");

  await connectDatabase();

  const defaultPasswordHash = await bcrypt.hash(
    "Staff@123456",
    env.BCRYPT_SALT_ROUNDS,
  );
  const citizenPasswordHash = await bcrypt.hash(
    "Citizen@123456",
    env.BCRYPT_SALT_ROUNDS,
  );
  const adminPasswordHash = await bcrypt.hash(
    env.ADMIN_PASSWORD,
    env.BCRYPT_SALT_ROUNDS,
  );

  const admin = await User.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    {
      name: "StreetMend Platform Administrator",
      email: env.ADMIN_EMAIL.toLowerCase(),
      password: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
      phone: "+1-555-0100",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Platform Admin: ${admin.email}`);

  const departmentsData = [
    { name: "Roads & Infrastructure", code: "ROADS" },
    { name: "Water & Sewage Authority", code: "WATER" },
    { name: "Electricity & Public Lighting", code: "ELECTRICITY" },
    { name: "Sanitation & Waste Management", code: "SANITATION" },
  ];

  const departments: Record<string, any> = {};
  for (const d of departmentsData) {
    const dept = await Department.findOneAndUpdate(
      { code: d.code },
      { name: d.name, code: d.code, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    departments[d.code] = dept;
  }
  console.log(
    `Seeded ${Object.keys(departments).length} municipal departments`,
  );

  const ownersData = [
    {
      name: "Marcus Vance (Roads Owner)",
      email: "owner.roads@streetmend.gov",
      deptCode: "ROADS",
      phone: "+1-555-0201",
    },
    {
      name: "Elena Rostova (Water Owner)",
      email: "owner.water@streetmend.gov",
      deptCode: "WATER",
      phone: "+1-555-0202",
    },
    {
      name: "Kwame Nkrumah (Electricity Owner)",
      email: "owner.electricity@streetmend.gov",
      deptCode: "ELECTRICITY",
      phone: "+1-555-0203",
    },
    {
      name: "Sofia Al-Mansoor (Sanitation Owner)",
      email: "owner.sanitation@streetmend.gov",
      deptCode: "SANITATION",
      phone: "+1-555-0204",
    },
  ];

  const owners: Record<string, any> = {};
  for (const o of ownersData) {
    const dept = departments[o.deptCode];
    const user = await User.findOneAndUpdate(
      { email: o.email },
      {
        name: o.name,
        email: o.email,
        password: defaultPasswordHash,
        role: "STAFF",
        departmentId: dept._id,
        departmentPosition: "OWNER",
        isActive: true,
        isEmailVerified: true,
        staffApprovalStatus: "APPROVED",
        phone: o.phone,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    owners[o.deptCode] = user;

    dept.ownerId = user._id;
    await dept.save();
  }
  console.log("Appointed and linked 4 Department Owners");

  const staffMembersData = [
    {
      name: "David Miller (Roads Field Tech)",
      email: "staff.roads@streetmend.gov",
      deptCode: "ROADS",
      phone: "+1-555-0301",
    },
    {
      name: "Sarah Chen (Water Specialist)",
      email: "staff.water@streetmend.gov",
      deptCode: "WATER",
      phone: "+1-555-0302",
    },
    {
      name: "Tariq Bradley (Lighting Tech)",
      email: "staff.electricity@streetmend.gov",
      deptCode: "ELECTRICITY",
      phone: "+1-555-0303",
    },
    {
      name: "Maria Santos (Sanitation Inspector)",
      email: "staff.sanitation@streetmend.gov",
      deptCode: "SANITATION",
      phone: "+1-555-0304",
    },
  ];

  const staffMembers: Record<string, any> = {};
  for (const s of staffMembersData) {
    const dept = departments[s.deptCode];
    const user = await User.findOneAndUpdate(
      { email: s.email },
      {
        name: s.name,
        email: s.email,
        password: defaultPasswordHash,
        role: "STAFF",
        departmentId: dept._id,
        departmentPosition: "MEMBER",
        isActive: true,
        isEmailVerified: true,
        staffApprovalStatus: "APPROVED",
        phone: s.phone,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    staffMembers[s.deptCode] = user;
  }
  console.log("Seeded 4 approved department staff members");

  const pendingDept = departments["ROADS"];
  const pendingUser = await User.findOneAndUpdate(
    { email: "applicant.roads@streetmend.gov" },
    {
      name: "Alex Rivera (Pending Roads Applicant)",
      email: "applicant.roads@streetmend.gov",
      password: defaultPasswordHash,
      role: "STAFF",
      departmentId: pendingDept._id,
      departmentPosition: "MEMBER",
      isActive: false,
      isEmailVerified: true,
      staffApprovalStatus: "PENDING",
      phone: "+1-555-0401",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await StaffRequest.findOneAndUpdate(
    { applicantId: pendingUser._id, departmentId: pendingDept._id },
    {
      applicantId: pendingUser._id,
      departmentId: pendingDept._id,
      status: "PENDING",
      createdAt: new Date(),
    },
    { upsert: true, new: true },
  );
  console.log("Seeded 1 pending staff applicant awaiting approval");

  const citizensData = [
    {
      name: "John Civic Doe",
      email: "john.doe@citizen.org",
      phone: "+1-555-0501",
    },
    {
      name: "Jane Resident Smith",
      email: "jane.smith@citizen.org",
      phone: "+1-555-0502",
    },
  ];

  const citizens: any[] = [];
  for (const c of citizensData) {
    const citizen = await User.findOneAndUpdate(
      { email: c.email },
      {
        name: c.name,
        email: c.email,
        password: citizenPasswordHash,
        role: "CITIZEN",
        isActive: true,
        isEmailVerified: true,
        phone: c.phone,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    citizens.push(citizen);
  }
  console.log("Seeded 2 active citizens");

  const categoriesData = [
    {
      name: "Pothole & Pavement Damage",
      code: "POTHOLES",
      deptCode: "ROADS",
    },
    {
      name: "Damaged Sidewalk / Kerb",
      code: "SIDEWALK",
      deptCode: "ROADS",
    },
    {
      name: "Water Main Leak",
      code: "WATER_LEAK",
      deptCode: "WATER",
    },
    {
      name: "Sewage Overflow",
      code: "SEWAGE",
      deptCode: "WATER",
    },
    {
      name: "Broken Streetlight",
      code: "STREETLIGHT",
      deptCode: "ELECTRICITY",
    },
    {
      name: "Exposed Electrical Wires",
      code: "EXPOSED_WIRES",
      deptCode: "ELECTRICITY",
    },
    {
      name: "Illegal Waste Dumping",
      code: "GARBAGE",
      deptCode: "SANITATION",
    },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const dept = departments[cat.deptCode];
    const category = await IssueCategory.findOneAndUpdate(
      { code: cat.code },
      {
        name: cat.name,
        code: cat.code,
        departmentId: dept._id,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    categories[cat.code] = category;
  }
  console.log("Seeded 7 issue categories mapped to departments");

  const currentYear = new Date().getFullYear();

  // Wipe all existing issues, status histories, supports, flags, and counter to ensure a clean slate
  await Issue.deleteMany({});
  await IssueStatusHistory.deleteMany({});
  await IssueSupport.deleteMany({});
  await IssueFlag.deleteMany({});
  await Counter.deleteMany({});
  console.log(
    "Cleared existing issues, histories, support records, and counters",
  );

  // 1. Issue 1: Roads & Infrastructure - Pothole in Downtown Cairo (SUBMITTED)
  const issue1Created = new Date(Date.now() - 3600000 * 24);
  const issue1 = await Issue.create({
    reportNumber: `SM-${currentYear}-00001`,
    title: "Deep asphalt crater on Talaat Harb Street",
    description:
      "Significant roadway pothole near the pedestrian crossing causing severe vehicle alignment damage and slowing downtown traffic.",
    categoryId: categories["POTHOLES"]._id,
    departmentId: departments["ROADS"]._id,
    status: "SUBMITTED",
    priority: "HIGH",
    location: {
      type: "Point",
      coordinates: [31.2384, 30.0475], // Downtown Cairo (lon, lat)
    },
    address: "12 Talaat Harb Street, Downtown, Cairo, Egypt",
    images: [
      {
        url: "https://res.cloudinary.com/streetmend/image/upload/v1/mock/pothole_1.jpg",
        publicId: "mock/pothole_1",
      },
    ],
    createdBy: citizens[0]._id,
    supportCount: 1,
    flagCount: 0,
    isFlagged: false,
    isDeleted: false,
    createdAt: issue1Created,
  });

  await IssueStatusHistory.create({
    issueId: issue1._id,
    changedBy: citizens[0]._id,
    previousStatus: "NONE",
    newStatus: "SUBMITTED",
    reason: "Initial report submission by citizen",
    createdAt: issue1Created,
  });

  await IssueSupport.create({
    issueId: issue1._id,
    userId: citizens[1]._id,
    createdAt: new Date(Date.now() - 3600000 * 18),
  });

  // 2. Issue 2: Water & Sewage - Pipe Rupture in Zamalek (IN_PROGRESS)
  const issue2Created = new Date(Date.now() - 3600000 * 48);
  const issue2UnderReview = new Date(Date.now() - 3600000 * 36);
  const issue2Accepted = new Date(Date.now() - 3600000 * 24);
  const issue2InProgress = new Date(Date.now() - 3600000 * 10);

  const issue2 = await Issue.create({
    reportNumber: `SM-${currentYear}-00002`,
    title: "Underground water pipe rupture on 26th of July corridor",
    description:
      "Pressurized municipal drinking water bubbling up through curb stones onto the roadway and flooding pedestrian sidewalk.",
    categoryId: categories["WATER_LEAK"]._id,
    departmentId: departments["WATER"]._id,
    status: "IN_PROGRESS",
    priority: "URGENT",
    location: {
      type: "Point",
      coordinates: [31.2198, 30.0612], // Zamalek, Cairo (lon, lat)
    },
    address: "26th of July Corridor, Zamalek, Cairo, Egypt",
    images: [
      {
        url: "https://res.cloudinary.com/streetmend/image/upload/v1/mock/water_leak_1.jpg",
        publicId: "mock/water_leak_1",
      },
    ],
    createdBy: citizens[1]._id,
    assignedTo: staffMembers["WATER"]._id,
    supportCount: 2,
    flagCount: 0,
    isFlagged: false,
    isDeleted: false,
    createdAt: issue2Created,
  });

  await IssueStatusHistory.create([
    {
      issueId: issue2._id,
      changedBy: citizens[1]._id,
      previousStatus: "NONE",
      newStatus: "SUBMITTED",
      reason: "Initial report submission by citizen",
      createdAt: issue2Created,
    },
    {
      issueId: issue2._id,
      changedBy: owners["WATER"]._id,
      previousStatus: "SUBMITTED",
      newStatus: "UNDER_REVIEW",
      reason: "Water authority triage unit dispatched on-site inspection crew",
      createdAt: issue2UnderReview,
    },
    {
      issueId: issue2._id,
      changedBy: owners["WATER"]._id,
      previousStatus: "UNDER_REVIEW",
      newStatus: "ACCEPTED",
      reason:
        "Water utility confirmed municipal main line defect; work order approved and assigned to Sarah Chen",
      createdAt: issue2Accepted,
    },
    {
      issueId: issue2._id,
      changedBy: staffMembers["WATER"]._id,
      previousStatus: "ACCEPTED",
      newStatus: "IN_PROGRESS",
      reason:
        "Heavy machinery on site; main supply valve isolation and excavation in progress",
      createdAt: issue2InProgress,
    },
  ]);

  await IssueSupport.create([
    {
      issueId: issue2._id,
      userId: citizens[0]._id,
      createdAt: new Date(Date.now() - 3600000 * 30),
    },
    {
      issueId: issue2._id,
      userId: staffMembers["ROADS"]._id,
      createdAt: new Date(Date.now() - 3600000 * 20),
    },
  ]);

  // 3. Issue 3: Electricity & Lighting - Broken Streetlight in Heliopolis (RESOLVED)
  const issue3Created = new Date(Date.now() - 3600000 * 36);
  const issue3UnderReview = new Date(Date.now() - 3600000 * 28);
  const issue3Accepted = new Date(Date.now() - 3600000 * 20);
  const issue3InProgress = new Date(Date.now() - 3600000 * 12);
  const issue3Resolved = new Date(Date.now() - 3600000 * 4);

  const issue3 = await Issue.create({
    reportNumber: `SM-${currentYear}-00003`,
    title: "Dark streetlights cluster along Baghdad Street",
    description:
      "Three consecutive high-mast streetlights flickering and out at night, causing hazardous crossing conditions for pedestrians.",
    categoryId: categories["STREETLIGHT"]._id,
    departmentId: departments["ELECTRICITY"]._id,
    status: "RESOLVED",
    priority: "MEDIUM",
    location: {
      type: "Point",
      coordinates: [31.3285, 30.0895], // Korba, Heliopolis, Cairo (lon, lat)
    },
    address: "Baghdad Street, Korba, Heliopolis, Cairo, Egypt",
    images: [
      {
        url: "https://res.cloudinary.com/streetmend/image/upload/v1/mock/light_before.jpg",
        publicId: "mock/light_before",
      },
    ],
    resolutionNotes:
      "Replaced damaged 150W LED luminaire module and repaired degraded underground feeder cable. Streetlight bank verified fully operational.",
    resolutionImages: [
      {
        url: "https://res.cloudinary.com/streetmend/image/upload/v1/mock/light_after.jpg",
        publicId: "mock/light_after",
      },
    ],
    createdBy: citizens[0]._id,
    assignedTo: staffMembers["ELECTRICITY"]._id,
    supportCount: 0,
    flagCount: 0,
    isFlagged: false,
    isDeleted: false,
    resolvedAt: issue3Resolved,
    createdAt: issue3Created,
  });

  await IssueStatusHistory.create([
    {
      issueId: issue3._id,
      changedBy: citizens[0]._id,
      previousStatus: "NONE",
      newStatus: "SUBMITTED",
      reason: "Initial report submission by citizen",
      createdAt: issue3Created,
    },
    {
      issueId: issue3._id,
      changedBy: owners["ELECTRICITY"]._id,
      previousStatus: "SUBMITTED",
      newStatus: "UNDER_REVIEW",
      reason: "Electrical night inspection team verified outage sector",
      createdAt: issue3UnderReview,
    },
    {
      issueId: issue3._id,
      changedBy: owners["ELECTRICITY"]._id,
      previousStatus: "UNDER_REVIEW",
      newStatus: "ACCEPTED",
      reason:
        "Work order authorized for aerial bucket truck crew and replacement fixtures",
      createdAt: issue3Accepted,
    },
    {
      issueId: issue3._id,
      changedBy: staffMembers["ELECTRICITY"]._id,
      previousStatus: "ACCEPTED",
      newStatus: "IN_PROGRESS",
      reason:
        "Aerial maintenance crew deployed with bucket truck; electrical conduit diagnosis underway",
      createdAt: issue3InProgress,
    },
    {
      issueId: issue3._id,
      changedBy: staffMembers["ELECTRICITY"]._id,
      previousStatus: "IN_PROGRESS",
      newStatus: "RESOLVED",
      reason:
        "Replaced damaged 150W LED luminaire module and repaired degraded underground feeder cable.",
      createdAt: issue3Resolved,
    },
  ]);

  // 4. Issue 4: Sanitation & Waste Management in Maadi (ACCEPTED)
  const issue4Created = new Date(Date.now() - 3600000 * 18);
  const issue4UnderReview = new Date(Date.now() - 3600000 * 12);
  const issue4Accepted = new Date(Date.now() - 3600000 * 5);

  const issue4 = await Issue.create({
    reportNumber: `SM-${currentYear}-00004`,
    title: "Overflowing commercial refuse containers on Corniche El Nil",
    description:
      "Municipal waste bins overflowing onto pedestrian walkway along river promenade, causing public health hazard and sidewalk blockage.",
    categoryId: categories["GARBAGE"]._id,
    departmentId: departments["SANITATION"]._id,
    status: "ACCEPTED",
    priority: "MEDIUM",
    location: {
      type: "Point",
      coordinates: [31.258, 29.959], // Corniche El Nil, Maadi, Cairo (lon, lat)
    },
    address: "Corniche El Nil Promenade, Maadi, Cairo, Egypt",
    images: [
      {
        url: "https://res.cloudinary.com/streetmend/image/upload/v1/mock/garbage_1.jpg",
        publicId: "mock/garbage_1",
      },
    ],
    createdBy: citizens[1]._id,
    assignedTo: staffMembers["SANITATION"]._id,
    supportCount: 3,
    flagCount: 0,
    isFlagged: false,
    isDeleted: false,
    createdAt: issue4Created,
  });

  await IssueStatusHistory.create([
    {
      issueId: issue4._id,
      changedBy: citizens[1]._id,
      previousStatus: "NONE",
      newStatus: "SUBMITTED",
      reason: "Initial report submission by citizen",
      createdAt: issue4Created,
    },
    {
      issueId: issue4._id,
      changedBy: owners["SANITATION"]._id,
      previousStatus: "SUBMITTED",
      newStatus: "UNDER_REVIEW",
      reason:
        "Sanitation district supervisor inspected container capacity and litter dispersion",
      createdAt: issue4UnderReview,
    },
    {
      issueId: issue4._id,
      changedBy: owners["SANITATION"]._id,
      previousStatus: "UNDER_REVIEW",
      newStatus: "ACCEPTED",
      reason:
        "Compactor truck route scheduled for specialized container exchange and sanitation washdown",
      createdAt: issue4Accepted,
    },
  ]);

  await Counter.findByIdAndUpdate(
    `issue_${currentYear}`,
    { seq: 4 },
    { upsert: true, new: true },
  );

  console.log(
    "Seeded 4 authentic Cairo/Egypt civic issues and synchronized report counter to seq 4",
  );
  console.log("Seed script completed successfully!");

  await disconnectDatabase();
}

if (
  process.argv[1]?.endsWith("seed.ts") ||
  process.argv[1]?.endsWith("seed.js")
) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
