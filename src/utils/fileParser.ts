import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnMapping, Ticket } from '../types';
import { autoDetectMapping, parseRowsToTickets } from './columnMapper';
import { detectarFormatoServiceDesk, ResultadoDeteccionFormato } from './serviceDeskFormatDetector';

export interface ParseResult {
  tickets: Ticket[];
  columns: string[];
  mapping: ColumnMapping;
  rawRows: Record<string, any>[];
  fileName: string;
  formatoInfo?: ResultadoDeteccionFormato;
}

export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();

  let rawRows: Record<string, any>[] = [];

  if (extension === 'csv') {
    const text = await file.text();
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    rawRows = result.data as Record<string, any>[];
  } else if (extension === 'xlsx' || extension === 'xls') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Find header row in first 20 rows looking strictly for 'id original' or 'request id'
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    let headerRowIndex = -1;

    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (Array.isArray(row)) {
        const hasStrictHeader = row.some((cell) => {
          if (cell === null || cell === undefined) return false;
          const cellStr = String(cell).toLowerCase().trim();
          return cellStr.includes('id original') || cellStr.includes('request id');
        });
        if (hasStrictHeader) {
          headerRowIndex = i;
          break;
        }
      }
    }

    // Fallback if no strict header row was found
    if (headerRowIndex === -1) {
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (Array.isArray(row)) {
          const hasAnyHeader = row.some((cell) => {
            if (cell === null || cell === undefined) return false;
            const cellStr = String(cell).toLowerCase().trim();
            return cellStr === 'id' || cellStr.includes('ticket id') || cellStr.includes('folio');
          });
          if (hasAnyHeader) {
            headerRowIndex = i;
            break;
          }
        }
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    rawRows = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRowIndex,
      defval: '',
    }) as Record<string, any>[];
  } else {
    throw new Error('Formato de archivo no soportado. Por favor sube un archivo .xlsx, .xls o .csv.');
  }

  // Clean empty column names
  if (rawRows.length > 0) {
    const columns = Object.keys(rawRows[0]).filter(
      (col) => col && !col.toLowerCase().startsWith('__empty') && !col.toLowerCase().startsWith('unnamed')
    );

    const mapping = autoDetectMapping(columns);
    const tickets = parseRowsToTickets(rawRows, mapping);
    const formatoInfo = detectarFormatoServiceDesk(columns, rawRows, fileName);

    return {
      tickets,
      columns,
      mapping,
      rawRows,
      fileName,
      formatoInfo,
    };
  }

  return {
    tickets: [],
    columns: [],
    mapping: autoDetectMapping([]),
    rawRows: [],
    fileName,
    formatoInfo: detectarFormatoServiceDesk([], [], fileName),
  };
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
