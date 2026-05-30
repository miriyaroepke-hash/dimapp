import { getBlogPost } from "@/app/actions";
import BlogEditor from "./BlogEditor";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    let post = null;
    
    if (id !== "new") {
        post = await getBlogPost(parseInt(id));
        if (!post) {
            return <div>Статья не найдена</div>;
        }
    }

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">
                {post ? "Редактирование статьи" : "Новая статья"}
            </h1>
            <BlogEditor initialPost={post} />
        </div>
    );
}
