/**
 * PATCH /api/products/[id]  -- update a product (auth-scoped to the business)
 * DELETE /api/products/[id]  -- delete a product (auth-scoped to the business)
 *
 * Images are stored in the database as base64 (Vercel-compatible).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const { id } = await params;

  const product = await db.product.findFirst({ where: { id, businessId } });
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name")?.toString().trim();
    const description = formData.get("description")?.toString().trim() || null;
    const category = formData.get("category")?.toString().trim() || null;
    const price = parseFloat(formData.get("price")?.toString() ?? "0");
    const stock = parseInt(formData.get("stock")?.toString() ?? "0", 10);
    const lowStockThreshold = parseInt(formData.get("lowStockThreshold")?.toString() ?? "5", 10);
    const manualImageAlt = formData.get("imageAlt")?.toString().trim() || null;
    const file = formData.get("image") as File | null;

    // Dynamic fields
    const attributes: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (!["name", "description", "category", "price", "stock", "lowStockThreshold", "imageAlt", "image"].includes(key)) {
        const v = value.toString().trim();
        if (v) attributes[key] = v;
      }
    }

    let imageUrl = product.imageUrl;
    let imageData = product.imageData;
    let imageAlt = manualImageAlt ?? product.imageAlt;

    // If a new image is uploaded, store it in the database
    if (file && file.size > 0 && file.size < 2 * 1024 * 1024) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = `data:image/${ext};base64,${buffer.toString("base64")}`;
      imageData = base64;
      imageUrl = `/api/image/${id}`;

      // AI analyze new image if no manual alt
      if (!manualImageAlt) {
        try {
          const { getZaiClient } = await import("@/lib/ai-client");
          const zai = await getZaiClient();
          const visionRes = await zai.chat.completions.createVision({
            model: "glm-4v",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: `Describe this product image in one concise sentence. Focus on product type, color, key features. Just the description.` },
                { type: "image_url", image_url: { url: base64 } },
              ],
            }],
          });
          const aiDesc = (visionRes as any)?.choices?.[0]?.message?.content?.toString().trim();
          if (aiDesc && aiDesc.length > 5 && aiDesc.length < 300) imageAlt = aiDesc;
        } catch (e) {
          console.error("[products PATCH] VLM analysis failed", e);
        }
      }
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        name: name ?? product.name,
        description,
        category,
        price: Number.isFinite(price) ? price : product.price,
        stock: Number.isFinite(stock) ? stock : product.stock,
        lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : product.lowStockThreshold,
        imageUrl,
        imageData,
        imageAlt,
        attributes: JSON.stringify(attributes),
      },
    });

    await db.auditLog.create({
      data: {
        businessId,
        actorType: "USER",
        actorName: session.user.name,
        action: "UPDATE_PRODUCT",
        tool: "products.update",
        target: id,
        result: "SUCCESS",
        riskLevel: "LOW",
        details: JSON.stringify({ name: updated.name }),
      },
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (err: any) {
    console.error("[products PATCH] error", err);
    return NextResponse.json(
      { error: "Failed to update product.", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const businessId = session.user.businessId;
  const { id } = await params;

  const product = await db.product.findFirst({ where: { id, businessId } });
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.product.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      businessId,
      actorType: "USER",
      actorName: session.user.name,
      action: "DELETE_PRODUCT",
      tool: "products.delete",
      target: id,
      result: "SUCCESS",
      riskLevel: "MEDIUM",
      details: JSON.stringify({ name: product.name }),
    },
  });

  return NextResponse.json({ ok: true });
}
