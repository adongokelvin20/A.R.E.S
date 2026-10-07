/**
 * ChatBiz products API
 *
 * GET  /api/products              -- list products
 * POST /api/products              -- create with dynamic fields + optional image
 *   The image is stored in the database as base64 (Vercel-compatible -- no filesystem writes).
 *   The image is analyzed by the VLM to auto-generate a description.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const products = await db.product.findMany({
    where: { businessId: session.user.businessId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;

  try {
    const formData = await req.formData();
    const name = formData.get("name")?.toString().trim();
    let description = formData.get("description")?.toString().trim() || null;
    let category = formData.get("category")?.toString().trim() || null;
    const sku = formData.get("sku")?.toString().trim() || null;
    const price = parseFloat(formData.get("price")?.toString() ?? "0");
    const stock = parseInt(formData.get("stock")?.toString() ?? "0", 10);
    const lowStockThreshold = parseInt(formData.get("lowStockThreshold")?.toString() ?? "5", 10);
    const manualImageAlt = formData.get("imageAlt")?.toString().trim() || null;
    const file = formData.get("image") as File | null;

    // Dynamic fields
    const attributes: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (!["name", "description", "category", "sku", "price", "stock", "lowStockThreshold", "imageAlt", "image"].includes(key)) {
        const v = value.toString().trim();
        if (v) attributes[key] = v;
      }
    }

    if (!name || !Number.isFinite(price)) {
      return NextResponse.json({ error: "Name and price are required." }, { status: 400 });
    }

    let imageUrl: string | null = null;
    let imageData: string | null = null;
    let imageAlt: string | null = manualImageAlt;

    if (file && file.size > 0 && file.size < 2 * 1024 * 1024) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = `data:image/${ext};base64,${buffer.toString("base64")}`;
      imageData = base64;

      // If no manual imageAlt provided, analyze the image with VLM
      if (!imageAlt) {
        try {
          const { getVisionClient } = await import("@/lib/ai-client");
          const vision = await getVisionClient();
          const analysis = await vision.analyze(base64, `Analyze this product image. Extract: DESCRIPTION (1-2 sentences), CATEGORY (Male/Female/Kids/General/Unisex), COLOR, TYPE, MATCHING_TAGS (comma-separated).\n\nFormat:\nDESCRIPTION: <text>\nCATEGORY: <text>\nCOLOR: <text>\nTYPE: <text>\nMATCHING_TAGS: <text>`);
          const descMatch = analysis.match(/^DESCRIPTION:\s*(.+?)$/im);
          const catMatch = analysis.match(/^CATEGORY:\s*(.+?)$/im);
          const colorMatch = analysis.match(/^COLOR:\s*(.+?)$/im);
          const typeMatch = analysis.match(/^TYPE:\s*(.+?)$/im);
          const tagsMatch = analysis.match(/^MATCHING_TAGS:\s*(.+?)$/im);
          const parts = [];
          if (typeMatch?.[1]) parts.push(typeMatch[1].trim());
          if (colorMatch?.[1]) parts.push(colorMatch[1].trim());
          if (descMatch?.[1]) parts.push(descMatch[1].trim());
          if (tagsMatch?.[1]) parts.push(`tags: ${tagsMatch[1].trim()}`);
          if (parts.length > 0) imageAlt = parts.join(" | ");
          if (catMatch?.[1] && /^(Male|Female|Kids|General|Unisex)$/i.test(catMatch[1].trim()) && !category) category = catMatch[1].trim();
          if (descMatch?.[1] && descMatch[1].trim().length > 5 && !description) description = descMatch[1].trim();
        } catch (e: any) {
          console.error("[products] VLM analysis failed:", e?.message);
        }
      }
    }

    const product = await db.product.create({
      data: {
        businessId,
        name,
        description,
        category,
        sku,
        price,
        currency: "GHS",
        stock,
        lowStockThreshold,
        imageUrl,
        imageData,
        imageAlt,
        attributes: JSON.stringify(attributes),
        status: "ACTIVE",
      },
    });

    // Set the imageUrl to the API route that serves the image from DB
    if (imageData) {
      await db.product.update({
        where: { id: product.id },
        data: { imageUrl: `/api/image/${product.id}` },
      });
    }

    // Clear the store chat context cache so the new product shows up in the AI's context
    try {
      const { clearContextCache } = await import("@/lib/store-chat-context");
      clearContextCache(businessId);
    } catch {}

    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: session.user.name,
        action: "CREATE_PRODUCT",
        tool: "products.create",
        target: product.id,
        result: "SUCCESS",
        riskLevel: "LOW",
        details: JSON.stringify({ name, price, hasImage: !!imageData, aiAnalyzed: !!imageAlt && !manualImageAlt }),
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (err: any) {
    console.error("[products POST] error", err);
    return NextResponse.json(
      { error: "Failed to create product.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
