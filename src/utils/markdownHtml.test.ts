import { markdownToHtml, htmlToMarkdown } from "./markdownHtml";

describe("markdownToHtml", () => {
  it("converts headings H1 through H6", () => {
    for (let level = 1; level <= 6; level++) {
      const md = `${"#".repeat(level)} Title`;
      expect(markdownToHtml(md)).toBe(`<h${level}>Title</h${level}>`);
    }
  });

  it("converts bold and italic inline", () => {
    expect(markdownToHtml("a **b** c")).toBe("<p>a <strong>b</strong> c</p>");
    expect(markdownToHtml("a *b* c")).toBe("<p>a <em>b</em> c</p>");
  });

  it("converts a link", () => {
    expect(markdownToHtml("see [docs](https://x.io)")).toBe(
      '<p>see <a href="https://x.io">docs</a></p>'
    );
  });

  it("converts an unordered list", () => {
    expect(markdownToHtml("- one\n- two")).toBe("<ul><li>one</li><li>two</li></ul>");
  });

  it("converts an ordered list", () => {
    expect(markdownToHtml("1. one\n2. two")).toBe("<ol><li>one</li><li>two</li></ol>");
  });

  it("converts a blockquote", () => {
    expect(markdownToHtml("> quoted")).toBe("<blockquote><p>quoted</p></blockquote>");
  });

  it("escapes HTML-significant characters in text", () => {
    expect(markdownToHtml("a < b & c")).toBe("<p>a &lt; b &amp; c</p>");
  });

  it("returns an empty string for empty input", () => {
    expect(markdownToHtml("")).toBe("");
  });
});

describe("htmlToMarkdown", () => {
  it("serialises headings H1 through H6", () => {
    for (let level = 1; level <= 6; level++) {
      expect(htmlToMarkdown(`<h${level}>Title</h${level}>`)).toBe(`${"#".repeat(level)} Title`);
    }
  });

  it("serialises bold and italic (both tag spellings)", () => {
    expect(htmlToMarkdown("<p>a <strong>b</strong> c</p>")).toBe("a **b** c");
    expect(htmlToMarkdown("<p>a <b>b</b> c</p>")).toBe("a **b** c");
    expect(htmlToMarkdown("<p>a <em>b</em> c</p>")).toBe("a *b* c");
    expect(htmlToMarkdown("<p>a <i>b</i> c</p>")).toBe("a *b* c");
  });

  it("serialises a link", () => {
    expect(htmlToMarkdown('<p><a href="https://x.io">docs</a></p>')).toBe("[docs](https://x.io)");
  });

  it("serialises unordered and ordered lists", () => {
    expect(htmlToMarkdown("<ul><li>one</li><li>two</li></ul>")).toBe("- one\n- two");
    expect(htmlToMarkdown("<ol><li>one</li><li>two</li></ol>")).toBe("1. one\n2. two");
  });

  it("serialises a blockquote", () => {
    expect(htmlToMarkdown("<blockquote><p>quoted</p></blockquote>")).toBe("> quoted");
  });

  it("treats <br> as a line break", () => {
    expect(htmlToMarkdown("<div>line1<br>line2</div>")).toBe("line1\nline2");
  });

  it("separates paragraphs with a blank line", () => {
    expect(htmlToMarkdown("<p>one</p><p>two</p>")).toBe("one\n\ntwo");
  });

  it("returns an empty string for empty or break-only editor content", () => {
    expect(htmlToMarkdown("")).toBe("");
    expect(htmlToMarkdown("<br>")).toBe("");
    expect(htmlToMarkdown("<div><br></div>")).toBe("");
  });
});

describe("round-trip markdown -> html -> markdown", () => {
  const cases = [
    "# Strategy",
    "###### Deep dive",
    "White keeps the **initiative** and a *slight* edge",
    "- control the center\n- develop pieces\n- castle early",
    "1. e4\n2. Nf3\n3. Bb5",
    "> A quiet move that improves the worst piece.",
    "See [theory](https://example.com) for more",
  ];

  it.each(cases)("preserves %p", (md) => {
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md);
  });

  it("preserves a mixed document", () => {
    const md = [
      "# Plan",
      "White wants to play **d4** and open the center.",
      "- watch the *e5* break",
      "- keep the king safe",
    ].join("\n");
    // Blocks are re-joined with blank lines between distinct block types.
    const round = htmlToMarkdown(markdownToHtml(md));
    expect(round).toContain("# Plan");
    expect(round).toContain("White wants to play **d4** and open the center.");
    expect(round).toContain("- watch the *e5* break");
    expect(round).toContain("- keep the king safe");
  });
});
