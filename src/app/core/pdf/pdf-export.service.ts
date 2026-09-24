import { Injectable } from '@angular/core';
import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { CalculationResult, formatCzk, formatDateTime, formatPct, RULES_VERSION, ScenarioResult } from '@core/calc';
import {
  buildDurationRows,
  buildInputRows,
  buildScenarioSections,
  scenarioSubtitle,
  scenarioTitle,
} from '../../features/calculator/scenario-rows';

/**
 * Klientský export PDF (část 9.5): A4 na šířku, oba scénáře vedle sebe,
 * datum a čas výpočtu, verze pravidel, všechny vstupy a kompletní výsledky.
 * Výsledková karta je `unbreakable`, takže se nikdy nerozdělí uprostřed bloku.
 * Nic se neukládá – PDF se generuje pouze z aktuálního validního stavu.
 */
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  async export(result: CalculationResult, warnings: { label: string; message: string }[] = []): Promise<void> {
    const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);
    pdfMake.addVirtualFileSystem(vfs as Record<string, string>);

    const now = new Date();
    const definition = this.buildDefinition(result, warnings, now);
    const fileName = `kalkulace-vykupu-${now.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.pdf`;
    pdfMake.createPdf(definition).download(fileName);
  }

  buildDefinition(
    result: CalculationResult,
    warnings: { label: string; message: string }[],
    now: Date
  ): TDocumentDefinitions {
    const inputs = buildInputRows(result);
    const durations = buildDurationRows(result);

    const inputTable = (rows: { label: string; value: string }[]): Content => ({
      table: {
        widths: ['*', 'auto'],
        body: rows.map((r) => [
          { text: r.label, style: 'cellLabel' },
          { text: r.value, style: 'cellValue' },
        ]),
      },
      layout: 'lightHorizontalLines',
    });

    const all = [...inputs, ...durations];
    const per = Math.ceil(all.length / 4);
    const cols = [0, 1, 2, 3].map((i) => all.slice(i * per, (i + 1) * per)).filter((c) => c.length > 0);

    return {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [28, 26, 28, 30],
      info: { title: 'Kalkulačka výkupu BO! reality', author: 'BO! reality', subject: 'Kalkulace výkupu nemovitosti' },
      defaultStyle: { font: 'Roboto', fontSize: 7.5, lineHeight: 1.1 },
      styles: {
        h1: { fontSize: 14, bold: true },
        h2: { fontSize: 9.5, bold: true, margin: [0, 6, 0, 3] },
        meta: { fontSize: 7, color: '#666666' },
        cellLabel: { color: '#555555' },
        cellValue: { alignment: 'right', bold: false },
        section: { fontSize: 6.5, bold: true, color: '#777777', margin: [0, 3, 0, 1] },
        rowStrong: { bold: true },
        verdictPass: { color: '#1b7f3b', bold: true, fontSize: 11 },
        verdictFail: { color: '#b3261e', bold: true, fontSize: 11 },
      },
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: `Kalkulačka výkupu BO! reality · ${RULES_VERSION}`, style: 'meta', margin: [32, 0, 0, 0] },
          { text: `Strana ${currentPage} / ${pageCount}`, style: 'meta', alignment: 'right', margin: [0, 0, 32, 0] },
        ],
        margin: [0, 12, 0, 0],
      }),
      content: [
        {
          columns: [
            { text: 'Kalkulačka výkupu BO! reality', style: 'h1' },
            {
              stack: [
                { text: `Datum a čas výpočtu: ${formatDateTime(now)}`, style: 'meta' },
                { text: `Verze pravidel: ${RULES_VERSION}`, style: 'meta' },
              ],
              alignment: 'right',
            },
          ],
        },
        {
          text: 'Garantovaný scénář (nejnižší garantovaná prodejní cena) je konzervativní a rozhodující. Tržní scénář je doplňkový optimistický pohled.',
          style: 'meta',
          margin: [0, 3, 0, 4],
        },

        // Vstupy
        { text: 'Vstupy ovlivňující výpočet', style: 'h2' },
        {
          columns: cols.map(inputTable),
          columnGap: 14,
        },
        ...(warnings.length
          ? [
              { text: 'Neblokující upozornění', style: 'h2' } as Content,
              { ul: warnings.map((w) => `${w.label}: ${w.message}`), style: 'meta' } as Content,
            ]
          : []),

        // Scénáře vedle sebe
        {
          // Nadpis a obě karty drží pohromadě; každá karta je navíc sama nedělitelná.
          stack: [
            { text: 'Výsledky scénářů', style: 'h2', margin: [0, 6, 0, 3] },
            {
              columns: [this.scenarioCard(result, result.guaranteed), this.scenarioCard(result, result.market)],
              columnGap: 14,
            },
          ],
          unbreakable: true,
        },
      ],
    };
  }

  private scenarioCard(result: CalculationResult, s: ScenarioResult): Content {
    const sections = buildScenarioSections(result, s);
    const isGuaranteed = s.kind === 'guaranteed';
    const body: TableCell[][] = [];

    body.push([
      {
        stack: [
          {
            text: `${scenarioTitle(s.kind)}${isGuaranteed ? ' – Rozhodující varianta' : ' – Optimistický pohled'}`,
            bold: true,
            fontSize: 9.5,
          },
          { text: scenarioSubtitle(s.kind), style: 'meta' },
        ],
        colSpan: 2,
        fillColor: isGuaranteed ? '#eeeeee' : '#e8f1fb',
        margin: [4, 3, 4, 3],
      },
      {},
    ]);

    body.push([
      {
        columns: [
          { text: `Stav: ${s.verdict}`, style: s.passes ? 'verdictPass' : 'verdictFail' },
          {
            text: `Celkový zisk ${formatCzk(s.totalProfit)} · marže ${formatPct(s.totalNetMarginPct)}`,
            alignment: 'right',
            bold: true,
            fontSize: 9,
          },
        ],
        colSpan: 2,
        margin: [4, 3, 4, 3],
      },
      {},
    ]);

    for (const section of sections) {
      body.push([{ text: section.title.toUpperCase(), style: 'section', colSpan: 2, margin: [4, 3, 4, 0] }, {}]);
      for (const row of section.rows) {
        const strong = row.tone === 'strong';
        const negative = row.numeric !== undefined && row.numeric < 0;
        body.push([
          { text: row.label, style: strong ? 'rowStrong' : 'cellLabel', margin: [4, 0.5, 4, 0.5] },
          {
            text: row.exact ?? row.value,
            alignment: 'right',
            bold: strong,
            color: negative ? '#b3261e' : undefined,
            margin: [4, 0.5, 4, 0.5],
          },
        ]);
      }
    }

    return {
      unbreakable: true,
      table: { widths: ['*', 'auto'], body },
      layout: {
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0.8 : 0.3),
        vLineWidth: () => 0,
        hLineColor: (i, node) =>
          i === 0 || i === node.table.body.length ? (isGuaranteed ? '#222222' : '#5b9bd5') : '#dddddd',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    };
  }
}
