import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import env from "../config/env.js";
import User from "../models/user.model.js";
import Department from "../models/department.model.js";
import IssueCategory from "../models/issueCategory.model.js";
import Issue from "../models/issue.model.js";
import IssueStatusHistory from "../models/issueStatusHistory.model.js";
import IssueSupport from "../models/issueSupport.model.js";
import StaffRequest from "../models/staffRequest.model.js";

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

  const issue1 = await Issue.findOneAndUpdate(
    { reportNumber: `SM-${currentYear}-00001` },
    {
      reportNumber: `SM-${currentYear}-00001`,
      title: "Dangerous deep pothole on Elm Street",
      description:
        "Large pothole in the right eastbound lane causing tire damage to passing vehicles.",
      categoryId: categories["POTHOLES"]._id,
      departmentId: departments["ROADS"]._id,
      status: "SUBMITTED",
      priority: "MEDIUM",
      location: {
        type: "Point",
        coordinates: [-73.9851, 40.7488],
      },
      address: "350 5th Ave, New York, NY",
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
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await IssueStatusHistory.findOneAndUpdate(
    { issueId: issue1._id, previousStatus: "NONE", newStatus: "SUBMITTED" },
    {
      issueId: issue1._id,
      changedBy: citizens[0]._id,
      previousStatus: "NONE",
      newStatus: "SUBMITTED",
      reason: "Initial report submission by citizen",
      createdAt: new Date(Date.now() - 3600000 * 48),
    },
    { upsert: true },
  );

  await IssueSupport.findOneAndUpdate(
    { issueId: issue1._id, userId: citizens[1]._id },
    {
      issueId: issue1._id,
      userId: citizens[1]._id,
      createdAt: new Date(),
    },
    { upsert: true },
  );

  const issue2 = await Issue.findOneAndUpdate(
    { reportNumber: `SM-${currentYear}-00002` },
    {
      reportNumber: `SM-${currentYear}-00002`,
      title: "Continuous high-pressure water pipe rupture",
      description:
        "Clean drinking water leaking rapidly through pavement curb onto pedestrian walkway.",
      categoryId: categories["WATER_LEAK"]._id,
      departmentId: departments["WATER"]._id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      location: {
        type: "Point",
        coordinates: [-73.9772, 40.7527],
      },
      address: "89 E 42nd St, New York, NY",
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
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await IssueStatusHistory.findOneAndUpdate(
    { issueId: issue2._id, newStatus: "IN_PROGRESS" },
    {
      issueId: issue2._id,
      changedBy: staffMembers["WATER"]._id,
      previousStatus: "ACCEPTED",
      newStatus: "IN_PROGRESS",
      reason: "Excavation and valve shutoff crew dispatched to site",
      createdAt: new Date(Date.now() - 3600000 * 12),
    },
    { upsert: true },
  );

  const resolvedDate = new Date(Date.now() - 3600000 * 4);
  const createdDate = new Date(Date.now() - 3600000 * 28);
  const issue3 = await Issue.findOneAndUpdate(
    { reportNumber: `SM-${currentYear}-00003` },
    {
      reportNumber: `SM-${currentYear}-00003`,
      title: "Dark intersection due to non-functioning streetlight",
      description:
        "Lamp post #42B flickering and completely dark at night, creating unsafe crossing.",
      categoryId: categories["STREETLIGHT"]._id,
      departmentId: departments["ELECTRICITY"]._id,
      status: "RESOLVED",
      priority: "LOW",
      location: {
        type: "Point",
        coordinates: [-73.9654, 40.7829],
      },
      address: "Central Park West & 72nd St, New York, NY",
      images: [
        {
          url: "https://res.cloudinary.com/streetmend/image/upload/v1/mock/light_before.jpg",
          publicId: "mock/light_before",
        },
      ],
      resolutionNotes:
        "Replaced burned-out 150W LED luminaire module and photocell sensor. System tested operational.",
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
      resolvedAt: resolvedDate,
      createdAt: createdDate,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await IssueStatusHistory.findOneAndUpdate(
    { issueId: issue3._id, newStatus: "RESOLVED" },
    {
      issueId: issue3._id,
      changedBy: staffMembers["ELECTRICITY"]._id,
      previousStatus: "IN_PROGRESS",
      newStatus: "RESOLVED",
      reason:
        "Replaced burned-out 150W LED luminaire module and photocell sensor.",
      createdAt: resolvedDate,
    },
    { upsert: true },
  );

  console.log(
    "Seeded 3 representative civic issues with status histories and supports",
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
