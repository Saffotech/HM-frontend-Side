import { planPricing, plansSeed } from "./plansData";

export const hospitalsSeed = [
  hospital("TNT-1001", "CITYGEN", "City General Hospital", "Multi-specialty", "Bengaluru", "Karnataka", "560025", "Dr. Ananya Rao", "Professional", "Active", "Active", "Annual", "None", "2025-11-12", "2026-10-09", 22, 64, 320),
  hospital("TNT-1002", "LAKEHC", "Lakeside Medical Center", "Teaching", "Chennai", "Tamil Nadu", "600006", "Dr. Karthik Subramanian", "Enterprise", "Active", "Active", "Annual", "None", "2025-12-03", "2026-12-03", 46, 380, 780),
  hospital("TNT-1003", "NORTHCH", "Northstar Children's Hospital", "Children's", "Mumbai", "Maharashtra", "400013", "Dr. Neha Kulkarni", "Starter", "Suspended", "Suspended", "Monthly", "None", "2025-12-18", "2026-11-18", 8, 11, 140),
  hospital("TNT-1004", "GREENFD", "Greenfield Community Hospital", "General", "Pune", "Maharashtra", "411001", "Rahul Deshpande", "Starter", "Active", "Active", "Monthly", "None", "2026-01-09", "2026-11-09", 9, 16, 90),
  hospital("TNT-1005", "APEXHT", "Apex Heart Institute", "Specialty", "Hyderabad", "Telangana", "500082", "Dr. Farah Qureshi", "Enterprise", "Active", "Active", "Annual", "None", "2026-02-02", "2026-11-15", 38, 260, 260),
  hospital("TNT-1006", "RIVERSD", "Riverside Clinic Group", "General", "Kochi", "Kerala", "682016", "Anita Mathew", "Professional", "Closed", "Cancelled", "Annual", "None", "2026-02-20", "2026-02-20", 0, 42, 60),
  hospital("TNT-1007", "HARMONY", "Harmony Women's Hospital", "Specialty", "Jaipur", "Rajasthan", "302001", "Dr. Meenal Joshi", "Professional", "Active", "Past Due", "Monthly", "None", "2026-03-06", "2026-11-06", 19, 72, 180),
  hospital("TNT-1008", "SUMMIT", "Summit Trauma Center", "Specialty", "New Delhi", "Delhi", "110016", "Dr. Arjun Malhotra", "Enterprise", "Active", "Active", "Annual", "None", "2026-03-24", "2027-03-24", 42, 410, 410),
  hospital("TNT-1009", "OAKRIDGE", "Oakridge Multispecialty", "Multi-specialty", "Ahmedabad", "Gujarat", "380015", "Dr. Pooja Shah", "Professional", "Active", "Active", "Annual", "None", "2026-04-11", "2026-10-11", 24, 81, 290),
  hospital("TNT-1010", "BLUEWTR", "Bluewater Diagnostics", "Diagnostic", "Kolkata", "West Bengal", "700019", "Sanjay Bose", "Starter", "Suspended", "Suspended", "Monthly", "None", "2026-04-28", "2026-10-28", 5, 8, 0),
  hospital("TNT-1011", "MERIDN", "Meridian Cancer Care", "Specialty", "Chandigarh", "Chandigarh", "160036", "Dr. Imran Siddiqi", "Enterprise", "Active", "Active", "Annual", "None", "2026-05-07", "2027-05-07", 31, 240, 220),
  hospital("TNT-1012", "PALMVIEW", "Palmview General Hospital", "General", "Panaji", "Goa", "403001", "Dr. Leena D'Souza", "Starter", "Active", "Trial", "Monthly", "30 days", "2026-06-04", "2026-11-03", 3, 2, 70),
  hospital("TNT-1013", "SILVER", "Silverline Orthopedics", "Specialty", "Lucknow", "Uttar Pradesh", "226010", "Dr. Vivek Tandon", "Professional", "Active", "Active", "Monthly", "None", "2026-06-19", "2026-11-12", 15, 48, 120),
  hospital("TNT-1014", "HARBOR", "Harborview Medical", "Multi-specialty", "Visakhapatnam", "Andhra Pradesh", "530002", "Dr. Sravani Reddy", "Professional", "Active", "Active", "Annual", "None", "2026-07-15", "2027-07-15", 20, 57, 240),
  hospital("TNT-1015", "CRESCENT", "Crescent Maternity", "Specialty", "Indore", "Madhya Pradesh", "452001", "Dr. Nidhi Agarwal", "Starter", "Suspended", "Suspended", "Monthly", "None", "2026-08-08", "2026-10-08", 7, 19, 80),
  hospital("TNT-1016", "EVERGRN", "Evergreen Rural Hospital", "General", "Coimbatore", "Tamil Nadu", "641001", "Revathi Krishnan", "Starter", "Active", "Active", "Monthly", "None", "2026-08-26", "2026-11-26", 10, 21, 55),
  hospital("TNT-1017", "NOVASUR", "Nova Surgical Center", "Specialty", "Surat", "Gujarat", "395007", "Dr. Harsh Patel", "Professional", "Active", "Active", "Monthly", "None", "2026-09-09", "2026-10-09", 17, 40, 100),
  hospital("TNT-1018", "WESTBR", "Westbridge Healthcare", "Multi-specialty", "Nagpur", "Maharashtra", "440010", "Dr. Aisha Khan", "Enterprise", "Active", "Active", "Annual", "None", "2026-10-01", "2027-10-01", 27, 110, 360),
];

function firstName(value) {
  return value.replace(/^Dr\.\s+/i, "").split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
}

function hospital(id, code, name, type, city, state, postalCode, contact, plan, status, subscriptionStatus, billingCycle, trialPeriod, registeredAt, renewalDate, users, storageUsedGb, beds) {
  const planInfo = plansSeed.find((item) => item.name === plan);
  const limits = {
    userLimit: planInfo?.userLimit || 0,
    storageLimitGb: planInfo?.storageLimitGb || 0,
    ...planPricing(plan, billingCycle),
  };
  const trial = subscriptionStatus === "Trial";
  return {
    id,
    code,
    name,
    type,
    email: `admin@${code.toLowerCase()}.example`,
    phone: "+91 80 4000 2100",
    address: "100 Care Avenue",
    city,
    state,
    postalCode,
    contactPerson: contact,
    adminName: contact,
    adminEmail: `${firstName(contact)}@${code.toLowerCase()}.example`,
    adminPhone: "+91 98450 22011",
    plan,
    status,
    subscriptionId: `SUB-${id.replace(/^TNT-/, "")}`,
    subscriptionStatus,
    billingCycle,
    trialPeriod,
    registeredAt,
    startDate: registeredAt,
    renewalDate,
    amount: trial ? 0 : limits.amount,
    monthlyRecurring: trial || status !== "Active" ? 0 : limits.monthlyRecurring,
    users: status === "Closed" ? 0 : users,
    userLimit: limits.userLimit,
    storageUsedGb,
    storageLimitGb: limits.storageLimitGb,
    beds,
  };
}

export const REQUEST_STATUSES = ["New", "Contacted", "Registered", "Not Interested"];
export const CONTACT_METHODS = ["Phone call", "Email", "WhatsApp", "Video meeting", "Site visit"];
export const CLOSE_REASONS = ["Not interested", "Budget constraints", "Chose another vendor", "Unreachable", "Duplicate request"];

export const onboardingSeed = [
  lead({
    id: "ONB-2406", hospitalName: "Lotus Valley Hospital", type: "General", city: "Noida", state: "Uttar Pradesh",
    contactPerson: "Dr. Kavita Menon", designation: "Medical Director", plan: "Professional", billingCycle: "Annual", beds: 120,
    source: "Website", submittedAt: "2026-10-05T18:20:00", status: "New", priority: "High",
    contactPhone: "+91 98111 20456",
    message: "Looking to move OPD, IPD and pharmacy billing to one system. Please call after 11 AM.",
  }),
  lead({
    id: "ONB-2405", hospitalName: "Sagar Speciality Clinic", type: "Specialty", city: "Mangaluru", state: "Karnataka",
    contactPerson: "Dr. Rakesh Pai", designation: "Owner", plan: "Starter", billingCycle: "Monthly", beds: 25,
    source: "Phone enquiry", submittedAt: "2026-10-04T12:05:00", status: "New",
    contactPhone: "+91 98451 77820",
    message: "Small clinic, needs appointments and patient records.",
  }),
  lead({
    id: "ONB-2404", hospitalName: "Lakshmi Eye Care", type: "Specialty", city: "Madurai", state: "Tamil Nadu",
    contactPerson: "Dr. Lakshmi Narayanan", designation: "Owner", plan: "Professional", billingCycle: "Monthly", beds: 40,
    source: "Campaign", submittedAt: "2026-10-08T11:30:00", status: "New", assignedTo: "Meera Iyer",
    contactPhone: "+91 98940 51276",
    message: "Saw the clinic software campaign. Needs OPD and optical billing.",
  }),
  lead({
    id: "ONB-2403", hospitalName: "Aster Bay Hospital", type: "Multi-specialty", city: "Thiruvananthapuram", state: "Kerala",
    contactPerson: "Dr. Fathima Noor", designation: "CEO", plan: "Enterprise", billingCycle: "Annual", beds: 300,
    source: "Referral", submittedAt: "2026-09-28T10:30:00", status: "Agreed", assignedTo: "Meera Iyer",
    priority: "High",
    contactPhone: "+91 98470 22110",
    message: "Referred by Lakeside Medical Center. Interested in multi-branch setup.",
    agreedAt: "2026-10-09T12:15:00", agreedBy: "Meera Iyer",
    handoverNote: "Accepted the Enterprise annual quotation. Billing contact is the CFO, Mr. Thomas (+91 98470 22111).",
    activity: [
      { at: "2026-10-09T12:15:00", by: "Meera Iyer", method: "Agreed", note: "Hospital agreed to register on Enterprise · Annual. Sent to accounts. Accepted the Enterprise annual quotation. Billing contact is the CFO, Mr. Thomas (+91 98470 22111)." },
      { at: "2026-10-01T15:00:00", by: "Meera Iyer", method: "Video meeting", note: "Product demo done with the IT team. Sending quotation for 2 branches." },
      { at: "2026-09-29T11:10:00", by: "Meera Iyer", method: "Phone call", note: "Introductory call. Wants Enterprise with lab integration." },
    ],
  }),
  lead({
    id: "ONB-2402", hospitalName: "Cedar Point Medical", type: "General", city: "Bhopal", state: "Madhya Pradesh",
    contactPerson: "Dr. Mohit Jain", designation: "Administrator", plan: "Professional", billingCycle: "Monthly", beds: 80,
    source: "Website", submittedAt: "2026-10-02T09:15:00", status: "Contacted", assignedTo: "Rohan Desai", followUpDate: "2026-10-05",
    priority: "High", nextAction: "Follow up on the pricing comparison.",
    contactPhone: "+91 98260 11840",
    message: "Comparing two vendors. Need pricing details.",
    activity: [
      { at: "2026-10-03T16:40:00", by: "Rohan Desai", method: "Email", note: "Shared pricing sheet and feature comparison." },
    ],
  }),
  lead({
    id: "ONB-2400", hospitalName: "Pinecrest Hospital", type: "General", city: "Shillong", state: "Meghalaya",
    contactPerson: "Dr. Daniel Lyngdoh", designation: "Administrator", plan: "Starter", billingCycle: "Monthly", beds: 45,
    source: "WhatsApp", submittedAt: "2026-09-30T17:45:00", status: "Contacted", assignedTo: "Meera Iyer", followUpDate: "2026-10-10",
    priority: "Medium", nextAction: "Confirm demo slot with the administrator.",
    contactPhone: "+91 98630 44120",
    message: "Asked about pricing on WhatsApp.",
    activity: [
      { at: "2026-10-02T10:20:00", by: "Meera Iyer", method: "WhatsApp", note: "Shared plan brochure. Wants a demo next week.", followUpDate: "2026-10-10", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2398", hospitalName: "Hillcrest Medical", type: "General", city: "Dehradun", state: "Uttarakhand",
    contactPerson: "Dr. Shalini Rawat", designation: "Medical Superintendent", plan: "Professional", billingCycle: "Annual", beds: 150,
    source: "Email", submittedAt: "2026-09-22T14:00:00", status: "Agreed", assignedTo: "Saffo Admin",
    priority: "Medium",
    contactPhone: "+91 98970 33421",
    message: "Want to start before November.",
    agreedAt: "2026-10-10T16:40:00", agreedBy: "Saffo Admin",
    handoverNote: "Wants to go live before November.",
    activity: [
      { at: "2026-10-10T16:40:00", by: "Saffo Admin", method: "Agreed", note: "Hospital agreed to register on Professional · Annual. Sent to accounts. Wants to go live before November." },
      { at: "2026-10-04T12:30:00", by: "Saffo Admin", method: "Phone call", note: "Agreed on Professional annual. Collecting administrator details for registration." },
      { at: "2026-09-23T10:00:00", by: "Saffo Admin", method: "Phone call", note: "Explained plans and onboarding timeline." },
    ],
  }),
  lead({
    id: "ONB-2395", hospitalName: "Kaveri Multispeciality", type: "Multi-specialty", city: "Tiruchirappalli", state: "Tamil Nadu",
    contactPerson: "Dr. Senthil Kumar", designation: "Managing Director", plan: "Professional", billingCycle: "Annual", beds: 180,
    source: "Referral", submittedAt: "2026-09-25T09:10:00", status: "Contacted", assignedTo: "Rohan Desai", followUpDate: "2026-10-15",
    priority: "High", nextAction: "Share the annual agreement draft.",
    contactPhone: "+91 98431 60218",
    message: "Referred by Harborview Medical.",
    activity: [
      { at: "2026-10-01T15:30:00", by: "Rohan Desai", method: "Video meeting", note: "Demo with the MD and finance head. Positive on Professional annual.", followUpDate: "2026-10-15", nextAction: "Share the annual agreement draft." },
      { at: "2026-09-26T11:00:00", by: "Rohan Desai", method: "Phone call", note: "Introductory call. Booked a demo.", followUpDate: "2026-10-01", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2390", hospitalName: "Westbridge Healthcare", type: "Multi-specialty", city: "Nagpur", state: "Maharashtra",
    contactPerson: "Dr. Aisha Khan", designation: "Director", plan: "Enterprise", billingCycle: "Annual", beds: 360,
    source: "Referral", submittedAt: "2026-09-20T11:00:00", status: "Registered", assignedTo: "Meera Iyer",
    hospitalId: "TNT-1018", registeredAt: "2026-10-01T10:00:00", registeredBy: "Meera Iyer",
    activity: [
      { at: "2026-10-01T10:00:00", by: "Meera Iyer", method: "Registration", note: "Registered as hospital TNT-1018." },
      { at: "2026-09-24T15:30:00", by: "Meera Iyer", method: "Site visit", note: "Visited the hospital. Contract signed." },
    ],
  }),
  lead({
    id: "ONB-2381", hospitalName: "Nova Surgical Center", type: "Specialty", city: "Surat", state: "Gujarat",
    contactPerson: "Dr. Harsh Patel", designation: "Founder", plan: "Professional", billingCycle: "Monthly", beds: 100,
    source: "Website", submittedAt: "2026-09-02T09:40:00", status: "Registered", assignedTo: "Rohan Desai",
    hospitalId: "TNT-1017", registeredAt: "2026-09-09T12:00:00", registeredBy: "Rohan Desai",
    activity: [
      { at: "2026-09-09T12:00:00", by: "Rohan Desai", method: "Registration", note: "Registered as hospital TNT-1017." },
      { at: "2026-09-04T11:00:00", by: "Rohan Desai", method: "Phone call", note: "Confirmed plan and administrator details." },
    ],
  }),
  lead({
    id: "ONB-2377", hospitalName: "Metro Care Clinic", type: "General", city: "Patna", state: "Bihar",
    contactPerson: "Amit Kumar", designation: "Manager", plan: "Starter", billingCycle: "Monthly", beds: 20,
    source: "Phone enquiry", submittedAt: "2026-08-22T13:20:00", status: "Not Interested", assignedTo: "Rohan Desai", priority: "Low",
    closeReason: "Budget constraints", closeNote: "Budget not approved this year. Asked to reconnect next quarter.",
    closedBy: "Rohan Desai", closedAt: "2026-08-25T12:00:00",
    activity: [
      { at: "2026-08-25T12:00:00", by: "Rohan Desai", method: "Phone call", note: "Budget not approved this year. Asked to reconnect next quarter." },
    ],
  }),
  lead({
    id: "ONB-2371", hospitalName: "Riverbend Nursing Home", type: "General", city: "Mysuru", state: "Karnataka",
    contactPerson: "Dr. Lata Rao", designation: "Owner", plan: "Starter", billingCycle: "Monthly", beds: 30,
    source: "Website", submittedAt: "2026-08-14T10:00:00", status: "Not Interested", assignedTo: "Saffo Admin", priority: "Low",
    closeReason: "Chose another vendor", closeNote: "Informed us they selected another vendor.",
    closedBy: "Saffo Admin", closedAt: "2026-08-18T17:00:00",
    activity: [
      { at: "2026-08-18T17:00:00", by: "Saffo Admin", method: "Email", note: "Informed us they selected another vendor." },
    ],
  }),
  lead({
    id: "ONB-2350", hospitalName: "Shanti Hospital", type: "General", city: "Vadodara", state: "Gujarat",
    contactPerson: "Dr. Nirav Mehta", designation: "Owner", plan: "Professional", billingCycle: "Monthly", beds: 60,
    source: "Website", submittedAt: "2026-09-08T12:40:00", status: "Not Interested", assignedTo: "Rohan Desai", priority: "Medium",
    closeReason: "Chose another vendor", closeNote: "Went with a local vendor already used by their lab.",
    closedBy: "Rohan Desai", closedAt: "2026-09-18T16:00:00",
    activity: [
      { at: "2026-09-18T16:00:00", by: "Rohan Desai", method: "Closed", note: "Chose another vendor. Went with a local vendor already used by their lab." },
      { at: "2026-09-09T10:30:00", by: "Rohan Desai", method: "Phone call", note: "Shared pricing. They are comparing with a local vendor.", followUpDate: "2026-09-15", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2342", hospitalName: "Evergreen Rural Hospital", type: "General", city: "Coimbatore", state: "Tamil Nadu",
    contactPerson: "Revathi Krishnan", designation: "Administrator", plan: "Starter", billingCycle: "Monthly", beds: 55,
    source: "Phone enquiry", submittedAt: "2026-08-12T10:15:00", status: "Registered", assignedTo: "Rohan Desai",
    hospitalId: "TNT-1016", registeredAt: "2026-08-26T12:00:00", registeredBy: "Rohan Desai",
    activity: [
      { at: "2026-08-26T12:00:00", by: "Rohan Desai", method: "Registration", note: "Registered as hospital TNT-1016." },
      { at: "2026-08-20T11:00:00", by: "Rohan Desai", method: "Site visit", note: "Walked the team through billing and records.", followUpDate: "2026-08-25" },
      { at: "2026-08-13T09:30:00", by: "Rohan Desai", method: "Phone call", note: "Explained the Starter plan.", followUpDate: "2026-08-20", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2338", hospitalName: "Crescent Maternity", type: "Specialty", city: "Indore", state: "Madhya Pradesh",
    contactPerson: "Dr. Nidhi Agarwal", designation: "Director", plan: "Starter", billingCycle: "Monthly", beds: 80,
    source: "Website", submittedAt: "2026-07-28T15:20:00", status: "Registered", assignedTo: "Saffo Admin",
    hospitalId: "TNT-1015", registeredAt: "2026-08-08T10:00:00", registeredBy: "Saffo Admin",
    activity: [
      { at: "2026-08-08T10:00:00", by: "Saffo Admin", method: "Registration", note: "Registered as hospital TNT-1015." },
      { at: "2026-08-05T14:00:00", by: "Saffo Admin", method: "Email", note: "Sent onboarding checklist.", followUpDate: "2026-08-07" },
      { at: "2026-07-29T12:00:00", by: "Saffo Admin", method: "Phone call", note: "Discussed maternity workflows.", followUpDate: "2026-08-02", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2330", hospitalName: "Green Valley Clinic", type: "General", city: "Siliguri", state: "West Bengal",
    contactPerson: "Dr. Arup Sen", designation: "Owner", plan: "Starter", billingCycle: "Monthly", beds: 20,
    source: "Phone enquiry", submittedAt: "2026-07-10T09:00:00", status: "Not Interested", assignedTo: "Saffo Admin", priority: "Low",
    closeReason: "Budget constraints", closeNote: "Will revisit next financial year.",
    closedBy: "Saffo Admin", closedAt: "2026-07-22T13:00:00",
    activity: [
      { at: "2026-07-22T13:00:00", by: "Saffo Admin", method: "Closed", note: "Budget constraints. Will revisit next financial year." },
      { at: "2026-07-11T10:00:00", by: "Saffo Admin", method: "Phone call", note: "Shared Starter pricing.", followUpDate: "2026-07-16", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2325", hospitalName: "Harborview Medical", type: "Multi-specialty", city: "Visakhapatnam", state: "Andhra Pradesh",
    contactPerson: "Dr. Sravani Reddy", designation: "CEO", plan: "Professional", billingCycle: "Annual", beds: 240,
    source: "Referral", submittedAt: "2026-07-02T11:45:00", status: "Registered", assignedTo: "Meera Iyer",
    hospitalId: "TNT-1014", registeredAt: "2026-07-15T10:30:00", registeredBy: "Meera Iyer",
    activity: [
      { at: "2026-07-15T10:30:00", by: "Meera Iyer", method: "Registration", note: "Registered as hospital TNT-1014." },
      { at: "2026-07-09T15:00:00", by: "Meera Iyer", method: "Site visit", note: "Met the CEO and IT head. Agreed on Professional annual.", followUpDate: "2026-07-14" },
      { at: "2026-07-03T10:00:00", by: "Meera Iyer", method: "Phone call", note: "Introductory call.", followUpDate: "2026-07-08", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2315", hospitalName: "Sunrise Diagnostics", type: "Diagnostic", city: "Raipur", state: "Chhattisgarh",
    contactPerson: "Vikram Sahu", designation: "Manager", plan: "Starter", billingCycle: "Monthly", beds: 0,
    source: "Website", submittedAt: "2026-07-20T16:10:00", status: "Not Interested", assignedTo: "Meera Iyer", priority: "Low",
    closeReason: "Unreachable", closeNote: "No response after three attempts.",
    closedBy: "Meera Iyer", closedAt: "2026-07-31T12:00:00",
    activity: [
      { at: "2026-07-31T12:00:00", by: "Meera Iyer", method: "Closed", note: "Unreachable. No response after three attempts." },
      { at: "2026-07-29T11:00:00", by: "Meera Iyer", method: "Phone call", note: "No answer." },
      { at: "2026-07-21T10:30:00", by: "Meera Iyer", method: "Phone call", note: "No answer. Left a message.", followUpDate: "2026-07-25", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2310", hospitalName: "Silverline Orthopedics", type: "Specialty", city: "Lucknow", state: "Uttar Pradesh",
    contactPerson: "Dr. Vivek Tandon", designation: "Founder", plan: "Professional", billingCycle: "Monthly", beds: 120,
    source: "Website", submittedAt: "2026-06-05T10:00:00", status: "Registered", assignedTo: "Rohan Desai",
    hospitalId: "TNT-1013", registeredAt: "2026-06-19T11:00:00", registeredBy: "Rohan Desai",
    activity: [
      { at: "2026-06-19T11:00:00", by: "Rohan Desai", method: "Registration", note: "Registered as hospital TNT-1013." },
      { at: "2026-06-12T16:00:00", by: "Rohan Desai", method: "Video meeting", note: "Demo of OT scheduling and billing.", followUpDate: "2026-06-18" },
      { at: "2026-06-06T10:30:00", by: "Rohan Desai", method: "Phone call", note: "Introductory call.", followUpDate: "2026-06-12", statusAfter: "Contacted" },
    ],
  }),
  lead({
    id: "ONB-2304", hospitalName: "Palmview General Hospital", type: "General", city: "Panaji", state: "Goa",
    contactPerson: "Dr. Leena D'Souza", designation: "Medical Director", plan: "Starter", billingCycle: "Monthly", beds: 70,
    source: "Campaign", submittedAt: "2026-05-25T13:00:00", status: "Registered", assignedTo: "Meera Iyer",
    hospitalId: "TNT-1012", registeredAt: "2026-06-04T10:00:00", registeredBy: "Meera Iyer",
    activity: [
      { at: "2026-06-04T10:00:00", by: "Meera Iyer", method: "Registration", note: "Registered as hospital TNT-1012 on a 30-day trial." },
      { at: "2026-05-26T12:00:00", by: "Meera Iyer", method: "Phone call", note: "Wants to try before committing.", followUpDate: "2026-06-01", statusAfter: "Contacted" },
    ],
  }),
];

function slug(value) {
  return value.replace(/^Dr\.\s+/i, "").split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
}

function lead(input) {
  const domain = input.hospitalName.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10);
  return {
    contactEmail: `${slug(input.contactPerson)}@${domain}.example`,
    contactPhone: "+91 98100 33445",
    hospitalEmail: `info@${domain}.example`,
    message: "",
    assignedTo: "",
    followUpDate: "",
    nextAction: "",
    priority: "Medium",
    activity: [],
    agreedAt: "",
    agreedBy: "",
    handoverNote: "",
    hospitalId: "",
    registeredAt: "",
    registeredBy: "",
    closeReason: "",
    closeNote: "",
    closedBy: "",
    closedAt: "",
    ...input,
  };
}
