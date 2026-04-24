import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "public"."StorefrontProduct" (
                "id" SERIAL NOT NULL,
                "name" TEXT NOT NULL,
                "description" TEXT,
                "image" TEXT,
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,
                PRIMARY KEY ("id")
            );
        `);
        
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='storefrontProductId') THEN 
                    ALTER TABLE "public"."Product" ADD COLUMN "storefrontProductId" INTEGER;
                    ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_storefrontProductId_fkey" FOREIGN KEY ("storefrontProductId") REFERENCES "public"."StorefrontProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF; 
            END $$;
        `);

        return NextResponse.json({ success: true, message: "Migration applied." });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
