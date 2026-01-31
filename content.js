(() => {
  let isExporting = false;

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function findTable() {
    const tables = document.querySelectorAll('table');
    if (tables.length === 0) return null;
    
    let largestTable = tables[0];
    let maxRows = tables[0].querySelectorAll('tr').length;
    
    tables.forEach(table => {
      const rowCount = table.querySelectorAll('tr').length;
      if (rowCount > maxRows) {
        maxRows = rowCount;
        largestTable = table;
      }
    });
    
    return largestTable;
  }

  function extractTableData(table) {
    const rows = table.querySelectorAll('tr');
    const data = [];
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('th, td');
      const rowData = [];
      
      cells.forEach(cell => {
        let text = cell.innerText || cell.textContent || '';
        text = text.trim().replace(/\s+/g, ' ');
        rowData.push(text);
      });
      
      if (rowData.length > 0 && rowData.some(cell => cell.length > 0)) {
        data.push(rowData);
      }
    });
    
    return data;
  }

  function findNextButton() {
    const selectors = [
      'a.next',
      'button.next',
      '.next > a',
      '.next > button',
      '.pagination-next',
      '.pagination-next > a',
      '.pagination-next > button',
      'a.page-link[aria-label="Next"]',
      'button[aria-label="Next"]',
      'a[aria-label="Next"]',
      'a[aria-label="Next page"]',
      'button[aria-label="Next page"]',
      '.pagination a:last-child',
      '.pagination li:last-child a',
      'a[rel="next"]',
      'button[rel="next"]',
      '[class*="next"]:not([disabled])',
      'a:has(> [class*="chevron-right"])',
      'button:has(> [class*="chevron-right"])',
      'a:has(> [class*="arrow-right"])',
      'button:has(> [class*="arrow-right"])',
      '.paginate_button.next',
      '#next',
      '.next-page',
      'a[title="Next"]',
      'button[title="Next"]',
      'a[title="Next Page"]',
      'button[title="Next Page"]'
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (isNextButtonValid(el)) {
            return el;
          }
        }
      } catch (e) {
        continue;
      }
    }

    const allButtons = document.querySelectorAll('a, button');
    for (const el of allButtons) {
      const text = (el.innerText || el.textContent || '').toLowerCase().trim();
      if ((text === 'next' || text === '›' || text === '»' || text === '>') && isNextButtonValid(el)) {
        return el;
      }
    }

    return null;
  }

  function isNextButtonValid(element) {
    if (!element) return false;
    
    if (element.disabled) return false;
    if (element.classList.contains('disabled')) return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    if (element.hasAttribute('disabled')) return false;
    
    const parent = element.parentElement;
    if (parent && parent.classList.contains('disabled')) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (style.pointerEvents === 'none') return false;
    
    return true;
  }

  function escapeXML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function convertToExcelXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '  <Styles>\n';
    xml += '    <Style ss:ID="Header">\n';
    xml += '      <Font ss:Bold="1" ss:Size="11"/>\n';
    xml += '      <Interior ss:Color="#4472C4" ss:Pattern="Solid"/>\n';
    xml += '      <Font ss:Color="#FFFFFF" ss:Bold="1"/>\n';
    xml += '    </Style>\n';
    xml += '    <Style ss:ID="Default">\n';
    xml += '      <Font ss:Size="11"/>\n';
    xml += '    </Style>\n';
    xml += '  </Styles>\n';
    xml += '  <Worksheet ss:Name="Sheet1">\n';
    xml += '    <Table>\n';

    data.forEach((row, rowIndex) => {
      xml += '      <Row>\n';
      row.forEach(cell => {
        const styleId = rowIndex === 0 ? 'Header' : 'Default';
        const cellValue = escapeXML(cell);
        const isNumber = !isNaN(cell) && cell.trim() !== '';
        const cellType = isNumber ? 'Number' : 'String';
        xml += `        <Cell ss:StyleID="${styleId}"><Data ss:Type="${cellType}">${cellValue}</Data></Cell>\n`;
      });
      xml += '      </Row>\n';
    });

    xml += '    </Table>\n';
    xml += '  </Worksheet>\n';
    xml += '</Workbook>';

    return xml;
  }

  function downloadExcel(data, filename) {
    const excelContent = convertToExcelXML(data);
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  async function waitForTableUpdate(previousRowCount, table, maxWait = 5000) {
    const startTime = Date.now();
    const checkInterval = 100;
    
    while (Date.now() - startTime < maxWait) {
      await sleep(checkInterval);
      
      const currentTable = findTable();
      if (!currentTable) continue;
      
      const currentRows = currentTable.querySelectorAll('tr').length;
      
      if (currentRows > 0 && currentRows !== previousRowCount) {
        await sleep(300);
        return true;
      }
    }
    
    await sleep(500);
    return true;
  }

  async function exportAllPages() {
    if (isExporting) {
      return { success: false, error: 'Export already in progress' };
    }

    isExporting = true;
    let allData = [];
    let headers = null;
    let pageCount = 0;
    let totalRows = 0;

    try {
      const table = findTable();
      if (!table) {
        return { success: false, error: 'No table found on this page' };
      }

      while (true) {
        pageCount++;
        
        const currentTable = findTable();
        if (!currentTable) {
          break;
        }

        const pageData = extractTableData(currentTable);
        
        if (pageData.length === 0) {
          break;
        }

        if (headers === null && pageData.length > 0) {
          const firstRow = currentTable.querySelector('tr');
          const hasHeaders = firstRow && firstRow.querySelectorAll('th').length > 0;
          
          if (hasHeaders) {
            headers = pageData[0];
            allData.push(headers);
            const dataRows = pageData.slice(1);
            allData.push(...dataRows);
            totalRows += dataRows.length;
          } else {
            allData.push(...pageData);
            totalRows += pageData.length;
          }
        } else {
          const firstRow = currentTable.querySelector('tr');
          const hasHeaders = firstRow && firstRow.querySelectorAll('th').length > 0;
          
          const dataRows = hasHeaders ? pageData.slice(1) : pageData;
          allData.push(...dataRows);
          totalRows += dataRows.length;
        }

        try {
          chrome.runtime.sendMessage({
            action: 'progress',
            page: pageCount,
            rowsCollected: totalRows,
            totalPages: pageCount
          });
        } catch (e) {
        }

        const previousRowCount = currentTable.querySelectorAll('tr').length;

        const nextButton = findNextButton();
        
        if (!nextButton) {
          break;
        }

        nextButton.click();

        await waitForTableUpdate(previousRowCount, currentTable);

        if (pageCount > 1000) {
          break;
        }
      }

      if (allData.length === 0) {
        return { success: false, error: 'No data extracted from table' };
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `students_${timestamp}.xls`;
      
      downloadExcel(allData, filename);

      return {
        success: true,
        totalRows: totalRows,
        totalPages: pageCount,
        filename: filename
      };

    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      isExporting = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startExport') {
      exportAllPages().then(result => {
        sendResponse(result);
      });
      return true;
    }
  });

  console.log('Table Exporter content script loaded');
})();
