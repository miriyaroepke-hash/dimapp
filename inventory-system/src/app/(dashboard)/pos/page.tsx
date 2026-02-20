import POSInterface from "@/components/POSInterface";
import prisma from "@/lib/prisma";

export default async function POSPage() {
    // We might want to pass initial products or let the client fetch/search
    // For better performance with large inventory, client-side search API is better.
    // But for now, we can pass all products if not too many, or just empty and let scanner work.
    // We'll fetch all for simple autocomplete.

    const products = await prisma.product.findMany({
        select: { id: true, name: true, sku: true, price: true, size: true, quantity: true },
        where: { quantity: { gt: 0 } } // Only sellable items
    });

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
            <h1 className="text-2xl font-bold mb-4">Касса (POS)</h1>
            <POSInterface initialProducts={products} />
        </div>
    );
}
