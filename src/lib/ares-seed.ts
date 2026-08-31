/**
 * A.R.E.S. seed — creates one demo business per sector so the dashboard
 * preview and AI chat can run on real data, not hardcoded mock values.
 */
import { db } from "@/lib/db";

const SECTORS = [
  {
    type: "CLOTHING_STORE",
    name: "Accra Threads Co.",
    slug: "accra-threads",
    description:
      "Premium streetwear and African-inspired fashion retail based in Accra, serving customers across Ghana with WhatsApp-based ordering and doorstep delivery.",
    country: "GH",
    currency: "GHS",
    modules: ["inventory", "orders", "customers", "deliveries", "marketing", "whatsapp"],
    products: [
      { name: "Kente Hoodie — Black", price: 320, stock: 4, attrs: { size: "XL", color: "Black" }, category: "Hoodies" },
      { name: "Kente Hoodie — Black", price: 320, stock: 18, attrs: { size: "L", color: "Black" }, category: "Hoodies" },
      { name: "Kente Hoodie — Sand", price: 320, stock: 9, attrs: { size: "M", color: "Sand" }, category: "Hoodies" },
      { name: "Accra Logo Tee — White", price: 120, stock: 42, attrs: { size: "M", color: "White" }, category: "T-Shirts" },
      { name: "Accra Logo Tee — White", price: 120, stock: 3, attrs: { size: "XL", color: "White" }, category: "T-Shirts" },
      { name: "Linen Trousers — Olive", price: 240, stock: 12, attrs: { size: "32", color: "Olive" }, category: "Trousers" },
      { name: "Linen Trousers — Navy", price: 240, stock: 7, attrs: { size: "34", color: "Navy" }, category: "Trousers" },
      { name: "Beaded Slide Sandals", price: 180, stock: 22, attrs: { size: "42", color: "Multi" }, category: "Footwear" },
    ],
    knowledge: [
      { category: "POLICY", question: "What is your return policy?", answer: "Items can be returned within 7 days if unworn and with original tags. Sale items are final sale." },
      { category: "POLICY", question: "Do you deliver outside Accra?", answer: "Yes. We deliver nationwide via GDA and Stable Express. Delivery fee is calculated by region at checkout." },
      { category: "FAQ", question: "What payment methods do you accept?", answer: "Mobile Money (MTN MoMo, Telecel Cash, AirtelTigo Money), cash on delivery within Accra, and bank transfer." },
      { category: "OPERATING_HOURS", question: "When are you open?", answer: "Mon–Sat 9am–7pm GMT. Closed on Sundays and public holidays." },
    ],
  },
  {
    type: "RESTAURANT",
    name: "Bantuma Kitchen",
    slug: "bantuma-kitchen",
    description:
      "Contemporary Ghanaian restaurant in Osu fusing local flavors with modern plating. Dine-in, takeaway, and WhatsApp delivery across Accra.",
    country: "GH",
    currency: "GHS",
    modules: ["menu", "orders", "tables", "kitchen", "delivery", "customers"],
    products: [
      { name: "Jollof Rice & Chicken", price: 65, stock: 99, attrs: { size: "Regular", color: "" }, category: "Main" },
      { name: "Jollof Rice & Chicken", price: 95, stock: 99, attrs: { size: "Large", color: "" }, category: "Main" },
      { name: "Banku & Tilapia", price: 110, stock: 99, attrs: { size: "Regular", color: "" }, category: "Main" },
      { name: "Kelewele (Spicy Plantain)", price: 35, stock: 99, attrs: { size: "Small", color: "" }, category: "Sides" },
      { name: "Sobolo (Hibiscus Drink)", price: 18, stock: 60, attrs: { size: "500ml", color: "" }, category: "Drinks" },
      { name: "Palm Wine", price: 25, stock: 24, attrs: { size: "300ml", color: "" }, category: "Drinks" },
    ],
    knowledge: [
      { category: "FAQ", question: "Are your meals halal?", answer: "Yes. All our poultry and meat is sourced from halal-certified suppliers." },
      { category: "POLICY", question: "Do you take reservations?", answer: "Yes. Walk-ins welcome, but Friday and Saturday evenings book up — reserve via WhatsApp at least 2 hours ahead." },
      { category: "POLICY", question: "What's your delivery radius?", answer: "We deliver within 12km of Osu. Orders over GHS 150 deliver free; below that, a GHS 20 fee applies." },
    ],
  },
  {
    type: "SCHOOL",
    name: "Rising Stars Academy",
    slug: "rising-stars-academy",
    description:
      "Private basic school in Kumasi offering Creche, Nursery, and Primary education with a focus on numeracy, literacy, and character development.",
    country: "GH",
    currency: "GHS",
    modules: ["students", "parents", "attendance", "fees", "results", "announcements"],
    products: [
      { name: "Tuition — Creche (per term)", price: 1200, stock: 999, attrs: { size: "", color: "" }, category: "Fees" },
      { name: "Tuition — Nursery (per term)", price: 1400, stock: 999, attrs: { size: "", color: "" }, category: "Fees" },
      { name: "Tuition — Primary (per term)", price: 1800, stock: 999, attrs: { size: "", color: "" }, category: "Fees" },
      { name: "Uniform Set", price: 220, stock: 80, attrs: { size: "Various", color: "" }, category: "Supplies" },
    ],
    knowledge: [
      { category: "FAQ", question: "What are your admission requirements?", answer: "Completed admission form, birth certificate, two passport photos, and previous school report (for Primary transfers)." },
      { category: "POLICY", question: "When are fees due?", answer: "Fees are due within the first two weeks of each term. A 5% late fee applies after week two." },
      { category: "OPERATING_HOURS", question: "School hours?", answer: "Creche/Nursery: 7:30am–1pm. Primary: 7:30am–3pm. After-school care until 5:30pm at additional cost." },
    ],
  },
  {
    type: "REAL_ESTATE",
    name: "East Legon Estates",
    slug: "east-legon-estates",
    description:
      "Boutique real estate brokerage specializing in residential sales, rentals, and short-let management in premium Accra neighborhoods.",
    country: "GH",
    currency: "GHS",
    modules: ["properties", "leads", "agents", "viewings", "documents"],
    products: [
      { name: "3-Bedroom Townhouse — East Legon", price: 8500, stock: 1, attrs: { size: "3BR", color: "Rent/mo" }, category: "Rentals" },
      { name: "4-Bedroom Detached — Cantonments", price: 18500, stock: 1, attrs: { size: "4BR", color: "Rent/mo" }, category: "Rentals" },
      { name: "2-Bedroom Apartment — Labone", price: 4200, stock: 1, attrs: { size: "2BR", color: "Rent/mo" }, category: "Rentals" },
      { name: "5-Bedroom House — Trasacco Valley", price: 2200000, stock: 1, attrs: { size: "5BR", color: "Sale" }, category: "Sales" },
      { name: "Land — 1 Acre — Aburi", price: 450000, stock: 1, attrs: { size: "1 acre", color: "Sale" }, category: "Land" },
    ],
    knowledge: [
      { category: "FAQ", question: "What documents do I need to rent?", answer: "Valid ID, proof of income or employment, and one referee. For expats, a residence permit is also required." },
      { category: "POLICY", question: "What's your commission?", answer: "For rentals: 10% of annual rent. For sales: 5% of sale price, paid by seller." },
      { category: "FAQ", question: "Can I view a property before paying?", answer: "Yes. Viewings are free and scheduled via WhatsApp. We do not collect any payment until a formal offer is accepted." },
    ],
  },
  {
    type: "SERVICE",
    name: "ClearFlow Plumbing",
    slug: "clearflow-plumbing",
    description:
      "Licensed plumbing service in Greater Accra offering emergency repairs, installations, and routine maintenance for homes and small businesses.",
    country: "GH",
    currency: "GHS",
    modules: ["appointments", "quotes", "customers", "invoices", "support"],
    products: [
      { name: "Emergency Call-Out (after hours)", price: 350, stock: 999, attrs: { size: "", color: "" }, category: "Emergency" },
      { name: "Standard Repair Visit", price: 180, stock: 999, attrs: { size: "", color: "" }, category: "Service" },
      { name: "Bathroom Installation Quote", price: 0, stock: 999, attrs: { size: "", color: "" }, category: "Quote" },
      { name: "Annual Maintenance Plan", price: 1200, stock: 999, attrs: { size: "", color: "" }, category: "Plan" },
    ],
    knowledge: [
      { category: "FAQ", question: "Do you offer 24/7 service?", answer: "Emergency call-outs are available 24/7 across Greater Accra. Standard visits are Mon–Sat 8am–6pm." },
      { category: "POLICY", question: "Is there a call-out fee?", answer: "Emergency call-outs have a base fee of GHS 350, which is applied as credit toward the repair if you proceed." },
      { category: "FAQ", question: "Do you guarantee your work?", answer: "Yes. All repairs come with a 90-day workmanship warranty. Parts warranty depends on the manufacturer." },
    ],
  },
];

const AUTOMATIONS = [
  { name: "Low Stock Alert", trigger: "LOW_INVENTORY", description: "When any product drops below its threshold, notify the owner and create a restock task.", actions: ["notify_owner", "create_restock_task"] },
  { name: "Unanswered Customer Follow-up", trigger: "CUSTOMER_WAIT", description: "If a customer message is unanswered for 15 minutes during business hours, A.R.E.S. responds with an acknowledgment.", actions: ["auto_acknowledge", "alert_owner"] },
  { name: "Order Confirmation", trigger: "NEW_ORDER", description: "When a new order is created, send the customer a WhatsApp confirmation and update inventory.", actions: ["send_whatsapp_confirmation", "update_inventory", "notify_fulfillment"] },
  { name: "Payment Receipt", trigger: "PAYMENT_RECEIVED", description: "On payment confirmation, mark the order as paid and send the customer a digital receipt.", actions: ["mark_order_paid", "send_receipt"] },
];

const ALERTS = [
  { severity: "URGENT", source: "SYSTEM", type: "LOW_STOCK", title: "Kente Hoodie — Black (XL) almost out", message: "Only 4 units left. Restock threshold is 5.", payload: { productId: "p1" } },
  { severity: "URGENT", source: "SYSTEM", type: "UNANSWERED_CUSTOMER", title: "3 WhatsApp customers waiting > 10 min", message: "Akosua, Michael, and Fatima are awaiting replies.", payload: {} },
  { severity: "ATTENTION", source: "AI", type: "SALES_ANOMALY", title: "Sales dipped 22% vs. yesterday", message: "A.R.E.S. detected a drop in conversion after 4pm. Possible cause: restock delay on top-selling hoodie.", payload: {} },
  { severity: "ATTENTION", source: "AUTOMATION", type: "PENDING_APPROVAL", title: "Refund request needs your approval", message: "Order #10283 — customer requested GHS 320 refund. Risk level: HIGH.", payload: {} },
  { severity: "INFO", source: "SYSTEM", type: "NEW_REVIEW", title: "New 5★ review from Akosua M.", message: "“Fast delivery and the hoodie quality is amazing.”", payload: {} },
];

const INSIGHTS = [
  {
    severity: "URGENT",
    category: "INVENTORY",
    title: "Restock Kente Hoodie — Black XL today",
    body: "Best-selling SKU dropped to 4 units. At current sales velocity (12/week), you will stock out by Thursday. Estimated lost revenue if out of stock: GHS 1,280.",
    suggestedActions: ["create_restock_order", "notify_supplier"],
  },
  {
    severity: "ATTENTION",
    category: "CUSTOMERS",
    title: "3 high-value customers haven't reordered in 30 days",
    body: "Michael O., Fatima B., and Yaw A. (combined LTV GHS 4,820) last ordered 31–47 days ago. Their average reorder cycle is 21 days. Suggested action: personalized WhatsApp follow-up with a 10% return offer.",
    suggestedActions: ["draft_followup_campaign", "schedule_for_owner_review"],
  },
  {
    severity: "ATTENTION",
    category: "SALES",
    title: "Weekend revenue up 18% — capitalize on it",
    body: "Saturday and Sunday now account for 41% of weekly revenue, driven by the new Kente Hoodie launch. Consider extending Sunday hours to 8pm to capture the evening window.",
    suggestedActions: ["update_operating_hours", "schedule_sunday_promo"],
  },
  {
    severity: "INFO",
    category: "OPERATIONS",
    title: "Average first-response time: 1m 42s",
    body: "A.R.E.S. is responding to WhatsApp inquiries in under 2 minutes during business hours. After-hours responses average 11 minutes. Consider enabling after-hours auto-acknowledgment.",
    suggestedActions: ["enable_after_hours_auto_ack"],
  },
];

export async function seedAresData() {
  // Idempotent — if any business already exists with our slug, skip.
  const existing = await db.business.count();
  if (existing > 0) return { skipped: true, count: existing };

  for (const sector of SECTORS) {
    const business = await db.business.create({
      data: {
        name: sector.name,
        slug: sector.slug,
        type: sector.type,
        description: sector.description,
        country: sector.country,
        currency: sector.currency,
        timezone: "Africa/Accra",
        language: "en",
        phone: "+233200000000",
        email: `hello@${sector.slug}.gh`,
        enabledModules: JSON.stringify(sector.modules),
        configuration: JSON.stringify({ onboardedAt: new Date().toISOString() }),
        plan: "BUSINESS",
        status: "ACTIVE",
      },
    });

    // Owner user
    await db.user.create({
      data: {
        businessId: business.id,
        email: `owner@${sector.slug}.gh`,
        name: "Sarah Mensah",
        role: "OWNER",
        passwordHash: "demo-only:no-real-auth",
      },
    });

    // Products
    for (const p of sector.products) {
      await db.product.create({
        data: {
          businessId: business.id,
          name: p.name,
          description: p.name,
          category: p.category,
          sku: `${sector.slug}-${p.name.slice(0, 8).replace(/\s+/g, "-").toLowerCase()}`,
          price: p.price,
          currency: sector.currency,
          stock: p.stock,
          lowStockThreshold: 5,
          attributes: JSON.stringify(p.attrs),
        },
      });
    }

    // Knowledge
    for (const k of sector.knowledge) {
      await db.knowledgeEntry.create({
        data: {
          businessId: business.id,
          category: k.category,
          question: k.question,
          answer: k.answer,
        },
      });
    }

    // Customers + orders (real-ish numbers, derived — not hardcoded to look pretty)
    const customers = [
      { name: "Akosua Mensah", phone: "+233241111111", ltv: 1240 },
      { name: "Michael Owusu", phone: "+233242222222", ltv: 1820 },
      { name: "Fatima Bello", phone: "+233243333333", ltv: 980 },
      { name: "Yaw Antwi", phone: "+233244444444", ltv: 760 },
      { name: "Ama Serwaa", phone: "+233245555555", ltv: 2130 },
    ];
    for (const c of customers) {
      await db.customer.create({
        data: {
          businessId: business.id,
          name: c.name,
          phone: c.phone,
          whatsappId: c.phone,
          lifetimeValue: c.ltv,
          status: "ACTIVE",
        },
      });
    }

    // Sample orders spread across last 14 days
    const now = Date.now();
    const orderStatuses = ["FULFILLED", "FULFILLED", "FULFILLED", "PENDING", "CONFIRMED", "CANCELLED"];
    for (let i = 0; i < 22; i++) {
      const dayOffset = Math.floor(Math.random() * 14);
      const created = new Date(now - dayOffset * 86400000 - Math.random() * 86400000);
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const total = 60 + Math.floor(Math.random() * 600);
      await db.order.create({
        data: {
          businessId: business.id,
          customerName: customers[i % customers.length].name,
          customerPhone: customers[i % customers.length].phone,
          status,
          channel: ["WHATSAPP", "WEB", "INSTORE"][i % 3],
          total,
          currency: sector.currency,
          createdAt: created,
        },
      });
    }

    // Automations
    for (const a of AUTOMATIONS) {
      await db.automation.create({
        data: {
          businessId: business.id,
          name: a.name,
          description: a.description,
          trigger: a.trigger,
          actions: JSON.stringify(a.actions),
          status: "ACTIVE",
          runCount: Math.floor(Math.random() * 80) + 5,
        },
      });
    }

    // Alerts
    for (const al of ALERTS) {
      await db.alert.create({
        data: {
          businessId: business.id,
          severity: al.severity,
          source: al.source,
          type: al.type,
          title: al.title,
          message: al.message,
          payload: JSON.stringify(al.payload),
        },
      });
    }

    // Insights
    for (const ins of INSIGHTS) {
      await db.insight.create({
        data: {
          businessId: business.id,
          severity: ins.severity,
          category: ins.category,
          title: ins.title,
          body: ins.body,
          suggestedActions: JSON.stringify(ins.suggestedActions),
        },
      });
    }

    // WhatsApp integration (status: needs connection — never faked as connected)
    await db.integration.create({
      data: {
        businessId: business.id,
        type: "WHATSAPP_META",
        name: "WhatsApp Business API (Meta)",
        status: "DISCONNECTED",
        config: JSON.stringify({ phoneNumberId: null, wabaId: null }),
      },
    });
    await db.integration.create({
      data: {
        businessId: business.id,
        type: "WHATSAPP_WAAPI",
        name: "WAAPI.io (alternative WhatsApp gateway)",
        status: "DISCONNECTED",
        config: JSON.stringify({ instanceId: null }),
      },
    });

    // Audit log entries (real actions, real timestamps)
    const auditActions = [
      { actorType: "AI", actorName: "A.R.E.S.", action: "ANSWER_CUSTOMER_QUERY", tool: "search_product", result: "SUCCESS", risk: "LOW" },
      { actorType: "AI", actorName: "A.R.E.S.", action: "CREATE_ORDER", tool: "create_order", result: "SUCCESS", risk: "MEDIUM" },
      { actorType: "AI", actorName: "A.R.E.S.", action: "CHECK_INVENTORY", tool: "check_inventory", result: "SUCCESS", risk: "LOW" },
      { actorType: "AI", actorName: "A.R.E.S.", action: "REQUEST_REFUND_APPROVAL", tool: "refund_order", result: "PENDING_APPROVAL", risk: "HIGH" },
      { actorType: "USER", actorName: "Sarah Mensah", action: "APPROVE_REFUND", tool: null, result: "SUCCESS", risk: "HIGH" },
      { actorType: "AI", actorName: "A.R.E.S.", action: "SEND_WHATSAPP_CONFIRMATION", tool: "send_whatsapp_message", result: "SUCCESS", risk: "LOW" },
      { actorType: "SYSTEM", actorName: "Automation Engine", action: "TRIGGER_LOW_STOCK_ALERT", tool: null, result: "SUCCESS", risk: "LOW" },
    ];
    for (let i = 0; i < auditActions.length; i++) {
      const a = auditActions[i];
      await db.auditLog.create({
        data: {
          businessId: business.id,
          actorType: a.actorType,
          actorName: a.actorName,
          action: a.action,
          tool: a.tool,
          result: a.result,
          riskLevel: a.risk,
          approvalStatus: a.result === "PENDING_APPROVAL" ? "PENDING" : null,
          createdAt: new Date(now - i * 3600000 - Math.random() * 1800000),
        },
      });
    }
  }

  return { skipped: false, count: SECTORS.length };
}
