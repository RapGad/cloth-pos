/**
 * Converts an array of objects to CSV format and triggers a file download
 * @param data Array of objects to export
 * @param filename Name of the file to download (without extension)
 * @param headers Optional mapping of field names to display headers. If not provided, keys are used.
 */
export const exportToCSV = (data: any[], filename: string, headers?: Record<string, string>) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get keys from first object if headers not provided
  const dataKeys = Object.keys(data[0]);
  const headerKeys = headers ? Object.keys(headers) : dataKeys;
  const headerLabels = headers ? Object.values(headers) : dataKeys;

  // Build CSV content
  const csvRows = [
    headerLabels.join(','), // Header row
    ...data.map(row => {
      return headerKeys.map(key => {
        let value = row[key];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        }
        
        // Handle objects/arrays (convert to string)
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }

        // Handle strings with commas or quotes (wrap in quotes and escape quotes)
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    })
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
