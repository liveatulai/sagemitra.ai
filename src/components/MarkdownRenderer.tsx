import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Parse emotional cues and render inline
function parseEmotionalCues(text: string) {
  const parts = [];
  let lastIndex = 0;
  const emotionPattern = /\*([^*]+)\*/g;
  let match;

  while ((match = emotionPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // Add the emotion cue
    parts.push({ type: 'emotion', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const parts = parseEmotionalCues(content);
  
  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.type === 'emotion') {
          return (
            <span key={index} className="emotion-inline">
              *{part.content}*
            </span>
          );
        }
        return (
          <ReactMarkdown
            key={index}
            components={{
              p: ({ children }) => <span className="inline">{children}</span>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic opacity-90">{children}</em>,
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-secondary/50 px-1 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-secondary/50 p-2 rounded text-sm font-mono overflow-x-auto my-2">
                    {children}
                  </code>
                );
              },
              ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary/30 pl-4 italic my-2">
                  {children}
                </blockquote>
              ),
              h1: ({ children }) => <h1 className="text-xl font-bold my-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-semibold my-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold my-1">{children}</h3>,
            }}
          >
            {part.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
