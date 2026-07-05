/**
 * Bidirectional conversion between a small, well-defined Markdown subset and the
 * HTML used inside the WYSIWYG note editor's contentEditable surface.
 *
 * Supported constructs (everything the note toolbar can produce):
 *   - Headings H1–H6            (`# `..`###### `  ↔  <h1>..<h6>)
 *   - Bold                      (`**text**`        ↔  <strong>/<b>)
 *   - Italic                    (`*text*`          ↔  <em>/<i>)
 *   - Unordered list            (`- item`          ↔  <ul><li>)
 *   - Ordered list              (`1. item`         ↔  <ol><li>)
 *   - Blockquote                (`> text`          ↔  <blockquote>)
 *   - Link                      (`[text](url)`     ↔  <a href>)
 *   - Paragraphs / line breaks
 *
 * Notes are authored, stored, and exported as Markdown; HTML exists only while
 * the editor is open. `markdownToHtml` seeds the editor; `htmlToMarkdown`
 * serialises it back on save. Both are pure (no DOM dependency) so they run in
 * the renderer and in the Node test environment identically.
 */

const BLOCK_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "p", "div"]);
const VOID_TAGS = new Set(["br", "img", "hr", "input", "meta", "link"]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Convert the inline Markdown of a single line (links, bold, italic) to HTML. */
function inlineToHtml(text: string): string {
  let out = escapeHtml(text);
  // Links first so their bracketed text isn't mistaken for emphasis.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => `<a href="${url}">${label}</a>`);
  // Bold (`**`) before italic (`*`) so the double marker wins.
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

/**
 * Convert a Markdown string to HTML for the editor. Line/block oriented: each
 * line is classified as a heading, list item, blockquote, blank, or paragraph.
 */
export function markdownToHtml(markdown: string): string {
  const lines = (markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inQuote = false;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html.push("</blockquote>");
      inQuote = false;
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);

    if (heading) {
      closeList();
      closeQuote();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineToHtml(heading[2])}</h${level}>`);
    } else if (ul) {
      closeQuote();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${inlineToHtml(ul[1])}</li>`);
    } else if (ol) {
      closeQuote();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${inlineToHtml(ol[1])}</li>`);
    } else if (quote) {
      closeList();
      if (!inQuote) {
        html.push("<blockquote>");
        inQuote = true;
      }
      html.push(`<p>${inlineToHtml(quote[1])}</p>`);
    } else if (line.trim() === "") {
      closeList();
      closeQuote();
    } else {
      closeList();
      closeQuote();
      html.push(`<p>${inlineToHtml(line)}</p>`);
    }
  }

  closeList();
  closeQuote();
  return html.join("");
}

// ── HTML → Markdown ─────────────────────────────────────────────────────────

type MdNode =
  | { type: "text"; value: string }
  | { type: "element"; tag: string; href?: string; children: MdNode[] };

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&"); // ampersand last so it can't double-decode
}

/**
 * Minimal, forgiving HTML parser for the bounded tag set the editor emits. It
 * builds a lightweight tree; unknown attributes are ignored (only <a href> is
 * kept) and mismatched close tags unwind the stack safely.
 */
function parseHtml(html: string): MdNode[] {
  const tokenRe = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>|([^<]+)/g;
  const root: MdNode = { type: "element", tag: "root", children: [] };
  const stack: Array<Extract<MdNode, { type: "element" }>> = [root as Extract<MdNode, { type: "element" }>];

  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(html)) !== null) {
    const [full, closing, rawTag, attrs, selfClose, text] = match;

    if (text !== undefined) {
      const value = decodeEntities(text);
      if (value) stack[stack.length - 1].children.push({ type: "text", value });
      continue;
    }
    if (full.startsWith("<!--")) continue;

    const tag = (rawTag || "").toLowerCase();
    if (!tag) continue;

    if (closing) {
      // Unwind to the nearest matching open element.
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const el: Extract<MdNode, { type: "element" }> = { type: "element", tag, children: [] };
    if (tag === "a") {
      const href = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (href) el.href = href[2] ?? href[3] ?? href[4] ?? "";
    }
    stack[stack.length - 1].children.push(el);
    if (!VOID_TAGS.has(tag) && !selfClose) {
      stack.push(el);
    }
  }

  return root.children;
}

/** Serialise inline nodes (text, bold, italic, links, breaks) to Markdown. */
function inlineToMarkdown(node: MdNode): string {
  if (node.type === "text") return node.value;
  const inner = node.children.map(inlineToMarkdown).join("");
  switch (node.tag) {
    case "strong":
    case "b":
      return inner.trim() ? `**${inner}**` : inner;
    case "em":
    case "i":
      return inner.trim() ? `*${inner}*` : inner;
    case "a":
      return node.href ? `[${inner}](${node.href})` : inner;
    case "br":
      return "\n";
    default:
      return inner;
  }
}

/** Serialise a block-level element to a Markdown block (possibly multi-line). */
function blockToMarkdown(node: Extract<MdNode, { type: "element" }>): string {
  const tag = node.tag;

  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag.slice(1), 10);
    return `${"#".repeat(level)} ${inlineToMarkdown(node).trim()}`;
  }

  if (tag === "ul" || tag === "ol") {
    const items = node.children.filter(
      (c): c is Extract<MdNode, { type: "element" }> => c.type === "element" && c.tag === "li"
    );
    return items
      .map((li, i) => `${tag === "ol" ? `${i + 1}.` : "-"} ${inlineToMarkdown(li).trim()}`)
      .join("\n");
  }

  if (tag === "blockquote") {
    const lines = serializeChildren(node.children).join("\n\n").split("\n");
    return lines.map((l) => (l.length ? `> ${l}` : ">")).join("\n");
  }

  // Paragraph / div / generic wrapper → its own children as blocks.
  return serializeChildren(node.children).join("\n\n");
}

/**
 * Walk a list of nodes, grouping loose inline content (text, <br>, bold, italic,
 * links) into paragraph blocks and delegating block elements to
 * `blockToMarkdown`. Returns an ordered list of Markdown blocks.
 */
function serializeChildren(nodes: MdNode[]): string[] {
  const blocks: string[] = [];
  let buffer = "";

  const flush = () => {
    const text = buffer.replace(/[ \t]+\n/g, "\n").trim();
    if (text) blocks.push(text);
    buffer = "";
  };

  for (const node of nodes) {
    if (node.type === "text") {
      buffer += node.value;
      continue;
    }
    if (BLOCK_TAGS.has(node.tag)) {
      flush();
      const md = blockToMarkdown(node);
      if (md.trim()) blocks.push(md);
    } else if (node.tag === "br") {
      buffer += "\n";
    } else {
      buffer += inlineToMarkdown(node);
    }
  }

  flush();
  return blocks;
}

/**
 * Convert the editor's HTML back to the Markdown subset. Pure string parsing so
 * it needs no DOM and behaves the same in the renderer and in tests.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  return serializeChildren(parseHtml(html))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
