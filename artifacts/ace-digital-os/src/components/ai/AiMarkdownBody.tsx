import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type AiMarkdownBodyProps = {
  text: string;
  className?: string;
};

/** Renders Ace assistant replies with Markdown (bold, lists, tables). */
export function AiMarkdownBody({ text, className }: AiMarkdownBodyProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <div
      className={cn(
        "prose prose-sm prose-slate max-w-none break-words dark:prose-invert",
        "[&_a]:text-primary [&_a]:underline",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1",
        "[&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-2",
        "[&_p]:my-1 [&_p]:leading-relaxed",
        "[&_ul]:my-1 [&_ol]:my-1",
        "[&_table]:text-xs",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
