import type { OutputType } from "@prisma/client";

type OutputStorybook = {
  project: {
    name: string;
    orgName: string | null;
    startDate: Date;
    endDate: Date;
  };
  storybook: {
    title: string | null;
    openingText: string | null;
    closingText: string | null;
  };
  items: {
    caption: string | null;
    day: { dayNumber: number; title: string | null; date: Date };
    schedule: { time: string | null; title: string; location: string | null };
    upload: { memo: string | null; adminNote: string | null };
  }[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plainText(data: OutputStorybook) {
  const lines = [
    data.storybook.title ?? `${data.project.name} 스토리북`,
    data.project.orgName ?? "소속 없음",
    `${data.project.startDate.toLocaleDateString("ko-KR")} - ${data.project.endDate.toLocaleDateString("ko-KR")}`,
    "",
    data.storybook.openingText ?? "",
    "",
    ...data.items.flatMap((item) => [
      `Day ${item.day.dayNumber} ${item.day.title ?? ""}`,
      `${item.schedule.time ? `${item.schedule.time} ` : ""}${item.schedule.title}`,
      item.schedule.location ?? "",
      item.caption ?? item.upload.adminNote ?? item.upload.memo ?? "메모 없음",
      "",
    ]),
    data.storybook.closingText ?? "",
  ];

  return lines.filter((line, index) => line || index < 5).join("\n");
}

export function renderHtmlOutput(data: OutputStorybook) {
  const title = data.storybook.title ?? `${data.project.name} 스토리북`;
  const items = data.items
    .map(
      (item) => `
        <section class="item">
          <p class="meta">Day ${item.day.dayNumber} · ${escapeHtml(item.day.date.toLocaleDateString("ko-KR"))}</p>
          <h2>${escapeHtml(item.day.title ?? "여행 일정")}</h2>
          <h3>${escapeHtml(`${item.schedule.time ? `${item.schedule.time} · ` : ""}${item.schedule.title}`)}</h3>
          <p class="place">${escapeHtml(item.schedule.location ?? "기록")}</p>
          <p>${escapeHtml(item.caption ?? item.upload.adminNote ?? item.upload.memo ?? "메모 없음")}</p>
        </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f7f8f3; color: #111827; }
    main { max-width: 860px; margin: 0 auto; padding: 48px 20px; }
    header { border-bottom: 1px solid #c8d1c2; padding-bottom: 28px; margin-bottom: 28px; }
    h1 { font-size: 40px; line-height: 1.15; margin: 0 0 12px; }
    h2 { font-size: 24px; margin: 4px 0; }
    h3 { font-size: 18px; margin: 16px 0 8px; }
    p { line-height: 1.75; }
    .meta, .place { color: #4b6355; font-size: 14px; }
    .item { background: white; border: 1px solid #d9dfd3; border-radius: 8px; padding: 22px; margin: 18px 0; }
    footer { margin-top: 28px; border-top: 1px solid #c8d1c2; padding-top: 22px; color: #4b6355; }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="meta">${escapeHtml(data.project.orgName ?? "소속 없음")} · ${escapeHtml(data.project.startDate.toLocaleDateString("ko-KR"))} - ${escapeHtml(data.project.endDate.toLocaleDateString("ko-KR"))}</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(data.storybook.openingText ?? "승인된 스토리북 기록입니다.")}</p>
    </header>
    ${items}
    ${data.storybook.closingText ? `<footer>${escapeHtml(data.storybook.closingText)}</footer>` : ""}
  </main>
</body>
</html>`;
}

function pdfEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function renderPdfOutput(data: OutputStorybook) {
  const text = plainText(data)
    .split("\n")
    .slice(0, 42)
    .map((line) => line.slice(0, 82));
  const contentLines = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"];

  for (const line of text) {
    contentLines.push(`(${pdfEscape(line)}) Tj`, "T*");
  }
  contentLines.push("ET");

  const content = contentLines.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export function renderOutput(type: OutputType, data: OutputStorybook) {
  if (type === "pdf") return renderPdfOutput(data);

  const html = renderHtmlOutput(data);
  return Buffer.from(html, "utf8");
}

export function outputFileName(type: OutputType) {
  if (type === "pdf") return "storybook-report.pdf";
  if (type === "doc") return "storybook-report.doc";
  return "storybook-archive.html";
}
