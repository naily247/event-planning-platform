import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type AdminReportKind =
  | 'users'
  | 'vendors'
  | 'events'
  | 'bookings'
  | 'payments'
  | 'revenue'
  | 'complaints';

type PdfMetric = {
  label: string;
  value: string | number;
  helper?: string;
};

type PdfRankedItem = {
  label: string;
  value: string | number;
  secondary?: string;
};

type PdfTable = {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

type PdfTrendPoint = {
  label: string;
  value: number;
};

export type AdminReportPdfConfig = {
  kind: AdminReportKind;
  reportTitle: string;
  reportDescription: string;
  generatedAt?: string;
  from?: string;
  to?: string;
  groupBy: string;

  metrics: PdfMetric[];

  trend?: {
    title: string;
    valueLabel: string;
    points: PdfTrendPoint[];
    valueFormatter?: (value: number) => string;
  };

  rankedSections?: Array<{
    eyebrow: string;
    title: string;
    items: PdfRankedItem[];
  }>;

  tables?: PdfTable[];
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const PLUM: [number, number, number] = [91, 61, 82];
const DEEP_PLUM: [number, number, number] = [70, 44, 62];
const ROSEWOOD: [number, number, number] = [140, 92, 111];
const NEAR_BLACK: [number, number, number] = [38, 32, 36];
const CHARCOAL: [number, number, number] = [78, 70, 75];
const MUTED: [number, number, number] = [126, 116, 122];
const BORDER: [number, number, number] = [226, 219, 224];
const SOFT_LAVENDER: [number, number, number] = [246, 242, 247];
const VERY_SOFT_LAVENDER: [number, number, number] = [250, 248, 250];
const WHITE: [number, number, number] = [255, 255, 255];

const EVENTURE_LOGO_PATH = '/images/branding/eventure-logo-navbar.png';

async function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Unable to create canvas context for report logo.'));
        return;
      }

      context.drawImage(image, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      reject(new Error('Unable to load the Eventure report logo.'));
    };

    image.src = src;
  });
}

function safeText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
}

function formatGeneratedDate(value?: string) {
  if (!value) {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatFileDate() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateRangeLabel(from?: string, to?: string) {
  if (!from && !to) {
    return 'All available history';
  }

  return `${from || 'Beginning'} – ${to || 'Today'}`;
}

function normalizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function setFill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawRoundedCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: [number, number, number] = WHITE,
) {
  setFill(doc, fill);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 3, 3, 'FD');
}

function ensureSpace(doc: jsPDF, y: number, requiredHeight: number) {
  if (y + requiredHeight <= PAGE_HEIGHT - 20) {
    return y;
  }

  doc.addPage();
  return 22;
}

function drawPageChrome(doc: jsPDF, pageNumber: number, totalPages: number) {
  setDraw(doc, BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, PAGE_HEIGHT - 14, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, PLUM);
  doc.text('EVENTURE', MARGIN_X, PAGE_HEIGHT - 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, MUTED);
  doc.text('Administrative intelligence report', MARGIN_X + 19, PAGE_HEIGHT - 8.5);

  doc.text(`Page ${pageNumber} of ${totalPages}`, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 8.5, {
    align: 'right',
  });
}

function drawHeader(doc: jsPDF, config: AdminReportPdfConfig, eventureLogo: string | null) {
  const logoWidth = 34;
  const logoHeight = 22.67;

  // Keep the report canvas clean and neutral.
  setFill(doc, WHITE);
  doc.rect(0, 0, PAGE_WIDTH, 60, 'F');

  // Eventure brand.
  // The source PNG contains transparent canvas space, so position its
  // image box slightly higher to keep the visible wordmark clear.
  if (eventureLogo) {
    doc.addImage(eventureLogo, 'PNG', MARGIN_X - 2, 1, logoWidth, logoHeight, undefined, 'FAST');
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setText(doc, PLUM);
    doc.text('EVENTURE', MARGIN_X, 12);
  }

  // Administrative context gets its own line below the visible logo.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, CHARCOAL);
  doc.text('ADMINISTRATION • PLATFORM INTELLIGENCE', MARGIN_X, 23);

  // Report title.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  setText(doc, NEAR_BLACK);
  doc.text(config.reportTitle, MARGIN_X, 34);

  // Report description.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(doc, CHARCOAL);

  const descriptionLines = doc.splitTextToSize(config.reportDescription, 128) as string[];

  doc.text(descriptionLines.slice(0, 2), MARGIN_X, 42);

  // Restrained report-type identifier.
  const reportTypeWidth = 42;
  const reportTypeHeight = 17;
  const reportTypeX = PAGE_WIDTH - MARGIN_X - reportTypeWidth;
  const reportTypeY = 27;

  drawRoundedCard(
    doc,
    reportTypeX,
    reportTypeY,
    reportTypeWidth,
    reportTypeHeight,
    VERY_SOFT_LAVENDER,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  setText(doc, MUTED);
  doc.text('REPORT TYPE', reportTypeX + 4, reportTypeY + 6);

  doc.setFontSize(9);
  setText(doc, DEEP_PLUM);
  doc.text(config.kind.toUpperCase(), reportTypeX + 4, reportTypeY + 12);

  // Very subtle separator instead of a large colored header background.
  setDraw(doc, BORDER);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_X, 55, PAGE_WIDTH - MARGIN_X, 55);

  return 64;
}

function drawMetadata(doc: jsPDF, config: AdminReportPdfConfig, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, ROSEWOOD);
  doc.text('REPORT CONTEXT', MARGIN_X, y);

  doc.setFontSize(13);
  setText(doc, NEAR_BLACK);
  doc.text('Generation details', MARGIN_X, y + 6);

  const gap = 3;
  const width = (CONTENT_WIDTH - gap * 2) / 3;
  const cardY = y + 11;

  const metadata = [
    {
      label: 'Generated',
      value: formatGeneratedDate(config.generatedAt),
    },
    {
      label: 'Grouped by',
      value: config.groupBy.charAt(0).toUpperCase() + config.groupBy.slice(1),
    },
    {
      label: 'Date range',
      value: getDateRangeLabel(config.from, config.to),
    },
  ];

  metadata.forEach((item, index) => {
    const x = MARGIN_X + index * (width + gap);

    drawRoundedCard(doc, x, cardY, width, 20, VERY_SOFT_LAVENDER);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(doc, MUTED);
    doc.text(item.label.toUpperCase(), x + 4, cardY + 6);

    doc.setFontSize(8);
    setText(doc, NEAR_BLACK);

    const lines = doc.splitTextToSize(item.value, width - 8) as string[];
    doc.text(lines.slice(0, 2), x + 4, cardY + 12);
  });

  return cardY + 27;
}

function drawMetrics(doc: jsPDF, metrics: PdfMetric[], y: number) {
  y = ensureSpace(doc, y, 43);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, ROSEWOOD);
  doc.text('EXECUTIVE SUMMARY', MARGIN_X, y);

  doc.setFontSize(13);
  setText(doc, NEAR_BLACK);
  doc.text('Key indicators', MARGIN_X, y + 6);

  const gap = 3;
  const columns = Math.min(metrics.length, 4);
  const width = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
  const cardY = y + 11;

  metrics.slice(0, 4).forEach((metric, index) => {
    const x = MARGIN_X + index * (width + gap);

    drawRoundedCard(doc, x, cardY, width, 28, SOFT_LAVENDER);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(doc, MUTED);

    const labelLines = doc.splitTextToSize(metric.label.toUpperCase(), width - 8) as string[];

    doc.text(labelLines.slice(0, 2), x + 4, cardY + 6);

    const metricValue = safeText(metric.value);

    let valueFontSize = 11.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(valueFontSize);

    while (valueFontSize > 8 && doc.getTextWidth(metricValue) > width - 8) {
      valueFontSize -= 0.5;
      doc.setFontSize(valueFontSize);
    }

    setText(doc, DEEP_PLUM);
    doc.text(metricValue, x + 4, cardY + 15);

    if (metric.helper) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      setText(doc, MUTED);

      const helperLines = doc.splitTextToSize(metric.helper, width - 8) as string[];

      doc.text(helperLines.slice(0, 1), x + 4, cardY + 24);
    }
  });

  return cardY + 35;
}

function drawTrend(doc: jsPDF, trend: NonNullable<AdminReportPdfConfig['trend']>, y: number) {
  y = ensureSpace(doc, y, 76);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, ROSEWOOD);
  doc.text('TREND ANALYSIS', MARGIN_X, y);

  doc.setFontSize(13);
  setText(doc, NEAR_BLACK);
  doc.text(trend.title, MARGIN_X, y + 6);

  const cardY = y + 11;
  const cardHeight = 58;

  drawRoundedCard(doc, MARGIN_X, cardY, CONTENT_WIDTH, cardHeight, WHITE);

  if (trend.points.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(doc, MUTED);
    doc.text(
      'No trend data is available for the selected reporting period.',
      PAGE_WIDTH / 2,
      cardY + cardHeight / 2,
      {
        align: 'center',
      },
    );

    return cardY + cardHeight + 7;
  }

  const values = trend.points.map((point) => (Number.isFinite(point.value) ? point.value : 0));

  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);

  const chartX = MARGIN_X + 12;
  const chartY = cardY + 10;
  const chartWidth = CONTENT_WIDTH - 20;
  const chartHeight = 34;

  setDraw(doc, BORDER);
  doc.setLineWidth(0.2);

  for (let index = 0; index <= 4; index += 1) {
    const gridY = chartY + (chartHeight / 4) * index;
    doc.line(chartX, gridY, chartX + chartWidth, gridY);
  }

  const formatter =
    trend.valueFormatter ??
    ((value: number) =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
      }).format(value));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setText(doc, MUTED);

  for (let index = 0; index <= 4; index += 1) {
    const value = maxValue - ((maxValue - minValue) / 4) * index;

    doc.text(formatter(value), chartX - 2, chartY + (chartHeight / 4) * index + 1.8, {
      align: 'right',
    });
  }

  if (trend.points.length === 1) {
    const point = trend.points[0];
    const barWidth = Math.min(38, chartWidth * 0.34);
    const x = chartX + (chartWidth - barWidth) / 2;

    const denominator = maxValue === 0 ? 1 : maxValue;
    const barHeight = Math.max(2, (Math.max(point.value, 0) / denominator) * (chartHeight - 4));

    setFill(doc, PLUM);
    doc.roundedRect(x, chartY + chartHeight - barHeight, barWidth, barHeight, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, DEEP_PLUM);
    doc.text(formatter(point.value), x + barWidth / 2, chartY + chartHeight - barHeight - 2, {
      align: 'center',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, MUTED);
    doc.text(point.label, x + barWidth / 2, chartY + chartHeight + 5, {
      align: 'center',
    });
  } else {
    const denominator = maxValue - minValue || 1;
    const pointGap = chartWidth / Math.max(trend.points.length - 1, 1);

    const plotted = trend.points.map((point, index) => {
      const x = chartX + pointGap * index;
      const normalized = (point.value - minValue) / denominator;
      const pointY = chartY + chartHeight - normalized * chartHeight;

      return {
        ...point,
        x,
        y: pointY,
      };
    });

    setDraw(doc, PLUM);
    doc.setLineWidth(0.8);

    plotted.forEach((point, index) => {
      if (index === 0) {
        return;
      }

      const previous = plotted[index - 1];

      doc.line(previous.x, previous.y, point.x, point.y);
    });

    plotted.forEach((point, index) => {
      setFill(doc, WHITE);
      setDraw(doc, PLUM);
      doc.setLineWidth(0.7);
      doc.circle(point.x, point.y, 1.5, 'FD');

      const shouldShowLabel =
        plotted.length <= 8 ||
        index === 0 ||
        index === plotted.length - 1 ||
        index % Math.ceil(plotted.length / 6) === 0;

      if (shouldShowLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        setText(doc, MUTED);

        doc.text(point.label, point.x, chartY + chartHeight + 5, {
          align: 'center',
        });
      }
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  setText(doc, MUTED);
  doc.text(trend.valueLabel.toUpperCase(), MARGIN_X + 5, cardY + 6);

  return cardY + cardHeight + 7;
}

function drawRankedSection(
  doc: jsPDF,
  section: NonNullable<AdminReportPdfConfig['rankedSections']>[number],
  y: number,
) {
  const rowCount = Math.max(section.items.length, 1);

  const estimatedTableHeight =
    10 + // section heading area
    8 + // table header
    rowCount * 8.5 +
    8; // spacing after table

  y = ensureSpace(doc, y, Math.min(estimatedTableHeight, 72));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, ROSEWOOD);
  doc.text(section.eyebrow.toUpperCase(), MARGIN_X, y);

  doc.setFontSize(13);
  setText(doc, NEAR_BLACK);
  doc.text(section.title, MARGIN_X, y + 6);

  const rows =
    section.items.length > 0
      ? section.items.map((item, index) => [
          String(index + 1),
          safeText(item.label),
          safeText(item.secondary),
          safeText(item.value),
        ])
      : [['—', 'No data available', '—', '—']];

  autoTable(doc, {
    startY: y + 10,
    pageBreak: 'avoid',
    margin: {
      left: MARGIN_X,
      right: MARGIN_X,
      bottom: 22,
    },
    head: [['#', 'Item', 'Details', 'Value']],
    body: rows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3,
      textColor: NEAR_BLACK,
      lineColor: BORDER,
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: DEEP_PLUM,
      textColor: WHITE,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: VERY_SOFT_LAVENDER,
    },
    columnStyles: {
      0: {
        cellWidth: 11,
        halign: 'center',
      },
      3: {
        halign: 'right',
        fontStyle: 'bold',
      },
    },
  });

  const finalY = (
    doc as jsPDF & {
      lastAutoTable?: {
        finalY: number;
      };
    }
  ).lastAutoTable?.finalY;

  return (finalY ?? y + 35) + 8;
}

function drawTable(doc: jsPDF, table: PdfTable, y: number) {
  y = ensureSpace(doc, y, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, ROSEWOOD);
  doc.text('DETAILED DATA', MARGIN_X, y);

  doc.setFontSize(13);
  setText(doc, NEAR_BLACK);
  doc.text(table.title, MARGIN_X, y + 6);

  autoTable(doc, {
    startY: y + 10,
    margin: {
      left: MARGIN_X,
      right: MARGIN_X,
      bottom: 22,
    },
    head: [table.columns],
    body:
      table.rows.length > 0
        ? table.rows.map((row) => row.map((value) => safeText(value)))
        : [table.columns.map((_, index) => (index === 0 ? 'No records available' : '—'))],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 2.7,
      textColor: NEAR_BLACK,
      lineColor: BORDER,
      lineWidth: 0.2,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: DEEP_PLUM,
      textColor: WHITE,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: VERY_SOFT_LAVENDER,
    },
  });

  const finalY = (
    doc as jsPDF & {
      lastAutoTable?: {
        finalY: number;
      };
    }
  ).lastAutoTable?.finalY;

  return (finalY ?? y + 35) + 8;
}

function drawClosingNote(doc: jsPDF, config: AdminReportPdfConfig, y: number) {
  y = ensureSpace(doc, y, 34);

  drawRoundedCard(doc, MARGIN_X, y, CONTENT_WIDTH, 26, SOFT_LAVENDER);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, DEEP_PLUM);
  doc.text('About this report', MARGIN_X + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  setText(doc, CHARCOAL);

  const note =
    `This ${config.reportTitle.toLowerCase()} was generated from Eventure's administrative reporting data ` +
    `using the selected date range and ${config.groupBy} grouping. Values reflect the data available ` +
    'to the administrator at the time of generation.';

  const lines = doc.splitTextToSize(note, CONTENT_WIDTH - 10) as string[];
  doc.text(lines, MARGIN_X + 5, y + 13);

  return y + 31;
}

export async function downloadAdminReportPdf(config: AdminReportPdfConfig) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let eventureLogo: string | null = null;

  try {
    eventureLogo = await loadImageAsDataUrl(EVENTURE_LOGO_PATH);
  } catch {
    eventureLogo = null;
  }

  doc.setProperties({
    title: `Eventure - ${config.reportTitle}`,
    subject: config.reportDescription,
    author: 'Eventure Administration',
    creator: 'Eventure',
  });

  let y = drawHeader(doc, config, eventureLogo);

  y = drawMetadata(doc, config, y);
  y = drawMetrics(doc, config.metrics, y);

  if (config.trend) {
    y = drawTrend(doc, config.trend, y);
  }

  config.rankedSections?.forEach((section) => {
    y = drawRankedSection(doc, section, y);
  });

  config.tables?.forEach((table) => {
    y = drawTable(doc, table, y);
  });

  drawClosingNote(doc, config, y);

  const totalPages = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    drawPageChrome(doc, pageNumber, totalPages);
  }

  const fileName = `eventure-${normalizeFileName(config.kind)}-report-${formatFileDate()}.pdf`;

  doc.save(fileName);
}
