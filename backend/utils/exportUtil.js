const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const TAMIL_TITLE = 'அருள்மிகு சூராயம்மன் கோவில் துணை';

/**
 * Converts array of rows and column definitions to a CSV string with title header.
 * @param {Array} rows 
 * @param {Array<{header: string, key: string, formatter?: Function}>} columns 
 * @param {string} [title]
 * @returns {string}
 */
function toCSV(rows, columns, title = TAMIL_TITLE) {
  const titleLine = `"${title.replace(/"/g, '""')}"`;
  const subLine = `"நிதி நிர்வாக அறிக்கை (Finance Management Report) - Export Date: ${new Date().toLocaleDateString('ta-IN')}"`;
  const headerLine = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');

  const dataLines = rows.map((row) => {
    return columns
      .map((col) => {
        let val = row[col.key];
        if (col.formatter) {
          val = col.formatter(val, row);
        }
        if (val === null || val === undefined) {
          val = '';
        }
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(',');
  });

  return '\uFEFF' + [titleLine, subLine, '', headerLine, ...dataLines].join('\n');
}

/**
 * Converts array of rows and column definitions to an Excel XLSX Buffer.
 * Embeds logo image and Tamil title banner at top of the document.
 * @param {Array} rows 
 * @param {Array<{header: string, key: string, formatter?: Function}>} columns 
 * @param {string} [title]
 * @returns {Promise<Buffer>}
 */
async function toXLSX(rows, columns, title = TAMIL_TITLE) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report Data');

  // Check logo image path
  const logoPath = path.join(__dirname, '../assets/logo.jpeg');
  const hasLogo = fs.existsSync(logoPath);

  if (hasLogo) {
    const imageId = workbook.addImage({
      filename: logoPath,
      extension: 'jpeg',
    });
    // Add logo image with enlarged dimensions (100x100 pixels) at top-left
    worksheet.addImage(imageId, {
      tl: { col: 0.1, row: 0.1 },
      ext: { width: 100, height: 100 },
      editAs: 'oneCell'
    });
  }

  const totalCols = Math.max(columns.length, 6);

  // Set Row Heights for Title Header Banner
  worksheet.getRow(1).height = hasLogo ? 35 : 24;
  worksheet.getRow(2).height = 36;
  worksheet.getRow(3).height = 24;
  worksheet.getRow(4).height = 14;

  const startCol = hasLogo ? 3 : 1; // Start text in Column C if logo is in Col A-B

  // Title: "அருள்மிகு சூராயம்மன் கோவில் துணை"
  worksheet.mergeCells(2, startCol, 2, totalCols);
  const titleCell = worksheet.getCell(2, startCol);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1C3D32' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Subtitle: "நிதி நிர்வாக அறிக்கை | Export Date..."
  worksheet.mergeCells(3, startCol, 3, totalCols);
  const subCell = worksheet.getCell(3, startCol);
  subCell.value = `நிதி நிர்வாக அறிக்கை | Export Date: ${new Date().toLocaleDateString('en-IN')}`;
  subCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF555555' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 5: Column Headers
  const headerRowIndex = 5;
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 28;

  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF285447' }, // Temple Forest Green
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1C3D32' } },
      bottom: { style: 'medium', color: { argb: 'FF1C3D32' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  });

  // Data Rows (Row 6+)
  rows.forEach((row, rIdx) => {
    const rowNum = headerRowIndex + 1 + rIdx;
    const rowObj = worksheet.getRow(rowNum);
    rowObj.height = 22;

    columns.forEach((col, cIdx) => {
      let val = row[col.key];
      if (col.formatter) {
        val = col.formatter(val, row);
      }
      const cell = rowObj.getCell(cIdx + 1);
      cell.value = val !== null && val !== undefined ? val : '';
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (rIdx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    });
  });

  // Calculate & Set Column Widths
  columns.forEach((col, idx) => {
    const column = worksheet.getColumn(idx + 1);
    let maxLen = col.header.length;
    rows.forEach((row) => {
      let val = row[col.key];
      if (col.formatter) {
        val = col.formatter(val, row);
      }
      if (val) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    });
    column.width = Math.max(maxLen + 4, 18);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = { toCSV, toXLSX, TAMIL_TITLE };

