const ExcelJS = require('exceljs');

/**
 * Converts array of rows and column definitions to a CSV string.
 * @param {Array} rows 
 * @param {Array<{header: string, key: string, formatter?: Function}>} columns 
 * @returns {string}
 */
function toCSV(rows, columns) {
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

  return '\uFEFF' + [headerLine, ...dataLines].join('\n');
}

/**
 * Converts array of rows and column definitions to an Excel XLSX Buffer.
 * @param {Array} rows 
 * @param {Array<{header: string, key: string, formatter?: Function}>} columns 
 * @returns {Promise<Buffer>}
 */
async function toXLSX(rows, columns) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Export Data');

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.max(col.header.length + 5, 18),
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF285447' }, // Temple forest green
  };

  rows.forEach((row) => {
    const rowData = {};
    columns.forEach((col) => {
      let val = row[col.key];
      if (col.formatter) {
        val = col.formatter(val, row);
      }
      rowData[col.key] = val !== null && val !== undefined ? val : '';
    });
    worksheet.addRow(rowData);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = { toCSV, toXLSX };
