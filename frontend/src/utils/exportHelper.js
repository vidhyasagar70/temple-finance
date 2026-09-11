import axiosClient from '../api/axiosClient';

/**
 * Downloads export file (CSV or XLSX) from the backend endpoint.
 * Handles desktop browsers, Chrome Android, and iOS Safari blob downloads.
 * @param {string} endpoint - API route (e.g. '/pangalis/export')
 * @param {string} baseFileName - Desired filename without extension (e.g. 'Pangalis_List')
 * @param {object} params - Filter query params
 * @param {'csv'|'xlsx'} format - Export format
 */
export const downloadExport = async (endpoint, baseFileName, params = {}, format = 'csv') => {
  const responseData = await axiosClient.get(endpoint, {
    params: { ...params, format },
    responseType: 'blob',
  });

  const mimeType = format === 'xlsx' 
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv;charset=utf-8;';

  const blobObj = new Blob([responseData], { type: mimeType });
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  const fileName = `${baseFileName}_${new Date().toISOString().split('T')[0]}.${ext}`;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blobObj, fileName);
    return;
  }

  const url = window.URL.createObjectURL(blobObj);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);

  if (isIOS) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    window.URL.revokeObjectURL(url);
  }, 1000);
};
