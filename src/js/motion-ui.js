      
        /* 🟢 GLOBAL STATE 🟢 */
        let selectedApiFile = null;
        window.isApiReportActive = false;
        window.currentTatBase = 'creat';

        /* 🟢 DOM READY: DRAG & DROP INITIALIZATION 🟢 */
        document.addEventListener("DOMContentLoaded", () => {
          const dropArea = document.getElementById('api-drop-area');
          if (dropArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
              dropArea.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
            });
            ['dragenter', 'dragover'].forEach(name => {
              dropArea.addEventListener(name, () => dropArea.style.backgroundColor = 'rgba(234, 179, 8, 0.15)', false);
            });
            ['dragleave', 'drop'].forEach(name => {
              dropArea.addEventListener(name, () => dropArea.style.backgroundColor = 'rgba(234, 179, 8, 0.05)', false);
            });
            dropArea.addEventListener('drop', (e) => { handleApiFileSelect(e.dataTransfer.files); });
          }

          // 📥 Import Data Dropzone logic
          const importDropzone = document.getElementById('import-dropzone');
          if (importDropzone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
              importDropzone.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
            });
            ['dragenter', 'dragover'].forEach(name => {
              importDropzone.addEventListener(name, () => importDropzone.style.backgroundColor = 'rgba(59, 130, 246, 0.1)', false);
            });
            ['dragleave', 'drop'].forEach(name => {
              importDropzone.addEventListener(name, () => importDropzone.style.backgroundColor = 'rgba(59, 130, 246, 0.02)', false);
            });
            importDropzone.addEventListener('drop', (e) => {
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                const fileInput = document.getElementById('csv-file');
                fileInput.files = files;
                document.getElementById('csv-file-name').innerText = files[0].name;
              }
            });
          }
        });

        /* 🟢 API ENGINE FUNCTIONS (PREMIUM UX UPDATED) 🟢 */

        // 🚀 Global Cache: File ko memory mein safe rakhne ke liye
        window.apiCsvTextCache = "";

        window.handleApiFileSelect = function (files) {
          if (!files || files.length === 0) return;
          selectedApiFile = files[0];

          // UI Update: Reading status
          document.getElementById('api-drop-icon').innerHTML = "⏳";
          document.getElementById('api-drop-text').innerHTML = `<span style="color:#b45309;">${selectedApiFile.name}</span>`;
          document.getElementById('api-drop-subtext').innerText = "Reading file into memory...";
          document.getElementById('api-btn-container').style.display = 'none';

          // 🚀 Read file IMMEDIATELY on drop
          let reader = new FileReader();
          reader.onload = function (e) {
            window.apiCsvTextCache = e.target.result; // Store raw text instantly

            // UI Update: Success status (Green glow)
            document.getElementById('api-drop-icon').innerHTML = "✅";
            document.getElementById('api-drop-text').innerHTML = `<span style="color:#10b981;">File Ready: ${selectedApiFile.name}</span>`;
            document.getElementById('api-drop-subtext').innerText = "Click the button below to start processing";
            document.getElementById('api-drop-area').style.borderColor = "#10b981";
            document.getElementById('api-drop-area').style.backgroundColor = "rgba(16, 185, 129, 0.05)";
            document.getElementById('api-btn-container').style.display = 'block'; // Show button container
          };
          reader.onerror = function () {
            alert("❌ Browser blocked reading the file. Try clicking to upload instead of drag-and-drop.");
            resetApiModal();
          };
          reader.readAsText(selectedApiFile);
        };

        window.handleApiButtonClick = function () {
          const reportModal = document.getElementById('apiReportModal');
          const autoModal = document.getElementById('apiAutoModal');

          // 🕵️‍♂️ Check: Kya data pehle se process ho chuka hai?
          if (window.isApiReportActive) {
            // Agar report memory mein hai, toh seedha Full-Screen Report dikhao
            if (reportModal) {
              reportModal.style.setProperty('display', 'flex', 'important');
              const oldMinTab = document.getElementById('min-apiReportModal');
              if (oldMinTab) oldMinTab.remove();
            }
            if (autoModal) autoModal.style.display = 'none';

          } else {
            // Agar koi report nahi hai, toh Drag-Drop screen dikhao
            if (autoModal) autoModal.style.setProperty('display', 'flex', 'important');
            if (reportModal) reportModal.style.display = 'none';
          }
        };

        window.closeApiReportPermanently = function () {
          if (confirm("This will clear the current report data. Continue?")) {
            document.getElementById('apiReportModal').style.display = 'none';
            window.isApiReportActive = false;
            resetApiModal();
          }
        };

        window.processApiAutoMatch = function () {
          // 🚀 Check memory cache instead of trying to read the file again
          if (!window.apiCsvTextCache) {
            alert("⚠️ File data is missing. Please drop the CSV again.");
            return;
          }

          // 1. Disable button to prevent double-click issues
          let startBtn = document.getElementById('api-start-btn');
          if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerText = "⏳ Analyzing CSV...";
          }

          // 2. Hide File Drop Modal & Show Global Loader
          document.getElementById('apiAutoModal').style.display = 'none';
          if (typeof showLoader === 'function') showLoader('api');

          // 3. Send cached text directly to backend
          google.script.run
            .withSuccessHandler(resString => {
              // Loader hatana aur button wapas theek karna
              if (typeof hideLoader === 'function') hideLoader();
              if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerText = "🚀 Start Auto-Match";
              }

              try {
                if (!resString) throw new Error("Empty response from server");

                let data = JSON.parse(resString);

                // Populate Dashboard Numbers
                document.getElementById('rep-api-count').innerText = data.apiCount || 0;
                document.getElementById('rep-man-count').innerText = data.manualCount || 0;
                document.getElementById('rep-already').innerText = data.alreadyFilled || 0;
                document.getElementById('rep-flagged').innerText = data.retroFlagged || 0;
                document.getElementById('rep-new').innerText = data.newlyFilled || 0;

                // Populate Duplicates
                let dupHtml = "Booking ID\tName\tAgent\tBooking Time\n";
                if (data.duplicates && data.duplicates.length > 0) {
                  data.duplicates.forEach(d => {
                    dupHtml += d.isSeparator ? "-----------------------------------\n" : `${d.bid}\t${d.rawName}\t${d.agent}\t${d.time}\n`;
                  });
                  document.getElementById('rep-dup-box').textContent = dupHtml;
                } else {
                  document.getElementById('rep-dup-box').textContent = "No duplicates found. ✅";
                }

                // Populate Extra Bookings
                let nfHtml = "Booking ID\tName\tAge\tGender\tCity\tAgent\tBooking Time\n";
                if (data.notFound && data.notFound.length > 0) {
                  data.notFound.forEach(d => { nfHtml += `${d.bid}\t${d.rawName}\t${d.age}\t${d.gender}\t${d.city}\t${d.agent}\t${d.bTime}\n`; });
                  document.getElementById('rep-notfound-box').textContent = nfHtml;
                } else {
                  document.getElementById('rep-notfound-box').textContent = "All entries mapped successfully! ✅";
                }

                // ZABARDASTI MODAL SCREEN PAR LAANA AUR FLAG ON KARNA
                window.isApiReportActive = true;
                let reportModal = document.getElementById('apiReportModal');
                if (reportModal) {
                  reportModal.style.setProperty('display', 'flex', 'important');
                  reportModal.style.zIndex = '100000';
                }

                if (typeof showToast === 'function') showToast("✅ Auto-Match Complete!");
                if (typeof fetchData === 'function') fetchData(true);

              } catch (parseErr) {
                alert("❌ Report Error: Could not display data.\nReason: " + parseErr.message);
              }
            })
            .withFailureHandler(err => {
              if (typeof hideLoader === 'function') hideLoader();
              if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerText = "🚀 Start Auto-Match";
              }
              alert("❌ Backend Error: " + err.message);
            })
            .backendApiAutoMatch(window.apiCsvTextCache);
        };

        window.copyRightSideData = function () {
          let combinedText = "=== CSV DUPLICATES ===\n" + document.getElementById('rep-dup-box').textContent +
            "\n\n=== EXTRA BOOKINGS ===\n" + document.getElementById('rep-notfound-box').textContent;
          let textArea = document.createElement("textarea");
          textArea.value = combinedText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          if (typeof showToast === 'function') showToast("✅ Data Copied!");
        };

        function resetApiModal() {
          selectedApiFile = null;
          window.apiCsvTextCache = ""; // 🚀 Clear cache on reset

          // Reset Premium UI
          if (document.getElementById('api-drop-icon')) document.getElementById('api-drop-icon').innerHTML = "📄";
          if (document.getElementById('api-drop-text')) document.getElementById('api-drop-text').innerHTML = "Drag & Drop CSV Here";
          if (document.getElementById('api-drop-subtext')) document.getElementById('api-drop-subtext').innerText = "Or click to browse files";

          let dropArea = document.getElementById('api-drop-area');
          if (dropArea) {
            dropArea.style.borderColor = "#f59e0b";
            dropArea.style.backgroundColor = "rgba(245, 158, 11, 0.05)";
          }

          if (document.getElementById('api-btn-container')) document.getElementById('api-btn-container').style.display = 'none';
          if (document.getElementById('api-csv-file')) document.getElementById('api-csv-file').value = "";

          // Reset Button status
          let startBtn = document.getElementById('api-start-btn');
          if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerText = "🚀 Start Auto-Match";
          }
        }
        // =========================================================
        // ⏱️ DYNAMIC TAT ENGINE (Col: 8h, Sub: 6h, Creat: 6h)
        // =========================================================
        window.currentTatBase = window.currentTatBase || 'creat'; // Duplicate error se bachne ke liye safe declaration

        window.setTatBase = function (base) {
          window.currentTatBase = base;

          // 🚀 BRAMHASTRA: Sabhi buttons ko pehle transparent karega, aur sirf dabaye hue ko Blue karega
          ['col', 'sub', 'creat'].forEach(b => {
            let el = document.getElementById('tat-' + b);
            if (el) {
              if (b === base) {
                el.style.background = '#3b82f6'; // Active Blue
                el.style.color = '#ffffff';
                el.style.borderColor = '#2563eb';
              } else {
                el.style.background = 'transparent'; // Inactive Grey
                el.style.color = '#64748b';
                el.style.borderColor = '#e2e8f0';
              }
            }
          });

          // UI Refresh (List ko naye base ke hisaab se update karna)
          if (typeof updateUI === 'function') updateUI();
          else if (typeof renderList === 'function') renderList();
        };

        // 2. Exact Time Diff Formatter (Days, Hours, Mins)
        window.formatTatDiff = function (ms) {
          if (ms < 0) ms = 0;
          let days = Math.floor(ms / 86400000);
          let hours = Math.floor((ms % 86400000) / 3600000);
          let mins = Math.floor((ms % 3600000) / 60000);

          if (days > 0) return `${days}d ${hours}h ${mins}m`;
          if (hours > 0) return `${hours}h ${mins}m`;
          return `${mins}m`;
        };

        // 3. Card ke liye Smart TAT Calculator (BULLETPROOF DATE & TIME)
        window.getDynamicTat = function (item) {
          let baseTimeStr = "";
          let targetHours = 6;

          // A. Kis time se hisaab lagana hai?
          let activeBase = window.currentTatBase || 'creat';
          if (activeBase === 'col') {
            baseTimeStr = item.colTime;
            targetHours = 8; // Collection ke liye 8 Ghante
          } else if (activeBase === 'sub') {
            baseTimeStr = item.subTime;
            targetHours = 6; // Submission ke liye 6 Ghante
          } else {
            baseTimeStr = item.latestSubTime;
            targetHours = 6; // Creation ke liye 6 Ghante
          }

          if (!baseTimeStr || baseTimeStr === "-" || baseTimeStr === "N/A" || baseTimeStr === "--") {
            return { text: "No Base Time", color: "#94a3b8", badge: "" };
          }

          // B. 🚀 SUPER DATE PARSER (Fixes 0m ON TIME bug)
          let itemDate = new Date();
          if (item.date) {
            let dStr = String(item.date).trim().split(" ")[0]; // Sirf date wala part lega
            let monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
            let parts = dStr.split(/[-/]/);

            if (parts.length === 3) {
              let p1 = parts[0], p2 = parts[1].toLowerCase(), p3 = parts[2];
              if (p3.length === 4) {
                if (isNaN(p2)) {
                  itemDate = new Date(p3, monthMap[p2.substring(0, 3)], p1); // DD-MMM-YYYY (e.g. 15-Mar-2026)
                } else if (parseInt(p1) <= 12 && parseInt(p2) > 12) {
                  itemDate = new Date(p3, parseInt(p1) - 1, p2); // MM/DD/YYYY (e.g. 3/14/2026)
                } else {
                  itemDate = new Date(p3, parseInt(p2) - 1, p1); // DD/MM/YYYY (e.g. 14/3/2026)
                }
              } else if (p1.length === 4) {
                itemDate = new Date(p1, parseInt(p2) - 1, p3); // YYYY-MM-DD
              }
            } else {
              let d = new Date(dStr);
              if (!isNaN(d.getTime())) itemDate = d;
            }
          }
          itemDate.setHours(0, 0, 0, 0);

          // C. 🚀 SUPER TIME PARSER (Fixes "Invalid Time" hyphen bug)
          function parseTime(tStr, baseD) {
            if (!tStr) return null;
            let d = new Date(baseD.getTime());

            // Jadoo: Ab ye bina hyphen par confuse hue sidha Time ko pakdega (jaise 07:00 ya 10:15:00)
            let match = String(tStr).match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])?/);
            if (match) {
              let h = parseInt(match[1]);
              let m = parseInt(match[2]);
              let ampm = match[3] ? match[3].toUpperCase() : null;

              if (ampm === 'PM' && h < 12) h += 12;
              if (ampm === 'AM' && h === 12) h = 0;

              d.setHours(h, m, 0, 0);
              return d;
            }
            return null;
          }

          let startD = parseTime(baseTimeStr, itemDate);
          if (!startD) return { text: "Invalid Time", color: "#94a3b8", badge: "" };

          // D. End Time Calculation
          let endD = new Date(); // Current Live Time
          if (item.status && String(item.status).toLowerCase().includes("share") && item.shareTime && item.shareTime !== "-") {
            let sD = parseTime(item.shareTime, itemDate);
            if (sD) {
              if (sD < startD && (startD.getHours() > 18 && sD.getHours() < 6)) sD.setDate(sD.getDate() + 1);
              endD = sD;
            }
          }

          // E. Final TAT Math
          let diffMs = endD.getTime() - startD.getTime();
          if (diffMs < -10000000) diffMs += 86400000; // Raat ke hisaab ko theek karna

          let diffHours = diffMs / 3600000;
          let isLate = diffHours > targetHours;

          // 🚀 NAYA JADOO: High TAT walo ko identify karna
          let isHighTatStatus = item.status && String(item.status).toLowerCase().includes("high tat");

          let color, bg, label;

          if (isHighTatStatus) {
            // High TAT ke liye Special Purple Badge (Bina Late bole)
            color = "#8b5cf6"; // Dark Purple
            bg = "#ede9fe";    // Light Purple Background
            label = "HIGH TAT";
          } else {
            // Normal tests ke liye Red/Green
            color = isLate ? "#ef4444" : "#10b981";
            bg = isLate ? "#fee2e2" : "#d1fae5";
            label = isLate ? "LATE" : "ON TIME";
          }

          return {
            text: window.formatTatDiff(diffMs),
            color: color,
            badge: `<span style="background: ${bg}; color: ${color}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 5px;">${label}</span>`
          };
        }; // <-- Function yahan khatam hota hai
        // =========================================================
        // 🚀 1. SMART LOCAL DATA MOVER & KPI UPDATER
        // =========================================================
        function moveLocallyAndUpdateKpi(rid, sourceTab, targetTab, updates) {
          if (!globalData[sourceTab]) return;

          let idx = globalData[sourceTab].findIndex(i => i.rid === rid);
          if (idx > -1) {
            let item = globalData[sourceTab][idx];

            // 1. Source Tab se hatao
            globalData[sourceTab].splice(idx, 1);

            // 2. Data Update karo (Status/ID jo bhi change hua)
            Object.assign(item, updates);

            // 3. Naye tab me daalo
            if (!globalData[targetTab]) globalData[targetTab] = [];
            globalData[targetTab].unshift(item);

            // 4. Dono KPI Turant Change Karo
            let srcKpi = document.getElementById('kpi-' + sourceTab);
            let tgtKpi = document.getElementById('kpi-' + targetTab);
            if (srcKpi) srcKpi.innerText = Math.max(0, parseInt(srcKpi.innerText) - 1);
            if (tgtKpi) tgtKpi.innerText = parseInt(tgtKpi.innerText) + 1;
          }
        }

        // =========================================================
        // 🚀 2. PRO UX FLYING BUBBLE (RANDOM CURVED MOTION)
        // =========================================================
        window.triggerSmartFlyAnimation = function (rowId, text, targetKpiId) {
          let rowEl = document.getElementById(rowId);
          let detailsRow = document.getElementById('details-' + rowId);
          let targetEl = document.getElementById(targetKpiId) || document.querySelector('.seg-control');

          if (!rowEl || !targetEl) return;

          // A. Coordinates Nikalna
          let startRect = rowEl.getBoundingClientRect();
          let endRect = targetEl.getBoundingClientRect();

          let startX = startRect.left + (startRect.width / 2);
          let startY = startRect.top + 20;
          let endX = endRect.left + (endRect.width / 2);
          let endY = endRect.top + (endRect.height / 2);

          // 🔴 PRO UX JADOO: Har baar naya Curved Rasta (Arc) banana
          let direction = Math.random() > 0.5 ? 1 : -1;
          let midX = (startX + endX) / 2 + (Math.random() * 150 * direction); // Left ya Right arc
          let midY = Math.min(startY, endY) - 50 - (Math.random() * 80); // Upar ki taraf uchhal

          // B. Bubble Create Karna
          let bubble = document.createElement('div');
          bubble.innerHTML = text;
          bubble.style.position = 'fixed';
          bubble.style.left = '0px';
          bubble.style.top = '0px';
          bubble.style.background = 'linear-gradient(135deg, #a855f7, #ec4899)'; // Cool Purple-Pink Gradient
          bubble.style.color = 'white';
          bubble.style.padding = '10px 20px';
          bubble.style.borderRadius = '30px';
          bubble.style.fontSize = '13px';
          bubble.style.fontWeight = '800';
          bubble.style.zIndex = '999999';
          bubble.style.boxShadow = '0 10px 25px rgba(236, 72, 153, 0.5)';
          bubble.style.pointerEvents = 'none';
          bubble.style.transform = `translate(${startX}px, ${startY}px) scale(0)`;
          document.body.appendChild(bubble);

          // C. Row Collapse Animation (Ekdum Smooth)
          let initialHeight = rowEl.offsetHeight;
          rowEl.style.overflow = 'hidden';
          rowEl.style.height = initialHeight + 'px';
          rowEl.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

          // Force CSS to notice the height before setting it to 0
          void rowEl.offsetHeight;

          rowEl.style.height = '0px';
          rowEl.style.paddingTop = '0px';
          rowEl.style.paddingBottom = '0px';
          rowEl.style.opacity = '0';
          rowEl.style.border = 'none';
          if (detailsRow) detailsRow.style.display = 'none';

          // D. Fly Animation (Web Animations API)
          // Step 1: Pop Out
          let popIn = bubble.animate([
            { transform: `translate(${startX}px, ${startY}px) scale(0)`, opacity: 0 },
            { transform: `translate(${startX}px, ${startY}px) scale(1.1)`, opacity: 1 },
            { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 1 }
          ], { duration: 400, easing: 'ease-out', fill: 'forwards' });

          // Step 2: Fly & Curve
          popIn.onfinish = () => {
            rowEl.style.display = 'none'; // Row gayab

            let fly = bubble.animate([
              { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 1 },
              { transform: `translate(${midX}px, ${midY}px) scale(0.8)`, opacity: 0.9 },
              { transform: `translate(${endX}px, ${endY}px) scale(0.2)`, opacity: 0.5 }
            ], { duration: 700, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards' });

            // Step 3: Hit KPI Target & Bounce
            fly.onfinish = () => {
              bubble.remove();
              if (rowEl) rowEl.remove();

              targetEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
              targetEl.style.transform = 'scale(1.3)';
              targetEl.style.color = '#ec4899';
              targetEl.style.background = 'rgba(236, 72, 153, 0.15)';
              targetEl.style.borderRadius = '8px';

              setTimeout(() => {
                targetEl.style.transform = 'scale(1)';
                targetEl.style.color = '';
                targetEl.style.background = '';
              }, 300);
            };
          };
        };

        // =========================================================
        // 🟢 3. CREATE TAB: SUBMIT BOOKING ID LOGIC 
        // =========================================================
        window.saveNewBookingId = function (rid, inputId, city, oldBid, pName, reqIdsStr) {
          let inputEl = document.getElementById(inputId);
          let newBid = inputEl ? inputEl.value.trim() : "";
          if (!newBid) { showToast("⚠️ Kripya Booking ID daalein!"); return; }

          pauseSync();

          moveLocallyAndUpdateKpi(rid, currentTab, 'pending', { bookingId: newBid, status: 'Pending' });
          triggerSmartFlyAnimation(rid, '💾 Saved! Moving to Pending', 'kpi-pending');

          google.script.run
            .withSuccessHandler(() => { resumeSync(); })
            .withFailureHandler(err => { showToast("❌ Error: " + err.message); resumeSync(); })
            .updateRecord(city, oldBid, pName, null, null, newBid, reqIdsStr, null, null, null, null, window.currentUser.name);
        };

        // =========================================================
        // 🟢 4. STATUS DROPDOWN (GHOST BUSTER MEMORY 👻)
        // =========================================================
        window.autoSaveRow = function (rid, changedEl, city, bId, patientName, reqIdsStr) {
          let newStatus = document.getElementById('status-' + rid) ? document.getElementById('status-' + rid).value : "N/A";
          let newRemarks = document.getElementById('note-' + rid) ? document.getElementById('note-' + rid).value : "";
          let userName = window.currentUser ? window.currentUser.name : "A Teammate";
          let stLow = newStatus.toLowerCase();
          let isShared = stLow.includes('share');

          // 👻 THE GHOST MEMORY: Sirf isi card ko 8 sec tak wapas aane se rokega
          window.ghostMemory = window.ghostMemory || {};
          window.ghostMemory[rid] = { stat: newStatus, time: Date.now() };

          // 1. ⚡ ACTUAL MEMORY MOVE 
          if (typeof globalData !== 'undefined') {
            let targetTab = isShared ? 'shared' : 'pending';
            let sourceTab = isShared ? 'pending' : 'shared';

            for (let t in globalData) {
              let item = globalData[t].find(i => i.rid === rid || i.bookingId === rid);
              if (item) { item.status = newStatus; item.remarks = newRemarks; }
            }

            let sIdx = globalData[sourceTab] ? globalData[sourceTab].findIndex(i => i.rid === rid || i.bookingId === rid) : -1;
            if (sIdx > -1) {
              let movedItem = globalData[sourceTab].splice(sIdx, 1)[0];
              if (globalData[targetTab]) globalData[targetTab].unshift(movedItem);
            }
          }

          // 2. ⚡ FIREBASE PING
          if (changedEl && changedEl.classList.contains("status-select")) {
            if (typeof window.firebaseDB !== 'undefined' && window.firebaseDB) {
              try {
                const ref = window.firebaseRef(window.firebaseDB, 'live_status_updates/' + rid);
                window.firebaseSet(ref, { stat: newStatus, usr: userName, time: Date.now() });
              } catch (e) { }
            }

            // 3. ⚡ KHUD KI SCREEN SE TURANT GAYAB KARO
            changedEl.style.color = isShared ? 'var(--success)' : 'var(--warning)';

            let row = document.getElementById(rid);
            let dRow = document.getElementById('details-' + rid);

            let shouldHide = false;
            if (isShared && currentTab === 'pending') shouldHide = true;
            if (!isShared && currentTab === 'shared') shouldHide = true;

            if (shouldHide && row) {
              row.style.setProperty('display', 'none', 'important');
              if (dRow) dRow.style.setProperty('display', 'none', 'important');
              showToast(isShared ? "🚀 Moved to Shared!" : "📥 Back to Pending!");
              if (typeof updateUI === 'function') updateUI();
            }
          } else if (changedEl) {
            changedEl.style.opacity = '0.5';
          }

          // 4. ⚡ GOOGLE SHEET (Background save)
          setTimeout(() => {
            google.script.run
              .withSuccessHandler(() => { if (changedEl) changedEl.style.opacity = '1'; })
              .withFailureHandler(() => { if (changedEl) changedEl.style.opacity = '1'; })
              .updateRecord(city, bId, patientName, newStatus, newRemarks, "", reqIdsStr, "", "", "", "", userName);
          }, 10);
        };
        // =========================================================
        // 🟢 5. INCOMPLETE TAB: SMART SAVE LOGIC (WALKIE-TALKIE ENABLED)
        // =========================================================
        window.updateIncompleteRow = function (rid, city, oldBid, name, reqIdsStr, event) {
          if (event) event.stopPropagation();

          let nBid = document.getElementById('inc-bid-' + rid) ? document.getElementById('inc-bid-' + rid).value.trim() : "";
          let na = document.getElementById('inc-age-' + rid) ? document.getElementById('inc-age-' + rid).value : "";
          let ng = document.getElementById('inc-gender-' + rid) ? document.getElementById('inc-gender-' + rid).value : "";
          let nfbs = document.getElementById('inc-fbs-' + rid) ? document.getElementById('inc-fbs-' + rid).value : "";
          let ncol = document.getElementById('inc-col-' + rid) ? document.getElementById('inc-col-' + rid).value : "";

          let hasPatientDetails = (na !== "" && ng !== "" && nfbs !== "" && ncol !== "");
          let hasBookingId = (nBid !== "");

          if (!hasPatientDetails && !hasBookingId) {
            if (typeof showToast === 'function') showToast("⚠️ Please fill Booking ID OR all Patient Details!");
            return;
          }

          let userName = window.currentUser ? window.currentUser.name : "Unknown User";

          // 1. Khud ki screen par turant update (Optimistic UI)
          let targetTab = nBid ? 'pending' : 'create';
          let txt = nBid ? '✅ Saved! To Pending' : '✅ Saved! To Create';

          moveLocallyAndUpdateKpi(rid, 'incomplete', targetTab, {
            colTime: ncol, age: na, gender: ng, fbs: nfbs, bookingId: nBid, status: 'Pending'
          });

          triggerSmartFlyAnimation(rid, txt, 'kpi-' + targetTab);

          // 🚀 2. WALKIE-TALKIE PING: Dusre sabhi users ko batao ki ye update ho gaya hai!
          if (typeof window.fireGlobalSyncPing === 'function') {
            window.fireGlobalSyncPing('SMART_SAVE', rid, {
              bId: nBid, age: na, gender: ng, fbs: nfbs, colTime: ncol
            });
          }

          let notesVal = document.getElementById('note-' + rid) ? document.getElementById('note-' + rid).value : "";

          // 3. Background mein chup-chap Google Sheet mein save karo (No loading, no refreshing)
          google.script.run
            .withFailureHandler((e) => {
              alert("Save Error: " + e.message);
              if (typeof fetchData === 'function') fetchData(true); // Sirf fail hone par wapas refresh karo
            })
            .updateRecord(city, oldBid, name, "", notesVal, nBid, reqIdsStr, na, ng, nfbs, ncol, userName);
        };
        // =========================================================
        // 🟢 TRF DRAG AND DROP ENGINE FIX 🟢
        // =========================================================
        document.addEventListener("DOMContentLoaded", () => {
          const trfDropArea = document.getElementById('trf-drop-area');
          if (trfDropArea) {
            // Default browser action ko rokna taaki file dusre tab me na khule
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
              trfDropArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
            });

            // Hover karne par color dark pink karna
            ['dragenter', 'dragover'].forEach(eventName => {
              trfDropArea.addEventListener(eventName, () => trfDropArea.style.backgroundColor = 'rgba(236, 72, 153, 0.2)', false);
            });

            // Mouse hatane par wapas light pink karna
            ['dragleave', 'drop'].forEach(eventName => {
              trfDropArea.addEventListener(eventName, () => trfDropArea.style.backgroundColor = 'rgba(236, 72, 153, 0.05)', false);
            });

            // File Drop karne par handleTrfFiles function ko files bhej dena
            trfDropArea.addEventListener('drop', (e) => {
              let dt = e.dataTransfer;
              let files = dt.files;
              if (typeof handleTrfFiles === 'function') {
                handleTrfFiles(files);
              }
            });
          }
        });
        /// Base64 Helper
        function getBase64(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
          });
        }
        // =========================================================
        // 🚀 SUPER-FAST IMAGE COMPRESSOR & QUEUE SYSTEM
        // =========================================================

        // 1. IMAGE COMPRESSOR (5MB photo ko 150KB banayega, Speed 10x badhegi)
        // 1. ULTRA-FAST IMAGE COMPRESSOR (Prevents Network Timeouts)
        function getCompressedBase64(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
              const img = new Image();
              img.src = event.target.result;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // 🚀 Reduced for extreme speed
                let scaleSize = MAX_WIDTH / img.width;
                if (scaleSize > 1) scaleSize = 1;

                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // 🚀 Aggressive compression to ensure GAS never times out
                const compressedData = canvas.toDataURL('image/jpeg', 0.5);
                resolve(compressedData.split(',')[1]);
              };
              img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
          });
        }

        // 2. TURBO UPLOAD ENGINE (True Error Exposer & Aesthetic UI)
        async function handleTrfFiles(files) {
          if (!files || files.length === 0) return;

          let dropArea = document.getElementById('trf-drop-area');
          let parentCol = dropArea.parentElement;

          dropArea.style.padding = "10px 20px";
          dropArea.style.minHeight = "auto";
          let dropIcon = dropArea.querySelector('div:nth-child(1)');
          let dropSub = dropArea.querySelector('div:nth-child(3)');
          if (dropIcon) dropIcon.style.display = "none";
          if (dropSub) dropSub.style.display = "none";

          let headerBox = document.getElementById('trf-progress-header');
          let statusBox = document.getElementById('trf-status-box');

          if (!headerBox) {
            headerBox = document.createElement('div');
            headerBox.id = 'trf-progress-header';
            headerBox.style.cssText = "margin-top:15px; margin-bottom:15px; width:100%; display:flex; justify-content:space-between; align-items:center; font-family:'Inter', sans-serif;";
            parentCol.insertBefore(headerBox, dropArea.nextSibling);
          }

          if (!statusBox) {
            statusBox = document.createElement('div');
            statusBox.id = 'trf-status-box';
            statusBox.style.cssText = "flex:1; width:100%; min-height:450px; max-height:calc(100vh - 200px); overflow-y:auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.02); display:flex; flex-direction:column; font-family:'Inter', sans-serif;";
            parentCol.insertBefore(statusBox, headerBox.nextSibling);
          }

          statusBox.innerHTML = '';
          let totalFiles = files.length;
          let summary = { matched: [], parked: [], linked: [], skipped: [], smartSkipped: [] };

          const addLog = (type, title, subtitle, filename) => {
            let colors = {
              success: { icon: "✓", color: "#059669", line: "#34d399" },
              info: { icon: "i", color: "#0284c7", line: "#7dd3fc" },
              warning: { icon: "⧖", color: "#d97706", line: "#fcd34d" },
              error: { icon: "✕", color: "#dc2626", line: "#fca5a5" },
              smart: { icon: "↺", color: "#0d9488", line: "#5eead4" }
            };
            let theme = colors[type];

            let logHtml = `<div style="display:flex; align-items:center; padding:12px 20px; border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
              <div style="flex-shrink:0; font-size:14px; font-weight:400; color:${theme.color}; width:20px; text-align:center;">${theme.icon}</div>
              <div style="flex-shrink:0; width:2px; height:24px; background:${theme.line}; margin:0 15px; border-radius:2px;"></div>
              <div style="flex:1; min-width:0; display:flex; align-items:center; justify-content:space-between;">
                  <div>
                      <span style="font-size:13px; color:#1e293b; font-weight:500;">${title}</span>
                      <span style="font-size:12px; color:#64748b; font-weight:400; margin-left:8px;">— ${subtitle}</span>
                  </div>
                  <span style="font-size:11px; color:#94a3b8; font-family:monospace; margin-left:15px;">${filename}</span>
              </div>
          </div>`;
            statusBox.insertAdjacentHTML('beforeend', logHtml);
            statusBox.scrollTop = statusBox.scrollHeight;
          };

          let allPendingRecords = [...(globalData.pending || []), ...(globalData.incomplete || []), ...(globalData.create || [])];

          for (let i = 0; i < totalFiles; i++) {
            let file = files[i];
            let pct = Math.round((i / totalFiles) * 100);

            const updateHeader = (statusText, subText = "") => {
              headerBox.innerHTML = `
                  <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:14px; height:14px; border:2px solid #e2e8f0; border-top-color:#6366f1; border-radius:50%; animation:spin 1s linear infinite;"></div>
                      <div style="display:flex; flex-direction:column;">
                          <span style="font-size:14px; font-weight:600; color:#0f172a;">${statusText}</span>
                          ${subText ? `<span style="font-size:11px; color:#64748b; font-weight:400;">${subText}</span>` : ''}
                      </div>
                  </div>
                  <div style="font-size:12px; font-weight:500; color:#64748b; border:1px solid #e2e8f0; padding:4px 12px; border-radius:20px;">${pct}% • File ${i + 1} of ${totalFiles}</div>
              `;
            };

            let uniqueFileId = "TRF_DONE_" + file.name + "_" + file.size;
            if (localStorage.getItem(uniqueFileId)) {
              addLog("smart", "Cache Hit", "Already processed previously", file.name);
              summary.smartSkipped.push(file.name);
              continue;
            }

            let success = false;
            let retryCount = 0;
            let lastErrorMsg = "";

            // 🚀 ONLY 2 RETRIES TO SAVE TIME
            while (!success && retryCount < 2) {
              updateHeader("Analyzing Image...", "Gemini AI extracting text");
              let base64Data = await getCompressedBase64(file);

              let aiResult = await new Promise((resolve) => {
                google.script.run
                  .withSuccessHandler(resolve)
                  .withFailureHandler(err => resolve({ status: "Error", message: "Google Network Drop: " + err.message }))
                  .analyzeTrfImage(base64Data);
              });

              if (aiResult.status === "Error") {
                lastErrorMsg = aiResult.message; // 🚀 YAHAN STORE HOGA ASLI ERROR
                retryCount++;
                if (retryCount < 2) {
                  updateHeader("Retrying...", "Attempt 2/2");
                  await new Promise(r => setTimeout(r, 2000));
                  continue;
                } else {
                  break; // Loop todo, error dikhao
                }
              }

              success = true;
              let aiData = aiResult.data;

              updateHeader("Searching Database...", "Matching patient details locally");

              let matchedRecord = null;
              let cleanAiBarcode = aiData.barcode ? String(aiData.barcode).toLowerCase().replace(/[^a-z0-9]/g, '') : "";
              let aiNameClean = (aiData.name || "").toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|master|miss|baby)\s*/i, '').replace(/[^a-z0-9]/gi, '').trim();

              for (let r of allPendingRecords) {
                let sBarcode = r.barcode ? String(r.barcode).toLowerCase().replace(/[^a-z0-9]/g, '') : "";
                let sNameClean = (r.name || "").toLowerCase().replace(/^(mr\.|mrs\.|ms\.|dr\.|master|miss|baby)\s*/i, '').replace(/[^a-z0-9]/gi, '').trim();

                let isBarcodeMatch = (cleanAiBarcode && cleanAiBarcode !== "na" && sBarcode !== "" && sBarcode.includes(cleanAiBarcode));
                let isNameMatch = false;

                if (aiNameClean.length > 3 && sNameClean.length > 3 && (sNameClean.includes(aiNameClean) || aiNameClean.includes(sNameClean))) {
                  let sAgeClean = String(r.age || "").match(/\d+/) ? String(r.age).match(/\d+/)[0] : "";
                  let aiAgeClean = String(aiData.age || "").match(/\d+/) ? String(aiData.age).match(/\d+/)[0] : "";
                  let isAgeMatch = (sAgeClean === "" || (aiAgeClean !== "" && Math.abs(parseInt(sAgeClean) - parseInt(aiAgeClean)) <= 2));
                  if (isAgeMatch) isNameMatch = true;
                }

                if (isBarcodeMatch || isNameMatch) { matchedRecord = r; break; }
              }

              updateHeader("Saving to Server...", "Uploading TRF to Drive");

              let finalSaveResult;
              let currentUserName = window.currentUser ? window.currentUser.name : "System";

              if (matchedRecord) {
                let targetId = matchedRecord.bookingId || matchedRecord.refId || matchedRecord.name;
                finalSaveResult = await new Promise((resolve) => {
                  google.script.run.withSuccessHandler(resolve).withFailureHandler(e => resolve({ status: "Error", message: "Save failed: " + e.message }))
                    .directAttachTrf(base64Data, file.name, matchedRecord.city, targetId, aiData, currentUserName);
                });

                if (finalSaveResult.status === "Matched") {
                  addLog("success", `Attached to ${targetId}`, `${matchedRecord.name}`, file.name);
                  summary.matched.push(`${targetId} | ${matchedRecord.name}`);
                  localStorage.setItem(uniqueFileId, "true");
                } else if (finalSaveResult.status === "Already Linked") {
                  addLog("info", `Already Linked`, `${matchedRecord.name} already has TRF`, file.name);
                  summary.linked.push(matchedRecord.name);
                  localStorage.setItem(uniqueFileId, "true");
                } else {
                  addLog("error", `Save Failed`, finalSaveResult.message, file.name);
                  summary.skipped.push(file.name);
                }
              } else {
                finalSaveResult = await new Promise((resolve) => {
                  google.script.run.withSuccessHandler(resolve).withFailureHandler(e => resolve({ status: "Error", message: "Park failed: " + e.message }))
                    .parkTrfInWaitingRoom(base64Data, file.name, aiData);
                });

                if (finalSaveResult.status === "Parked" || finalSaveResult.status === "Already Parked") {
                  addLog("warning", `Waiting Room`, `No match for ${aiData.name || 'Unknown'}`, file.name);
                  summary.parked.push(aiData.name || 'Unknown');
                  localStorage.setItem(uniqueFileId, "true");
                } else {
                  addLog("error", `Park Failed`, finalSaveResult.message, file.name);
                  summary.skipped.push(file.name);
                }
              }
            }

            if (!success) {
              // 🚀 YAHAN DIKHEGA ASLI ERROR!
              addLog("error", "Analysis Failed", lastErrorMsg || "Unknown Error", file.name);
              summary.skipped.push(`${file.name} (Error)`);
            }
          }

          headerBox.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
              <div style="font-size:16px;">✨</div>
              <span style="font-size:14px; font-weight:600; color:#10b981;">Scan Complete</span>
          </div>
          <div style="font-size:12px; font-weight:500; color:#64748b;">100%</div>
      `;

          let finalHtml = `<div style="padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius:0 0 12px 12px; margin-top: auto;">
          <h4 style="margin:0 0 15px 0; color:#334155; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Final Execution Summary</h4>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr; gap:12px; margin-bottom:0;">
              <div style="background:#ffffff; padding:12px; border-radius:8px; text-align:center; border: 1px solid #e2e8f0;">
                  <div style="font-size:20px; font-weight:800; color:#10b981;">${summary.matched.length}</div>
                  <div style="font-size:10px; font-weight:600; color:#64748b; text-transform:uppercase; margin-top:4px;">Matched</div>
              </div>
              <div style="background:#ffffff; padding:12px; border-radius:8px; text-align:center; border: 1px solid #e2e8f0;">
                  <div style="font-size:20px; font-weight:800; color:#f59e0b;">${summary.parked.length}</div>
                  <div style="font-size:10px; font-weight:600; color:#64748b; text-transform:uppercase; margin-top:4px;">Waiting</div>
              </div>
              <div style="background:#ffffff; padding:12px; border-radius:8px; text-align:center; border: 1px solid #e2e8f0;">
                  <div style="font-size:20px; font-weight:800; color:#3b82f6;">${summary.linked.length}</div>
                  <div style="font-size:10px; font-weight:600; color:#64748b; text-transform:uppercase; margin-top:4px;">Already In</div>
              </div>
              <div style="background:#ffffff; padding:12px; border-radius:8px; text-align:center; border: 1px solid #e2e8f0;">
                  <div style="font-size:20px; font-weight:800; color:#0d9488;">${summary.smartSkipped.length}</div>
                  <div style="font-size:10px; font-weight:600; color:#64748b; text-transform:uppercase; margin-top:4px;">Cached</div>
              </div>
              <div style="background:#ffffff; padding:12px; border-radius:8px; text-align:center; border: 1px solid #e2e8f0;">
                  <div style="font-size:20px; font-weight:800; color:#ef4444;">${summary.skipped.length}</div>
                  <div style="font-size:10px; font-weight:600; color:#64748b; text-transform:uppercase; margin-top:4px;">Failed</div>
              </div>
          </div>
      </div>`;

          statusBox.insertAdjacentHTML('beforeend', finalHtml);
          statusBox.scrollTop = statusBox.scrollHeight;

          if (typeof fetchPendingTRFs === "function") fetchPendingTRFs();
          if (typeof fetchData === "function") fetchData(true);
        }
        // =========================================================
        // 🟢 WAITING ROOM LOGIC (FRONTEND API) - UPDATED
        // =========================================================
        function fetchPendingTRFs() {
          let listContainer = document.getElementById('pending-trf-list');
          if (!listContainer) return;

          listContainer.innerHTML = '<div style="text-align:center; color:#94a3b8; font-size:12px; margin-top:40px;">Fetching pending TRFs... ⏳</div>';

          google.script.run.withSuccessHandler(function (response) {
            let trfs = JSON.parse(response);
            if (trfs.length === 0) {
              listContainer.innerHTML = '<div style="text-align:center; color:#10b981; font-size:13px; margin-top:40px; font-weight:bold;">🎉 All Clear!<br><span style="color:#64748b; font-weight:normal; font-size: 11px;">No pending TRFs found.</span></div>';
              return;
            }

            // 1. MASTER COPY TEXT PREPARATION
            let allPendingText = "*🚨 ALL PENDING TRFs 🚨*\n\n";

            // 2. MASTER COPY BUTTON UI
            let html = `
          <div style="margin-bottom: 15px; text-align: center;">
              <button onclick="copyWaitingData(this, \`ALL_PENDING_PLACEHOLDER\`)" style="background:#8b5cf6; color:white; border:none; padding:10px 12px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer; width:100%; box-shadow: 0 2px 4px rgba(139,92,246,0.3);">
                  📋 Copy ALL Pending TRFs Info
              </button>
          </div>`;

            trfs.forEach(function (item, index) {
              let textToCopy = `*Pending TRF Details:*\nName: ${item.name}\nAge: ${item.age}\nGender: ${item.gender}\nBarcode: ${item.barcode}\n_Please update the sheet so it can auto-sync!_`;

              // Add to master list
              allPendingText += `*${index + 1}. ${item.name}*\nAge: ${item.age} | Gen: ${item.gender}\nBarcode: ${item.barcode}\n---\n`;

              html += `
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
                      <b style="font-size: 13px; color: #334155;">${item.name}</b>
                      <span style="font-size: 10px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 10px;">${item.time.split(' ')[1]}</span>
                  </div>
                  <div style="font-size: 11px; color: #475569; margin-bottom: 10px; line-height: 1.5; background: #f8fafc; padding: 8px; border-radius: 6px;">
                      🧑 Age: <b>${item.age}</b> | ⚧️ Gen: <b>${item.gender}</b><br>
                      🏷️ Barcode: <b style="color: #ec4899;">${item.barcode}</b>
                  </div>
                  
                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                      <button onclick="window.open('${item.link}', '_blank')" style="flex: 1; min-width: 45%; padding: 6px; font-size: 11px; background: #fdf2f8; color: #ec4899; border: 1px solid #fbcfe8; border-radius: 4px; cursor: pointer;">👁️ View</button>
                      
                      <button onclick="copyWaitingData(this, \`${textToCopy}\`)" style="flex: 1; min-width: 45%; padding: 6px; font-size: 11px; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 4px; cursor: pointer;">📋 Copy</button>
                      
                      <button onclick="attachTRFManually(${item.rowId}, '${item.link}')" style="flex: 1; min-width: 45%; padding: 6px; font-size: 11px; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; border-radius: 4px; cursor: pointer; margin-top: 4px;">🔗 Attach to ID</button>
                      
                      <button onclick="deleteTRF(${item.rowId})" style="flex: 1; min-width: 45%; padding: 6px; font-size: 11px; background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 4px; cursor: pointer; margin-top: 4px;">🗑️ Delete</button>
                  </div>
              </div>`;
            });

            // Finalize copy text replacement
            html = html.replace('ALL_PENDING_PLACEHOLDER', allPendingText.replace(/`/g, '\\`'));
            listContainer.innerHTML = html;

          }).getPendingTRFs();
        }

        // 🟢 NEW FRONTEND FUNCTIONS
        function deleteTRF(rowId) {
          if (!confirm("Are you sure you want to permanently delete this TRF from the Waiting Room?")) return;
          google.script.run.withSuccessHandler(res => {
            showToast("🗑️ " + res);
            fetchPendingTRFs(); // Reload list
          }).withFailureHandler(err => alert("Error: " + err.message)).deletePendingTRF(rowId);
        }

        function attachTRFManually(rowId, link) {
          let bId = prompt("Enter the exact Booking ID to attach this TRF:");
          if (!bId || bId.trim() === "") return;
          google.script.run.withSuccessHandler(res => {
            showToast("✅ " + res);
            fetchPendingTRFs(); // Reload list
          }).withFailureHandler(err => alert("Error: " + err.message)).manualAttachPendingTRF(rowId, bId.trim(), link);
        }

        function copyWaitingData(btn, text) {
          navigator.clipboard.writeText(text).then(() => {
            let oldText = btn.innerHTML;
            btn.innerHTML = "✅ Copied!";
            btn.style.background = "#16a34a";
            btn.style.color = "white";
            setTimeout(() => {
              btn.innerHTML = oldText;
              btn.style.background = "#f0fdf4";
              btn.style.color = "#16a34a";
            }, 2000);
          });
        }
        // 🟢 JADOO BUTTON FUNCTION (Read Text)
        window.readTrfText = function () {
          let rawLink = document.getElementById('trf-zoom-btn').href; // Original Drive link yahan chhupa hota hai
          let ocrPanel = document.getElementById('trf-ocr-panel');
          let ocrBtn = document.getElementById('trf-ocr-btn');

          // Panel khol do aur loading dikhao
          ocrPanel.style.display = 'block';
          ocrPanel.innerHTML = '<div style="text-align:center; margin-top: 40px;"><span style="font-size:20px;">🤖</span><br><b style="color:#ec4899;">AI is reading the TRF...</b><br><span style="color:#64748b;">It takes about 3 seconds</span></div>';

          // Button ko disable kardo jab tak load ho raha hai
          ocrBtn.disabled = true;
          ocrBtn.innerHTML = "⏳ Reading...";
          ocrBtn.style.opacity = "0.6";

          google.script.run.withSuccessHandler(function (text) {
            // Line breaks theek karke render karna
            let formattedText = text.replace(/\n/g, '<br>');

            // Output dikhana
            ocrPanel.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                  <b style="color:#ec4899;">📄 Extracted TRF Data:</b>
                                  <button onclick="document.getElementById('trf-ocr-panel').style.display='none'" style="border:none; background:none; cursor:pointer; color:#ef4444; font-size:10px; font-weight:bold;">✕ Close</button>
                                </div>
                                <div style="font-family: monospace;">${formattedText}</div>`;

            // Button ko wapas normal karna
            ocrBtn.disabled = false;
            ocrBtn.innerHTML = "📄 Read Text";
            ocrBtn.style.opacity = "1";
          }).extractFullTextFromDriveLink(rawLink);
        };

        // 🟢 openFloatingTrf ko thoda sa modify karna hoga taaki naya window khulte waqt OCR panel chhup jaye
        window.openFloatingTrf = function (link, rid, city) {
          currentTrfRotation = 0;
          let iframe = document.getElementById('trf-iframe');
          if (iframe) {
            iframe.style.transition = "none";
            iframe.style.transform = "rotate(0deg) scale(1)";
          }

          document.getElementById('viewer-rid').value = rid;
          document.getElementById('viewer-city').value = city;

          let uploadArea = document.getElementById('trf-upload-area');
          let delBtn = document.getElementById('trf-delete-btn');
          let zoomBtn = document.getElementById('trf-zoom-btn');
          let rotateBtn = document.getElementById('trf-rotate-btn');
          let ocrBtn = document.getElementById('trf-ocr-btn'); // Naya Button
          let ocrPanel = document.getElementById('trf-ocr-panel'); // Naya Panel

          // Har baar naya TRF kholne par text panel band kar do
          if (ocrPanel) ocrPanel.style.display = 'none';

          if (link && link.trim() !== '') {
            let viewLink = link.replace('/view?usp=drivesdk', '/preview').replace('/view', '/preview');

            iframe.src = viewLink;
            iframe.style.display = 'block';
            if (uploadArea) uploadArea.style.display = 'none';
            if (delBtn) delBtn.style.display = 'block';
            if (rotateBtn) rotateBtn.style.display = 'block';
            if (ocrBtn) ocrBtn.style.display = 'block'; // Read Text button on

            if (zoomBtn) {
              zoomBtn.href = link;
              zoomBtn.style.display = 'block';
            }
          } else {
            iframe.src = '';
            iframe.style.display = 'none';
            if (uploadArea) uploadArea.style.display = 'flex';
            if (delBtn) delBtn.style.display = 'none';
            if (zoomBtn) zoomBtn.style.display = 'none';
            if (rotateBtn) rotateBtn.style.display = 'none';
            if (ocrBtn) ocrBtn.style.display = 'none';

            currentUploadRid = rid;
            currentUploadCity = city;
          }

          document.getElementById('floating-trf-viewer').style.display = 'flex';
        };
        // ========================================================
        // 🚀 FIREBASE INSTANT LISTENER (THE WALKIE-TALKIE)
        // ========================================================
        let _lastFirebaseTs = 0; // Debounce tracker
        setTimeout(() => {
          if (typeof window.firebaseDB !== 'undefined') {
            const syncRef = window.firebaseRef(window.firebaseDB, 'global_sync/last_update');

            window.firebaseOnValue(syncRef, (snapshot) => {
              const lastUpdate = snapshot.val();

              if (!lastUpdate || typeof isTyping === 'undefined') return;

              // 🚀 DEBOUNCE: Agar same timestamp hai toh ignore karo (duplicate fire)
              if (lastUpdate === _lastFirebaseTs) return;
              _lastFirebaseTs = lastUpdate;

              // 🚀 FIX: isTyping check rakhna hai — user type kar raha hai toh disturb mat karo
              // BUT _writeLockUntil removed — server push ko kabhi block nahi karna!
              if (!isTyping) {
                console.log("⚡ Firebase last_update ping! Fetching fresh data...");
                if (typeof fetchData === 'function') fetchData(true);
              }
            });
          }
        }, 3000);

        // ========================================================
        // 👻 THE GHOST BUSTER ENGINE (0.05 Sec Auto-Hide Shield)
        // ========================================================
        setInterval(() => {
          if (window.ghostMemory) {
            let now = Date.now();
            for (let rid in window.ghostMemory) {
              let ghost = window.ghostMemory[rid];

              // 8 second tak card par nazar rakhega
              if (now - ghost.time < 8000) {
                let stLow = ghost.stat.toLowerCase();
                let row = document.getElementById(rid);
                let dRow = document.getElementById('details-' + rid);

                let shouldHide = false;
                if (stLow.includes('share') && typeof currentTab !== 'undefined' && currentTab === 'pending') shouldHide = true;
                if (!stLow.includes('share') && typeof currentTab !== 'undefined' && currentTab === 'shared') shouldHide = true;

                // Agar Google sheet ne galti se card wapas draw kar diya, toh ye use turant hide karega
                if (shouldHide && row && row.style.display !== 'none') {
                  row.style.setProperty('display', 'none', 'important');
                  if (dRow) dRow.style.setProperty('display', 'none', 'important');
                }
              } else {
                // 8 second baad iska kaam khatam
                delete window.ghostMemory[rid];
              }
            }
          }
        }, 50);

        // ========================================================
        // 🔒 REAL-TIME CARD LOCKING (BULLETPROOF PRESENCE SYSTEM)
        // ========================================================
        let activeLocks = {};

        function getMyName() {
          if (typeof window.currentUser !== 'undefined' && window.currentUser.name) return window.currentUser.name;
          let headerName = document.getElementById('user-display-name');
          if (headerName && headerName.innerText && headerName.innerText !== "Loading...") return headerName.innerText.trim();
          return "A Teammate";
        }

        // 🚀 BRAMHASTRA: ID ko stable banane ke liye array index (-idx-) hata do
        function getStableLockId(rid) {
          return rid ? rid.split('-idx-')[0] : "";
        }

        window.acquireLockFirebase = function (rid) {
          if (typeof window.firebaseDB === 'undefined' || !window.firebaseDB) return;
          let myName = getMyName();
          let stableId = getStableLockId(rid); // Use stable ID
          if (!stableId) return;

          if (typeof activeLocks !== 'undefined') {
            for (let oldStableId in activeLocks) {
              if (activeLocks[oldStableId] && activeLocks[oldStableId].user === myName) {
                const oldRef = window.firebaseRef(window.firebaseDB, 'locked_cards/' + oldStableId);
                window.firebaseRemove(oldRef);
              }
            }
          }

          const lockRef = window.firebaseRef(window.firebaseDB, 'locked_cards/' + stableId);
          window.firebaseSet(lockRef, { user: myName, time: Date.now() });
        };

        window.releaseLockFirebase = function (rid) {
          if (typeof window.firebaseDB === 'undefined' || !window.firebaseDB) return;
          let stableId = getStableLockId(rid); // Use stable ID
          if (!stableId) return;

          const lockRef = window.firebaseRef(window.firebaseDB, 'locked_cards/' + stableId);
          window.firebaseRemove(lockRef);
        };

        setTimeout(() => {
          if (typeof window.firebaseDB !== 'undefined' && window.firebaseDB) {
            const lockRef = window.firebaseRef(window.firebaseDB, 'locked_cards');
            window.firebaseOnValue(lockRef, (snapshot) => {
              activeLocks = snapshot.val() || {};
              updateLiveLocksUI();
            });

            if (!document.getElementById('lock-pulse-css')) {
              document.head.insertAdjacentHTML('beforeend', '<style id="lock-pulse-css">@keyframes lockPulse { 0% {opacity: 1;} 50% {opacity: 0.5;} 100% {opacity: 1;} } .live-lock-badge { animation: lockPulse 1.5s infinite; }</style>');
            }
          }
        }, 2000);

        window.updateLiveLocksUI = function () {
          const allRows = document.querySelectorAll('.compact-row');
          let myName = getMyName();

          allRows.forEach(row => {
            const rid = row.id;
            const stableId = getStableLockId(rid); // Compare locks using stable ID
            const lockData = activeLocks[stableId];
            let lockBadge = row.querySelector('.live-lock-badge');

            // Agar koi aur user is card ko dekh raha hai (pichle 10 min mein)
            if (lockData && lockData.user !== myName && (Date.now() - lockData.time < 600000)) {
              if (!lockBadge) {
                const td = row.querySelector('td:nth-child(2)');
                if (td) {
                  td.insertAdjacentHTML('beforeend', `<div class="live-lock-badge" style="margin-top:6px; padding:3px 6px; background:#fee2e2; border:1px solid #ef4444; border-radius:4px; font-size:9px; font-weight:bold; color:#b91c1c; display:inline-block; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);">👁️ ${lockData.user} is viewing...</div>`);
                }
              } else {
                lockBadge.innerHTML = `👁️ ${lockData.user} is viewing...`;
              }
              row.style.backgroundColor = "rgba(254, 226, 226, 0.4)";
            } else {
              if (lockBadge) lockBadge.remove();
              row.style.backgroundColor = "";
            }
          });
        };

        window.addEventListener('beforeunload', () => {
          if (typeof currentlyExpandedRow !== 'undefined' && currentlyExpandedRow) {
            releaseLockFirebase(currentlyExpandedRow);
          }
        });;

        // ========================================================
        // 🚀 FIREBASE WEBSOCKET RECEIVER (TWO-WAY MOVE 0.01 SEC)
        // ========================================================
        setTimeout(() => {
          if (typeof window.firebaseDB !== 'undefined' && window.firebaseDB) {
            const liveRef = window.firebaseRef(window.firebaseDB, 'live_status_updates');

            window.firebaseOnValue(liveRef, (snapshot) => {
              const updates = snapshot.val() || {};
              let myName = getMyName();

              for (let rid in updates) {
                let data = updates[rid];

                if (data.usr !== myName && (Date.now() - data.time < 120000)) {
                  let stLow = data.stat.toLowerCase();
                  let isShared = stLow.includes('share');

                  // ⚡ MEMORY MOVE DUSRI SCREEN PAR
                  if (typeof globalData !== 'undefined') {
                    let targetTab = isShared ? 'shared' : 'pending';
                    let sourceTab = isShared ? 'pending' : 'shared';

                    for (let t in globalData) {
                      let item = globalData[t].find(i => i.rid === rid || i.bookingId === rid);
                      if (item) item.status = data.stat;
                    }

                    let sIdx = globalData[sourceTab] ? globalData[sourceTab].findIndex(i => i.rid === rid || i.bookingId === rid) : -1;
                    if (sIdx > -1) {
                      let movedItem = globalData[sourceTab].splice(sIdx, 1)[0];
                      if (globalData[targetTab]) globalData[targetTab].unshift(movedItem);
                    }
                  }

                  // ⚡ UI MANIPULATION
                  let row = document.getElementById(rid);
                  if (row) {
                    let select = row.querySelector('.status-select');
                    if (select && select.value !== data.stat) {
                      select.value = data.stat;
                      select.style.color = isShared ? 'var(--success)' : 'var(--warning)';

                      let dRow = document.getElementById('details-' + rid);
                      let shouldHide = false;
                      if (isShared && typeof currentTab !== 'undefined' && currentTab === 'pending') shouldHide = true;
                      if (!isShared && typeof currentTab !== 'undefined' && currentTab === 'shared') shouldHide = true;

                      if (shouldHide) {
                        row.style.setProperty('display', 'none', 'important');
                        if (dRow) dRow.style.setProperty('display', 'none', 'important');
                        if (typeof updateUI === 'function') updateUI();
                      } else {
                        row.style.display = 'table-row';
                      }

                      let td = row.querySelector('td:nth-child(3)');
                      if (td) {
                        let old = row.querySelector('.instant-action-badge');
                        if (old) old.remove();

                        let badgeBg = isShared ? '#dcfce7' : '#fef08a';
                        let badgeColor = isShared ? '#166534' : '#854d0e';

                        td.insertAdjacentHTML('beforeend', `<div class="instant-action-badge" style="margin-top:6px; padding:4px 8px; background:${badgeBg}; border:1px solid ${badgeColor}; border-radius:6px; font-size:10px; font-weight:900; color:${badgeColor}; display:inline-block;">🚀 ${data.stat} by ${data.usr}</div>`);

                        setTimeout(() => { let b = row.querySelector('.instant-action-badge'); if (b) b.remove(); }, 4000);
                      }
                    }
                  }
                }
              }
            });
          }
        }, 1500);
        // ========================================================
        // 🚀 INCOMPLETE TRF COPY GENERATOR
        // ========================================================
        window.showIncompleteTRFPopup = function () {
          let incompleteList = getFilteredData(globalData.incomplete) || [];

          // Agar incomplete data nahi hai toh alert dikhao
          if (incompleteList.length === 0) {
            if (typeof showToast === 'function') showToast("⚠️ No incomplete records found!");
            else alert("No incomplete records found!");
            return;
          }

          // 1. Text Format banana
          let textToCopy = "Hi Team,\n\nTRF not received for the below bookings. Kindly check and update:\n\n";

          incompleteList.forEach(item => {
            let rId = (item.rIds && item.rIds.length > 0) ? item.rIds.join(", ") : (item.refId || "N/A");
            let cxName = item.name || "Unknown";
            let phlebo = item.phleboName || "Not Assigned";

            // Format: Request ID || Cx Name || Phlebo Name
            textToCopy += `${rId} || ${cxName} || ${phlebo}\n`;
          });

          // 2. Pop-up (Modal) Banana aur Screen par dikhana
          let modalHtml = `
          <div id="trf-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:99999; display:flex; justify-content:center; align-items:center;">
              <div style="background:#fff; padding:20px; border-radius:8px; width:550px; max-width:90%; box-shadow:0 10px 25px rgba(0,0,0,0.3); animation: fadeIn 0.3s ease-in-out;">
                  <h3 style="margin-top:0; color:#1e293b; font-family:sans-serif;">📋 Missing TRF Details</h3>
                  <textarea id="trf-copy-text" style="width:100%; height:250px; padding:12px; border:1px solid #cbd5e1; border-radius:6px; font-family:monospace; font-size:13px; margin-bottom:15px; resize:none; box-sizing:border-box; outline:none;" readonly>${textToCopy}</textarea>
                  <div style="display:flex; justify-content:flex-end; gap:12px;">
                      <button onclick="document.getElementById('trf-modal-overlay').remove()" style="padding:8px 16px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer; color:#475569; font-weight:bold; transition:0.2s;">Cancel</button>
                      <button onclick="copyTRFText()" style="padding:8px 16px; background:#8b5cf6; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold; box-shadow:0 2px 4px rgba(139, 92, 246, 0.3); transition:0.2s;">📋 Copy & Close</button>
                  </div>
              </div>
          </div>`;

          document.body.insertAdjacentHTML('beforeend', modalHtml);
        };

        // 3. Copy Karne ka function
        window.copyTRFText = function () {
          let copyTextArea = document.getElementById("trf-copy-text");
          copyTextArea.select();
          copyTextArea.setSelectionRange(0, 99999); // Mobile compatibility

          navigator.clipboard.writeText(copyTextArea.value).then(() => {
            if (typeof showToast === 'function') showToast("✅ Text Copied to Clipboard!");
            else alert("Copied successfully!");
            document.getElementById('trf-modal-overlay').remove(); // Copy hote hi popup band
          }).catch(err => {
            alert("Copy failed! Please select and copy manually.");
          });
        };
        // ========================================================
        // 🚀 AUTO-HIDE/SHOW "COPY TRF" BUTTON ENGINE
        // ========================================================
        setInterval(() => {
          let copyBtn = document.getElementById('copy-trf-btn');
          if (copyBtn) {
            // Check karega ki tab 'incomplete' hai ya nahi, AUR usme data hai ya nahi
            let isTabIncomplete = (typeof currentTab !== 'undefined' && currentTab === 'incomplete');
            let hasData = (typeof globalData !== 'undefined' && globalData.incomplete && globalData.incomplete.length > 0);

            // Agar dono baatein sach hain, toh button dikhao, warna hide kar do
            if (isTabIncomplete && hasData) {
              copyBtn.style.display = 'inline-block';
            } else {
              copyBtn.style.display = 'none';
            }
          }
        }, 500); // Har aadhe second me background me chup-chap check karta rahega
        /* 🟢 ULTRA PRO MAX: MINIMIZE MODAL ENGINE 🟢 */
        window.minimizeModal = function (modalId, title) {
          let modalEl = document.getElementById(modalId);
          if (!modalEl) return;

          // 1. Modal ko chupana (Data delete kiye bina display none kar diya)
          modalEl.style.display = 'none';

          // 2. Floating Dock dhoondhna ya naya banana
          let dock = document.getElementById('minimized-dock');
          if (!dock) {
            dock = document.createElement('div');
            dock.id = 'minimized-dock';
            dock.style.cssText = 'position: fixed; bottom: 30px; left: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 12px;';
            document.body.appendChild(dock);
          }

          // 3. Agar already minimize nahi hai, toh ek floating tab banao
          if (!document.getElementById('min-' + modalId)) {
            let minTab = document.createElement('div');
            minTab.id = 'min-' + modalId;
            minTab.title = "Click to restore";

            // Premium Glassmorphism Style
            minTab.style.cssText = 'background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(59, 130, 246, 0.4); padding: 10px 16px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 14px; color: #1e293b; transition: all 0.2s ease;';

            minTab.innerHTML = `
                  <span style="display:flex; align-items:center; justify-content:center; background:#eff6ff; color:#3b82f6; width:28px; height:28px; border-radius:6px; font-size:16px;">📊</span>
                  <span style="white-space:nowrap;">${title}</span>
                  <span style="color:#10b981; margin-left:10px; font-size:14px; font-weight:bold; background: #d1fae5; padding: 2px 8px; border-radius: 4px;">⤢ Open</span>
              `;

            // Hover Animation
            minTab.onmouseover = () => { minTab.style.transform = 'translateY(-3px)'; minTab.style.boxShadow = '0 15px 30px rgba(59, 130, 246, 0.2)'; };
            minTab.onmouseout = () => { minTab.style.transform = 'translateY(0)'; minTab.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'; };

            // Restore Animation & Logic
            minTab.onclick = function () {
              // Modal ko wapas flex/block se dikhana (taaki wo beech me aa jaye)
              modalEl.style.display = 'flex';
              minTab.remove(); // Dock se hata do
            };

            dock.appendChild(minTab);
          }
        };
        // =========================================================
        // 🚀 PRO-LEVEL TREND ANALYTICS ENGINE (SMOOTH UI)
        // =========================================================
        let miniChartObj = null;
        let fullChartObj = null;
        let partnerMixObj = null;
        let sourceMixObj = null;
        let cityVolumeObj = null;
        let rawTrendStats = null;
        let currentChartMode = 'partner'; // 'partner' or 'source'

        function initTrendDates() {
          let e = new Date();
          let s = new Date(e.getTime() - (29 * 86400000));
          if (document.getElementById('trend-date-end')) document.getElementById('trend-date-end').value = e.toISOString().slice(0, 10);
          if (document.getElementById('trend-date-start')) document.getElementById('trend-date-start').value = s.toISOString().slice(0, 10);
        }

        window.setTrendDates = function (days) {
          let e = new Date();
          let s = new Date(e.getTime() - ((days - 1) * 86400000));
          document.getElementById('trend-date-end').value = e.toISOString().slice(0, 10);
          document.getElementById('trend-date-start').value = s.toISOString().slice(0, 10);

          // Manage Buttons Active State
          ['7', '15', '30'].forEach(d => {
            let btn = document.getElementById('btn-trend-' + d);
            if (btn) { if (d == days) btn.classList.add('active'); else btn.classList.remove('active'); }
          });

          fetchTrendStats(true);
        };

        window.toggleChartMode = function (mode) {
          currentChartMode = mode;
          document.getElementById('mode-partner').classList.remove('active');
          document.getElementById('mode-source').classList.remove('active');
          document.getElementById('mode-' + mode).classList.add('active');
          renderFullChart();
        };

        function fetchTrendStats(forceBackend = false) {
          let sInput = document.getElementById('trend-date-start');
          let eInput = document.getElementById('trend-date-end');
          if (!sInput || !sInput.value) initTrendDates();

          let start = sInput.value;
          let end = eInput.value;

          let miniBadge = document.getElementById('mini-chart-badge');
          let syncIcon = document.getElementById('sync-trend-icon');
          if (miniBadge) miniBadge.innerText = "Syncing... ⏳";
          if (syncIcon) syncIcon.classList.add('spin');

          google.script.run
            .withSuccessHandler(res => {
              if (syncIcon) syncIcon.classList.remove('spin');

              let data;
              try { data = JSON.parse(res); } catch (e) {
                console.error("❌ JSON parse failed:", e, "Raw res:", res);
                if (miniBadge) { miniBadge.innerText = "Parse Error!"; miniBadge.style.background = "#fee2e2"; miniBadge.style.color = "#ef4444"; }
                return;
              }

              if (!data || data.error) {
                console.error("❌ Backend error:", data && data.error);
                if (miniBadge) { miniBadge.innerText = "Error!"; miniBadge.style.background = "#fee2e2"; miniBadge.style.color = "#ef4444"; }
                return;
              }

              rawTrendStats = data.stats;
              console.log("🔥 TREND DATA DUMP:", JSON.stringify(rawTrendStats, null, 2));

              if (!rawTrendStats || Object.keys(rawTrendStats).length === 0) {
                if (miniBadge) { miniBadge.innerText = "No Data"; }
                return;
              }

              let cities = new Set();
              Object.values(rawTrendStats).forEach(dayData => { if (dayData && typeof dayData === 'object') Object.keys(dayData).forEach(c => cities.add(c)); });

              const sortedCities = Array.from(cities).sort();

              // Populate Mini Chart Select (Single)
              let miniSelect = document.getElementById('mini-chart-city');
              if (miniSelect) {
                let v = miniSelect.value;
                miniSelect.innerHTML = '<option value="ALL">🏢 All Cities</option>' + sortedCities.map(c => `<option value="${c}">${c}</option>`).join('');
                miniSelect.value = cities.has(v) ? v : "ALL";
              }

              // Populate Full Chart Multi-select (Preserving selection)
              let fullDrop = document.getElementById('analytics-city-drop');
              if (fullDrop) {
                let currentSelected = getAnalyticsSelectedCities();
                let isAllCurrently = currentSelected.includes("ALL");

                // 🚀 FIX: If All is selected, all individuals should also be checked in the UI for clarity
                let html = `<label style="padding: 5px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.05)'" onmouseout="this.style.background='transparent'"><input type="checkbox" id="analytics-city-all" value="ALL" ${isAllCurrently ? 'checked' : ''} onchange="toggleAllCities(this)"> <span style="font-weight: 700;">🏢 All Cities</span></label>`;

                sortedCities.forEach(c => {
                  let isChecked = isAllCurrently || currentSelected.includes(c);
                  html += `<label style="padding: 5px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.05)'" onmouseout="this.style.background='transparent'"><input type="checkbox" name="analytics_cities" value="${c}" ${isChecked ? 'checked' : ''} onchange="updateAnalyticsCitySelection()"> <span>${c}</span></label>`;
                });
                fullDrop.innerHTML = html;

                // Update label text
                let text = isAllCurrently ? "All Cities" : (currentSelected.length === 0 ? "No City Selected" : currentSelected.length + " Cities Selected");
                let labelEl = document.getElementById('analytics-city-text');
                if (labelEl) labelEl.innerText = text;
              }

              renderMiniChart();
              if (document.getElementById('analyticsFullPage') && document.getElementById('analyticsFullPage').classList.contains('active')) renderFullChart();
            })
            .withFailureHandler(err => {
              if (syncIcon) syncIcon.classList.remove('spin');
              console.error("❌ getTrendAnalyticsData FAILED:", err);
              if (miniBadge) { miniBadge.innerText = "Script Error!"; miniBadge.style.background = "#fee2e2"; miniBadge.style.color = "#ef4444"; }
            })
            .getTrendAnalyticsData(start, end);
        }

        window.renderMiniChart = function () {
          if (!rawTrendStats || rawTrendStats.error) return;

          let city = document.getElementById('mini-chart-city').value || "ALL";
          let allDates = Object.keys(rawTrendStats).sort((a, b) => new Date(a) - new Date(b));
          let lastNDates = allDates.slice(-5);

          let ppmcData = [], retailData = [], lineData = [], labels = [], totalWeek = 0;

          lastNDates.forEach(dateStr => {
            let dayData = rawTrendStats[dateStr];
            let p = 0, r = 0;

            if (city === "ALL") {
              Object.values(dayData).forEach(cityStats => { p += cityStats.PPMC; r += cityStats.RETAIL; });
            } else if (dayData[city]) { p = dayData[city].PPMC; r = dayData[city].RETAIL; }

            ppmcData.push(p); retailData.push(r);
            let totalDay = p + r; lineData.push(totalDay); totalWeek += totalDay;

            let dObj = new Date(dateStr);
            let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            labels.push(`${days[dObj.getDay()]} ${dObj.getDate()}/${dObj.getMonth() + 1}`);
          });

          let badge = document.getElementById('mini-chart-badge');
          if (badge) {
            badge.innerText = `${totalWeek}`;
            badge.style.background = "transparent";
            badge.style.color = "#065f46";
          }
          // 🚀 Populate PPMC/Retail split badges in new widget
          let totalPPMC7 = ppmcData.reduce((a, b) => a + b, 0);
          let totalRetail7 = retailData.reduce((a, b) => a + b, 0);
          let ppmcBadgeEl = document.getElementById('mini-ppmc-badge');
          let retailBadgeEl = document.getElementById('mini-retail-badge');
          if (ppmcBadgeEl) ppmcBadgeEl.innerText = totalPPMC7 > 0 ? totalPPMC7 : '0';
          if (retailBadgeEl) retailBadgeEl.innerText = totalRetail7 > 0 ? totalRetail7 : '0';

          // ── CHART.JS INIT GUARD ──────────────────────────────────
          // Yield one animation frame so the browser finalises layout
          // and the canvas reports correct offsetWidth/Height to Chart.js.
          // This is the definitive fix for the "0-height chart" GSAP conflict.
          requestAnimationFrame(() => {
            let ctx = document.getElementById('miniTrendChart').getContext('2d');
            if (miniChartObj) miniChartObj.destroy();

            // ── Soft gradient fill under the total line ──
            const lineGrad = ctx.createLinearGradient(0, 0, 0, 120);
            lineGrad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
            lineGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

            miniChartObj = new Chart(ctx, {
              type: 'bar',
              data: {
                labels: labels,
                datasets: [
                  {
                    type: 'line',
                    label: 'Total',
                    data: lineData,
                    borderColor: '#10b981',
                    backgroundColor: lineGrad,
                    borderWidth: 2.5,
                    tension: 0.45,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#10b981',
                    fill: true,
                    order: 0
                  },
                  {
                    type: 'bar',
                    label: 'Retail',
                    data: retailData,
                    backgroundColor: 'rgba(59, 130, 246, 0.55)',
                    hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4,
                    borderSkipped: false,
                    barPercentage: 0.55,
                    order: 1
                  },
                  {
                    type: 'bar',
                    label: 'PPMC',
                    data: ppmcData,
                    backgroundColor: 'rgba(239, 68, 68, 0.55)',
                    hoverBackgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 4,
                    borderSkipped: false,
                    barPercentage: 0.55,
                    order: 2
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600, easing: 'easeOutQuart' },
                scales: {
                  x: {
                    stacked: true,
                    grid: { display: false },
                    border: { display: false },
                    ticks: {
                      font: { size: 8, family: 'Inter', weight: '600' },
                      color: '#94a3b8',
                      maxRotation: 0
                    }
                  },
                  y: {
                    stacked: true,
                    border: { display: false },
                    grid: { display: false },
                    ticks: { display: false }
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleFont: { size: 11, family: 'Inter', weight: '700' },
                    bodyFont: { size: 11, family: 'Inter' },
                    cornerRadius: 10,
                    padding: { x: 12, y: 8 },
                    boxPadding: 4
                  }
                },
                interaction: { mode: 'index', intersect: false }
              }
            });
          }); // end requestAnimationFrame
        };

        window.getAnalyticsSelectedCities = function () {
          let selected = [];
          let checks = document.getElementsByName('analytics_cities');
          let allCheck = document.getElementById('analytics-city-all');

          if (!checks || checks.length === 0) return ["ALL"];
          if (allCheck && allCheck.checked) return ["ALL"];

          for (let c of checks) { if (c.checked) selected.push(c.value); }
          return selected; // Returns empty array if none checked
        };

        window.toggleAllCities = function (el) {
          let checks = document.getElementsByName('analytics_cities');
          if (!checks) return;
          for (let c of checks) { c.checked = el.checked; }
          updateAnalyticsCitySelection();
        };

        window.updateAnalyticsCitySelection = function () {
          let checks = document.getElementsByName('analytics_cities');
          let allCheck = document.getElementById('analytics-city-all');

          if (checks && allCheck) {
            let anyUnchecked = Array.from(checks).some(c => !c.checked);
            if (anyUnchecked) allCheck.checked = false;

            let allChecked = Array.from(checks).every(c => c.checked);
            if (allChecked) allCheck.checked = true;
          }

          let selected = getAnalyticsSelectedCities();
          let isAll = allCheck && allCheck.checked;
          let text = isAll ? "All Cities" : (selected.length === 0 ? "No City Selected" : selected.length + " Cities Selected");

          let labelEl = document.getElementById('analytics-city-text');
          if (labelEl) labelEl.innerText = text;

          renderFullChart();
        };

        window.renderFullChart = function () {
          if (!rawTrendStats || rawTrendStats.error) return;

          let selectedCities = getAnalyticsSelectedCities();
          let allCheck = document.getElementById('analytics-city-all');
          let isAll = allCheck && allCheck.checked;

          // 🚀 FIX: If not all and none selected, show zero data
          if (!isAll && selectedCities.length === 0) {
            // Reset charts and KPIs
            document.getElementById('stat-total').innerText = "0";
            document.getElementById('stat-avg').innerText = "0";
            document.getElementById('stat-ppmc').innerText = "0";
            document.getElementById('stat-retail').innerText = "0";
            document.getElementById('stat-api').innerText = "0";
            document.getElementById('stat-manual').innerText = "0";
            document.getElementById('full-chart-title').innerText = "No Cities Selected";
            if (fullChartObj) fullChartObj.destroy();
            if (cityVolumeObj) cityVolumeObj.destroy();
            return;
          }
          let targetDates = Object.keys(rawTrendStats).sort((a, b) => new Date(a) - new Date(b));
          let totalDays = targetDates.length;

          let ds1Data = [], ds2Data = [], lineData = [], labels = [];
          let totalP = 0, totalR = 0, totalApi = 0, totalMan = 0, grandTotal = 0;

          targetDates.forEach(dateStr => {
            let dayData = rawTrendStats[dateStr];
            let p = 0, r = 0, a = 0, m = 0;

            if (isAll) {
              Object.values(dayData).forEach(cityStats => {
                p += cityStats.PPMC; r += cityStats.RETAIL;
                a += cityStats.API; m += cityStats.MANUAL;
              });
            } else {
              selectedCities.forEach(city => {
                if (dayData[city]) {
                  p += dayData[city].PPMC; r += dayData[city].RETAIL;
                  a += dayData[city].API; m += dayData[city].MANUAL;
                }
              });
            }

            totalP += p; totalR += r; totalApi += a; totalMan += m;
            let totalDay = p + r;
            grandTotal += totalDay;

            lineData.push(totalDay);

            if (currentChartMode === 'partner') { ds1Data.push(r); ds2Data.push(p); }
            else { ds1Data.push(a); ds2Data.push(m); }

            let dObj = new Date(dateStr);
            let daysArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            labels.push(`${daysArr[dObj.getDay()]} ${("0" + dObj.getDate()).slice(-2)}/${("0" + (dObj.getMonth() + 1)).slice(-2)}`);
          });

          // Aggregate City Data for Bar Chart
          let cityMap = {};
          targetDates.forEach(d => {
            let dayData = rawTrendStats[d];
            Object.keys(dayData).forEach(cn => {
              if (!isAll && !selectedCities.includes(cn)) return;
              let v = (dayData[cn].PPMC || 0) + (dayData[cn].RETAIL || 0);
              cityMap[cn] = (cityMap[cn] || 0) + v;
            });
          });
          let sortedCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
          let cityLabels = sortedCities.map(x => x[0]);
          let cityValues = sortedCities.map(x => x[1]);



          // Update KPI Cards
          document.getElementById('stat-total').innerText = grandTotal;
          document.getElementById('stat-avg').innerText = totalDays > 0 ? Math.round(grandTotal / totalDays) : 0;
          document.getElementById('stat-ppmc').innerText = totalP;
          document.getElementById('stat-retail').innerText = totalR;
          document.getElementById('stat-api').innerText = totalApi;
          document.getElementById('stat-manual').innerText = totalMan;

          let titleTxt = isAll ? `Overall Collections` : (selectedCities.length === 1 ? `${selectedCities[0]} Collections` : `Selected Cities (${selectedCities.length})`);
          document.getElementById('full-chart-title').innerText = titleTxt;

          if (targetDates.length > 0) {
            let d1 = new Date(targetDates[0]); let d2 = new Date(targetDates[targetDates.length - 1]);
            let mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            document.getElementById('chart-date-label').innerHTML = `📅 ${d1.getDate()} ${mNames[d1.getMonth()]}  ➔  ${d2.getDate()} ${mNames[d2.getMonth()]}`;
          }

          requestAnimationFrame(() => {
            let ctx = document.getElementById('fullTrendChart').getContext('2d');
            if (fullChartObj) fullChartObj.destroy();

            // Line Chart Gradient (Green)
            let gradientLine = ctx.createLinearGradient(0, 0, 0, 400);
            gradientLine.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
            gradientLine.addColorStop(1, 'rgba(16, 185, 129, 0)');

            let ds1Config = currentChartMode === 'partner'
              ? { label: 'Retail / AHC', color: '#3b82f6' }
              : { label: 'API Bookings', color: '#8b5cf6' };

            let ds2Config = currentChartMode === 'partner'
              ? { label: 'PPMC', color: '#ef4444' }
              : { label: 'Manual Bookings', color: '#64748b' };

            fullChartObj = new Chart(ctx, {
              type: 'bar',
              data: {
                labels: labels,
                datasets: [
                  {
                    type: 'line', label: 'Total Volume', data: lineData,
                    borderColor: '#10b981', backgroundColor: gradientLine,
                    borderWidth: 3.5, tension: 0.45, pointRadius: 0,
                    pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#10b981', pointHoverBorderWidth: 3, fill: true
                  },
                  {
                    type: 'bar', label: ds1Config.label, data: ds1Data,
                    backgroundColor: ds1Config.color, borderRadius: 6, borderSkipped: false, barPercentage: 0.6
                  },
                  {
                    type: 'bar', label: ds2Config.label, data: ds2Data,
                    backgroundColor: ds2Config.color, borderRadius: 6, borderSkipped: false, barPercentage: 0.6
                  }
                ]
              },
              options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' } },
                  y: { stacked: true, grid: { color: '#f1f5f9', borderDash: [5, 5] }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' } }
                },
                plugins: {
                  legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true, font: { family: 'Inter', weight: 'bold', size: 12 }, color: '#334155' } },
                  tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 14, family: 'Inter' }, bodyFont: { size: 13, family: 'Inter' }, padding: 14, cornerRadius: 10, boxPadding: 6 }
                },
                interaction: { mode: 'index', intersect: false }
              }
            });

            // ── PARTNER MIX CHART (PIE) ──
            let partnerCtx = document.getElementById('partnerMixChart').getContext('2d');
            if (partnerMixObj) partnerMixObj.destroy();
            partnerMixObj = new Chart(partnerCtx, {
              type: 'pie',
              data: {
                labels: ['Retail / AHC', 'PPMC'],
                datasets: [{
                  data: [totalR, totalP],
                  backgroundColor: ['#3b82f6', '#ef4444'],
                  borderWidth: 0,
                  hoverOffset: 30
                }]
              },
              options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1200, easing: 'easeOutQuart', animateScale: true, animateRotate: true },
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { family: 'Inter', size: 10, weight: 'bold' }, color: '#64748b' } },
                  tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10, cornerRadius: 8 }
                }
              }
            });

            // ── SOURCE MIX CHART (PIE) ──
            let sourceCtx = document.getElementById('sourceMixChart').getContext('2d');
            if (sourceMixObj) sourceMixObj.destroy();
            sourceMixObj = new Chart(sourceCtx, {
              type: 'pie',
              data: {
                labels: ['API Sync', 'Manual'],
                datasets: [{
                  data: [totalApi, totalMan],
                  backgroundColor: ['#8b5cf6', '#64748b'],
                  borderWidth: 0,
                  hoverOffset: 30
                }]
              },
              options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1200, easing: 'easeOutQuart', delay: 200, animateScale: true, animateRotate: true },
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { family: 'Inter', size: 10, weight: 'bold' }, color: '#64748b' } },
                  tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10, cornerRadius: 8 }
                }
              }
            });

            // ── CITY Leaderboard (HORIZONTAL BAR) ──
            let cityCtx = document.getElementById('cityVolumeChart').getContext('2d');
            if (cityVolumeObj) cityVolumeObj.destroy();
            cityVolumeObj = new Chart(cityCtx, {
              type: 'bar',
              data: {
                labels: cityLabels,
                datasets: [{
                  label: 'Volume',
                  data: cityValues,
                  backgroundColor: 'rgba(245, 158, 11, 0.7)',
                  borderRadius: 5,
                  barThickness: 15
                }]
              },
              options: {
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1500, easing: 'easeOutQuart', delay: 400 },
                scales: {
                  x: { display: false },
                  y: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' }, color: '#334155' } }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 10, cornerRadius: 8 }
                }
              }
            });
          }); // end requestAnimationFrame
        };

        window.captureAnalyticsScreenshot = function () {
          if (typeof html2canvas === 'undefined') {
            showToast("⚠️ Screenshot library not loaded. Please wait or refresh.");
            return;
          }
          let target = document.getElementById('analyticsFullPage');
          if (!target) return;
          showToast("📸 Preparing screenshot... Please wait.", 3000);

          html2canvas(target, {
            scale: 2,
            backgroundColor: "#f1f5f9",
            useCORS: true,
            logging: false,
            onclone: (clonedDoc) => {
              let clonedTarget = clonedDoc.getElementById('analyticsFullPage');
              if (clonedTarget) {
                clonedTarget.style.height = 'auto';
                clonedTarget.style.overflow = 'visible';
                clonedTarget.style.padding = '40px';
                clonedTarget.style.webkitFontSmoothing = 'antialiased';
                clonedTarget.style.mozOsxFontSmoothing = 'grayscale';
              }
            }
          }, {
            scale: 3,
            devicePixelRatio: 2,
            backgroundColor: "#f1f5f9",
            useCORS: true
          }).then(canvas => {
            let link = document.createElement('a');
            link.download = `Analytics_${new Date().toLocaleDateString()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast("✅ Screenshot saved!");
          });
        };

        window.captureCitySummaryScreenshot = function () {
          if (typeof html2canvas === 'undefined') {
            showToast("⚠️ Screenshot library not loaded.");
            return;
          }
          let target = document.getElementById('cityFullPageContent');
          if (!target) return;
          showToast("📸 Capturing City Summary...", 3000);

          html2canvas(target, {
            scale: 3,
            devicePixelRatio: 2,
            backgroundColor: "#f1f5f9",
            useCORS: true,
            logging: false,
            onclone: (clonedDoc) => {
              let clonedTarget = clonedDoc.getElementById('cityFullPageContent');
              if (clonedTarget) {
                clonedTarget.style.height = 'auto';
                clonedTarget.style.overflow = 'visible';
                clonedTarget.style.padding = '30px';
                clonedTarget.style.webkitFontSmoothing = 'antialiased';
                clonedTarget.style.mozOsxFontSmoothing = 'grayscale';
              }
            }
          }).then(canvas => {
            let link = document.createElement('a');
            link.download = `City_Summary_${new Date().toLocaleDateString()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast("✅ Screenshot saved!");
          });
        };

        let citySamplesChartObj = null, apiManualChartObj = null, totalSharedChartObj = null;

        function renderCitySummaryCharts(labels, ppmcData, retailData, api, manual, shared, pending) {
          // 1. City Samples Stacked Bar Chart
          let ctx1 = document.getElementById('citySamplesChart').getContext('2d');
          if (citySamplesChartObj) citySamplesChartObj.destroy();
          citySamplesChartObj = new Chart(ctx1, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'PPMC',
                  data: ppmcData,
                  backgroundColor: '#8b5cf6', // Purple for PPMC
                  borderRadius: 4
                },
                {
                  label: 'Retail',
                  data: retailData,
                  backgroundColor: '#fbbf24', // Gold for Retail
                  borderRadius: 4
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { top: 20 } },
              plugins: {
                legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: '900' } } },
                tooltip: { mode: 'index', intersect: false }
              },
              scales: {
                y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { weight: 'bold' } } },
                x: { stacked: true, grid: { display: false }, ticks: { font: { weight: 'bold', size: 11 } } }
              },
              animation: {
                onComplete: function () {
                  let chartInstance = this, ctx = chartInstance.ctx;
                  ctx.font = 'bold 12px Inter, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';

                  this.data.datasets.forEach(function (dataset, i) {
                    let meta = chartInstance.getDatasetMeta(i);
                    meta.data.forEach(function (bar, index) {
                      let data = dataset.data[index];
                      if (data > 0) {
                        // Draw white pill background for clarity
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.beginPath();
                        ctx.roundRect(bar.x - 12, bar.y + 5, 24, 16, 4);
                        ctx.fill();
                        // Draw dark text
                        ctx.fillStyle = '#1e293b';
                        ctx.fillText(data, bar.x, bar.y + 13);
                      }
                    });
                  });
                }
              }
            }
          });

          // Calculate Percentages
          let totalSource = api + manual;
          let apiPct = totalSource > 0 ? ((api / totalSource) * 100).toFixed(1) : 0;
          let manualPct = totalSource > 0 ? ((manual / totalSource) * 100).toFixed(1) : 0;

          let totalDelivery = shared + pending;
          let sharedPct = totalDelivery > 0 ? ((shared / totalDelivery) * 100).toFixed(1) : 0;
          let pendingPct = totalDelivery > 0 ? ((pending / totalDelivery) * 100).toFixed(1) : 0;

          // 2. API vs Manual Doughnut (Better than Pie)
          let ctx2 = document.getElementById('apiManualChart').getContext('2d');
          if (apiManualChartObj) apiManualChartObj.destroy();
          apiManualChartObj = new Chart(ctx2, {
            type: 'doughnut',
            data: {
              labels: [`API: ${api} (${apiPct}%)`, `Manual: ${manual} (${manualPct}%)`],
              datasets: [{
                data: [api, manual],
                backgroundColor: ['#8b5cf6', '#cbd5e1'],
                borderWidth: 0,
                hoverOffset: 15,
                weight: 2
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '60%',
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11, weight: '900' }, color: '#1e293b' } },
                tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', padding: 12, cornerRadius: 8 }
              }
            },
            plugins: [{
              beforeDraw: (chart) => {
                const { ctx } = chart;
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 6;
                ctx.shadowOffsetY = 6;
              },
              afterDraw: (chart) => {
                chart.ctx.restore();
              }
            }]
          });

          // 3. Total vs Shared Doughnut
          let ctx3 = document.getElementById('totalSharedChart').getContext('2d');
          if (totalSharedChartObj) totalSharedChartObj.destroy();
          totalSharedChartObj = new Chart(ctx3, {
            type: 'doughnut',
            data: {
              labels: [`Shared: ${shared} (${sharedPct}%)`, `Pending: ${pending} (${pendingPct}%)`],
              datasets: [{
                data: [shared, pending],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 15,
                borderRadius: 10
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '60%',
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11, weight: '900' }, color: '#1e293b' } },
                tooltip: { backgroundColor: 'rgba(30, 41, 59, 0.95)', padding: 12, cornerRadius: 8 }
              }
            },
            plugins: [{
              beforeDraw: (chart) => {
                const { ctx } = chart;
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 6;
                ctx.shadowOffsetY = 6;
              },
              afterDraw: (chart) => {
                chart.ctx.restore();
              }
            }]
          });
        }

        window.analyzeTrendWithAI = function () {
          if (!rawTrendStats) { showToast("No trend data loaded to analyze."); return; }

          const aiBox = document.getElementById('audit-ai-box');
          const aiText = document.getElementById('audit-ai-text');
          if (!aiBox || !aiText) return;

          aiBox.style.display = 'block';
          aiText.innerHTML = '<span class="spin">⏳</span> Bisht Ji is crunching numbers... Analyzing trends and identifying patterns.';
          aiBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

          let selectedCities = getAnalyticsSelectedCities();
          let startDate = document.getElementById('trend-date-start').value;
          let endDate = document.getElementById('trend-date-end').value;

          // Prepare context-specific data for AI
          let summaryData = {
            period: `${startDate} to ${endDate}`,
            cities: selectedCities,
            totals: {
              total: document.getElementById('stat-total').innerText,
              avg: document.getElementById('stat-avg').innerText,
              ppmc: document.getElementById('stat-ppmc').innerText,
              retail: document.getElementById('stat-retail').innerText,
              api: document.getElementById('stat-api').innerText,
              manual: document.getElementById('stat-manual').innerText
            }
          };

          const prompt = `As Bisht Ji, Operations Analyst, analyze this collection trend report. 
            Selected Cities: ${JSON.stringify(selectedCities)}. 
            Period: ${summaryData.period}. 
            Current Stats: ${JSON.stringify(summaryData.totals)}. 
            Give me 3-4 professional operational insights in ENGLISH. Focus on PPMC vs Retail balance, revenue potential, and API adoption. Use bullet points. Be concise but professional.`;

          google.script.run.withSuccessHandler(res => {
            aiText.innerHTML = res;
          }).withFailureHandler(err => {
            console.error("AI Analysis failed:", err);
            aiText.innerHTML = "❌ AI analysis failed. Please try again later.";
          }).askBishtJiSimple(prompt);
        };

        const originalHideLoader = hideLoader;
        hideLoader = function () {
          originalHideLoader();
          if (!rawTrendStats) fetchTrendStats();

          if (window.gsap) {
            gsap.from(".toolbar, .filter-row .search-wrapper, .filter-row .btn-apple, .segmented-control", {
              opacity: 0,
              x: -15,
              duration: 0.8,
              stagger: 0.05,
              ease: "power3.out",
              delay: 0.1,
              clearProps: "all"
            });
          }
        };

        // ========================================================
        // 🎨 THEME ENGINE LOGIC (Aggressive Global Rewrite)
        // ========================================================

        window.setUiTheme = function (themeClass, silent) {
          // ✅ AGGRESSIVE: Surgically remove ONLY color theme classes, preserve everything else
          const ALL_COLOR_THEMES = ['theme-ocean', 'theme-emerald', 'theme-sunset', 'theme-aurora', 'theme-green', 'theme-red', 'theme-orange'];
          ALL_COLOR_THEMES.forEach(t => document.body.classList.remove(t));

          // Add new color theme
          document.body.classList.add(themeClass);

          // ✅ Preserve dark-mode (was being nuked before by className = '')
          if (localStorage.getItem('hg_darkMode') === 'true') {
            if (!document.body.classList.contains('dark-mode')) document.body.classList.add('dark-mode');
          }

          // ✅ Preserve UI style class (glassmorphism, skeuomorphism etc.)
          const savedStyle = localStorage.getItem('hyperGlassThemeStyle');
          if (savedStyle && !document.body.classList.contains('style-' + savedStyle)) {
            document.body.classList.add('style-' + savedStyle);
          }

          // ✅ Update --primary CSS variable + persist it
          const root = document.documentElement;
          const themeColorMap = {
            'theme-aurora': '#8b5cf6',
            'theme-sunset': '#ea580c',
            'theme-emerald': '#059669',
            'theme-ocean': '#0284c7',
            'theme-green': '#059669',
            'theme-orange': '#d97706',
            'theme-red': '#dc2626'
          };
          const newPrimary = themeColorMap[themeClass] || '#4f46e5';
          root.style.setProperty('--primary', newPrimary);
          localStorage.setItem('hg_primary', newPrimary);

          // ✅ Persist theme choice so refresh remembers it
          // Mark auto-themes explicitly so updateThemeBackground knows they're manually chosen
          localStorage.setItem('saved_premium_theme', themeClass);
          // If user explicitly picks green/orange/red from dropdown, lock it for 10 min
          // by tagging it so updateThemeBackground won't auto-switch away from it
          if (['theme-green', 'theme-orange', 'theme-red'].includes(themeClass)) {
            localStorage.setItem('hg_theme_locked_until', Date.now() + 600000);
          } else {
            localStorage.removeItem('hg_theme_locked_until');
          }

          // ── Save to Firebase (cross-device sync) ──
          if (!silent && window.currentUser && typeof window.saveUserPreferences === 'function') {
            window.saveUserPreferences({
              themeClass: themeClass,
              primaryColor: newPrimary,
              darkMode: document.body.classList.contains('dark-mode'),
              themeStyle: localStorage.getItem('hyperGlassThemeStyle') || 'glassmorphism',
              cursorPreset: localStorage.getItem('hg_cursorPreset') || 'liquid-drop'
            });
          }

          // Close dropdown
          const dropdown = document.getElementById('theme-dropdown');
          if (dropdown) dropdown.classList.remove('show');

          if (!silent && typeof showToast === 'function') showToast('🎨 Theme saved & applied!');
        };

        window.setThemeStyle = function (styleName, element) {
          // Remove existing style classes
          document.body.className = document.body.className.replace(/\bstyle-[a-z0-9-]+\b/g, '');
          document.body.classList.add('style-' + styleName);

          // Update active state in UI
          document.querySelectorAll('.theme-preset-card').forEach(c => c.classList.remove('active-theme'));
          if (element) element.classList.add('active-theme');

          // Save to localStorage
          localStorage.setItem('hyperGlassThemeStyle', styleName);
          if (window.saveUserPreferences) window.saveUserPreferences(); // ⚡ FIREBASE SAVE
        };

        window.applyCustomTheme = function () {
          const primary = document.getElementById('tc-color-primary').value;
          const danger = document.getElementById('tc-color-danger').value;
          const bgUrl = document.getElementById('tc-bg-url').value;

          if (primary) {
            document.documentElement.style.setProperty('--primary', primary);
            localStorage.setItem('hg_primary', primary);
          }
          if (danger) {
            document.documentElement.style.setProperty('--danger', danger);
            localStorage.setItem('hg_danger', danger);
          }
          if (bgUrl) {
            document.body.style.backgroundImage = `url('${bgUrl}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.animation = 'none'; // Stop mesh liquid if custom bg
            document.body.classList.remove('theme-green', 'theme-orange', 'theme-red');
            localStorage.setItem('hg_bgUrl', bgUrl);
          }

          if (window.saveUserPreferences) window.saveUserPreferences(); // ⚡ FIREBASE SAVE
          closeModal('themeCenterModal');
          if (typeof showToast === 'function') showToast("🎨 Custom Engine Applied & Saved!");
        };

        window.toggleTheme = function () {
          // Dark mode toggle intercept override
          const isDark = document.body.classList.toggle('dark-mode');
          localStorage.setItem('hg_darkMode', isDark);
          // ✅ FIX: dark-light-btn is the moon/sun toggle; theme-btn is the ⚙️ settings
          var dlBtn = document.getElementById('dark-light-btn');
          if (dlBtn) dlBtn.innerHTML = isDark ? '☀️' : '🌙';
          // Persist dark mode to Firebase
          if (window.currentUser && typeof window.saveUserPreferences === 'function') {
            window.saveUserPreferences({
              darkMode: isDark,
              themeClass: localStorage.getItem('saved_premium_theme') || 'theme-green',
              themeStyle: localStorage.getItem('hyperGlassThemeStyle') || 'glassmorphism',
              primaryColor: localStorage.getItem('hg_primary') || '#4f46e5',
              cursorPreset: localStorage.getItem('hg_cursorPreset') || 'liquid-drop'
            });
          }
        };

        // ── ☁️ FIREBASE USER PREFERENCES ENGINE ─────────────────────
        // Email → safe Firebase key (Firebase keys cannot contain '.')
        function _emailToKey(email) {
          return email ? email.replace(/\./g, ',').replace(/@/g, '_at_') : 'anon';
        }

        window.saveUserPreferences = function (prefs) {
          if (!window.firebaseDB || !window.currentUser || !window.currentUser.email) return;
          try {
            var key = _emailToKey(window.currentUser.email);
            var prefRef = window.firebaseRef(window.firebaseDB, 'user_prefs/' + key);
            window.firebaseSet(prefRef, Object.assign({}, prefs, { updatedAt: Date.now() }));
          } catch (e) { console.warn('[Prefs] Save failed:', e); }
        };

        window.loadUserPreferences = function () {
          if (!window.firebaseDB || !window.currentUser || !window.currentUser.email) return;
          try {
            var key = _emailToKey(window.currentUser.email);
            var prefRef = window.firebaseRef(window.firebaseDB, 'user_prefs/' + key);
            // onlyOnce: true → reads once, no persistent listener overhead
            window.firebaseOnValue(prefRef, function (snapshot) {
              var prefs = snapshot.val();
              if (!prefs) return;

              // 1. Dark mode
              if (prefs.darkMode === true) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('hg_darkMode', 'true');
                var dlBtn = document.getElementById('dark-light-btn');
                if (dlBtn) dlBtn.innerHTML = '☀️';
              } else if (prefs.darkMode === false) {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('hg_darkMode', 'false');
                var dlBtn2 = document.getElementById('dark-light-btn');
                if (dlBtn2) dlBtn2.innerHTML = '🌙';
              }

              // 2. Color theme (silent=true so no toast on load)
              if (prefs.themeClass && typeof window.setUiTheme === 'function') {
                window.setUiTheme(prefs.themeClass, true);
              }

              // 3. UI style preset (glassmorphism, etc.)
              if (prefs.themeStyle) {
                document.body.className = document.body.className.replace(/\bstyle-[a-z0-9-]+\b/g, '');
                document.body.classList.add('style-' + prefs.themeStyle);
                localStorage.setItem('hyperGlassThemeStyle', prefs.themeStyle);
              }

              // 4. Custom primary color
              if (prefs.primaryColor) {
                document.documentElement.style.setProperty('--primary', prefs.primaryColor);
                localStorage.setItem('hg_primary', prefs.primaryColor);
              }

              // 5. Cursor preset (inject after GSAP IIFE)
              if (prefs.cursorPreset && prefs.cursorPreset !== 'liquid-drop') {
                setTimeout(function () {
                  if (typeof window.setCursorPreset === 'function') {
                    var btn = document.getElementById('cursor-btn-' + prefs.cursorPreset);
                    window.setCursorPreset(prefs.cursorPreset, btn);
                  }
                }, 400);
              }
            }, { onlyOnce: true });
          } catch (e) { console.warn('[Prefs] Load failed:', e); }
        };

        // ── CURSOR PRESET ENGINE ─────────────────────────────────────
        window.setCursorPreset = function (preset, btnEl) {
          const cursor = document.getElementById('custom-cursor');
          if (!cursor) return;

          // Strip all preset classes
          cursor.classList.remove('preset-minimal-ring', 'preset-neon-dot');

          // Apply new preset (liquid-drop is the default, no extra class needed)
          if (preset === 'minimal-ring') cursor.classList.add('preset-minimal-ring');
          if (preset === 'neon-dot') cursor.classList.add('preset-neon-dot');

          // Update active button state in Theme Center
          document.querySelectorAll('.tc-cursor-btn').forEach(b => {
            b.style.borderColor = 'var(--border-light)';
            b.style.background = 'var(--card-bg)';
            b.style.color = 'var(--text-main)';
          });
          if (btnEl) {
            btnEl.style.borderColor = 'var(--primary)';
            btnEl.style.background = 'var(--primary-glow)';
            btnEl.style.color = 'var(--primary)';
          }

          localStorage.setItem('hg_cursorPreset', preset);
        };

        // Restore persistent logic on load
        document.addEventListener('DOMContentLoaded', () => {
          // ✅ FIX: Restore color theme class FIRST on every refresh
          const ALL_COLOR_THEMES = ['theme-ocean', 'theme-emerald', 'theme-sunset', 'theme-aurora', 'theme-green', 'theme-red', 'theme-orange'];
          const savedColorTheme = localStorage.getItem('saved_premium_theme');
          if (savedColorTheme && ALL_COLOR_THEMES.indexOf(savedColorTheme) !== -1) {
            ALL_COLOR_THEMES.forEach(t => document.body.classList.remove(t));
            document.body.classList.add(savedColorTheme);
            // Restore matching --primary variable
            const themeColorMap = { 'theme-aurora': '#8b5cf6', 'theme-sunset': '#ea580c', 'theme-emerald': '#059669', 'theme-ocean': '#0284c7', 'theme-green': '#059669', 'theme-orange': '#d97706', 'theme-red': '#dc2626' };
            if (themeColorMap[savedColorTheme]) document.documentElement.style.setProperty('--primary', themeColorMap[savedColorTheme]);
          }

          const savedStyle = localStorage.getItem('hyperGlassThemeStyle');
          if (savedStyle) {
            document.body.classList.add('style-' + savedStyle);
            const cards = document.querySelectorAll('.theme-preset-card');
            cards.forEach(c => {
              if (c.getAttribute('onclick') && c.getAttribute('onclick').includes(savedStyle)) {
                c.classList.add('active-theme');
              } else {
                c.classList.remove('active-theme');
              }
            });
          } else {
            document.body.classList.add('style-glassmorphism');
          }

          if (localStorage.getItem('hg_darkMode') === 'true') {
            document.body.classList.add('dark-mode');
          }

          const savedBg = localStorage.getItem('hg_bgUrl');
          if (savedBg) {
            document.body.style.backgroundImage = `url('${savedBg}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.animation = 'none';
            document.body.classList.remove('theme-green', 'theme-orange', 'theme-red');
          }
          if (localStorage.getItem('hg_primary')) document.documentElement.style.setProperty('--primary', localStorage.getItem('hg_primary'));
          if (localStorage.getItem('hg_danger')) document.documentElement.style.setProperty('--danger', localStorage.getItem('hg_danger'));

          // ── Restore Cursor Preset ──
          const savedCursor = localStorage.getItem('hg_cursorPreset');
          if (savedCursor && savedCursor !== 'liquid-drop') {
            // Cursor DOM is injected by GSAP IIFE; wait for it
            setTimeout(() => {
              const activeCursorBtn = document.getElementById('cursor-btn-' + savedCursor);
              setCursorPreset(savedCursor, activeCursorBtn);
            }, 200);
          }

          // ── Sync Theme Center: mark active cursor preset button ──
          const activeCursorPreset = localStorage.getItem('hg_cursorPreset') || 'liquid-drop';
          const activeCursorBtn = document.getElementById('cursor-btn-' + activeCursorPreset);
          if (activeCursorBtn) {
            activeCursorBtn.style.borderColor = 'var(--primary)';
            activeCursorBtn.style.background = 'var(--primary-glow)';
            activeCursorBtn.style.color = 'var(--primary)';
          }
        });

        // ========================================================
        // 🚀 HYPER-GLASS 2.0 PREMIUM MOTION ENGINE (Phase 2 & 3)
        // All layers: pointer-events:none — zero click interference
        // ========================================================
        (function initHyperGlassMotion() {
          return; // Animations disabled for performance
          if (typeof window.gsap === 'undefined') return;

          // ── 0. Inject Custom Cursor DOM Payload ─────────────────
          let customCursor = document.getElementById('custom-cursor');
          if (!customCursor) {
            customCursor = document.createElement('div');
            customCursor.id = 'custom-cursor';
            document.body.appendChild(customCursor);
          }

          // High-performance GSAP quickSetter for cursor
          const xTo = gsap.quickTo(customCursor, "x", { duration: 0.15, ease: "power3" });
          const yTo = gsap.quickTo(customCursor, "y", { duration: 0.15, ease: "power3" });

          window.addEventListener("mousemove", e => {
            xTo(e.clientX);
            yTo(e.clientY);
          });

          // Hide when cursor leaves window
          document.addEventListener('mouseout', e => {
            if (!e.relatedTarget && !e.toElement) customCursor.classList.add('hidden');
          });
          document.addEventListener('mouseenter', () => customCursor.classList.remove('hidden'));

          // Cursor hover interactions (event delegation)
          document.addEventListener('mouseover', e => {
            const isInteractable = e.target.closest('a, button, input, select, textarea, .glass-card, .theme-preset-card, .file-drop-area');
            if (isInteractable) {
              customCursor.classList.add('hovering');
            }
          });
          document.addEventListener('mouseout', e => {
            const isInteractable = e.target.closest('a, button, input, select, textarea, .glass-card, .theme-preset-card, .file-drop-area');
            if (isInteractable) {
              customCursor.classList.remove('hovering');
            }
          });

          // ── 🚀 STAGGERED PREMIUM CARD ENTRANCE (GSAP) ───────────
          function runEntranceAnimation() {
            const kpiCards = document.querySelectorAll('.kpi-grid .glass-card');
            if (kpiCards.length > 0 && window.gsap) {
              gsap.fromTo(kpiCards,
                { y: 30, opacity: 0 }, // Animation yahan se shuru hogi
                {
                  y: 0,
                  opacity: 1,
                  duration: 0.8,
                  stagger: 0.1,
                  ease: "power4.out",
                  clearProps: "all" // Khatam hone par CSS normal ho jayegi
                }
              );
            }

            // Animate Toolbar and Table Container as well for premium feel
            if (window.gsap) {
              gsap.fromTo(".toolbar, .table-container",
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, delay: 0.4, ease: "power3.out", stagger: 0.2 }
              );
            }

            // ── CHART WRAPPER: Hard-guarantee visibility before Chart.js measures canvas ──
            const chartWrapper = document.getElementById('miniTrendChart');
            if (chartWrapper && window.gsap) {
              const wrapper = chartWrapper.closest('div[style*="min-height"]') || chartWrapper.parentElement;
              if (wrapper) {
                gsap.set(wrapper, { opacity: 1, visibility: 'visible', clearProps: "opacity,visibility" });
              }
            }
          }

          // ── 2. 3D CARD TILT + DEEP SPECULAR (RAF-throttled) ─────
          // Using RAF for cursor tracking to guarantee 60fps, no jank
          function attachCardTilt(card) {
            if (card._hyper_tilt_attached) return;
            card._hyper_tilt_attached = true;
            card.style.transformStyle = "preserve-3d";

            let cardRaf = null;
            let cx = 0, cy = 0;

            card.addEventListener('mousemove', (e) => {
              const rect = card.getBoundingClientRect();
              cx = e.clientX - rect.left;
              cy = e.clientY - rect.top;

              if (!cardRaf) {
                cardRaf = requestAnimationFrame(() => {
                  // CSS var for specular highlight — no reflow cost
                  card.style.setProperty('--mouse-x', cx + 'px');
                  card.style.setProperty('--mouse-y', cy + 'px');
                  cardRaf = null;
                });
              }

              // GSAP tilt — clamped to ±10 degrees for subtlety
              const rect2 = card.getBoundingClientRect();
              const rotX = -((cy / rect2.height) - 0.5) * 10;
              const rotY = ((cx / rect2.width) - 0.5) * 10;
              gsap.to(card, {
                rotationX: rotX,
                rotationY: rotY,
                transformPerspective: 900,
                scale: 1.025,
                duration: 0.35,
                ease: "power2.out",
                overwrite: "auto"
              });
            });

            card.addEventListener('mouseleave', () => {
              gsap.to(card, {
                rotationX: 0,
                rotationY: 0,
                scale: 1,
                duration: 0.9,
                ease: "elastic.out(1, 0.45)",
                overwrite: "auto"
              });
              // Fade specular back
              card.style.setProperty('--mouse-x', '50%');
              card.style.setProperty('--mouse-y', '50%');
            });
          }

          // ── 3. PROXIMITY-BASED MAGNETIC BUTTONS ─────────────────
          // Pull strength scales with cursor distance from center
          function attachMagneticButton(btn) {
            if (btn._hyper_mag_attached) return;
            btn._hyper_mag_attached = true;

            btn.addEventListener('mousemove', (e) => {
              const rect = btn.getBoundingClientRect();
              const cx = e.clientX - (rect.left + rect.width / 2);
              const cy = e.clientY - (rect.top + rect.height / 2);
              // Scale pull by proximity (max 12px displacement)
              const strength = 0.38;
              gsap.to(btn, {
                x: cx * strength,
                y: cy * strength,
                duration: 0.3,
                ease: "power2.out",
                overwrite: "auto"
              });
            });

            btn.addEventListener('mouseleave', () => {
              gsap.to(btn, {
                x: 0, y: 0,
                duration: 0.75,
                ease: "elastic.out(1.1, 0.4)",
                overwrite: "auto"
              });
            });
          }

          // ── 4. GLOBAL CURSOR SHEEN (RAF-throttled) ──────────────
          const sheen = document.getElementById('global-sheen');
          if (sheen) {
            let sheenRaf = null;
            let mx = window.innerWidth / 2;
            let my = window.innerHeight / 2;
            window.addEventListener('mousemove', (e) => {
              mx = e.clientX;
              my = e.clientY;
              if (!sheenRaf) {
                sheenRaf = requestAnimationFrame(() => {
                  sheen.style.setProperty('--mouse-x', mx + 'px');
                  sheen.style.setProperty('--mouse-y', my + 'px');
                  sheenRaf = null;
                });
              }
            });
          }

          // ── 5. INIT ALL STATIC ELEMENTS ─────────────────────────
          function initAllElements() {
            document.querySelectorAll('.glass-card').forEach(attachCardTilt);
            document.querySelectorAll('.btn-apple, .seg-btn, .btn-modern-primary, .login-btn-google').forEach(attachMagneticButton);
          }

          document.addEventListener('DOMContentLoaded', () => {
            initAllElements();
            // Slight delay so data-rendered KPI cards are in DOM
            setTimeout(runEntranceAnimation, 120);
          });
          // Also run now in case DOM already loaded (script deferred or inline)
          if (document.readyState !== 'loading') {
            initAllElements();
            setTimeout(runEntranceAnimation, 120);
          }

          // ── 6. INTERSECTION OBSERVER for table rows ──────────────
          const rowObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting && !entry.target._gsap_in) {
                entry.target._gsap_in = true;
                gsap.fromTo(entry.target,
                  { y: 16, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.42, ease: "power2.out", overwrite: "auto" }
                );
              }
            });
          }, { threshold: 0.08 });

          // ── 7. MUTATION OBSERVER for dynamic rows + badges ───────
          const mutConfig = { childList: true, subtree: true };
          const mutCallback = (mutationList) => {
            for (const mutation of mutationList) {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                  if (node.nodeType !== 1) return;
                  // New table rows — stagger entrance
                  if (node.classList && node.classList.contains('compact-row')) {
                    node.style.opacity = "0";
                    rowObserver.observe(node);
                  }
                  // New glass cards in dynamic content
                  if (node.classList && node.classList.contains('glass-card')) {
                    attachCardTilt(node);
                  }
                  // Dynamic btn-apple buttons
                  if (node.classList && node.classList.contains('btn-apple')) {
                    attachMagneticButton(node);
                  }
                  // Data pulse on status badge flash
                  if (node.classList && node.classList.contains('instant-action-badge')) {
                    const row = node.closest('tr');
                    if (row) {
                      row.classList.remove('pulse-up');
                      void row.offsetWidth;
                      row.classList.add('pulse-up');
                    }
                  }
                });
              }
            }
          };
          new MutationObserver(mutCallback).observe(document.body, mutConfig);

        })(); // End initHyperGlassMotion IIFE
      </script>

</body>

