import { getBlogPost } from "@/app/actions";
import BlogEditor from "./BlogEditor";

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
    let post = null;
    
    if (params.id !== "new") {
        post = await getBlogPost(parseInt(params.id));
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
