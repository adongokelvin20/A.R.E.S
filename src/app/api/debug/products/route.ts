/**
 * GET /api/debug/products
 *
 * Debug endpoint — tests the products query directly and returns the error.
 * No auth required (temporary — for debugging only).
 */
import { NextResponse } from "next/server";
import { db, ensureDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const results: any = { steps: [] };

  // Step 1: ensureDatabase
  try {
    await ensureDatabase();
    results.steps.push({ step: "ensureDatabase", ok: true });
  } catch (e: any) {
    results.steps.push({ step: "ensureDatabase", ok: false, error: e?.message });
  }

  // Step 2: ALTER TABLE
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "image2Data" TEXT`);
    await db.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "image3Data" TEXT`);
    results.steps.push({ step: "alter_table", ok: true });
  } catch (e: any) {
    results.steps.push({ step: "alter_table", ok: false, error: e?.message });
  }

  // Step 3: Count products
  try {
    const count = await db.product.count();
    results.steps.push({ step: "product_count", ok: true, count });
  } catch (e: any) {
    results.steps.push({ step: "product_count", ok: false, error: e?.message });
  }

  // Step 4: findMany without select (queries ALL columns)
  try {
    const products = await db.product.findMany({ take: 1 });
    results.steps.push({ step: "findMany_all_columns", ok: true, count: products.length });
  } catch (e: any) {
    results.steps.push({ step: "findMany_all_columns", ok: false, error: e?.message });
  }

  // Step 5: findMany with select (queries only specified columns)
  try {
    const products = await db.product.findMany({
      take: 1,
      select: {
        id: true, name: true, description: true, category: true, price: true,
        currency: true, stock: true, lowStockThreshold: true, imageUrl: true,
        imageAlt: true, attributes: true, status: true, createdAt: true,
      },
    });
    results.steps.push({ step: "findMany_select", ok: true, count: products.length });
  } catch (e: any) {
    results.steps.push({ step: "findMany_select", ok: false, error: e?.message });
  }

  // Step 6: Check table columns
  try {
    const columns = await db.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Product'
      ORDER BY ordinal_position
    `);
    results.steps.push({ step: "table_columns", ok: true, columns });
  } catch (e: any) {
    results.steps.push({ step: "table_columns", ok: false, error: e?.message });
  }

  // Step 7: Test archives
  try {
    const archives = await db.weeklyArchive.findMany({ take: 1 });
    results.steps.push({ step: "weeklyArchive_findMany", ok: true, count: archives.length });
  } catch (e: any) {
    results.steps.push({ step: "weeklyArchive_findMany", ok: false, error: e?.message });
  }

  // Step 8: Test WeeklyArchive table columns
  try {
    const columns = await db.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'WeeklyArchive'
      ORDER BY ordinal_position
    `);
    results.steps.push({ step: "weeklyArchive_columns", ok: true, columns });
  } catch (e: any) {
    results.steps.push({ step: "weeklyArchive_columns", ok: false, error: e?.message });
  }

  return NextResponse.json(results, { status: 200 });
}
