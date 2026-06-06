import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { displayMessageBody, type MessageBodyNameMaps } from "@/lib/chat-mentions";
import { cn } from "@/lib/utils";

interface MessageBodyProps {
  body: string;
  className?: string;
  nameMaps?: MessageBodyNameMaps;
}

export function MessageBody({ body, className, nameMaps }: MessageBodyProps) {
  const text = displayMessageBody(body, nameMaps);
  if (!text.trim()) return null;

  return (
    <div
      className={cn(
        "prose prose-sm prose-slate max-w-none break-words dark:prose-invert [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-2 [&_p]:my-0 [&_p]:leading-relaxed",
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
        {text}
      </ReactMarkdown>
    </div>
  );
}
