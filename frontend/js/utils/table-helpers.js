/* ==========================================================================
   table-helpers.js
   ========================================================================== */

import { openModal } from '../components/modal.js';
import { pnsForPo } from '../components/shared-tables.js';
import { POS, PO_EXTRACTION_RECORDS, PO_SOURCE_FILES } from '../data/mock-data.js';
import { PROJECTS } from '../data/projects-store.js';
import { poVersionRecords } from '../pages/purchase-orders.js';
import { renderPage } from '../pages/router.js';
import { state } from '../state.js';
import { icon } from './icons.js';
import { poColumns } from './table-state.js';

export function toggleColMenu() { state.colMenuOpen = !state.colMenuOpen; renderPage(); }

export function toggleColumn(key) { poColumns[key] = !poColumns[key]; renderPage(); }

export function columnMenuPanel() {
      const labels = { version: 'Version', pnCount: 'PN Count', delivery: 'Delivery Date', simulation: 'Simulation', status: 'Readiness', lifecycle: 'Lifecycle' };
      return `<div class="col-menu-panel open" onclick="event.stopPropagation()">
    ${Object.keys(labels).map(k => `<label class="col-menu-item"><input type="checkbox" ${poColumns[k] ? 'checked' : ''} onchange="toggleColumn('${k}')"/> ${labels[k]}</label>`).join('')}
  </div>`;
    }

export function filterChips(filters, labels, clearFnName, resetFnName) {
      const active = Object.keys(filters).filter(k => filters[k]);
      if (active.length === 0) return '';
      return `<div class="chip-row">
    ${active.map(k => `<div class="chip">${labels[k] || k} : ${filters[k]}
      <div class="chip-x" onclick="${clearFnName}('${k}')">${icon('close', '')}</div>
    </div>`).join('')}
    <div class="chip-reset" onclick="${resetFnName}()">Reset All</div>
  </div>`;
    }

export function statsRow(items) {
      return `<div class="stats-row">
    ${items.map(it => `<div class="stat-pill"><div class="sp-label">${it.label}</div><div class="sp-value" style="color:${it.color || 'var(--ink)'}">${it.value}</div></div>`).join('')}
  </div>`;
    }

export function sortTh(label, key, sortState, fnName) {
      const active = sortState.key === key;
      return `<th class="sortable" onclick="${fnName}('${key}')">${label}<span class="sort-arrows">
    <svg class="${active && sortState.dir === 1 ? 'active' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M6 15l6-6 6 6"/></svg>
    <svg class="${active && sortState.dir === -1 ? 'active' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M6 9l6 6 6-6"/></svg>
  </span></th>`;
    }

export function sortRows(rows, sortState) {
      if (!sortState.key) return rows;
      const key = sortState.key, dir = sortState.dir;
      return [...rows].sort((a, b) => {
        let av = a[key], bv = b[key];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

export function rowCountLabel(n, noun) {
      const plural = n === 1 ? noun : (noun.endsWith('y') && !/[aeiou]y$/i.test(noun) ? noun.slice(0, -1) + 'ies' : noun + 's');
      return `<div class="row-count">${n} ${plural}</div>`;
    }

export function paginationBar(total, page, pageSize, setPageFnName) {
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      page = Math.min(page, totalPages);
      const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const end = Math.min(total, page * pageSize);
      let pages = [];
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      if (pages.length > 5) {
        pages = [1, 2, '…', totalPages - 1, totalPages];
        if (page > 2 && page < totalPages - 1) pages = [1, '…', page, '…', totalPages];
      }
      return `<div class="pagination-bar">
    <div class="pagination-info">Showing ${start}–${end} of ${total}</div>
    <div class="pagination-pages">
      <div class="page-btn ${page <= 1 ? 'disabled' : ''}" onclick="${setPageFnName}(${page - 1})">${icon('chevLeft', '')}</div>
      ${pages.map(p => p === '…' ? `<div class="page-btn disabled">…</div>` : `<div class="page-btn ${p === page ? 'active' : ''}" onclick="${setPageFnName}(${p})">${p}</div>`).join('')}
      <div class="page-btn ${page >= totalPages ? 'disabled' : ''}" onclick="${setPageFnName}(${page + 1})">${icon('chevRight', '')}</div>
    </div>
  </div>`;
    }

export function emptyStateBlock(title, sub, resetFnName) {
      return `<div class="empty-state">
    ${icon('folder', '')}
    <div class="e-title">${title}</div>
    <div class="e-sub">${sub}</div>
    ${resetFnName ? `<button class="btn sm" style="margin-top:14px;" onclick="${resetFnName}()">Reset Filters</button>` : ''}
  </div>`;
    }

export function exportNotice() { openModal('Export', 'Use the PDF or Excel buttons beside a table title to export the visible table.'); }

export function inlineJsValue(value) { return String(value || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/[\r\n]+/g,' '); }

export function exportFileName(value) { return String(value || 'export').trim().replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'') || 'export'; }

export function exportHtmlValue(value) { return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export function tableExportActions(tableId, title) {
      const safeTitle = inlineJsValue(title);
      return `<div class="table-export-actions"><button class="btn sm" title="Export ${exportHtmlValue(title)} as PDF" onclick="exportWorkspaceTable('${tableId}','pdf','${safeTitle}')">${icon('FileText','')} PDF</button><button class="btn sm" title="Export ${exportHtmlValue(title)} as Excel" onclick="exportWorkspaceTable('${tableId}','excel','${safeTitle}')">${icon('download','')} Excel</button></div>`;
    }

export function workspaceTableData(tableId) {
      const table = document.getElementById(tableId);
      if (!table) return null;
      const headerCells = [...table.querySelectorAll('thead th')];
      const keepIndexes = headerCells.map((cell,index) => ({ cell,index })).filter(item => item.cell.dataset.export !== 'false' && !/^actions?$/i.test(item.cell.innerText.trim())).map(item => item.index);
      const headers = keepIndexes.map(index => headerCells[index]?.innerText.trim() || '');
      const rows = [...table.querySelectorAll('tbody tr, tfoot tr')].map(row => {
        const cells = [...row.querySelectorAll('td')];
        return keepIndexes.map(index => (cells[index]?.innerText || '').replace(/\s+/g,' ').trim());
      }).filter(row => row.some(Boolean));
      return { headers, rows };
    }

export function downloadWorkspaceBlob(content, mime, fileName) {
      const blob = new Blob([content], { type:mime });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = fileName;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href),1000);
    }

export function exportWorkspaceTable(tableId, format, title) {
      const data = workspaceTableData(tableId);
      if (!data || !data.headers.length) return openModal('Export unavailable','The table is not currently visible. Open the table and try again.');
      const fileBase = exportFileName(title);
      const tableHtml = `<table><thead><tr>${data.headers.map(value => `<th>${exportHtmlValue(value)}</th>`).join('')}</tr></thead><tbody>${data.rows.map(row => `<tr>${row.map(value => `<td style="mso-number-format:'\\@'">${exportHtmlValue(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      if (format === 'excel') {
        const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><h2>${exportHtmlValue(title)}</h2>${tableHtml}</body></html>`;
        downloadWorkspaceBlob(workbook,'application/vnd.ms-excel;charset=utf-8',`${fileBase}.xls`);
        return;
      }
      const popup = window.open('','_blank','width=1200,height=800');
      if (!popup) return openModal('PDF export blocked','Allow pop-ups for this application, then select PDF again.');
      popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${exportHtmlValue(title)}</title><style>@page{size:landscape;margin:14mm}body{font-family:Arial,sans-serif;color:#111}h1{font-size:20px;margin:0 0 14px}p{font-size:10px;color:#555;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:9px}th,td{padding:7px 8px;border:1px solid #cbd5e1;text-align:left;vertical-align:top}th{background:#eaf4f6;font-weight:700}tr:nth-child(even) td{background:#f8fafc}</style></head><body><h1>${exportHtmlValue(title)}</h1><p>Generated ${exportHtmlValue(new Date().toLocaleString())}</p>${tableHtml}<script>window.onload=()=>{window.focus();window.print();}<\/script></body></html>`);
      popup.document.close();
    }

export function poExtractionPayload(poId) {
      if (poId === 'draft') return JSON.parse(JSON.stringify(state.poExtraction));
      const stored = PO_EXTRACTION_RECORDS.get(poId);
      if (stored) return JSON.parse(JSON.stringify(stored));
      const po = POS.find(item => item.id === poId);
      if (!po) return null;
      const project = PROJECTS.find(item => item.name === po.project);
      const lines = pnsForPo(poId).map((item,index) => {
        const quantity = Number(item.qty || 0);
        const unitPrice = Number(item.unitPrice || 0);
        return {
          line_no:String(index + 1).padStart(5,'0'), plant:'1000', due_date:po.delivery || '',
          material_group:'FINISHED-GOOD', part_number:item.pn, description:item.desc,
          customer_part_ref:`${po.customer.replace(/\s+/g,'-').toUpperCase()}-${String(index + 1).padStart(4,'0')}`,
          item_category:'Standard', quantity, unit_price:unitPrice,
          total:Number((quantity * unitPrice).toFixed(2))
        };
      });
      const computedTotal = Number(lines.reduce((sum,line) => sum + line.total,0).toFixed(2));
      return {
        po_number:po.id, version:String(po.version || 'v1').replace(/^v/i,''), order_date:po.date || '', change_date:po.date || '',
        supplier_no:'SUP-100483', supplier_name:'Approved Automotive Components Supplier',
        supplier_address:"Tangier Automotive City, Morocco", buyer_name:'Adient Automotive Seating Morocco',
        buyer_vat:'MA40487126', buyer_register_nr:'RC 186245', invoicing_party_taxid:'MA100347829',
        delivery_contact:project?.engineer || 'Launch Engineer', delivery_address:project?.site || 'Tangier Plant 2',
        payment_terms:'Immediate payment', incoterms:'DAP Tangier', contact_name:project?.engineer || 'Launch Engineer',
        contact_tel:'+212 539 40 18 76', contact_email:'launch.engineering@example.com',
        header_text:`Validated purchase order for ${po.project}.`, currency:lines[0]?.currency || 'EUR',
        jit_customer:po.customer, development_level:'Production', engineering_phase:'Launch',
        reason_of_purchase:'Production launch requirement', stated_total:computedTotal, computed_total:computedTotal,
        totals_match:true, line_count:lines.length, lines
      };
    }

export function poExtractionWorkbookHtml(payload) {
      const headerLabels = {
        po_number:'PO Number', version:'Version', order_date:'Order Date', change_date:'Change Date',
        supplier_no:'Supplier Number', supplier_name:'Supplier Name', supplier_address:'Supplier Address',
        buyer_name:'Buyer Name', buyer_vat:'Buyer VAT', buyer_register_nr:'Buyer Register Number',
        invoicing_party_taxid:'Invoicing Party Tax ID', delivery_contact:'Delivery Contact',
        delivery_address:'Delivery Address', payment_terms:'Payment Terms', incoterms:'Incoterms',
        contact_name:'Contact Name', contact_tel:'Contact Telephone', contact_email:'Contact Email',
        header_text:'Header Text', currency:'Currency', jit_customer:'Customer', development_level:'Development Level',
        engineering_phase:'Engineering Phase', reason_of_purchase:'Reason of Purchase', stated_total:'Stated Total',
        computed_total:'Computed Total', totals_match:'Totals Match', line_count:'Line Count'
      };
      const lineColumns = [
        ['line_no','Line Number'],['plant','Plant'],['due_date','Due Date'],['material_group','Material Group'],
        ['part_number','Part Number'],['description','Description'],['customer_part_ref','Customer Part Reference'],
        ['item_category','Item Category'],['quantity','Quantity'],['unit_price','Unit Price'],['total','Line Total']
      ];
      const headerRows = Object.entries(headerLabels).map(([key,label]) => `<tr><th>${exportHtmlValue(label)}</th><td style="mso-number-format:'\\@'">${exportHtmlValue(payload[key] === true ? 'Yes' : payload[key] === false ? 'No' : payload[key])}</td></tr>`).join('');
      const lineRows = (payload.lines || []).map(line => `<tr>${lineColumns.map(([key]) => `<td ${['line_no','part_number','customer_part_ref'].includes(key) ? `style="mso-number-format:'\\@'"` : ''}>${exportHtmlValue(line[key])}</td>`).join('')}</tr>`).join('');
      return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#111827}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px;color:#086f86}p{color:#475569}table{border-collapse:collapse;min-width:900px}th,td{border:1px solid #cbd5e1;padding:7px 9px;text-align:left}th{background:#e7f4f7;font-weight:700}.meta{min-width:620px}.meta th{width:220px}</style></head><body><h1>Purchase Order Extraction — ${exportHtmlValue(payload.po_number)}</h1><p>Validated structured data · Version ${exportHtmlValue(payload.version)} · ${exportHtmlValue(payload.currency)}</p><h2>PO Header</h2><table class="meta"><tbody>${headerRows}</tbody></table><h2>Extracted Line Items</h2><table><thead><tr>${lineColumns.map(([,label]) => `<th>${exportHtmlValue(label)}</th>`).join('')}</tr></thead><tbody>${lineRows}</tbody></table></body></html>`;
    }

export function downloadPoExtractionExcel(poId) {
      const payload = poExtractionPayload(poId);
      if (!payload) return openModal('Excel export unavailable','The extracted purchase order data could not be found.');
      const filePo = poId === 'draft' ? payload.po_number : poId;
      downloadWorkspaceBlob(poExtractionWorkbookHtml(payload),'application/vnd.ms-excel;charset=utf-8',`${exportFileName(filePo)}_extracted_v${exportFileName(payload.version)}.xls`);
    }

export function pdfSafeText(value) {
      return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
    }

export function buildPoSourcePdf(payload) {
      const sourceLines = [
        'PURCHASE ORDER', `PO Number: ${payload.po_number}`, `Version: ${payload.version}`,
        `Order Date: ${payload.order_date || '-'}`, `Customer: ${payload.jit_customer || payload.buyer_name || '-'}`,
        `Supplier: ${payload.supplier_name || '-'}`, `Currency: ${payload.currency || 'EUR'}`,
        `Total: ${Number(payload.computed_total || 0).toFixed(2)} ${payload.currency || 'EUR'}`, '', 'LINE ITEMS'
      ];
      (payload.lines || []).slice(0,14).forEach(line => sourceLines.push(`${line.line_no}  ${line.part_number}  Qty ${line.quantity}  Unit ${Number(line.unit_price || 0).toFixed(2)}  Total ${Number(line.total || 0).toFixed(2)}`));
      if ((payload.lines || []).length > 14) sourceLines.push(`... ${(payload.lines || []).length - 14} additional line item(s)`);
      sourceLines.push('', 'Mockup source document for seeded demonstration data.');
      const commands = ['BT','/F1 17 Tf','50 748 Td',`(${pdfSafeText(sourceLines[0])}) Tj`,'/F1 10 Tf'];
      sourceLines.slice(1).forEach(line => commands.push('0 -22 Td',`(${pdfSafeText(line)}) Tj`));
      commands.push('ET');
      const stream = commands.join('\n');
      const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
      ];
      let pdf = '%PDF-1.4\n% LaunchOps mockup\n';
      const offsets = [0];
      objects.forEach((object,index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
      const xrefOffset = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10,'0')} 00000 n \n`;
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
      return pdf;
    }

export function poOriginalFileName(poId) {
      if (poId === 'draft') return state.poIntake.fileName || `${state.poExtraction.po_number}_original.pdf`;
      const source = PO_SOURCE_FILES.get(poId);
      if (source?.name) return source.name;
      const po = POS.find(item => item.id === poId);
      const version = po ? poVersionRecords(po).find(item => item.current) : null;
      return version?.file || `${poId}_original.pdf`;
    }

export function downloadOriginalPoPdf(poId) {
      if (poId === 'draft' && state.poIntake.sourceFile) {
        downloadWorkspaceBlob(state.poIntake.sourceFile,state.poIntake.sourceFile.type || 'application/pdf',poOriginalFileName(poId));
        return;
      }
      const source = PO_SOURCE_FILES.get(poId);
      if (source?.file) {
        downloadWorkspaceBlob(source.file,source.file.type || 'application/pdf',source.name || `${poId}_original.pdf`);
        return;
      }
      const payload = poExtractionPayload(poId);
      if (!payload) return openModal('PDF unavailable','The retained purchase order source document could not be found.');
      downloadWorkspaceBlob(buildPoSourcePdf(payload),'application/pdf',poOriginalFileName(poId));
    }

export function poDocumentDownloadButtons(poId, compact = false) {
      const size = compact ? ' sm' : '';
      return `<button class="btn${size}" title="Download the retained source PDF" onclick="downloadOriginalPoPdf('${inlineJsValue(poId)}')">${icon('FileText','')} Original PDF</button><button class="btn${size}" title="Download all validated extracted fields and line items" onclick="downloadPoExtractionExcel('${inlineJsValue(poId)}')">${icon('download','')} Extracted Excel</button>`;
    }

export function refreshNotice() { renderPage(); }
