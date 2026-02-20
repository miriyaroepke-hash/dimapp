import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache"; // Assuming Next.js 15
import { hash } from "bcryptjs";

export default async function UsersPage() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
        redirect("/");
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
    });

    async function resetPassword(formData: FormData) {
        "use server";
        const userId = Number(formData.get("userId"));
        const newPassword = formData.get("password") as string;

        if (!userId || !newPassword) return;

        try {
            const hashedPassword = await hash(newPassword, 12);
            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });
            revalidatePath("/users");
        } catch (e) {
            console.error("Failed to reset password", e);
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Пользователи</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 text-left">Имя</th>
                            <th className="px-6 py-3 text-left">Логин</th>
                            <th className="px-6 py-3 text-left">Email</th>
                            <th className="px-6 py-3 text-left">Роль</th>
                            <th className="px-6 py-3 text-left">Сменить пароль</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 text-gray-500">{user.username}</td>
                                <td className="px-6 py-4 text-gray-500">{user.email || "-"}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <form action={resetPassword} className="flex gap-2">
                                        <input type="hidden" name="userId" value={user.id} />
                                        <input
                                            type="text"
                                            name="password"
                                            placeholder="Новый пароль"
                                            className="border rounded px-2 py-1 text-sm w-32"
                                            required
                                        />
                                        <button type="submit" className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                                            Сменить
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
