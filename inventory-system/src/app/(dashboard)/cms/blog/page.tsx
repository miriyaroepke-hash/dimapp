import { getBlogPosts } from "@/app/actions";
import Link from "next/link";
import { Plus, Edit } from "lucide-react";
import DeleteButton from "./DeleteButton"; // Client component

export const dynamic = "force-dynamic";

export default async function BlogCmsPage() {
    const posts = await getBlogPosts(true);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Блог</h1>
                    <p className="text-gray-500 mt-2">Управление статьями в блоге.</p>
                </div>
                <Link 
                    href="/cms/blog/new" 
                    className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
                >
                    <Plus className="w-5 h-5 mr-2" /> Создать статью
                </Link>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-medium text-gray-500">ID</th>
                            <th className="p-4 font-medium text-gray-500">Название (RU)</th>
                            <th className="p-4 font-medium text-gray-500">Ссылка (Slug)</th>
                            <th className="p-4 font-medium text-gray-500">Статус</th>
                            <th className="p-4 font-medium text-gray-500">Дата</th>
                            <th className="p-4 font-medium text-gray-500 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    Нет статей. Создайте первую!
                                </td>
                            </tr>
                        )}
                        {posts.map(post => (
                            <tr key={post.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-4 text-gray-500">{post.id}</td>
                                <td className="p-4 font-medium">{post.title_ru}</td>
                                <td className="p-4 text-gray-500">{post.slug}</td>
                                <td className="p-4">
                                    {post.isPublished ? (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Опубликовано</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">Черновик</span>
                                    )}
                                </td>
                                <td className="p-4 text-gray-500">
                                    {new Date(post.createdAt).toLocaleDateString('ru-RU')}
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <Link 
                                        href={`/cms/blog/${post.id}`}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </Link>
                                    <DeleteButton id={post.id} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
