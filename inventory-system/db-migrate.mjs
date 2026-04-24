import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting...");
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

    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
