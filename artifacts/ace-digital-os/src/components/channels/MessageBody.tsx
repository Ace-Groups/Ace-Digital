import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { displayMessageBody } from "@/lib/chat-mentions";
import { cn } from "@/lib/utils";

interface MessageBodyProps {
  body: string;
  className?: string;
}

export function MessageBody({ body, className }: MessageBodyProps) {
  const text = displayMessageBody(body);
  if (!text.trim()) return null;

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-2",
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
