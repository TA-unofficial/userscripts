// ==UserScript==
// @name         TA-Payroll Enhancer
// @version      1.5.1
// @description  Adds various features to update your Payroll experience
// @match        *://ta-payroll.azurewebsites.net/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/TA-unofficial/userscripts/refs/heads/main/ta-payroll-enhancer.user.js
// @updateURL    https://raw.githubusercontent.com/TA-unofficial/userscripts/refs/heads/main/ta-payroll-enhancer.user.js
// ==/UserScript==

(function () {
    'use strict';

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    function parseDateString(dateStr) {
        return new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
    }

    function calculateShiftHours() {
        if (!location.href.includes('/SignIns')) return;

        const table = document.querySelector('#DataTables_Table_0');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        let totalRows = 0;
        let totalShiftSeconds = 0;
        let totalSpecialTaskSeconds = 0;

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const startText = cells[1].textContent.trim();
                const endText = cells[2].textContent.trim().replace(/\s+/g, ' ');
                const typeText = cells[3].textContent.trim().toLowerCase();

                const start = parseDateString(startText);
                const end = parseDateString(endText);

                if (!isNaN(start) && !isNaN(end) && end > start) {
                    const duration = (end - start) / 1000;
                    if (/^S[1-6](\s*-\s*S[1-6])?$/.test(typeText)) {
                        totalShiftSeconds += duration;
                    } else {
                        totalSpecialTaskSeconds += duration;
                    }
                }
                totalRows++;
            }
        });
        
        if (totalRows === 0) return;

        const totalSeconds = totalShiftSeconds + totalSpecialTaskSeconds;

        // Get visible entries value from dropdown
        const entryDropdown = document.querySelector('#DataTables_Table_0_length > label > select');
        const entryCount = entryDropdown ? entryDropdown.value : 'x';
        
        // Get total entries
        let totalCount = 0;
        const infoText = document.querySelector('#DataTables_Table_0_info')?.textContent;
        if (infoText) {
            // Match "of X entries" where X is the total
            const match = infoText.match(/of\s+(\d+)\s+entries/);
            totalCount = match ? parseInt(match[1], 10) : 0;
        }

        // Create or update summary container
        let summaryDiv = document.getElementById('shift-summary');
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = 'shift-summary';
            summaryDiv.className = 'mt-3 mb-3 p-3 border rounded bg-light';

            const container = document.querySelector('#content > div > div.row');
            if (container && container.parentNode) {
                container.parentNode.insertBefore(summaryDiv, container.nextSibling);
            }
        }

        summaryDiv.innerHTML = `
            <h3>Shift hour summary <small class="text-muted">(showing values for ${totalRows} entries out of the total ${totalCount}.)</small></h3>
            <p style="margin-bottom:0"><strong>Total Shift Hours:</strong> ${formatDuration(totalShiftSeconds)}</p>
            <p style="margin-bottom:0"><strong>Total Special Task Hours:</strong> ${formatDuration(totalSpecialTaskSeconds)}</p>
            <p style="margin-bottom:0"><strong>Total Hours:</strong> ${formatDuration(totalSeconds)}</p>
        `;
    }

    function watchTableChanges() {
        const target = document.querySelector('#DataTables_Table_0');
        if (!target) return;

        const observer = new MutationObserver(() => {
            calculateShiftHours();
        });

        observer.observe(target, { childList: true, subtree: true });

        // Recalculate when dropdown value changes
        const entryDropdown = document.querySelector('#DataTables_Table_0_length > label > select');
        if (entryDropdown) {
            entryDropdown.addEventListener('change', () => {
                setTimeout(() => calculateShiftHours(), 100);
            });
        }

        // Recalculate when the submit button is clicked
        const submitBtn = document.querySelector('#content > div > div:nth-child(2) > div > form > div:nth-child(2) > input');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                // Give time for form to process and refresh table
                setTimeout(() => calculateShiftHours(), 500);
            });
        }
    }

    function modifyTextContent() {
        const selector = '#content > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div.col.mr-2 > div.h5.mb-0.font-weight-bold.text-gray-800';
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = 'MYR ***';
        }
    }

    function waitForTableAndRun(callback) {
        const observer = new MutationObserver(() => {
            const table = document.querySelector('#DataTables_Table_0 tbody tr');
            if (table) {
                observer.disconnect();
                callback();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('load', () => {
        //modifyTextContent();
        waitForTableAndRun(() => {
            calculateShiftHours();
            watchTableChanges();
        });
    });
})();
