      
        /* 🟢 SMART EXCEL EXPORT LOGIC (CLEAN & COMPLETE) 🟢 */
        const exportColumnsMap = [
          { id: "city", label: "City", default: true },
          { id: "date", label: "Date", default: true },
          { id: "bookingId", label: "Booking ID", default: true },
          { id: "refId", label: "Request ID", default: true },
          { id: "name", label: "Patient Name", default: true },
          { id: "age", label: "Age", default: true },
          { id: "gender", label: "Gender", default: true },
          { id: "fbs", label: "FBS/RBS", default: true },
          { id: "type", label: "Partner Type", default: true },
          { id: "tests", label: "Tests (Package)", default: true },
          { id: "barcode", label: "Barcode No", default: true },
          { id: "colTime", label: "Collection Time", default: true },
          { id: "phleboName", label: "Phlebo Name", default: true },
          { id: "phleboPhone", label: "Phlebo Mobile", default: true },
          { id: "subTime", label: "Initial Sub Time", default: true },
          { id: "latestSubTime", label: "Booking Creation Time", default: true },
          { id: "status", label: "Status", default: true },
          { id: "remarks", label: "Remarks", default: true },
          { id: "shareTime", label: "Report Shared Time", default: true },
          { id: "caseType", label: "Case Type (Add-on/Missing)", default: false },
          { id: "isDuplicate", label: "Is Duplicate", default: false },
          { id: "mailStatus", label: "Mail Status", default: false },
          { id: "auditLogs", label: "Audit/Comment Logs", default: false }
        ];

        function openSmartExportModal() {
          try {
            let container = document.getElementById('export-checkboxes');
            if (!container) return;

            container.innerHTML = "";
            exportColumnsMap.forEach(col => {
              let checked = col.default ? "checked" : "";
              container.innerHTML += `
                      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                          <input type="checkbox" class="export-col-cb" value="${col.id}" data-label="${col.label}" ${checked} style="width: 16px; height: 16px;">
                          ${col.label}
                      </label>
                  `;
            });

            let modal = document.getElementById('smartExportModal');
            if (modal) {
              modal.style.display = 'flex';
              setTimeout(() => modal.classList.add('active'), 10);
            }
          } catch (e) {
            console.error("Modal Error: ", e);
          }
        }

        function selectAllExport(selectState) {
          document.querySelectorAll('.export-col-cb').forEach(cb => cb.checked = selectState);
        }

        function executeSmartExport() {
          try {
            let selectedCols = [];
            document.querySelectorAll('.export-col-cb:checked').forEach(cb => {
              selectedCols.push({ id: cb.value, label: cb.getAttribute('data-label') });
            });

            if (selectedCols.length === 0) {
              showToast("⚠️ Please tick at least one column!");
              return;
            }

            let sEl = document.getElementById('date-start');
            let eEl = document.getElementById('date-end');
            let sVal = sEl ? sEl.value : "";
            let eVal = eEl ? eEl.value : "";

            let sDate = sVal ? new Date(sVal) : new Date(0);
            let eDate = eVal ? new Date(eVal) : new Date('2099-12-31');
            sDate.setHours(0, 0, 0, 0);
            eDate.setHours(23, 59, 59, 999);

            let cityF = document.getElementById('city-filter') ? document.getElementById('city-filter').value : "ALL";
            let partnerF = document.getElementById('partner-filter') ? document.getElementById('partner-filter').value : "ALL";
            let searchBox = document.getElementById('search-box');
            let searchF = searchBox ? searchBox.value.toLowerCase().trim() : "";

            let includeMissing = document.getElementById('include-missing-cb') ? document.getElementById('include-missing-cb').checked : false;
            // 🔴 NAYA JADOO: Cancelled Checkbox Read
            let includeCancelled = document.getElementById('include-cancelled-cb') ? document.getElementById('include-cancelled-cb').checked : false;

            let activeData = [...(globalData.log || [])];

            if (includeMissing) {
              if (globalData.create) activeData = activeData.concat(globalData.create);
              if (globalData.incomplete) activeData = activeData.concat(globalData.incomplete);
            }
            if (includeCancelled && globalData.cancelled) {
              activeData = activeData.concat(globalData.cancelled);
            }

            // Remove exact object duplicates
            activeData = [...new Set(activeData)];

            let finalFilteredData = activeData.filter(i => {
              if (!i) return false;

              if (sVal !== "" || eVal !== "") {
                let dStr = String(i.date || "").trim();
                let rDate = new Date(dStr);
                if (isNaN(rDate.getTime())) {
                  let parts = dStr.split(/[-/]/);
                  if (parts.length === 3) {
                    rDate = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                  }
                }
                if (!isNaN(rDate.getTime())) {
                  rDate.setHours(12, 0, 0, 0);
                  if (rDate < sDate || rDate > eDate) return false;
                }
              }

              if (cityF !== "ALL" && i.city !== cityF) return false;
              if (partnerF !== "ALL" && i.type !== partnerF) return false;
              if (searchF && !(i.searchIndex || "").includes(searchF)) return false;

              return true;
            });

            if (finalFilteredData.length === 0) {
              showToast("⚠️ No data found! Check your dashboard dates and filters.");
              return;
            }

            let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
              <head>
                  <meta charset="utf-8">
                  <style>
                      table { border-collapse: collapse; font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; }
                      th { background-color: #1F4E78; color: #FFFFFF; font-weight: bold; text-align: center; vertical-align: middle; padding: 10px 15px; border: 1px solid #B4C6E7; white-space: nowrap; }
                      td { border: 1px solid #D9D9D9; vertical-align: middle; padding: 6px 10px; white-space: nowrap; text-align: center; }
                      .wrap-text { white-space: normal; min-width: 250px; text-align: left; word-wrap: break-word; }
                      .text-col { mso-number-format:"\\@"; } 
                  </style>
              </head>
              <body>`;

            tableHtml += `<table><tr>`;
            selectedCols.forEach(col => {
              tableHtml += `<th>${col.label}</th>`;
            });
            tableHtml += `</tr>`;

            finalFilteredData.forEach(i => {
              tableHtml += `<tr>`;
              selectedCols.forEach(col => {
                let val = i[col.id];

                let isLongText = (col.id === 'tests' || col.id === 'remarks' || col.id === 'auditLogs');
                let isId = (col.id === 'barcode' || col.id === 'bookingId' || col.id === 'refId' || col.id === 'phleboPhone');

                if (col.id === 'tests') val = (i.tests || []).join(", ");
                if (col.id === 'refId') val = (i.rIds && i.rIds.length > 0) ? i.rIds.join(", ") : (i.refId || "");
                if (col.id === 'barcode') val = (i.barcode || "").toString().replace(/[\[\]"]/g, '');
                if (col.id === 'auditLogs') val = (i.auditLogs || "").replace(/\n/g, ", ");

                // Khali cells ko N/A banana
                if (val === undefined || val === null || val.toString().trim() === "" || val === "-" || val === "--") {
                  val = "N/A";
                }

                let cellClass = "";
                if (isLongText) cellClass = "wrap-text";
                if (isId) cellClass += " text-col";

                let extraStyle = (val === "N/A") ? "color: #888888; font-style: italic;" : "";

                tableHtml += `<td class="${cellClass.trim()}" style="${extraStyle}">${val}</td>`;
              });
              tableHtml += `</tr>`;
            });

            tableHtml += `</table></body></html>`;

            const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Clean_Professional_Report_${new Date().toISOString().slice(0, 10)}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            document.getElementById('smartExportModal').classList.remove('active');
            setTimeout(() => document.getElementById('smartExportModal').style.display = 'none', 200);

            showToast("✅ Clean Professional Excel Downloaded!");
          } catch (err) {
            console.error("Export Crash Protected: ", err);
          }
        }
      </script>
      <div id="apiAutoModal"
        style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 99999; align-items: center; justify-content: center; flex-direction: column; backdrop-filter: blur(8px);">
        <div
          style="width: 100%; max-width: 600px; padding: 0; overflow: hidden; border: 1px solid var(--glass-border); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); background: var(--modal-bg);">

          <div
            style="background: linear-gradient(135deg, #fefce8, #f8fafc); padding: 25px 25px 20px; text-align: left; border-bottom: 1px solid #e2e8f0; position: relative;">
            <div
              style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706);">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h2
                  style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800; display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 26px;">🤖</span> API Auto-Match
                </h2>
                <p style="color: #64748b; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Drop
                  your CSV file to auto-match and update bookings instantly.</p>
              </div>
              <button
                style="background: transparent; border: none; font-size: 20px; color: #ef4444; cursor: pointer; font-weight: bold; transition: 0.2s;"
                onclick="document.getElementById('apiAutoModal').style.display='none'"
                onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">✕</button>
            </div>
          </div>

          <div style="padding: 30px 25px;">
            <div id="api-drop-area" class="file-drop-area"
              style="border: 2px dashed #f59e0b; background: rgba(245, 158, 11, 0.05); padding: 50px 20px; border-radius: 16px; text-align: center; cursor: pointer; transition: all 0.3s ease;"
              onclick="document.getElementById('api-csv-file').click()"
              onmouseover="this.style.backgroundColor='rgba(245, 158, 11, 0.1)'"
              onmouseout="this.style.backgroundColor='rgba(245, 158, 11, 0.05)'">
              <div id="api-drop-icon"
                style="font-size: 50px; margin-bottom: 15px; text-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);">
                📄</div>
              <div id="api-drop-text" style="font-size: 16px; font-weight: 800; color: #d97706; margin-bottom: 8px;">
                Drag &
                Drop CSV Here</div>
              <div id="api-drop-subtext"
                style="font-size: 12px; color: var(--text-sub); background: white; padding: 4px 12px; border-radius: 12px; display: inline-block; border: 1px solid var(--border-light); box-shadow: 0 2px 5px rgba(0,0,0,0.02); font-weight: 600;">
                Or click to browse files</div>
            </div>

            <input type="file" id="api-csv-file" accept=".csv" style="display: none;"
              onchange="handleApiFileSelect(this.files)">

            <div id="api-btn-container" style="display: none; margin-top: 20px;">
              <button class="btn-apple"
                style="padding: 16px 20px; width: 100%; font-size: 16px; font-weight: 700; justify-content: center; background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; border: none; border-radius: 12px; box-shadow: 0 6px 15px rgba(245, 158, 11, 0.3); transition: all 0.2s ease;"
                id="api-start-btn" onclick="processApiAutoMatch()"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(245, 158, 11, 0.4)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 15px rgba(245, 158, 11, 0.3)';">
                🚀 Start Auto-Match
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mac-window" id="apiReportModal"
        style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #ffffff; z-index: 10000; flex-direction: column; overflow: hidden;">
        <div
          style="padding: 15px 25px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #1e293b; font-size: 18px; display: flex; align-items: center; gap: 10px;">
            📊 CA Exact Match Report</h3>
          <div style="display: flex; align-items: center; gap: 15px;">
            <button onclick="document.getElementById('apiReportModal').style.display='none'"
              style="display: flex; align-items: center; gap: 8px; background: #eff6ff; border: 1px solid #bfdbfe; color: #3b82f6; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
              <span style="font-size: 18px; line-height: 0; margin-top: -4px;">_</span> Minimize
            </button>
            <button onclick="closeApiReportPermanently()"
              style="background: transparent; border: none; cursor: pointer; color: #ef4444; font-size: 20px; font-weight: bold; padding: 0 5px;">✕</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: row; flex: 1; overflow: hidden;">
          <div style="flex: 1; padding: 30px; border-right: 1px solid #e2e8f0; background: white; overflow-y: auto;">
            <h4 style="color: #475569; font-size: 13px; text-transform: uppercase; margin-bottom: 15px;">
              Data Found in CSV</h4>
            <div style="display: flex; gap: 15px; margin-bottom: 25px;">
              <div
                style="flex: 1; background: #f3e8ff; border: 1px solid #d8b4fe; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; font-weight: 800; color: #7e22ce;" id="rep-api-count">0
                </div>
                <div style="font-size: 12px; color: #6b21a8; font-weight: bold;">API BOOKINGS</div>
              </div>
              <div
                style="flex: 1; background: #fef3c7; border: 1px solid #fde68a; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 28px; font-weight: 800; color: #b45309;" id="rep-man-count">0
                </div>
                <div style="font-size: 12px; color: #92400e; font-weight: bold;">MANUAL BOOKINGS</div>
              </div>
            </div>
            <h4 style="color: #475569; font-size: 13px; text-transform: uppercase; margin-bottom: 15px;">
              System Action Summary</h4>
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px; color: #334155; line-height: 2.5;">
              <li
                style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <span>🔵 Already Filled in Sheet:</span> <b id="rep-already">0</b>
              </li>
              <li
                style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <span>🚩 Retroactively Flagged API:</span> <b id="rep-flagged" style="color: #8b5cf6;">0</b>
              </li>
              <li
                style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <span>🟢 Newly Auto-Filled:</span> <b id="rep-new" style="color: #10b981;">0</b>
              </li>
            </ul>
          </div>
          <div style="flex: 1.5; padding: 30px; background: #f8fafc; overflow-y: auto; position: relative;">
            <button onclick="copyRightSideData()"
              style="position: absolute; top: 25px; right: 30px; padding: 8px 16px; background: white; color: #10b981; border: 1px solid #10b981; border-radius: 8px; cursor: pointer; font-weight: bold;">📋
              Copy Data</button>
            <h4 style="color: #ef4444; font-size: 15px;">⚠️ CSV Duplicates</h4>
            <div id="rep-dup-box"
              style="white-space: pre; font-family: monospace; font-size: 12px; background: white; border: 1px solid #fca5a5; padding: 15px; border-radius: 10px; overflow-x: auto; margin-bottom: 30px;">
              No duplicates found.</div>
            <h4 style="color: #f97316; font-size: 15px;">❌ Extra Bookings</h4>
            <div id="rep-notfound-box"
              style="white-space: pre; font-family: monospace; font-size: 12px; background: white; border: 1px solid #fed7aa; padding: 15px; border-radius: 10px; overflow-x: auto;">
              All entries mapped successfully!</div>
          </div>
        </div>
      </div>

      <script>
