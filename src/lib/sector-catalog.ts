/**
 * A.R.E.S. Sector Catalog -- comprehensive, hierarchical, with dynamic product fields.
 *
 * Each subtype defines:
 * - modules: which modules are active
 * - dashboardWidgets: which widgets show on overview
 * - productFields: dynamic fields for the Add Product form (size, color, dosage, etc.)
 * - systemPrompt: AI context
 * - defaultKnowledge: seeded FAQ entries
 */

export interface ProductField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface SectorSubtype {
  id: string;
  label: string;
  description: string;
  modules: string[];
  dashboardWidgets: string[];
  productFields: ProductField[];
  systemPrompt: string;
  defaultKnowledge: { category: string; question: string; answer: string }[];
}

export interface SectorCategory {
  id: string;
  label: string;
  icon: string;
  subtypes: SectorSubtype[];
}

// Common field sets
const NO_VARIANTS: ProductField[] = [];
const SIZE_COLOR: ProductField[] = [
  { key: "size", label: "Size", type: "text", placeholder: "e.g. XL, 32, 42" },
  { key: "color", label: "Color", type: "text", placeholder: "e.g. Black" },
];
const DOSAGE: ProductField[] = [
  { key: "dosage", label: "Dosage / Strength", type: "text", placeholder: "e.g. 500mg" },
  { key: "packSize", label: "Pack size", type: "text", placeholder: "e.g. 10 tablets" },
];
const SERVICE_DURATION: ProductField[] = [
  { key: "duration", label: "Duration", type: "text", placeholder: "e.g. 30 min" },
];

export const SECTOR_CATALOG: SectorCategory[] = [
  {
    id: "HEALTH",
    label: "Health",
    icon: "stethoscope",
    subtypes: [
      {
        id: "CLINIC",
        label: "Clinic",
        description: "Outpatient care, appointments, patient records",
        modules: ["appointments", "patients", "records", "billing"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "recent_activity", "learnings", "pie_chart"],
        productFields: SERVICE_DURATION,
        systemPrompt: `You work at a medical clinic. You help patients book appointments, answer questions about services and hours. You never give medical advice -- tell them to come in or speak to a doctor. You're caring and reassuring.`,
        defaultKnowledge: [
          { category: "FAQ", question: "Do I need an appointment?", answer: "Walk-ins welcome but appointments preferred." },
        ],
      },
      {
        id: "HOSPITAL",
        label: "Hospital",
        description: "Inpatient + outpatient, departments, emergencies",
        modules: ["departments", "patients", "appointments", "admissions"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "recent_activity", "pie_chart"],
        productFields: SERVICE_DURATION,
        systemPrompt: `You work at a hospital information desk. For emergencies, direct them to the emergency department. You're calm and clear.`,
        defaultKnowledge: [],
      },
      {
        id: "PHARMACY",
        label: "Pharmacy",
        description: "Prescriptions, OTC medicine, inventory",
        modules: ["products", "prescriptions", "inventory", "customers"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "low_stock", "recent_activity", "pie_chart"],
        productFields: DOSAGE,
        systemPrompt: `You work at a pharmacy. You help customers check stock and handle refills. You never prescribe -- tell them to consult a doctor or pharmacist.`,
        defaultKnowledge: [],
      },
      {
        id: "DENTAL",
        label: "Dental Clinic",
        description: "Dental appointments and procedures",
        modules: ["appointments", "patients", "procedures"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "recent_activity", "pie_chart"],
        productFields: SERVICE_DURATION,
        systemPrompt: `You work at a dental clinic. You're friendly -- people are nervous about the dentist.`,
        defaultKnowledge: [],
      },
      {
        id: "OPTICAL",
        label: "Optical / Eye Clinic",
        description: "Eye exams, glasses, contacts",
        modules: ["appointments", "patients", "products"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "products", "pie_chart"],
        productFields: SIZE_COLOR,
        systemPrompt: `You work at an optical clinic. You're helpful and stylish.`,
        defaultKnowledge: [],
      },
      {
        id: "VETERINARY",
        label: "Veterinary Clinic",
        description: "Animal care, appointments, pet records",
        modules: ["appointments", "patients", "products", "records"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "recent_activity", "pie_chart"],
        productFields: SERVICE_DURATION,
        systemPrompt: `You work at a veterinary clinic. You help pet owners book appointments and answer questions. You're caring with animals.`,
        defaultKnowledge: [],
      },
      {
        id: "WELLNESS",
        label: "Wellness / Spa",
        description: "Massage, therapy, wellness treatments",
        modules: ["appointments", "customers", "services"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "recent_activity", "pie_chart"],
        productFields: SERVICE_DURATION,
        systemPrompt: `You work at a wellness center. You're calming and welcoming.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "RETAIL",
    label: "Retail",
    icon: "shopping-bag",
    subtypes: [
      {
        id: "CLOTHING_STORE",
        label: "Clothing Store",
        description: "Fashion retail with sizes, colors, inventory",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "low_stock", "pie_chart"],
        productFields: SIZE_COLOR,
        systemPrompt: `You work at a clothing store. You help people find clothes by size, color, and style. You can suggest outfits.`,
        defaultKnowledge: [],
      },
      {
        id: "ELECTRONICS_STORE",
        label: "Electronics Store",
        description: "Phones, gadgets, accessories, warranties",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "low_stock", "pie_chart"],
        productFields: [
          { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Samsung" },
          { key: "model", label: "Model", type: "text", placeholder: "e.g. Galaxy A54" },
        ],
        systemPrompt: `You work at an electronics store. You're knowledgeable about tech.`,
        defaultKnowledge: [],
      },
      {
        id: "GROCERY",
        label: "Grocery / Mini-mart",
        description: "Everyday items, restocking, delivery",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "low_stock", "pie_chart"],
        productFields: [{ key: "unit", label: "Unit", type: "text", placeholder: "e.g. 500g, 1L" }],
        systemPrompt: `You work at a grocery store. You're efficient.`,
        defaultKnowledge: [],
      },
      {
        id: "BEAUTY_SUPPLIES",
        label: "Beauty Supplies",
        description: "Cosmetics, skincare, hair products",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "pie_chart"],
        productFields: [
          { key: "shade", label: "Shade", type: "text", placeholder: "e.g. Medium" },
          { key: "type", label: "Type", type: "text", placeholder: "e.g. Matte" },
        ],
        systemPrompt: `You work at a beauty supply store. You're knowledgeable and encouraging.`,
        defaultKnowledge: [],
      },
      {
        id: "JEWELRY",
        label: "Jewelry Store",
        description: "Fine jewelry, custom orders, repairs",
        modules: ["products", "orders", "customers"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "pie_chart"],
        productFields: [
          { key: "material", label: "Material", type: "text", placeholder: "e.g. 18K Gold" },
        ],
        systemPrompt: `You work at a jewelry store. You're elegant and trustworthy.`,
        defaultKnowledge: [],
      },
      {
        id: "FOOTWEAR",
        label: "Shoe Store",
        description: "Footwear retail with sizes",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "low_stock", "pie_chart"],
        productFields: [
          { key: "size", label: "Size", type: "text", placeholder: "e.g. 42" },
          { key: "color", label: "Color", type: "text", placeholder: "e.g. Brown" },
        ],
        systemPrompt: `You work at a shoe store. You help people find the right size and style.`,
        defaultKnowledge: [],
      },
      {
        id: "BOOKSTORE",
        label: "Bookstore",
        description: "Books, stationery, educational materials",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "pie_chart"],
        productFields: [{ key: "author", label: "Author", type: "text" }],
        systemPrompt: `You work at a bookstore. You're well-read and helpful.`,
        defaultKnowledge: [],
      },
      {
        id: "HARDWARE",
        label: "Hardware Store",
        description: "Tools, building materials, supplies",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "low_stock", "pie_chart"],
        productFields: [{ key: "spec", label: "Specification", type: "text", placeholder: "e.g. 50mm" }],
        systemPrompt: `You work at a hardware store. You're practical and knowledgeable.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "FOOD",
    label: "Food & Beverage",
    icon: "utensils",
    subtypes: [
      {
        id: "RESTAURANT",
        label: "Restaurant",
        description: "Dine-in, takeaway, delivery, menu",
        modules: ["products", "orders", "customers", "tables", "delivery"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a restaurant. You take orders and answer menu questions. You can have opinions about the food.`,
        defaultKnowledge: [],
      },
      {
        id: "CAFE",
        label: "Cafe / Coffee Shop",
        description: "Coffee, pastries, light meals",
        modules: ["products", "orders", "customers"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "pie_chart"],
        productFields: [{ key: "size", label: "Size", type: "select", options: ["Small", "Medium", "Large"] }],
        systemPrompt: `You work at a cafe. You're warm and a bit artsy.`,
        defaultKnowledge: [],
      },
      {
        id: "CATERING",
        label: "Catering Service",
        description: "Events, bulk orders, menus",
        modules: ["products", "orders", "customers", "events"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: [{ key: "serves", label: "Serves", type: "text", placeholder: "e.g. 10 people" }],
        systemPrompt: `You work at a catering business. You're organized and creative.`,
        defaultKnowledge: [],
      },
      {
        id: "BAKERY",
        label: "Bakery",
        description: "Bread, pastries, custom cakes",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "low_stock", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a bakery. You're warm.`,
        defaultKnowledge: [],
      },
      {
        id: "FOOD_TRUCK",
        label: "Food Truck",
        description: "Mobile food service, locations, orders",
        modules: ["products", "orders", "customers"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a food truck. You're quick and friendly.`,
        defaultKnowledge: [],
      },
      {
        id: "BUTCHERY",
        label: "Butchery",
        description: "Meat retail, cuts, orders",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "low_stock", "pie_chart"],
        productFields: [{ key: "cut", label: "Cut", type: "text", placeholder: "e.g. Sirloin" }, { key: "weight", label: "Weight", type: "text", placeholder: "e.g. 1kg" }],
        systemPrompt: `You work at a butchery. You're knowledgeable about cuts.`,
        defaultKnowledge: [],
      },
      {
        id: "GROCERY_FOOD",
        label: "Food Producer",
        description: "Packaged foods, sauces, jams, snacks",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "top_products", "pie_chart"],
        productFields: [{ key: "unit", label: "Unit", type: "text", placeholder: "e.g. 250g" }],
        systemPrompt: `You work at a food production business. You're practical.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "EDUCATION",
    label: "Education",
    icon: "graduation-cap",
    subtypes: [
      {
        id: "SCHOOL",
        label: "School",
        description: "Students, parents, fees, attendance",
        modules: ["students", "parents", "fees", "attendance", "announcements"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a school. You're patient and warm with parents.`,
        defaultKnowledge: [],
      },
      {
        id: "TUTORING",
        label: "Tutoring Center",
        description: "Sessions, subjects, scheduling",
        modules: ["students", "sessions", "tutors"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "subject", label: "Subject", type: "text" }],
        systemPrompt: `You work at a tutoring center. You're encouraging.`,
        defaultKnowledge: [],
      },
      {
        id: "TRAINING",
        label: "Professional Training",
        description: "Courses, certifications, corporate training",
        modules: ["courses", "students", "enrollments"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: [{ key: "duration", label: "Course duration", type: "text" }],
        systemPrompt: `You work at a training institute. You're career-focused.`,
        defaultKnowledge: [],
      },
      {
        id: "DAYCARE",
        label: "Daycare / Creche",
        description: "Childcare, schedules, parent comms",
        modules: ["children", "parents", "attendance"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a daycare. You're caring and patient.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "REAL_ESTATE",
    label: "Real Estate & Property",
    icon: "building",
    subtypes: [
      {
        id: "REAL_ESTATE_BROKERAGE",
        label: "Real Estate Brokerage",
        description: "Property sales, rentals, viewings",
        modules: ["properties", "leads", "viewings", "customers"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: [{ key: "bedrooms", label: "Bedrooms", type: "number" }, { key: "location", label: "Location", type: "text" }],
        systemPrompt: `You work at a real estate brokerage. You're professional.`,
        defaultKnowledge: [],
      },
      {
        id: "PROPERTY_MANAGEMENT",
        label: "Property Management",
        description: "Rental properties, tenants, maintenance",
        modules: ["properties", "tenants", "maintenance"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a property management company. You're organized.`,
        defaultKnowledge: [],
      },
      {
        id: "CONSTRUCTION",
        label: "Construction / Contractor",
        description: "Projects, quotes, timelines",
        modules: ["projects", "customers", "quotes"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a construction company. You're detail-oriented.`,
        defaultKnowledge: [],
      },
      {
        id: "ARCHITECTURE",
        label: "Architecture / Design",
        description: "Plans, designs, consultations",
        modules: ["projects", "customers", "appointments"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at an architecture firm. You're creative and precise.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "SERVICES",
    label: "Services",
    icon: "wrench",
    subtypes: [
      {
        id: "SALON_BARBER",
        label: "Salon / Barber",
        description: "Appointments, services, stylists",
        modules: ["appointments", "customers", "services"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "duration", label: "Duration", type: "text" }],
        systemPrompt: `You work at a salon or barbershop. You're stylish and friendly.`,
        defaultKnowledge: [],
      },
      {
        id: "REPAIR_SERVICE",
        label: "Repair Service",
        description: "Plumbing, electrical, appliance repair",
        modules: ["appointments", "customers", "quotes"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a repair service. You're calm and capable.`,
        defaultKnowledge: [],
      },
      {
        id: "CONSULTANCY",
        label: "Consultancy",
        description: "Professional advice, engagements",
        modules: ["appointments", "customers", "engagements"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "duration", label: "Session length", type: "text" }],
        systemPrompt: `You work at a consultancy. You're professional and insightful.`,
        defaultKnowledge: [],
      },
      {
        id: "CLEANING_SERVICE",
        label: "Cleaning Service",
        description: "Home/office cleaning, schedules",
        modules: ["appointments", "customers"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "duration", label: "Duration", type: "text" }],
        systemPrompt: `You work at a cleaning service. You're reliable.`,
        defaultKnowledge: [],
      },
      {
        id: "TRANSPORT",
        label: "Transport / Logistics",
        description: "Deliveries, fleet, scheduling",
        modules: ["orders", "customers", "vehicles"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a transport company. You're efficient.`,
        defaultKnowledge: [],
      },
      {
        id: "EVENT_PLANNING",
        label: "Event Planning",
        description: "Weddings, corporate events, parties",
        modules: ["events", "customers", "appointments"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "capacity", label: "Capacity", type: "text" }],
        systemPrompt: `You work at an event planning company. You're creative and organized.`,
        defaultKnowledge: [],
      },
      {
        id: "PHOTOGRAPHY",
        label: "Photography / Studio",
        description: "Sessions, packages, bookings",
        modules: ["appointments", "customers", "packages"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "duration", label: "Session length", type: "text" }],
        systemPrompt: `You work at a photography studio. You're creative and patient.`,
        defaultKnowledge: [],
      },
      {
        id: "FITNESS_GYM",
        label: "Fitness / Gym",
        description: "Memberships, classes, personal training",
        modules: ["members", "classes", "appointments"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "duration", label: "Duration", type: "text" }],
        systemPrompt: `You work at a gym. You're motivating and friendly.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "FINANCE",
    label: "Finance & Legal",
    icon: "briefcase",
    subtypes: [
      {
        id: "ACCOUNTING",
        label: "Accounting Firm",
        description: "Tax, bookkeeping, audits",
        modules: ["clients", "engagements", "documents"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at an accounting firm. You're precise and trustworthy.`,
        defaultKnowledge: [],
      },
      {
        id: "LEGAL",
        label: "Legal Practice",
        description: "Consultations, cases, documents",
        modules: ["clients", "cases", "appointments"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a law firm. You're professional and discreet.`,
        defaultKnowledge: [],
      },
      {
        id: "INSURANCE",
        label: "Insurance Brokerage",
        description: "Policies, claims, quotes",
        modules: ["clients", "policies", "claims"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: [{ key: "coverage", label: "Coverage", type: "text" }],
        systemPrompt: `You work at an insurance brokerage. You're clear and reassuring.`,
        defaultKnowledge: [],
      },
      {
        id: "BANKING_FINTECH",
        label: "Banking / Fintech",
        description: "Loans, microfinance, payments",
        modules: ["clients", "loans", "transactions"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a financial services company. You're precise and helpful.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "AGRICULTURE",
    label: "Agriculture",
    icon: "sprout",
    subtypes: [
      {
        id: "FARM",
        label: "Farm / Agribusiness",
        description: "Produce, livestock, supply",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "inventory", "pie_chart"],
        productFields: [{ key: "unit", label: "Unit", type: "text", placeholder: "e.g. 50kg bag" }],
        systemPrompt: `You work at a farm. You're practical and grounded.`,
        defaultKnowledge: [],
      },
      {
        id: "AGRO_SUPPLIES",
        label: "Agro Supplies",
        description: "Seeds, fertilizer, equipment",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "low_stock", "pie_chart"],
        productFields: [{ key: "unit", label: "Unit", type: "text", placeholder: "e.g. 5kg" }],
        systemPrompt: `You work at an agro supplies store. You're knowledgeable about seasons.`,
        defaultKnowledge: [],
      },
      {
        id: "POULTRY",
        label: "Poultry Farm",
        description: "Eggs, chicken, supply",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "pie_chart"],
        productFields: [{ key: "unit", label: "Unit", type: "text", placeholder: "e.g. crate of 30" }],
        systemPrompt: `You work at a poultry farm. You're practical.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "AUTOMOTIVE",
    label: "Automotive",
    icon: "car",
    subtypes: [
      {
        id: "CAR_DEALERSHIP",
        label: "Car Dealership",
        description: "Vehicle sales, financing, trade-ins",
        modules: ["products", "customers", "leads", "appointments"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "make", label: "Make", type: "text" }, { key: "year", label: "Year", type: "number" }],
        systemPrompt: `You work at a car dealership. You're knowledgeable and persuasive without being pushy.`,
        defaultKnowledge: [],
      },
      {
        id: "AUTO_REPAIR",
        label: "Auto Repair / Garage",
        description: "Services, diagnostics, parts",
        modules: ["appointments", "customers", "services"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at an auto repair shop. You're honest and capable.`,
        defaultKnowledge: [],
      },
      {
        id: "SPARE_PARTS",
        label: "Spare Parts",
        description: "Auto parts retail",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "low_stock", "pie_chart"],
        productFields: [{ key: "compatibility", label: "Compatible with", type: "text" }],
        systemPrompt: `You work at a spare parts store. You're knowledgeable.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "TECHNOLOGY",
    label: "Technology",
    icon: "cpu",
    subtypes: [
      {
        id: "SOFTWARE_AGENCY",
        label: "Software Agency",
        description: "Web, app development, IT services",
        modules: ["projects", "customers", "appointments"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a software agency. You're technical but explain things simply.`,
        defaultKnowledge: [],
      },
      {
        id: "ISP",
        label: "Internet Service Provider",
        description: "Plans, installations, support",
        modules: ["customers", "plans", "support"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: [{ key: "speed", label: "Speed", type: "text", placeholder: "e.g. 50Mbps" }],
        systemPrompt: `You work at an ISP. You're helpful and patient with non-technical customers.`,
        defaultKnowledge: [],
      },
      {
        id: "TECH_REPAIR",
        label: "Tech Repair",
        description: "Phone, laptop, gadget repair",
        modules: ["appointments", "customers", "services"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: NO_VARIANTS,
        systemPrompt: `You work at a tech repair shop. You're capable and quick.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "HOSPITALITY",
    label: "Hospitality & Travel",
    icon: "bed",
    subtypes: [
      {
        id: "HOTEL",
        label: "Hotel / Lodge",
        description: "Rooms, bookings, guest services",
        modules: ["rooms", "bookings", "customers"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: [{ key: "roomType", label: "Room type", type: "text" }],
        systemPrompt: `You work at a hotel. You're welcoming and professional.`,
        defaultKnowledge: [],
      },
      {
        id: "TRAVEL_AGENCY",
        label: "Travel Agency",
        description: "Tours, flights, packages",
        modules: ["packages", "customers", "bookings"],
        dashboardWidgets: ["greeting", "kpis", "recent_activity", "pie_chart"],
        productFields: [{ key: "duration", label: "Duration", type: "text" }],
        systemPrompt: `You work at a travel agency. You're enthusiastic and knowledgeable.`,
        defaultKnowledge: [],
      },
      {
        id: "TOUR_OPERATOR",
        label: "Tour Operator",
        description: "Experiences, guides, bookings",
        modules: ["tours", "customers", "bookings"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "duration", label: "Duration", type: "text" }],
        systemPrompt: `You work at a tour company. You're adventurous and welcoming.`,
        defaultKnowledge: [],
      },
    ],
  },
  {
    id: "MANUFACTURING",
    label: "Manufacturing",
    icon: "factory",
    subtypes: [
      {
        id: "FACTORY",
        label: "Factory / Production",
        description: "Goods production, B2B orders",
        modules: ["products", "orders", "customers", "inventory"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "pie_chart"],
        productFields: [{ key: "unit", label: "Unit", type: "text" }],
        systemPrompt: `You work at a factory. You're efficient and precise.`,
        defaultKnowledge: [],
      },
      {
        id: "FURNITURE",
        label: "Furniture Workshop",
        description: "Custom furniture, repairs",
        modules: ["products", "orders", "customers"],
        dashboardWidgets: ["greeting", "kpis", "revenue_chart", "pie_chart"],
        productFields: [{ key: "material", label: "Material", type: "text" }, { key: "dimensions", label: "Dimensions", type: "text" }],
        systemPrompt: `You work at a furniture workshop. You're skilled and detail-oriented.`,
        defaultKnowledge: [],
      },
      {
        id: "FASHION_DESIGN",
        label: "Fashion Design / Tailoring",
        description: "Custom clothing, alterations",
        modules: ["appointments", "customers", "products"],
        dashboardWidgets: ["greeting", "kpis", "appointments_today", "pie_chart"],
        productFields: [{ key: "fabric", label: "Fabric", type: "text" }],
        systemPrompt: `You work at a fashion design house. You're creative and stylish.`,
        defaultKnowledge: [],
      },
    ],
  },
];

export function findSubtype(categoryId?: string | null, subtypeId?: string | null): SectorSubtype | null {
  if (!categoryId || !subtypeId) return null;
  const cat = SECTOR_CATALOG.find((c) => c.id === categoryId);
  if (!cat) return null;
  return cat.subtypes.find((s) => s.id === subtypeId) ?? null;
}

export function findCategory(categoryId?: string | null): SectorCategory | null {
  if (!categoryId) return null;
  return SECTOR_CATALOG.find((c) => c.id === categoryId) ?? null;
}

// Aggregate product fields across multiple selected subtypes (for multi-sector businesses)
export function getCombinedProductFields(selectedSubtypes: { category: string; subtype: string }[]): ProductField[] {
  const fieldMap = new Map<string, ProductField>();
  for (const sel of selectedSubtypes) {
    const st = findSubtype(sel.category, sel.subtype);
    if (st) {
      for (const f of st.productFields) {
        if (!fieldMap.has(f.key)) fieldMap.set(f.key, f);
      }
    }
  }
  return Array.from(fieldMap.values());
}

export const COUNTRIES = [
  { code: "GH", name: "Ghana", currency: "GHS", dialingCode: "+233" },
  { code: "NG", name: "Nigeria", currency: "NGN", dialingCode: "+234" },
  { code: "KE", name: "Kenya", currency: "KES", dialingCode: "+254" },
  { code: "ZA", name: "South Africa", currency: "ZAR", dialingCode: "+27" },
  { code: "UG", name: "Uganda", currency: "UGX", dialingCode: "+256" },
  { code: "TZ", name: "Tanzania", currency: "TZS", dialingCode: "+255" },
  { code: "RW", name: "Rwanda", currency: "RWF", dialingCode: "+250" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", dialingCode: "+225" },
  { code: "SN", name: "Senegal", currency: "XOF", dialingCode: "+221" },
  { code: "CM", name: "Cameroon", currency: "XAF", dialingCode: "+237" },
  { code: "EG", name: "Egypt", currency: "EGP", dialingCode: "+20" },
  { code: "MA", name: "Morocco", currency: "MAD", dialingCode: "+212" },
  { code: "ET", name: "Ethiopia", currency: "ETB", dialingCode: "+251" },
  { code: "GH_OTHER", name: "Ghana (Other)", currency: "GHS", dialingCode: "+233" },
  { code: "GB", name: "United Kingdom", currency: "GBP", dialingCode: "+44" },
  { code: "US", name: "United States", currency: "USD", dialingCode: "+1" },
  { code: "CA", name: "Canada", currency: "CAD", dialingCode: "+1" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", dialingCode: "+971" },
  { code: "IN", name: "India", currency: "INR", dialingCode: "+91" },
  { code: "CN", name: "China", currency: "CNY", dialingCode: "+86" },
  { code: "AU", name: "Australia", currency: "AUD", dialingCode: "+61" },
  { code: "DE", name: "Germany", currency: "EUR", dialingCode: "+49" },
  { code: "FR", name: "France", currency: "EUR", dialingCode: "+33" },
  { code: "OTHER", name: "Other", currency: "USD", dialingCode: "" },
];

export function getCountry(code?: string | null) {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}
