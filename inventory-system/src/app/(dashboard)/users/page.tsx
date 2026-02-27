import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

export default async function UsersPage() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
        redirect("/");
    }

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
    });

    async function createUser(formData: FormData) {
        "use server";
        const name = formData.get("name") as string;
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;
        const role = formData.get("role") as string;

        if (!name || !username || !password) return;

        try {
            const bcryptjs = await import("bcryptjs");
            const salt = await bcryptjs.genSalt(10);
            const hashedPassword = await bcryptjs.hash(password, salt);

            await prisma.user.create({
                data: { name, username, password: hashedPassword, role: role || "USER" },
            });
            revalidatePath("/users");
        } catch (e: any) {
            console.error("Failed to create user", e.message);
        }
    }

    async function resetPassword(formData: FormData) {
        "use server";
        const userId = Number(formData.get("userId"));
        const newPassword = formData.get("password") as string;
        if (!userId || !newPassword) return;
        try {
            const bcryptjs = await import("bcryptjs");
            const salt = await bcryptjs.genSalt(10);
            const hashedPassword = await bcryptjs.hash(newPassword, salt);

            await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
            revalidatePath("/users");
        } catch (e) {
            console.error("Failed to reset password", e);
        }
    }

    async function deleteUser(formData: FormData) {
        "use server";
        const userId = Number(formData.get("userId"));
        if (!userId) return;
        try {
            await prisma.user.delete({ where: { id: userId } });
            revalidatePath("/users");
        } catch (e) {
            console.error("Failed to delete user", e);
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Пользователи</h1>

            {/* Create user form */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Добавить пользователя</h2>
                <form action={createUser} className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Имя</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Введите имя"
                            required
                            className="border rounded px-3 py-2 text-sm w-40"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Логин</label>
                        <input
                            type="text"
                            name="username"
                            placeholder="Введите логин"
                            required
                            className="border rounded px-3 py-2 text-sm w-40"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Пароль</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Введите пароль"
                            required
                            className="border rounded px-3 py-2 text-sm w-40"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Роль</label>
                        <select name="role" className="border rounded px-3 py-2 text-sm w-32">
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="bg-purple-600 text-white px-5 py-2 rounded text-sm hover:bg-purple-700 font-medium"
                    >
                        + Создать
                    </button>
                </form>
            </div>

            {/* Users table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 text-left">Имя</th>
                            <th className="px-6 py-3 text-left">Логин</th>
                            <th className="px-6 py-3 text-left">Email</th>
                            <th className="px-6 py-3 text-left">Роль</th>
                            <th className="px-6 py-3 text-left">Сменить пароль</th>
                            <th className="px-6 py-3 text-left">Удалить</th>
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
                                <td className="px-6 py-4">
                                    <form action={deleteUser}>
                                        <input type="hidden" name="userId" value={user.id} />
                                        <button
                                            type="submit"
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Удалить
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
