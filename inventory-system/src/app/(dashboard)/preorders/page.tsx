import { prisma } from "@/lib/prisma";
import PreordersClient from "./PreordersClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PreordersPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/auth/login");
    }

    // Fetch products that are marked as preorder OR have active preorder items
    const products = await prisma.product.findMany({
        where: {
            OR: [
                { isPreorder: true },
                {
                    orderItems: {
                        some: { isPreorderItem: true }
                    }
                }
            ]
        },
        include: {
            orderItems: {
                where: { isPreorderItem: true },
                include: {
                    order: {
                        select: {
                            orderNumber: true,
                            clientName: true,
                            createdAt: true,
                            status: true
                        }
                    }
                },
                orderBy: {
                    order: {
                        createdAt: 'asc'
                    }
                }
            }
        }
    });

    return <PreordersClient initialProducts={products as any} />;
}
