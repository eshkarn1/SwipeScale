import type { Block, InlineNode } from '@/lib/markdown';

/**
 * Renders the typed AST from `@/lib/markdown` as real React elements — no
 * `dangerouslySetInnerHTML` anywhere. Baseline semantic markup only
 * (headings, paragraphs, lists, tables, inline code/bold); ui-builder owns
 * the typography and table styling layered on top of these elements.
 */
function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === 'code') return <code key={i}>{node.value}</code>;
        if (node.type === 'bold') return <strong key={i}>{node.value}</strong>;
        return <span key={i}>{node.value}</span>;
      })}
    </>
  );
}

export function MarkdownBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="markdown-body">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
            return (
              <Tag key={i}>
                <Inline nodes={block.inline} />
              </Tag>
            );
          }
          case 'paragraph':
            return (
              <p key={i}>
                <Inline nodes={block.inline} />
              </p>
            );
          case 'list':
            return (
              <ul key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline nodes={item} />
                  </li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <table key={i}>
                <thead>
                  <tr>
                    {block.header.map((cell, j) => (
                      <th key={j} scope="col">
                        <Inline nodes={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c}>
                          <Inline nodes={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
