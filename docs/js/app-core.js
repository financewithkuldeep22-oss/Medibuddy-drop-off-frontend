      
        const $ = (id) => document.getElementById(id) || document.createElement('div');
        function toggleTheme() { document.body.classList.toggle('dark-mode'); $('dark-light-btn').innerText = document.body.classList.contains('dark-mode') ? '☀️' : '🌙'; updateThemeBackground(); }
        function showToast(msg) { const t = $('toast'); t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }
        function copyTxt(txt) { if (!txt || txt === '-') return; const t = document.createElement("textarea"); t.value = txt; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.focus(); t.select(); try { document.execCommand('copy'); showToast('Copied!'); } catch (e) { } document.body.removeChild(t); }
        function closeModal(id) { $(id).classList.remove('active'); }
        function openModal(id) {
          $(id).classList.add('active');
          if (id === 'cityModal') $('modal-time').innerText = new Date().toLocaleString();
          if (id === 'waModal') renderWaModal();
          if (id === 'uploadCsvModal') {
            const select = $('import-city-select');
            if (select) {
              select.innerHTML = '<option value="">-- Choose City --</option>' + (globalData.cities || []).map(c => `<option value="${c}">${c}</option>`).join('');
              select.value = '';
              $('import-upload-area').style.display = 'none';
              $('csv-file').value = '';
              $('csv-file-name').innerText = '';
            }
          }
        }

        function toggleUploadArea() { $('import-upload-area').style.display = $('import-city-select').value !== "" ? 'block' : 'none'; }
        function openFullPage(id) { $(id).classList.add('active'); if (id === 'auditFullPage') { if (!$('audit-date-start').value) { const t = new Date().toISOString().slice(0, 10); $('audit-date-start').value = t; $('audit-date-end').value = t; } fetchAuditData(); } }
        function closeFullPage(id) { $(id).classList.remove('active'); }

        // =========================================================
        // 🛡️ ADMIN PANEL ENGINE — FULL RBAC V2 (Cities + Sub-Admin)
        // =========================================================

        // Map: perm key → selector(s) of the button/element to show/hide
        var PERM_SELECTOR_MAP = {
          can_import_data: ['[onclick*="uploadCsvModal"]'],
          can_drop_pdfs: ['[onclick*="dropzoneModal"]'],
          can_create_emails: ['[onclick*="openEmailGenerator"]'],
          can_do_api_match: ['[onclick*="handleApiButtonClick"]'],
          can_extract_wa_export: ['[onclick*="waModal"]'],
          can_upload_trfs: ['[onclick*="bulkTrfModal"]'],
          can_check_daily_audit: ['[onclick*="auditFullPage"]'],
          can_check_collection_trend: ['[onclick*="analyticsFullPage"]', '[onclick*="renderFullChart"]']
        };

        var _adminCachedCities = null; // Cache cities once fetched

        window.openAdminPanel = function () {
          openFullPage('adminPanelPage');
          adminLoadUsers();
          adminLoadCities();
        };

        // ── Load cities from backend into checkbox grid ──
        window.adminLoadCities = function () {
          var grid = document.getElementById('admin-cities-grid');
          if (!grid) return;
          if (_adminCachedCities) { renderCityCheckboxes(_adminCachedCities); return; }
          grid.innerHTML = '<div style="text-align:center;color:var(--text-sub);font-size:11px;grid-column:span 3;">⏳ Loading cities...</div>';
          google.script.run
            .withSuccessHandler(function (cities) {
              _adminCachedCities = cities;
              renderCityCheckboxes(cities);
            })
            .withFailureHandler(function (err) {
              grid.innerHTML = '<div style="text-align:center;color:#ef4444;font-size:11px;grid-column:span 3;">❌ ' + err.message + '</div>';
            })
            .getAvailableCities();
        };

        function renderCityCheckboxes(cities) {
          var grid = document.getElementById('admin-cities-grid');
          if (!grid || !cities) return;
          grid.innerHTML = cities.map(function (c) {
            return '<label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;cursor:pointer;padding:4px 6px;background:rgba(99,102,241,0.08);border-radius:6px;border:1px solid rgba(99,102,241,0.15);"><input type="checkbox" value="' + c + '" class="admin-city-cb"> 📍 ' + c + '</label>';
          }).join('');
        }

        // ── Sub-Admin checkbox toggle —— check all + disable others ──
        window.adminSubAdminToggle = function (el) {
          var allCbs = document.querySelectorAll('.admin-perm-cb');
          var allCityCbs = document.querySelectorAll('.admin-city-cb');
          if (el.checked) {
            allCbs.forEach(function (cb) { cb.checked = true; if (cb.value !== 'sub_admin_access') cb.disabled = true; });
            allCityCbs.forEach(function (cb) { cb.checked = true; cb.disabled = true; });
          } else {
            allCbs.forEach(function (cb) { cb.disabled = false; });
            allCityCbs.forEach(function (cb) { cb.disabled = false; });
          }
        };

        // ── Role changed → show/hide checkbox panels ──
        window.adminRoleChanged = function () {
          var role = document.getElementById('admin-user-role').value;
          var isFullAccess = (role === 'Admin' || role === 'Sub-Admin');
          document.getElementById('admin-perms-box').style.display = (role === 'Admin') ? 'none' : 'block';
          document.getElementById('admin-cities-box').style.display = (role === 'Admin') ? 'none' : 'block';

          if (role === 'Sub-Admin') {
            // Auto-check sub_admin_access
            var subCb = document.querySelector('.admin-perm-cb[value="sub_admin_access"]');
            if (subCb) { subCb.checked = true; adminSubAdminToggle(subCb); }
          } else if (role === 'User') {
            // Re-enable all checkboxes
            document.querySelectorAll('.admin-perm-cb').forEach(function (cb) { cb.disabled = false; });
            document.querySelectorAll('.admin-city-cb').forEach(function (cb) { cb.disabled = false; });
          }
        };

        // ── Clear form ──
        window.adminClearForm = function () {
          document.getElementById('admin-user-email').value = '';
          document.getElementById('admin-user-role').value = 'User';
          document.querySelectorAll('.admin-perm-cb').forEach(function (cb) { cb.checked = false; cb.disabled = false; });
          document.querySelectorAll('.admin-city-cb').forEach(function (cb) { cb.checked = false; cb.disabled = false; });
          document.getElementById('admin-perms-box').style.display = 'block';
          document.getElementById('admin-cities-box').style.display = 'block';
          var msg = document.getElementById('admin-save-msg');
          if (msg) msg.style.display = 'none';
        };

        // ── Populate form when clicking a row ──
        window.adminEditRow = function (email, role, perms, cities) {
          document.getElementById('admin-user-email').value = email;
          // Map sub_admin_access to Sub-Admin role
          var effectiveRole = role;
          if (role !== 'Admin' && perms && perms.indexOf('sub_admin_access') > -1) effectiveRole = 'Sub-Admin';
          document.getElementById('admin-user-role').value = effectiveRole;
          adminRoleChanged();

          // Check perms
          document.querySelectorAll('.admin-perm-cb').forEach(function (cb) {
            cb.checked = (effectiveRole === 'Admin') || (perms && (perms.indexOf('all') > -1 || perms.indexOf(cb.value) > -1));
          });
          // Check cities
          document.querySelectorAll('.admin-city-cb').forEach(function (cb) {
            cb.checked = (effectiveRole === 'Admin') || (cities && (cities.indexOf('all') > -1 || cities.indexOf(cb.value) > -1));
          });
        };

        // ── Load all users from backend ──
        window.adminLoadUsers = function () {
          var tbody = document.getElementById('admin-users-tbody');
          var countEl = document.getElementById('admin-user-count');
          if (!tbody) return;
          tbody.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:var(--text-sub);">⏳ Fetching users...</td></tr>';

          google.script.run
            .withSuccessHandler(function (usersObj) {
              var emails = Object.keys(usersObj);
              if (countEl) countEl.innerText = emails.length + ' users';
              if (emails.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:var(--text-sub);">No users registered yet.</td></tr>';
                return;
              }

              var PERM_LABELS = {
                can_import_data: 'Import', can_drop_pdfs: 'PDFs', can_create_emails: 'Emails',
                can_do_api_match: 'API Match', can_extract_wa_export: 'WA Export', can_upload_trfs: 'TRFs',
                can_check_daily_audit: 'Audit', can_check_collection_trend: 'Trends', sub_admin_access: 'Sub-Admin'
              };

              tbody.innerHTML = emails.map(function (email) {
                var u = usersObj[email];
                var isAdmin = u.role === 'Admin';
                var hasSub = u.perms && u.perms.indexOf('sub_admin_access') > -1;

                var roleTag = isAdmin
                  ? '<span style="background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px;">Admin</span>'
                  : hasSub
                    ? '<span style="background:#ede9fe;color:#6366f1;padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px;">Sub-Admin</span>'
                    : '<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:12px;font-weight:700;font-size:11px;">User</span>';

                var permsHtml = (isAdmin || (u.perms && u.perms.indexOf('all') > -1))
                  ? '<span style="color:#059669;font-weight:700;font-size:11px;">✅ Full Access</span>'
                  : (u.perms && u.perms.length > 0
                    ? u.perms.map(function (p) {
                      return '<span style="background:#f0fdf4;color:#166534;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;margin:1px;display:inline-block;">' + (PERM_LABELS[p] || p) + '</span>';
                    }).join('')
                    : '<span style="color:#ef4444;font-size:11px;font-weight:600;">❌ None</span>');

                var citiesHtml = (isAdmin || (u.cities && u.cities.indexOf('all') > -1))
                  ? '<span style="color:#6366f1;font-weight:700;font-size:11px;">🌍 All Cities</span>'
                  : (u.cities && u.cities.length > 0
                    ? u.cities.map(function (c) {
                      return '<span style="background:rgba(99,102,241,0.1);color:#4f46e5;padding:1px 6px;border-radius:6px;font-size:10px;font-weight:700;margin:1px;display:inline-block;">📍' + c + '</span>';
                    }).join('')
                    : '<span style="color:#ef4444;font-size:11px;font-weight:600;">❌ None</span>');

                var editBtn = email === 'kuldeep.bisht@redcliffelabs.com'
                  ? '<span style="font-size:10px;color:#94a3b8;">Super Admin</span>'
                  : '<button class="btn-apple" onclick=\'adminEditRow(' + JSON.stringify(email) + ',' + JSON.stringify(u.role) + ',' + JSON.stringify(u.perms || []) + ',' + JSON.stringify(u.cities || []) + ')\' style="padding:4px 10px;font-size:11px;background:rgba(59,130,246,0.1);color:#3b82f6;">✏️ Edit</button>';

                var nameStr = (typeof email === 'string' && email.includes('@')) ? email.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ') : 'System User';
                var userHtml = '<div style="font-weight:800; color:var(--text-main); font-size:13px; margin-bottom:2px;">' + nameStr + '</div><div style="font-size:10px; color:var(--text-sub); font-weight:600;">✉️ ' + email + '</div>';

                return '<tr style="border-bottom:1px solid var(--border-light); transition:0.2s;" onmouseover="this.style.background=\'var(--row-hover)\'" onmouseout="this.style.background=\'\'"><td style="padding:12px 16px;">' + userHtml + '</td><td style="padding:12px 16px;">' + roleTag + '</td><td style="padding:12px 16px;">' + permsHtml + '</td><td style="padding:12px 16px;">' + citiesHtml + '</td><td style="padding:12px 16px;text-align:center;">' + editBtn + '</td></tr>';
              }).join('');
            })
            .withFailureHandler(function (err) {
              if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:#ef4444;">❌ ' + err.message + '</td></tr>';
            })
            .getAllUsers();
        };

        // ── Save user ──
        window.adminSaveUser = function () {
          var email = (document.getElementById('admin-user-email').value || '').trim().toLowerCase();
          var role = document.getElementById('admin-user-role').value;
          var msg = document.getElementById('admin-save-msg');

          if (!email) { showToast('❌ Enter an email address!'); return; }

          // Collect perms
          var perms = [];
          if (role !== 'Admin') {
            document.querySelectorAll('.admin-perm-cb:checked').forEach(function (cb) { perms.push(cb.value); });
          }

          // Collect cities
          var cities = [];
          if (role !== 'Admin') {
            document.querySelectorAll('.admin-city-cb:checked').forEach(function (cb) { cities.push(cb.value); });
          }

          // Sub-Admin role maps to User + sub_admin_access perm + all cities on backend
          var backendRole = role;
          if (role === 'Sub-Admin') {
            backendRole = 'User';
            if (perms.indexOf('sub_admin_access') === -1) perms.push('sub_admin_access');
            cities = ['all'];
          }

          if (msg) { msg.style.display = 'block'; msg.style.color = '#d97706'; msg.innerText = '⏳ Saving...'; }

          var adminEmail = window.currentUser ? window.currentUser.email : '';
          google.script.run
            .withSuccessHandler(function () {
              if (msg) { msg.style.color = '#059669'; msg.innerText = '✅ Saved! Refreshing list...'; }
              setTimeout(adminLoadUsers, 500);
              adminClearForm();
              showToast('✅ User access updated!');
            })
            .withFailureHandler(function (err) {
              if (msg) { msg.style.color = '#ef4444'; msg.innerText = '❌ ' + err.message; }
            })
            .saveUserAccess(adminEmail, email, backendRole, perms, cities);
        };

        // ── Delete user ──
        window.adminDeleteUser = function () {
          var email = (document.getElementById('admin-user-email').value || '').trim().toLowerCase();
          if (!email) { showToast('❌ Enter the email to delete!'); return; }
          if (!confirm('Delete access for ' + email + '?')) return;

          var adminEmail = window.currentUser ? window.currentUser.email : '';
          google.script.run
            .withSuccessHandler(function () {
              showToast('🗑️ User removed!');
              adminClearForm();
              adminLoadUsers();
            })
            .withFailureHandler(function (err) { showToast('❌ ' + err.message); })
            .saveUserAccess(adminEmail, email, 'Delete', [], []);
        };

        // ── Apply granular permissions on login ──
        window.applyGranularPermissions = function (userData) {
          if (!userData) return;

          var isAdmin = userData.role === 'Admin';
          var perms = isAdmin ? ['all'] : (userData.perms || []);
          var cities = isAdmin ? ['all'] : (userData.cities || []);
          var hasAll = perms.indexOf('all') > -1 || perms.indexOf('sub_admin_access') > -1;
          var hasAllCities = cities.indexOf('all') > -1;

          // ── 1. Inject 🛡️ Admin Panel button for Admins ─────────────
          if (isAdmin) {
            var scanInterval = setInterval(function () {
              var allEls = document.querySelectorAll('button, a, .glass-card, .btn-apple');
              var auditBtn = null;
              for (var i = 0; i < allEls.length; i++) {
                if (allEls[i].textContent.trim().indexOf('Daily Audit') > -1) { auditBtn = allEls[i]; break; }
              }
              if (!auditBtn) return;
              if (document.getElementById('admin-panel-btn')) { clearInterval(scanInterval); return; }

              var adminBtn = auditBtn.cloneNode(true);
              adminBtn.id = 'admin-panel-btn';
              adminBtn.textContent = '🛡️ Admin Panel';
              adminBtn.removeAttribute('href');
              adminBtn.removeAttribute('onclick');
              adminBtn.style.background = 'linear-gradient(135deg, #1d4ed8, #3b82f6)';
              adminBtn.style.color = 'white';
              adminBtn.style.border = 'none';
              adminBtn.style.marginTop = '10px';
              adminBtn.onclick = function (e) { e.preventDefault(); window.openAdminPanel(); };
              auditBtn.parentNode.insertBefore(adminBtn, auditBtn.nextSibling);
              clearInterval(scanInterval);
            }, 500);
          }

          // ── 2. Hide buttons based on missing feature perms ─────────
          if (!hasAll) {
            Object.keys(PERM_SELECTOR_MAP).forEach(function (perm) {
              if (perms.indexOf(perm) === -1) {
                PERM_SELECTOR_MAP[perm].forEach(function (sel) {
                  document.querySelectorAll(sel).forEach(function (el) {
                    el.style.display = 'none';
                  });
                });
              }
            });
          }

          // ── 3. City visibility restriction ─────────────────────────
          if (!hasAllCities) {
            // Filter city dropdown in main filter bar
            setTimeout(function () {
              var cityDrop = document.getElementById('city-drop');
              if (cityDrop) {
                var labels = cityDrop.querySelectorAll('label');
                labels.forEach(function (lbl) {
                  var cb = lbl.querySelector('input[type="checkbox"]');
                  if (!cb) return;
                  var val = cb.value;
                  if (val === 'ALL') return; // Keep "All Cities" option
                  if (cities.indexOf(val) === -1) {
                    lbl.style.display = 'none';
                    cb.checked = false;
                  }
                });
              }
              // Also filter import city select
              var importSelect = document.getElementById('import-city-select');
              if (importSelect) {
                Array.from(importSelect.options).forEach(function (opt) {
                  if (!opt.value) return;
                  if (cities.indexOf(opt.value) === -1) opt.style.display = 'none';
                });
              }
            }, 2000); // Wait for cities to be populated by fetchData
          }
        };


        function toggleSidebar() { const sb = $('sidebar'), overlay = $('mobile-overlay'); if (window.innerWidth <= 768) { sb.classList.toggle('active-mobile'); overlay.classList.toggle('active'); } else { sb.classList.toggle('hidden'); } }

        /* 🟢 ANTI-FLICKER LOGIC (BULLETPROOF SHIELD) 🟢 */
        let isTyping = false;
        let syncTimeout = null;
        let _writeLockUntil = 0; // 🚀 WRITE-LOCK: Blocks auto-sync after optimistic UI updates
        function pauseSync() {
          clearTimeout(syncTimeout); // Purane timer ko cancel karo
          isTyping = true; // Screen strictly lock
        }
        function resumeSync() {
          clearTimeout(syncTimeout);
          // 3 Seconds tak lock rakhega taaki Google Sheet aaram se save kar le
          syncTimeout = setTimeout(() => { isTyping = false; }, 3000);
        }
        // 🚀 WRITE-LOCK ENGINE: Call this after any optimistic UI write to block stale auto-syncs
        function engageWriteLock(seconds) {
          _writeLockUntil = Date.now() + (seconds * 1000);
          console.log('🔒 Write-lock engaged for ' + seconds + 's — auto-sync paused until backend confirms.');
        }

        /* 🎮 PRO-LEVEL CORPORATE LIGHT THEME ENGINE 🎮 */

        function getDynamicLoaderData(type) {
          let rawName = window.currentUser && window.currentUser.name ? window.currentUser.name : 'Bisht';
          let cleanName = rawName.split(/[\s.]+/)[0];
          let fName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase() + " Ji";

          // 🚀 EKDAAM PROFESSIONAL TEXTS
          const vibes = {
            'init': {
              title: "SYSTEM INITIALIZATION", color1: "#0ea5e9", color2: "#3b82f6",
              msgs: [
                { text: `Welcome back, ${fName}. Securing your workspace...`, anim: '🔐' },
                { text: `Establishing secure connection to the database...`, anim: '📡' },
                { text: `Loading dashboard modules and recent logs...`, anim: '📊' }
              ]
            },
            'fetch': {
              title: "SYNCING DATA", color1: "#10b981", color2: "#059669",
              msgs: [
                { text: `Fetching latest records from the server...`, anim: '🔄' },
                { text: `Updating dashboard with real-time data...`, anim: '⚡' },
                { text: `Synchronizing your workspace, please wait...`, anim: '⏱️' }
              ]
            },
            'api': {
              title: "API AUTO-MATCH", color1: "#8b5cf6", color2: "#6366f1",
              msgs: [
                { text: `Connecting to partner APIs securely...`, anim: '🔗' },
                { text: `Cross-referencing bookings with external data...`, anim: '🔍' },
                { text: `Processing automated matches. This may take a moment...`, anim: '⚙️' }
              ]
            },
            'audit': {
              title: "GENERATING AUDIT", color1: "#f59e0b", color2: "#d97706",
              msgs: [
                { text: `Analyzing TAT and daily performance metrics...`, anim: '📈' },
                { text: `Compiling audit logs for the selected date range...`, anim: '📑' },
                { text: `Calculating deviations and generating final report...`, anim: '🧮' }
              ]
            },
            'pdf': {
              title: "PROCESSING FILES", color1: "#ec4899", color2: "#db2777",
              msgs: [
                { text: `Extracting data from the uploaded documents...`, anim: '📄' },
                { text: `Reading filenames and matching with database...`, anim: '🔎' },
                { text: `Updating status to Shared across all matched records...`, anim: '✅' }
              ]
            },
            'import': {
              title: "IMPORTING CSV", color1: "#14b8a6", color2: "#0d9488",
              msgs: [
                { text: `Validating CSV structure and headers...`, anim: '🧾' },
                { text: `Processing records and checking for duplicates...`, anim: '♻️' },
                { text: `Securely uploading data to the main server...`, anim: '☁️' }
              ]
            },
            'ai': {
              title: "AI PROCESSING", color1: "#a855f7", color2: "#7e22ce",
              msgs: [
                { text: `Bisht Ji AI is analyzing the requested data...`, anim: '🤖' },
                { text: `Processing natural language query...`, anim: '🧠' },
                { text: `Generating insights based on current dashboard state...`, anim: '✨' }
              ]
            }
          };

          let category = 'fetch';
          if (typeof isFirstLoad !== 'undefined' && isFirstLoad) {
            category = 'init';
          } else if (type && vibes[type]) {
            category = type;
          } else {
            if (document.getElementById('uploadCsvModal') && document.getElementById('uploadCsvModal').classList.contains('active')) category = 'import';
            else if (document.getElementById('apiAutoModal') && document.getElementById('apiAutoModal').style.display === 'flex') category = 'api';
            else if (document.getElementById('auditFullPage') && document.getElementById('auditFullPage').classList.contains('active')) category = 'audit';
            else if (document.getElementById('search-input') && document.getElementById('search-input').value !== "") category = 'fetch';
          }

          let selectedVibe = vibes[category];
          let msg = selectedVibe.msgs[Math.floor(Math.random() * selectedVibe.msgs.length)];

          return { title: selectedVibe.title, color1: selectedVibe.color1, color2: selectedVibe.color2, text: msg.text, anim: msg.anim };
        }

        function showLoader(type = 'fetch') {
          let loaderData = getDynamicLoaderData(type);
          let loaderEl = document.getElementById('loader');

          clearTimeout(window.loaderHideTimeout); // 🚀 FIX: Prevent accidental hides during transitions

          if (loaderEl && (!window.isPremiumLoaderSet)) {
            loaderEl.innerHTML = `
              <div id="loader-backdrop" style="position: fixed; inset: 0; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; justify-content: center; align-items: center; z-index: 99999; transition: opacity 0.3s ease;">
                  <div style="background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.5); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05); border-radius: 20px; padding: 35px 40px; width: auto; min-width: 320px; max-width: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; animation: loaderPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                      
                      <button onclick="hideLoader(); if(typeof showToast === 'function') showToast('Loader closed manually.');" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; font-size: 16px; color: #94a3b8; cursor: pointer; transition: 0.2s; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.color='#ef4444'; this.style.background='#fee2e2';" onmouseout="this.style.color='#94a3b8'; this.style.background='transparent';">✕</button>

                      <div style="position: relative; width: 60px; height: 60px; margin-bottom: 20px;">
                          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; animation: spin 2s linear infinite;">
                              <defs>
                                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stop-color="${loaderData.color1}" />
                                      <stop offset="100%" stop-color="${loaderData.color2}" />
                                  </linearGradient>
                              </defs>
                              <circle cx="50" cy="50" r="40" stroke="#f1f5f9" stroke-width="8" fill="none" />
                              <circle cx="50" cy="50" r="40" stroke="url(#gradient)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="150" stroke-dashoffset="50" style="animation: dash 1.5s ease-in-out infinite;" />
                          </svg>
                          <div id="loader-anim" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: transform 0.3s ease;">${loaderData.anim}</div>
                      </div>

                      <h2 id="loader-title" style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; letter-spacing: 1px; color: ${loaderData.color1}; text-transform: uppercase; font-family: 'Inter', sans-serif;">${loaderData.title}</h2>
                      <p id="loader-text" style="color: #475569; font-size: 14px; font-weight: 500; margin: 0; transition: opacity 0.3s ease;">${loaderData.text}</p>

                      <div id="loader-long-warning" style="display: none; margin-top: 15px; font-size: 11px; color: #d97706; background: #fef3c7; padding: 6px 12px; border-radius: 8px; border: 1px solid #fde68a; font-weight: 600;">
                          ⏳ Large file detected. Processing securely...
                      </div>
                  </div>
              </div>
              <style>
                  @keyframes loaderPop { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
                  @keyframes spin { 100% { transform: rotate(360deg); } }
                  @keyframes dash { 0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; } 50% { stroke-dasharray: 100, 200; stroke-dashoffset: -30; } 100% { stroke-dasharray: 100, 200; stroke-dashoffset: -125; } }
              </style>
              `;
            window.isPremiumLoaderSet = true;
          }

          let titleEl = document.getElementById('loader-title');
          let txtEl = document.getElementById('loader-text');
          let animEl = document.getElementById('loader-anim');
          let gradientStart = document.querySelector('#gradient stop:first-child');
          let gradientEnd = document.querySelector('#gradient stop:last-child');
          let warningEl = document.getElementById('loader-long-warning');

          if (titleEl) { titleEl.innerText = loaderData.title; titleEl.style.color = loaderData.color1; }
          if (gradientStart) gradientStart.setAttribute('stop-color', loaderData.color1);
          if (gradientEnd) gradientEnd.setAttribute('stop-color', loaderData.color2);
          if (txtEl) txtEl.innerText = loaderData.text;
          if (animEl) animEl.innerHTML = loaderData.anim;
          if (warningEl) warningEl.style.display = 'none';

          if (loaderEl) {
            loaderEl.style.display = 'block';
            let backdrop = document.getElementById('loader-backdrop');
            if (backdrop) backdrop.style.opacity = '1';
          }

          clearInterval(window.jokeInterval);
          clearTimeout(window.longWaitTimeout);

          window.longWaitTimeout = setTimeout(() => {
            if (warningEl) warningEl.style.display = 'block';
          }, 12000);

          window.jokeInterval = setInterval(() => {
            let newLoaderData = getDynamicLoaderData(type);
            if (txtEl) {
              txtEl.style.opacity = '0';
              if (animEl) animEl.style.transform = 'scale(0.8)';
              setTimeout(() => {
                txtEl.innerText = newLoaderData.text;
                if (animEl) { animEl.innerHTML = newLoaderData.anim; animEl.style.transform = 'scale(1)'; }
                txtEl.style.opacity = '1';
              }, 300);
            }
          }, 3500);
        }

        function hideLoader() {
          if (typeof isFirstLoad !== 'undefined') isFirstLoad = false;

          // 🚀 CHART DATA MANGWAO JAB LOADER HATE
          if (typeof fetchTrendStats === 'function') fetchTrendStats();

          clearInterval(window.jokeInterval);
          clearTimeout(window.longWaitTimeout);

          let backdrop = document.getElementById('loader-backdrop');
          let loaderEl = document.getElementById('loader');

          if (backdrop) {
            backdrop.style.opacity = '0';
            window.loaderHideTimeout = setTimeout(() => {
              if (loaderEl) loaderEl.style.display = 'none';
            }, 300);
          } else if (loaderEl) {
            loaderEl.style.display = 'none';
          }

          let syncDot = document.getElementById('sync-dot');
          if (syncDot) syncDot.classList.remove('spin');
          let searchIcon = document.getElementById('search-icon');
          if (searchIcon) searchIcon.innerHTML = '🔍';
        }
        // =========================================================
        // 📸 BULK TRF, FLOATING VIEWER & UPLOAD LOGIC
        // =========================================================
        let trfQueue = [];
        let totalTrfs = 0;
        let processedTrfs = 0;
        let currentUploadRid = null;
        let currentUploadCity = null;

        // 🟢 1. FLOATING WINDOW DRAG LOGIC
        dragElement(document.getElementById("floating-trf-viewer"));
        function dragElement(elmnt) {
          var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
          var dragHeader = document.getElementById("trf-drag-header");
          if (dragHeader) {
            dragHeader.onmousedown = dragMouseDown;
          }
          function dragMouseDown(e) { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; }
          function elementDrag(e) { e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; elmnt.style.bottom = "auto"; elmnt.style.right = "auto"; }
          function closeDragElement() { document.onmouseup = null; document.onmousemove = null; }
        }

        // 🟢 ROTATION TRACKER
        let currentTrfRotation = 0;

        // 🟢 ROTATE TRF FUNCTION
        window.rotateTrf = function () {
          currentTrfRotation += 90;
          if (currentTrfRotation >= 360) currentTrfRotation = 0;

          let iframe = document.getElementById('trf-iframe');

          // Smooth animation lagane ke liye transition
          iframe.style.transition = "transform 0.3s ease-in-out";

          // Agar image tedhi (90/270) ho, toh usko thoda chota (0.8 scale) kar dete hain taki window se bahar na jaye
          if (currentTrfRotation === 90 || currentTrfRotation === 270) {
            iframe.style.transform = `rotate(${currentTrfRotation}deg) scale(0.8)`;
          } else {
            iframe.style.transform = `rotate(${currentTrfRotation}deg) scale(1)`;
          }
        };

        // 🟢 3. SINGLE TRF UPLOAD (From Floating Window)
        window.uploadSingleTrf = function (files) {
          if (!files || files.length === 0) return;
          document.getElementById('floating-trf-viewer').style.display = 'none'; // Window band karo

          let file = files[0];
          let reader = new FileReader();
          reader.onload = function (e) {
            showToast("⏳ Uploading Manual TRF to Background...");
            let base64 = e.target.result.split(',')[1];

            google.script.run
              .withSuccessHandler(res => {
                showToast(res);
                fetchData(true); // Hard Refresh
              })
              .withFailureHandler(err => { showToast("❌ Error: " + err.message); })
              .manualAttachTRF(currentUploadCity, currentUploadRid, base64, file.type);
          };
          reader.readAsDataURL(file);
        };

        // 🟢 4. DELETE TRF
        window.deleteCurrentTrf = function () {
          if (!confirm("Are you sure you want to remove this TRF?")) return;
          let rid = document.getElementById('viewer-rid').value;
          let city = document.getElementById('viewer-city').value;
          document.getElementById('floating-trf-viewer').style.display = 'none';
          showToast("🗑️ Removing TRF Link...");

          google.script.run
            .withSuccessHandler(res => { showToast(res); fetchData(true); })
            .removeTRFLink(city, rid);
        };


        // 🟢 5. BULK TRF SCANNER LOGIC (With Logs)
        window.minimizeTrfModal = function () {
          closeFullPage('bulkTrfModal'); // 🔴 Naya Fix: Ab ye properly band aur open hoga

          if (processedTrfs < totalTrfs) {
            let widget = document.getElementById('floating-trf-widget');
            if (widget) widget.style.display = 'block';
            showToast("TRF Scanner running in background! 📸");
          }
        };

        /* 🟢 NAYA SMART PDF DROPZONE LOGIC 🟢 */
        document.addEventListener("DOMContentLoaded", () => {
          const dropArea = document.getElementById('pdf-drop-area');
          if (dropArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
              dropArea.addEventListener(eventName, preventDefaults, false);
            });
            function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
            ['dragenter', 'dragover'].forEach(eventName => {
              dropArea.addEventListener(eventName, () => dropArea.style.backgroundColor = 'rgba(168, 85, 247, 0.2)', false);
            });
            ['dragleave', 'drop'].forEach(eventName => {
              dropArea.addEventListener(eventName, () => dropArea.style.backgroundColor = 'rgba(168, 85, 247, 0.05)', false);
            });
            dropArea.addEventListener('drop', (e) => {
              let dt = e.dataTransfer;
              let files = dt.files;
              handlePdfSelect(files);
            });
          }
        });

        // 🚀 JSZIP SUPER ENGINE: Extracts PDF names from ZIP files instantly
        // 🚀 JSZIP SUPER ENGINE WITH PRO UX LOGS
        function handlePdfSelect(files) {
          if (!files || files.length === 0) return;

          let dropArea = document.getElementById('pdf-drop-area');
          let procContainer = document.getElementById('pdf-processing-container');
          let logBox = document.getElementById('pdf-log-box');
          let progBar = document.getElementById('pdf-progress-bar');
          let countBadge = document.getElementById('pdf-count-badge');
          let statusTitle = document.getElementById('pdf-status-title');

          // UX: Drop area ko chota karo, Logs box dikhao
          dropArea.style.padding = "20px";
          dropArea.style.opacity = "0.6";
          dropArea.style.transform = "scale(0.95)";
          procContainer.style.display = "block";
          logBox.innerHTML = ""; // Purane logs saaf
          progBar.style.width = "5%";
          progBar.style.background = "linear-gradient(90deg, #a855f7, #ec4899)";
          statusTitle.style.color = "var(--text-main)";

          const addLog = (msg, type = "info") => {
            let color = type === "error" ? "#fca5a5" : (type === "success" ? "#86efac" : (type === "warn" ? "#fde047" : "#cbd5e1"));
            let icon = type === "error" ? "❌" : (type === "success" ? "✅" : (type === "warn" ? "⚠️" : "⚡"));
            logBox.innerHTML += `<div style="color: ${color}; margin-bottom: 6px;">${icon} ${msg}</div>`;
            logBox.scrollTop = logBox.scrollHeight;
          };

          addLog("Initializing extraction engine...", "info");

          let fileNames = [];
          let promises = [];

          for (let i = 0; i < files.length; i++) {
            let file = files[i];

            // 1. Agar file ZIP hai
            if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
              addLog(`ZIP archive detected: [${file.name}]. Unpacking...`, "warn");
              progBar.style.width = "30%";

              promises.push(
                JSZip.loadAsync(file).then(function (zip) {
                  let pdfCount = 0;
                  Object.keys(zip.files).forEach(function (filename) {
                    if (!zip.files[filename].dir && filename.toLowerCase().endsWith('.pdf') && !filename.includes('__MACOSX')) {
                      let cleanName = filename.split('/').pop();
                      if (cleanName) { fileNames.push(cleanName); pdfCount++; }
                    }
                  });
                  addLog(`Successfully extracted ${pdfCount} PDFs from ZIP.`, "success");
                }).catch(err => {
                  addLog(`Failed to read ZIP archive! Corrupted file?`, "error");
                  console.error(err);
                })
              );
            }
            // 2. Agar Normal PDF hai
            else if (file.name.toLowerCase().endsWith('.pdf')) {
              fileNames.push(file.name);
              addLog(`Captured PDF: ${file.name}`, "info");
            }
            // 3. Koi aur file daal di galti se
            else {
              addLog(`Ignored unsupported file type: ${file.name}`, "error");
            }
          }

          // Jab browser sab file padh le, tab agla step
          Promise.all(promises).then(() => {
            progBar.style.width = "60%";
            countBadge.innerText = `${fileNames.length} Files Ready`;

            if (fileNames.length === 0) {
              addLog("No valid PDF files found to process. Aborting.", "error");
              statusTitle.innerText = "Extraction Failed";
              progBar.style.background = "#ef4444";
              dropArea.style.opacity = "1";
              dropArea.style.transform = "scale(1)";
              return;
            }

            addLog(`Total ${fileNames.length} valid filenames collected.`, "info");
            addLog(`Establishing secure connection to Database...`, "warn");
            statusTitle.innerText = "Syncing with Google Sheets...";

            // 🚀 BACKEND KO BHEJO
            google.script.run
              .withSuccessHandler(res => {
                progBar.style.width = "100%";
                progBar.style.background = "#10b981"; // Success Green
                statusTitle.innerText = "Sync Complete!";
                statusTitle.style.color = "#10b981";
                addLog(`Server Response: Data successfully synced!`, "success");

                // Thoda delay dekar success popup dikhao
                setTimeout(() => {
                  closeModal('dropzoneModal');
                  document.getElementById('successPopupText').innerText = res;
                  document.getElementById('successPopup').classList.add('show');

                  // Reset UI chupchap background mein agle time ke liye
                  setTimeout(() => {
                    dropArea.style.padding = "50px 20px";
                    dropArea.style.opacity = "1";
                    dropArea.style.transform = "scale(1)";
                    procContainer.style.display = "none";
                  }, 500);

                }, 1200);

                fetchData(true); // Dashboard Refresh
              })
              .withFailureHandler(err => {
                progBar.style.background = "#ef4444"; // Error Red
                statusTitle.innerText = "Server Error";
                statusTitle.style.color = "#ef4444";
                addLog(`CRITICAL ERROR: ${err.message}`, "error");
                dropArea.style.opacity = "1";
                dropArea.style.transform = "scale(1)";
              })
              .smartBulkMarkShared(fileNames);
          });
        }

        /* 🟢 EXCEL / CSV UPLOAD LOGIC 🟢 */
        /* 🟢 EXCEL / CSV UPLOAD LOGIC (BULLETPROOF) 🟢 */
        window.downloadImportTemplate = function () {
          const headers = ["appointmentId", "currentStatus", "patientName", "city", "AppointmentTime", "labTestName", "customerBarcodeArr", "patientGender", "contractName", "PhleboName", "PhleboPhoneNumber1", "patientAge", "patientDOB", "subArea"];
          const sampleRows = [
            ["12345678", "Sample and Bar Code Submitted", "Rahul Kumar", "Delhi NCR", "18/04/2026 10:00 AM", "CBC", "MB1234567", "Male", "Medibuddy", "Suresh Kumar", "9876543210", "30", "15/05/1994", "Noida Sector 62"]
          ];
          let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + sampleRows.map(r => r.join(",")).join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "Sample_Import_Template.csv");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (typeof showToast === 'function') showToast("✅ Sample Template Downloaded!");
        };

        function handleCsvUpload() {
          let fileInput = document.getElementById('csv-file');
          let citySelect = document.getElementById('import-city-select');

          let file = fileInput ? fileInput.files[0] : null;
          let selectedCity = citySelect ? (citySelect.value || "Mumbai") : "Mumbai";

          // Agar file choose nahi ki hai, toh screen par saaf Alert aayega
          if (!file) { alert("⚠️ Please select a file first!"); return; }

          showLoader('fetch');
          let userName = window.currentUser ? window.currentUser.name : "Unknown User";

          let reader = new FileReader();
          reader.onload = function (e) {
            let data = e.target.result;
            let csvText = "";
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              let workbook = XLSX.read(data, { type: 'binary' });
              let firstSheet = workbook.SheetNames[0];
              csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
            } else {
              csvText = data;
            }

            google.script.run
              .withSuccessHandler(res => {
                hideLoader();
                closeModal('uploadCsvModal');

                let popup = document.getElementById('successPopup');
                let popupText = document.getElementById('successPopupText');

                // Agar html wala popup sahi jagah hai, toh wahan dikhayega
                if (popup && popupText) {
                  popupText.textContent = res; // innerText ki jagah textContent lagaya taaki Excel Tabs (\t) na ude
                  popupText.style.whiteSpace = "pre"; // Excel layout ko straight rakhne ke liye
                  popupText.style.overflowX = "auto"; // Taki lamba text scroll ho sake
                  popupText.style.userSelect = "text"; // Aaram se mouse se copy karne ke liye
                  popupText.style.fontFamily = "monospace"; // Data ekdum straight table jaisa dikhega
                  popupText.style.textAlign = "left"; // Text ko left side align karne ke liye
                  popup.classList.add('show');
                } else {
                  // 🔴 NAYA: Agar HTML popup nahi mila, toh directly Screen Alert bhej dega!
                  alert("🚀 UPLOAD STATUS:\n\n" + res);
                }

                if (fileInput) fileInput.value = "";
                let fileNameDisplay = document.getElementById('csv-file-name');
                if (fileNameDisplay) fileNameDisplay.innerText = "";

                fetchData(true); // Background me sheet refresh
              })
              .withFailureHandler(err => {
                hideLoader();
                alert("❌ System Error processing file: " + err.message);
              })
              .processClientCSV(csvText, userName, selectedCity);
          };

          if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.readAsBinaryString(file);
          } else {
            reader.readAsText(file);
          }
        }

        /* 🟢 FULL RECORD EDIT LOGIC (FIXED IDs & FUNCTION NAMES) 🟢 */
        function openEditModal(rid) {
          const item = globalData[currentTab].find(i => i.rid === rid);
          if (!item) return;

          $('edit-city').value = item.city || "";
          $('edit-bid').value = item.bookingId || "";
          $('edit-searchid').value = item.bookingId || item.refId || "";
          $('edit-pname').value = item.name || "";

          $('edit-name').value = item.name || "";
          $('edit-age').value = item.age || "";
          $('edit-gender').value = item.gender || "";
          $('edit-type').value = item.type !== '-' ? item.type : "";
          $('edit-barcode').value = (item.barcode && item.barcode !== 'Not given') ? item.barcode : "";
          $('edit-col').value = item.colTime !== '-' ? item.colTime : "";
          $('edit-phlebo').value = item.phleboName || "";
          $('edit-phone').value = item.phleboPhone || "";
          $('edit-fbs').value = item.fbs || "";
          $('edit-rem').value = item.remarks || "";
          $('edit-status').value = item.status || "Pending";
          $('edit-tests').value = item.tests ? item.tests.join(', ') : "";

          document.getElementById('editModal').style.display = 'flex';
        }

        /* 🟢 FULL RECORD EDIT LOGIC (FIXED IDs & FUNCTION NAMES) 🟢 */
        // ... (baaki functions yahan hain) ...

        function saveFullEdit() {
          let city = $('edit-city').value;
          let bid = $('edit-bid').value;
          let searchId = $('edit-searchid').value || bid;
          let oldName = $('edit-pname').value;

          let newData = {
            bookingId: bid,
            name: $('edit-name').value,
            age: $('edit-age').value,
            gender: $('edit-gender').value,
            type: $('edit-type').value,
            barcode: $('edit-barcode').value,
            colTime: $('edit-col').value,
            phleboName: $('edit-phlebo').value,
            phleboPhone: $('edit-phone').value,
            fbs: $('edit-fbs').value,
            status: $('edit-status').value,
            remarks: $('edit-rem').value,
            tests: $('edit-tests').value
          };

          let userName = window.currentUser ? window.currentUser.name : "Unknown User";

          showLoader('fetch');
          google.script.run.withSuccessHandler(res => {
            hideLoader();

            // 1. Edit window ko gayab karna
            document.getElementById('editModal').style.display = 'none';

            // 2. 🚀 MAIN FIX: Jo row open thi usko memory se band karna (Lock hatana)
            currentlyExpandedRow = null;
            resumeSync();

            // 3. Exact changes ka bada Pop-up dikhana
            alert(res);

            // 4. Dusre tab/users ko update ping bhejna
            if (window.fireGlobalSyncPing) window.fireGlobalSyncPing("STATUS_UPDATE", searchId, newData.status);

            // 5. Screen ko jabardasti fresh data ke sath Paint karna (isSilent = false)
            fetchData(false);

          }).withFailureHandler(err => {
            hideLoader();
            alert("Error: " + err);
            resumeSync();
          }).editFullRecord(city, searchId, oldName, newData, userName);
        }

        /* 🟢 COMMENTS MODAL LOGIC 🟢 */
        let currentCommentId = "";
        function openCommentModal(rid, bookingOrReqId, patientName) {
          currentCommentId = bookingOrReqId;
          $('comment-subtitle').innerText = `Patient: ${patientName} | ID: ${bookingOrReqId}`;
          $('new-comment-text').value = "";
          $('comment-history-box').innerHTML = "Fetching comments... ⏳";
          openModal('commentModal');

          google.script.run.withSuccessHandler(res => {
            $('comment-history-box').innerHTML = res.replace(/\n/g, '<br>');
          }).withFailureHandler(err => {
            $('comment-history-box').innerHTML = "Failed to load comments: " + err;
          }).getRecordComments(bookingOrReqId);
        }

        function submitNewComment() {
          let txt = $('new-comment-text').value.trim();
          if (!txt) return showToast("Comment cannot be empty!");
          if (!currentCommentId) return showToast("Error: No ID found for comment.");

          let userName = window.currentUser ? window.currentUser.name : "Unknown User";
          $('new-comment-text').disabled = true;

          google.script.run.withSuccessHandler(res => {
            $('new-comment-text').disabled = false;
            $('new-comment-text').value = "";
            showToast(res);
            openCommentModal(null, currentCommentId, ""); // Refresh history
          }).withFailureHandler(err => {
            $('new-comment-text').disabled = false;
            alert("Error: " + err);
          }).addNewComment(currentCommentId, userName, txt);
        }

        /* 🟢 WA MODAL 🟢 */
        function renderWaModal() {
          try {
            let source = getFilteredData(globalData.pending);
            let grouped = {};

            source.forEach(i => {
              let c = (i.loc && i.loc.trim() !== "" && i.loc !== "-") ? i.loc.trim() : (i.city || "Unknown");
              if (!grouped[c]) grouped[c] = new Set();

              let id = (i.bookingId && i.bookingId !== "--" && i.bookingId !== "") ? i.bookingId : "Pending ID";
              let nameStr = (i.name && i.name.trim() !== "") ? i.name.trim() : "Unknown";

              // 🔴 EKDAAM CLEAN FORMAT: Sirf Booking ID | Name
              grouped[c].add(`${id} | ${nameStr}`);
            });

            let container = $('wa-export-container');
            container.innerHTML = "";
            let has = false;

            for (let loc in grouped) {
              let arr = Array.from(grouped[loc]);
              if (arr.length > 0) {
                has = true;
                let txt = `*${loc.toUpperCase()} (${arr.length})*\n` + arr.join('\n');
                container.innerHTML += `<div class="wa-card"><div class="wa-city-header"><span class="wa-city-title">${loc.toUpperCase()} (${arr.length})</span><button class="btn-copy-sm" data-text="${encodeURIComponent(txt)}" onclick="copySpecificText(this)">📋 Copy</button></div><div class="wa-city-body">${arr.join('<br>')}</div></div>`;
              }
            }
            if (!has) container.innerHTML = `<div style="text-align:center; padding: 40px; color:var(--text-sub);">No pending reports found.</div>`;
          } catch (e) {
            $('wa-export-container').innerHTML = `Error loading list: ${e.message}`;
          }
        }

        function copySpecificText(btn) { const text = decodeURIComponent(btn.getAttribute('data-text')); const textArea = document.createElement("textarea"); textArea.value = text; textArea.style.position = "fixed"; textArea.style.opacity = "0"; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); const originalText = btn.innerHTML; btn.innerHTML = "✓ Copied"; btn.style.backgroundColor = "#10b981"; setTimeout(() => { btn.innerHTML = originalText; btn.style.backgroundColor = ""; }, 2000); showToast("Copied!"); } catch (err) { showToast('Copy failed.'); } document.body.removeChild(textArea); }

        // 🔴 NAYA FUNCTION: CSV Export karne ke liye (Sirf 2 Column: Booking, City)
        function exportPendingBookingCSV() {
          let source = getFilteredData(globalData.pending);
          if (source.length === 0) { showToast("No pending records to export!"); return; }

          let csv = "Booking,City\n"; // Headers
          source.forEach(i => {
            let id = (i.bookingId && i.bookingId !== "--" && i.bookingId !== "") ? i.bookingId : "Pending ID";
            let c = (i.loc && i.loc.trim() !== "" && i.loc !== "-") ? i.loc.trim() : (i.city || "Unknown");
            csv += `"${id}","${c}"\n`; // Rows
          });

          const blob = new Blob([csv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Pending_Bookings_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
        }

        /* 🟢 DATA & STATE 🟢 */
        let globalData = { pending: [], create: [], incomplete: [], shared: [], log: [], summary: [], cities: [], partnerTypes: [] };
        let currentTab = 'pending'; let tatBaseIdx = 'creat'; let VISIBLE_COUNT = 99999; let currentlyExpandedRow = null; let typingTimer;

        function parseAnyDateTime(dateStr, timeStr) {
          if (!dateStr) return null; let dt = new Date(); let dParts = String(dateStr).trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
          if (dParts) dt = new Date(parseInt(dParts[3]), parseInt(dParts[2]) - 1, parseInt(dParts[1])); else { let d = new Date(dateStr); if (!isNaN(d.getTime())) dt = d; } dt.setHours(0, 0, 0, 0);
          if (!timeStr || timeStr === '-' || timeStr.toLowerCase() === 'n/a' || timeStr === '--') return dt;
          let tClean = String(timeStr).trim().replace(/[.,;]/g, ':').replace(/\s*(am|pm)/i, ' $1').toUpperCase(); let tParts = tClean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/);
          if (tParts) { let h = parseInt(tParts[1]), m = parseInt(tParts[2]), ampm = tParts[4]; if (ampm === 'PM' && h < 12) h += 12; if (ampm === 'AM' && h === 12) h = 0; dt.setHours(h, m, 0, 0); }
          return dt;
        }

        function setTatBase(base) { tatBaseIdx = base; document.querySelectorAll('.tat-btn').forEach(b => b.classList.remove('active')); $('tat-' + base).classList.add('active'); updateTimers(); }
        function getLocalTodayDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        function resetDates() { const t = getLocalTodayDate(); $('date-start').value = t; $('date-end').value = t; }

        window.setMainDates = function (daysAgo) {
          let d = new Date();
          d.setDate(d.getDate() - daysAgo);
          let ds = `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
          document.getElementById('date-start').value = ds;
          document.getElementById('date-end').value = ds;
          fetchData(false);
        };

        function resetFilters() {
          let oldStart = document.getElementById('date-start') ? document.getElementById('date-start').value : "";
          let oldEnd = document.getElementById('date-end') ? document.getElementById('date-end').value : "";

          resetDates();

          let newStart = document.getElementById('date-start') ? document.getElementById('date-start').value : "";
          let newEnd = document.getElementById('date-end') ? document.getElementById('date-end').value : "";

          // 1. Reset Checkboxes and Search
          document.querySelectorAll('#city-drop input').forEach(c => c.checked = (c.value === "ALL"));
          document.querySelectorAll('#type-drop input').forEach(c => c.checked = (c.value === "ALL"));
          document.querySelectorAll('#user-drop input').forEach(c => c.checked = (c.value === "ALL"));

          let cityTxt = document.getElementById('city-drop-text');
          let typeTxt = document.getElementById('type-drop-text');
          let userTxt = document.getElementById('user-drop-text');
          if (cityTxt) cityTxt.innerText = "All Cities";
          if (typeTxt) typeTxt.innerText = "All Partners";
          if (userTxt) userTxt.innerText = "All Users";

          let searchInp = document.getElementById('search-input');
          let searchIcon = document.getElementById('search-icon');
          if (searchInp) searchInp.value = "";
          if (searchIcon) searchIcon.innerHTML = '🔍';

          // 🔴 NAYA JADOO: Pending Filter ko wapas 'All Pending' par lana
          let pFilter = document.getElementById('pending-time-filter');
          if (pFilter) pFilter.value = 'ALL';
          let pText = document.getElementById('pending-drop-text');
          if (pText) pText.innerText = 'All Pending';
          document.querySelectorAll('input[name="pending_time"]').forEach(r => r.checked = (r.value === 'ALL'));
          let tatCb = document.getElementById('no-high-tat-cb');
          if (tatCb) tatCb.checked = false;

          switchTab('pending', true);

          // ULTRA-SMART LOGIC: Agar Date change nahi hui hai, toh download mat karo! Instantly dikhao.
          if (oldStart === newStart && oldEnd === newEnd && globalData.pending && globalData.pending.length > 0) {
            updateUI();
            showToast("Filters Reset Instantly! ⚡");
          } else {
            // Agar purani date thi (jaise last week) aur aaj par reset kiya hai, tabhi fetch karo.
            globalData.log = []; globalData.shared = []; globalData.create = []; globalData.incomplete = []; globalData.pending = [];
            updateUI();

            let fName = window.currentUser && window.currentUser.name ? window.currentUser.name.split(' ')[0] : 'Bhaiya';
            let jokes = [
              `✨ ${fName} bhai, bas ek lamba saans lijiye, aaj ka taaza data aa raha hai... 🧘‍♂️`,
              `🚀 Sabar ka fal meetha hota hai ${fName} ji! Data bas raste mein hi hai... 🍎`,
              `🕵️‍♂️ Ekdum fresh reports nikal raha hoon ${fName} aapke liye, bas 2 second... ⏳`,
              `🏃‍♂️ Bhag ke gaya hoon server room ${fName} bhai, bas table bharne hi wala hai... 💨`,
              `😎 Relax ${fName}! System apna kaam kar raha hai, aap agla step sochiye... 🧠`,
              `⚙️ Purana data screen se hata diya hai ${fName}, naya data background me load ho raha hai... 🧹`
            ];
            let randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

            let mainList = document.getElementById('main-list');
            if (mainList) {
              mainList.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:50px; font-weight:800; color:#ec4899; font-size:15px; animation: rowFadeIn 0.4s ease forwards;">${randomJoke}</td></tr>`;
            }
            showToast('Loading Today\'s Data... 📅');
            fetchData(true);
          }
        }

        function handleSearch() {
          clearTimeout(typingTimer);
          // 🚀 BRAMHASTRA: Backend ko call karne ki zarurat nahi, 
          // sirf UI update call karo. getFilteredData() apne aap search text pakad lega!
          updateUI();

          let searchVal = $('search-input').value.trim();
          if (searchVal.length > 0) {
            $('search-icon').innerHTML = '🔍'; // Spinner ki jagah normal icon
          } else {
            $('search-icon').innerHTML = '🔍';
          }
        }

        // 🔴 FIX: Now strictly checks specific columns instead of dumping whole JSON, preventing accidental data loss!
        function isStrictlyValidRecord(item) {
          let s = String(item.status || "").toLowerCase();
          let r = String(item.remarks || "").toLowerCase();
          let id = String(item.bookingId || "").toLowerCase().replace(/\s+/g, '');

          // Sirf tab hide karega agar intentionally status ya remark me cancel/reject likha ho
          if (s.includes("not collect") || s.includes("cancel") || s.includes("reject")) return false;
          if (r.includes("cancel") || r.includes("reject")) return false;
          if (id.includes("cancel") || id.includes("reject") || id.includes("notcollect")) return false;

          return true;
        }

        let isFetching = false;
        let currentFetchId = 0; // 🔴 NAYA: Overlapping requests ko rokne ke liye

        // 🚀 NAYA: Manual click karne par saare locks tod do aur data laao
        // 🚀 NAYA: Manual click karne par saare locks tod do aur data laao
        window.forceDashboardRefresh = function () {
          showToast('Hard Syncing with Server... ⚡');
          isTyping = false; // Typing lock hatao
          isFetching = false; // Purana fetch cancel karo
          currentlyExpandedRow = null; // Khuli hui row ko band karo taaki fresh data dikhe
          fetchData(false); // false = Full screen loader aayega aur confirm update hoga
        };

        // 🚀 SCOPED CITY SUMMARY FETCH
        window.setCitySummaryScope = function (daysAgo, customDate) {
          let start, end;
          if (daysAgo === -1 && customDate) {
            start = end = customDate;
          } else {
            let d = new Date();
            d.setDate(d.getDate() - (daysAgo || 0));
            start = end = d.toISOString().split('T')[0];
          }
          showLoader();
          google.script.run
            .withSuccessHandler((data) => {
              hideLoader();
              processAndRenderCitySummaryOnly(data, start, end);
            })
            .withFailureHandler((err) => { hideLoader(); showToast("Error: " + err); })
            .getDashboardData(start, end, "");
        };

        function processAndRenderCitySummaryOnly(data, start, end) {
          let cityStats = {};
          if (data.cities) {
            data.cities.forEach(c => { cityStats[c] = { total: 0, pending: 0, shared: 0, ppmc: 0, retail: 0 }; });
            let uniqueAll = new Map();
            [...data.pending, ...data.create, ...data.incomplete, ...data.shared].forEach(item => {
              if (item && item.bookingId && item.bookingId !== "--" && !item.isHistorical) uniqueAll.set(item.bookingId, item);
            });
            let uniquePending = new Map();
            [...data.pending, ...data.create, ...data.incomplete].forEach(item => {
              if (item && item.bookingId && !item.isHistorical) uniquePending.set(item.bookingId, item);
            });
            let uniqueShared = new Map();
            data.shared.forEach(item => {
              if (item && item.bookingId && !item.isHistorical) uniqueShared.set(item.bookingId, item);
            });

            let apiCount = 0, manualCount = 0;
            uniqueAll.forEach(item => {
              if (cityStats[item.city]) {
                cityStats[item.city].total++;
                if ((item.type || "").toLowerCase().includes("ppmc")) cityStats[item.city].ppmc++;
                else cityStats[item.city].retail++;
              }
              if (item.isApi) apiCount++; else manualCount++;
            });
            uniquePending.forEach(item => { if (cityStats[item.city]) cityStats[item.city].pending++; });
            uniqueShared.forEach(item => { if (cityStats[item.city]) cityStats[item.city].shared++; });

            let modalSumHtml = '';
            let cityLabels = [], cityPpmcData = [], cityRetailData = [];
            Object.keys(cityStats).sort().forEach(city => {
              let stats = cityStats[city];
              if (stats.total === 0 && stats.pending === 0 && stats.shared === 0) return;
              modalSumHtml += `
                    <tr style="border-bottom: 1px solid #f8fafc; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 16px 20px; font-weight: 700; color: #1e293b;">${city}</td>
                      <td align="center" style="padding: 16px 20px;"><span style="font-weight:900; color:#3b82f6; background: #eff6ff; padding: 6px 12px; border-radius: 6px;">${stats.total}</span></td>
                      <td align="center" style="padding: 16px 20px;"><span style="font-weight:800; color:#10b981; background: #ecfdf5; padding: 6px 12px; border-radius: 6px;">${stats.shared}</span></td>
                      <td align="right" style="padding: 16px 20px;"><span class="badge ${stats.pending > 0 ? 'badge-pend' : 'badge-zero'}" style="font-size: 13px; padding: 6px 12px;">${stats.pending}</span></td>
                    </tr>`;
              cityLabels.push(city);
              cityPpmcData.push(stats.ppmc);
              cityRetailData.push(stats.retail);
            });

            if (document.getElementById('city-full-page-tbody')) document.getElementById('city-full-page-tbody').innerHTML = modalSumHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px;">No data</td></tr>';
            if (document.getElementById('city-summary-date-title')) {
              const formatDate = (s) => {
                if (!s) return "";
                const d = new Date(s);
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return `${("0" + d.getDate()).slice(-2)}-${months[d.getMonth()]}-${d.getFullYear()}`;
              };
              const dDisplay = (start === end) ? formatDate(start) : `${formatDate(start)} to ${formatDate(end)}`;
              document.getElementById('city-summary-date-title').innerText = "Data for: " + dDisplay;
            }
            if (typeof renderCitySummaryCharts === 'function') {
              renderCitySummaryCharts(cityLabels, cityPpmcData, cityRetailData, apiCount, manualCount, uniqueShared.size, uniquePending.size);
            }
          }
        }

        function fetchData(isSilent = false) {
          if (!window.currentUser) return;
          if (isSilent && isTyping) return;

          // 🚀 STRICT LOCK REMOVED: Row open hone par bhi data fetch hoga

          if (isFetching && isSilent) return; // Background sync ko aapas me takrane se rokna

          currentFetchId++; // Har naye click par ek naya ID
          let myFetchId = currentFetchId;
          isFetching = true;

          if (!isSilent) showLoader('fetch'); else $('sync-dot').classList.add('spin');

          // 🚀 SET GLOBAL DATE STATE
          window.currentStartDate = document.getElementById('date-start').value;
          window.currentEndDate = document.getElementById('date-end').value;

          // ── ⏱️ 60-SECOND LOADER FAILSAFE ─────────────────────────────────────────
          const fetchSafetyTimer = setTimeout(function () {
            console.warn('⚠️ fetchData safety timer fired — forcefully releasing fetch lock after 60s.');
            isFetching = false;
            var sd = document.getElementById('sync-dot');
            if (sd) sd.classList.remove('spin');

            if (!isSilent) {
              var loaderEl = document.getElementById('loader');
              if (loaderEl) loaderEl.style.display = 'none';
              var bd = document.getElementById('loader-backdrop');
              if (bd) bd.style.opacity = '0';
              if (typeof showToast === 'function') showToast('⚠️ Sync timed out. Please tap Force Sync to retry.');
            }
          }, 60000);

          google.script.run
            .withSuccessHandler((data) => {
              if (fetchSafetyTimer) clearTimeout(fetchSafetyTimer); // Defuse the failsafe — all good
              // 🔴 NAYA FIX: Agar aapne Apply daba diya hai, toh background wale purane data ko screen par aane se roko
              if (myFetchId !== currentFetchId) return;

              // 🔴 NAYA FIX: Ab ID random nahi hogi. Isse refresh hone par khuli hui row band nahi hogi!
              const assignId = (arr) => arr.forEach((i, index) => {
                let baseId = (i.bookingId && i.bookingId !== "--" && i.bookingId !== "") ? i.bookingId : ((i.refId && i.refId !== "--" && i.refId !== "") ? i.refId : i.name);
                // 🔴 FIX: Aakhir mein '-idx-' + index joda gaya hai taaki har row 100% unique rahe
                i.rid = 'row-' + String(baseId).replace(/[^a-zA-Z0-9]/g, '') + '-' + String(i.city).replace(/[^a-zA-Z0-9]/g, '') + '-idx-' + index;
              });

              globalData = {
                pending: data.pending.filter(i => isStrictlyValidRecord(i)),
                create: data.create.filter(i => isStrictlyValidRecord(i)),
                incomplete: data.incomplete.filter(i => isStrictlyValidRecord(i)),
                shared: data.shared.filter(i => isStrictlyValidRecord(i)),
                log: data.log.filter(i => isStrictlyValidRecord(i)),
                summary: data.summary,
                cities: data.cities,
                partnerTypes: data.partnerTypes
              };

              assignId(globalData.pending); assignId(globalData.create); assignId(globalData.incomplete); assignId(globalData.shared); assignId(globalData.log);

              // 🚀 ULTRA-FAST BOOT FIX: Data ko browser memory mein save kar lo
              try { localStorage.setItem('offline_dashboard_cache', JSON.stringify(globalData)); } catch (e) { }

              // ── 🛡️ BULLETPROOF UI RENDER ───────────────────────────────────────
              // updateUI() or renderList() crashing must NEVER prevent hideLoader().
              try {
                if (!isTyping) {
                  updateUI();
                  if ($('emailGenPage').classList.contains('active')) renderEmailGenerator(true);
                }
              } catch (uiError) {
                console.error('🔴 updateUI() crashed — forcing hideLoader() anyway:', uiError);
                if (typeof showToast === 'function') showToast('⚠️ UI render error. Try Force Sync.');
              }

              // 🚀 THE MAGIC FIX: Agar silent (background) task tha, toh main loader band mat karo!
              if (!isSilent) {
                hideLoader();
              } else {
                let syncDot = document.getElementById('sync-dot');
                if (syncDot) syncDot.classList.remove('spin');
              }

              isFetching = false;

            }).withFailureHandler((err) => {
              if (fetchSafetyTimer) clearTimeout(fetchSafetyTimer); // Defuse failsafe on backend error too
              if (myFetchId !== currentFetchId) return;
              console.error('Sync Error: ' + err);

              // 🚀 THE MAGIC FIX (For Errors too)
              if (!isSilent) {
                hideLoader();
              } else {
                let syncDot = document.getElementById('sync-dot');
                if (syncDot) syncDot.classList.remove('spin');
              }

              isFetching = false;
            }).getDashboardData($('date-start').value, $('date-end').value, $('search-input').value.trim());
        }

        /* 🟢 APPLY FILTERS & CUSTOM SELECT LOGIC 🟢 */
        function handleMultiCheck(type) {
          const drop = $(type + '-drop');
          const checkboxes = Array.from(drop.querySelectorAll('input[type="checkbox"]'));
          const allBox = checkboxes.find(c => c.value === "ALL");
          const clicked = event.target;

          if (clicked.value === "ALL" && clicked.checked) {
            checkboxes.forEach(c => { if (c.value !== "ALL") c.checked = false; });
          } else if (clicked.checked) {
            allBox.checked = false;
          }

          let selected = checkboxes.filter(c => c.checked).map(c => c.value);
          if (selected.length === 0) { allBox.checked = true; selected = ["ALL"]; }

          const textSpan = $(type + '-drop-text');
          if (selected.includes("ALL")) textSpan.innerText = type === 'city' ? "All Cities" : (type === 'type' ? "All Partners" : "All Users");
          else if (selected.length === 1) textSpan.innerText = selected[0];
          else textSpan.innerText = selected.length + " Selected";

          updateUI();
        }

        // Dropdown ke bahar click karne par use band karna
        document.addEventListener('click', function (e) {
          if (!e.target.closest('.custom-multi-select')) {
            document.querySelectorAll('.multi-drop-list').forEach(d => d.classList.remove('show'));
          }
        });

        function getFilteredData(source, ignoreTimeFilter = false) {
          const cityBoxes = Array.from(document.querySelectorAll('#city-drop input:checked') || []).map(c => c.value);
          const typeBoxes = Array.from(document.querySelectorAll('#type-drop input:checked') || []).map(c => c.value);
          const userBoxes = Array.from(document.querySelectorAll('#user-drop input:checked') || []).map(c => c.value);
          const searchF = $('search-input').value.toLowerCase().trim();

          let res = source || [];
          if (cityBoxes.length > 0 && !cityBoxes.includes("ALL")) res = res.filter(i => cityBoxes.includes(i.city));
          if (typeBoxes.length > 0 && !typeBoxes.includes("ALL")) res = res.filter(i => typeBoxes.includes((i.type || "").trim()));

          if (userBoxes.length > 0 && !userBoxes.includes("ALL")) {
            res = res.filter(i => {
              if (userBoxes.includes("API") && i.isApi) return true;
              if (userBoxes.includes("Manual") && !i.isApi) return true;
              return false;
            });
          }

          if (searchF) res = res.filter(i => (i.searchIndex && i.searchIndex.includes(searchF)));

          // 🔴 NAYA JADOO: Old vs Today Pending Filter (Fixed)
          if (currentTab === 'pending' && !ignoreTimeFilter) { // ignoreTimeFilter allows calculating KPI splits from overall pending list
            let pFilter = document.getElementById('pending-time-filter');
            let hideHighTat = document.getElementById('no-high-tat-cb') && document.getElementById('no-high-tat-cb').checked;

            if ((pFilter && pFilter.value !== 'ALL') || hideHighTat) {
              const now = new Date();
              const todayForComparison = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

              res = res.filter(item => {
                if (hideHighTat && String(item.status || "").toLowerCase().includes('high')) return false;

                if (!pFilter || pFilter.value === 'ALL') return true;

                let dStr = String(item.date || "").trim().split(" ")[0]; // Sirf date uthayega, time hatayega
                let itemDate = new Date(0);
                let parts = dStr.split(/[-/]/);

                if (parts.length === 3) {
                  let p1 = parseInt(parts[0], 10);
                  let p2 = parseInt(parts[1], 10);
                  let p3 = parseInt(parts[2], 10);
                  if (p3 > 1000) {
                    if (p2 > 12) itemDate = new Date(p3, p1 - 1, p2); // MM/DD/YYYY handle karega
                    else itemDate = new Date(p3, p2 - 1, p1); // Strictly DD/MM/YYYY format fix
                  } else if (p1 > 1000) {
                    itemDate = new Date(p1, p2 - 1, p3); // YYYY-MM-DD
                  }
                } else {
                  let d = new Date(dStr);
                  if (!isNaN(d.getTime())) itemDate = d;
                }
                itemDate.setHours(0, 0, 0, 0);

                if (pFilter.value === 'OLD') return itemDate.getTime() < todayForComparison.getTime();
                if (pFilter.value === 'TODAY') return itemDate.getTime() >= todayForComparison.getTime();
                return true;
              });
            }
          }

          return res;
        }

        function updateThemeBackground() {
          // 🔒 RESPECT USER'S CUSTOM THEME — only auto-switch for default green/orange/red
          const savedTheme = localStorage.getItem('saved_premium_theme');
          const autoThemes = ['theme-green', 'theme-orange', 'theme-red', null, undefined, ''];
          if (!autoThemes.includes(savedTheme)) return; // User chose ocean/emerald/sunset/aurora — never override

          let fPending = getFilteredData(globalData.pending);
          let baseClass = fPending.length >= 16 ? 'theme-red' : (fPending.length > 0 ? 'theme-orange' : 'theme-green');

          // 🔴 SURGICAL: Only swap the color-theme class, preserve dark-mode + style- classes
          const ALL_COLOR_THEMES = ['theme-ocean', 'theme-emerald', 'theme-sunset', 'theme-aurora', 'theme-green', 'theme-red', 'theme-orange'];
          ALL_COLOR_THEMES.forEach(t => document.body.classList.remove(t));
          document.body.classList.add(baseClass);

          // 🚀 Re-apply style class if it was accidentally removed
          const savedStyle = localStorage.getItem('hyperGlassThemeStyle');
          if (savedStyle && !document.body.classList.contains('style-' + savedStyle)) {
            document.body.classList.add('style-' + savedStyle);
          }
          // 🚀 Re-apply dark mode if it was accidentally removed
          if (localStorage.getItem('hg_darkMode') === 'true' && !document.body.classList.contains('dark-mode')) {
            document.body.classList.add('dark-mode');
          }
        }

        function updateUI() {
          // 1. Last Update Time check
          const lastUpdateEl = $('last-update');
          if (lastUpdateEl) {
            lastUpdateEl.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          // 2. Data Filtering (Strictly using your logic)
          let fPending = getFilteredData(globalData.pending),
            fCreate = getFilteredData(globalData.create),
            fIncomplete = getFilteredData(globalData.incomplete),
            fShared = getFilteredData(globalData.shared),
            fLog = getFilteredData(globalData.log);
          console.log("🔥 KPI COUNT:", fLog.length);
          console.log("🔥 KPI IDs:", fLog.map(item => item.bookingId));

          // 3. 🟢 PENDING SPLIT: Old vs Today (Strictly Column A Date)
          let totalPending = fPending.length;
          const now = new Date();
          const todayForComparison = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

          let oldPendingCount = 0;
          let todayPendingCount = 0;

          // 🚀 FIX: Calculate split from UNFILTERED pending list so counts don't vanish when one filter is active
          let allPendingItems = getFilteredData(globalData.pending, true); // True means ignore time filter

          allPendingItems.forEach(item => {
            let dStr = String(item.date || "").trim().split(" ")[0];
            let itemDate = new Date(0);
            let parts = dStr.split(/[-/]/);

            if (parts.length === 3) {
              let p1 = parseInt(parts[0], 10), p2 = parseInt(parts[1], 10), p3 = parseInt(parts[2], 10);
              if (p3 > 1000) { itemDate = p2 > 12 ? new Date(p3, p1 - 1, p2) : new Date(p3, p2 - 1, p1); }
              else if (p1 > 1000) { itemDate = new Date(p1, p2 - 1, p3); }
            } else {
              let d = new Date(dStr); if (!isNaN(d.getTime())) itemDate = d;
            }
            itemDate.setHours(0, 0, 0, 0);

            if (itemDate.getTime() < todayForComparison.getTime()) oldPendingCount++;
            else todayPendingCount++;
          });

          // Updating Pending KPI with Split Colors
          const kpiPend = $('kpi-pending');
          if (kpiPend) {
            kpiPend.innerHTML = `
              ${totalPending}
              <div style="font-size: 11px; font-weight: 700; margin-top: 6px; display: flex; gap: 5px; justify-content: center;">
                  <span style="color: #ef4444; background: rgba(239,68,68,0.1); padding: 1px 4px; border-radius: 4px;" title="Old Pending">Old: ${oldPendingCount}</span>
                  <span style="color: var(--text-sub);">|</span>
                  <span style="color: #3b82f6; background: rgba(59,130,246,0.1); padding: 1px 4px; border-radius: 4px;" title="Today's Pending">Tdy: ${todayPendingCount}</span>
              </div>
          `;
          }

          // 4. Standard KPI Updates
          // 🚀 FIX: Backend already filtered Shared for "Today", so we just use the length directly
          if ($('kpi-create')) $('kpi-create').innerText = fCreate.length;
          if ($('kpi-incomplete')) $('kpi-incomplete').innerText = fIncomplete.length;
          if ($('kpi-shared')) $('kpi-shared').innerText = fShared.length;

          // 5. 🟢 LOGS SPLIT: API vs Manual (From your latest requirements)
          let totalLogs = fLog.length;
          let apiLogsCount = fLog.filter(item => item.isApi === true).length;
          let manualLogsCount = totalLogs - apiLogsCount;

          const kpiLog = $('kpi-log');
          if (kpiLog) {
            kpiLog.innerHTML = `
              ${totalLogs}
              <div style="font-size: 11px; font-weight: 700; margin-top: 6px; display: flex; gap: 5px; justify-content: center;">
                  <span style="color: #10b981; background: rgba(16,185,129,0.1); padding: 1px 4px; border-radius: 4px;">API: ${apiLogsCount}</span>
                  <span style="color: var(--text-sub);">|</span>
                  <span style="color: #eab308; background: rgba(234,179,8,0.1); padding: 1px 4px; border-radius: 4px;">Man: ${manualLogsCount}</span>
              </div>
          `;

            // 🟢 DYNAMIC LABEL: "TODAYS LOGS" -> "TOTAL LOGS"
            let logLabel = kpiLog.nextElementSibling;
            let dateInput = $('date-start');
            if (logLabel && dateInput) {
              let d = new Date();
              let todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              logLabel.innerText = (dateInput.value && dateInput.value !== todayStr) ? "TOTAL LOGS" : "TODAYS LOGS";
            }
          }

          // 6. Tabs Visibility & Count (Essential for navigation)
          const toggleTab = (id, count) => {
            const btn = $('tab-' + id);
            if (btn) {
              btn.style.display = count === 0 ? 'none' : 'inline-block';
              if (count > 0) {
                let label = id.charAt(0).toUpperCase() + id.slice(1);
                if (id === 'log') label = 'All Logs';
                btn.innerText = `${label} (${count})`;
              }
            }
          };
          toggleTab('pending', fPending.length);
          toggleTab('create', fCreate.length);
          toggleTab('incomplete', fIncomplete.length);
          toggleTab('shared', fShared.length);
          toggleTab('log', fLog.length);

          document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
          if ($('tab-' + currentTab)) $('tab-' + currentTab).classList.add('active');

          if (typeof updateThemeBackground === "function") updateThemeBackground();

          // 7. Dropdown Population (City & Partner Type)
          const cityDrop = $('city-drop');
          if (cityDrop && cityDrop.children.length === 0 && globalData.cities) {
            cityDrop.innerHTML = `<label><input type="checkbox" value="ALL" checked onchange="handleMultiCheck('city')"> All Cities</label>` +
              globalData.cities.map(c => `<label><input type="checkbox" value="${c}" onchange="handleMultiCheck('city')"> ${c}</label>`).join('');
          }

          const typeDrop = $('type-drop');
          if (typeDrop && typeDrop.children.length === 0 && globalData.partnerTypes) {
            typeDrop.innerHTML = `<label><input type="checkbox" value="ALL" checked onchange="handleMultiCheck('type')"> All Partners</label>` +
              globalData.partnerTypes.map(t => `<label><input type="checkbox" value="${t}" onchange="handleMultiCheck('type')"> ${t}</label>`).join('');
          }

          // 8. City Summary & Full Page Table (Accurate Unique Counting)
          let cityStats = {};
          if (globalData.cities) {
            globalData.cities.forEach(c => { cityStats[c] = { total: 0, pending: 0, shared: 0, ppmc: 0, retail: 0 }; });

            let uniqueAll = new Map();
            [...fPending, ...fCreate, ...fIncomplete, ...fShared].forEach(item => {
              if (item && item.rid && !item.isHistorical) uniqueAll.set(item.rid, item);
            });

            let uniquePending = new Map();
            [...fPending, ...fCreate, ...fIncomplete].forEach(item => {
              if (item && item.rid && !item.isHistorical) uniquePending.set(item.rid, item);
            });

            let uniqueShared = new Map();
            fShared.forEach(item => {
              if (item && item.rid && !item.isHistorical) uniqueShared.set(item.rid, item);
            });

            let apiCount = 0, manualCount = 0;

            uniqueAll.forEach(item => {
              if (cityStats[item.city]) {
                cityStats[item.city].total++;
                if ((item.type || "").toLowerCase().includes("ppmc")) cityStats[item.city].ppmc++;
                else cityStats[item.city].retail++;
              }
              if (item.isApi) apiCount++; else manualCount++;
            });
            uniquePending.forEach(item => { if (cityStats[item.city]) cityStats[item.city].pending++; });
            uniqueShared.forEach(item => { if (cityStats[item.city]) cityStats[item.city].shared++; });

            // 🚀 Update Date Title in City Summary
            if (document.getElementById('city-summary-date-title')) {
              const ds = window.currentStartDate || document.getElementById('date-start').value;
              const de = window.currentEndDate || document.getElementById('date-end').value;
              const dStr = (ds === de) ? ds : `${ds} - ${de}`;
              document.getElementById('city-summary-date-title').innerText = "Data for: " + dStr;
            }

            let sumHtml = '', modalSumHtml = '';
            let cityLabels = [], cityPpmcData = [], cityRetailData = [];

            Object.keys(cityStats).sort().forEach(city => {
              let stats = cityStats[city];
              if (stats.total === 0 && stats.pending === 0 && stats.shared === 0) return;
              const pBadge = stats.pending > 0 ? 'badge-pend' : 'badge-zero';
              sumHtml += `<div class="city-row" onclick="openFullPage('cityFullPage')"><span style="cursor:pointer; text-decoration: underline;">${city}</span><div><span class="badge badge-total" title="Total Sample Mapped">${stats.total}</span> <span class="badge ${pBadge}" title="Currently Pending">${stats.pending}</span></div></div>`;

              modalSumHtml += `
                  <tr style="border-bottom: 1px solid #f8fafc; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 16px 20px; font-weight: 700; color: #1e293b;">${city}</td>
                    <td align="center" style="padding: 16px 20px;"><span style="font-weight:900; color:#3b82f6; background: #eff6ff; padding: 6px 12px; border-radius: 6px;">${stats.total}</span></td>
                    <td align="center" style="padding: 16px 20px;"><span style="font-weight:800; color:#10b981; background: #ecfdf5; padding: 6px 12px; border-radius: 6px;">${stats.shared}</span></td>
                    <td align="right" style="padding: 16px 20px;"><span class="badge ${pBadge}" style="font-size: 13px; padding: 6px 12px;">${stats.pending}</span></td>
                  </tr>`;

              cityLabels.push(city);
              cityPpmcData.push(stats.ppmc);
              cityRetailData.push(stats.retail);
            });

            if ($('city-summary')) $('city-summary').innerHTML = sumHtml || '<div style="padding:10px; font-size:11px;">No data matching filters</div>';
            if (document.getElementById('city-full-page-tbody')) document.getElementById('city-full-page-tbody').innerHTML = modalSumHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px;">No data matching filters</td></tr>';

            // 🚀 RENDER CITY CHARTS
            requestAnimationFrame(() => {
              if (typeof renderCitySummaryCharts === 'function') {
                try {
                  renderCitySummaryCharts(cityLabels, cityPpmcData, cityRetailData, apiCount, manualCount, uniqueShared.size, uniquePending.size);
                } catch (e) { console.error("Chart Render Error:", e); }
              }
            });
          }

          // 9. Final Render Trigger
          if (typeof renderList === "function") renderList();
        }

        function switchTab(t, avoidRender = false) { currentTab = t; currentlyExpandedRow = null; document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active')); if ($('tab-' + t)) $('tab-' + t).classList.add('active'); if (window.innerWidth <= 768) { $('sidebar').classList.remove('active-mobile'); $('mobile-overlay').classList.remove('active'); } if (!avoidRender) { VISIBLE_COUNT = 99999; renderList(); } }
        function showNext10() { VISIBLE_COUNT += 15; renderList(); }

        /* 🟢 RENDER MAIN LIST (ULTRA COMPACT, COPYABLE REF BY & UPDATED TAT) 🟢 */
        function renderList() {
          const tbody = $('main-list'); tbody.innerHTML = '';
          let data = getFilteredData(globalData[currentTab]);

          // 🔴 SORTING LOGIC: PPMC Priority + Time Sort
          data.sort((a, b) => {
            let aIsPPMC = (a.type || "").toLowerCase().includes("ppmc") ? 1 : 0;
            let bIsPPMC = (b.type || "").toLowerCase().includes("ppmc") ? 1 : 0;
            if (aIsPPMC !== bIsPPMC) return bIsPPMC - aIsPPMC;

            let tA = parseAnyDateTime(a.date, a.colTime) || new Date(0);
            let tB = parseAnyDateTime(b.date, b.colTime) || new Date(0);
            return (currentTab === 'log' || currentTab === 'shared') ? tB - tA : tA - tB;
          });

          if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">No records found. 🎉</td></tr>'; return; }

          const dataToShow = data.slice(0, VISIBLE_COUNT);

          dataToShow.forEach((item, index) => {
            const rid = item.rid;
            let uniqueRIds = [...new Set(item.rIds || (item.refId ? [item.refId] : []))].filter(Boolean);
            let reqIdsStr = uniqueRIds.join(",");
            let isNeedsCreation = (item.bookingId === "" || item.bookingId === "--");

            // 🌟 COMPACT IDs
            let rIdPills = uniqueRIds.map(id => `<div class="pill pill-req copyable" onclick="copyTxt('${id}'); event.stopPropagation();" style="margin-top:2px; font-size:9px; padding:2px 5px;">Req: ${id}</div>`).join('');

            let ids = isNeedsCreation ? `<div style="color:var(--danger); font-weight:800; font-size:11px; margin-bottom:2px;">No ID</div>` : `<div class="copyable" style="font-weight:800; font-size:13px; margin-bottom:2px;" onclick="copyTxt('${item.bookingId}'); event.stopPropagation();">${item.bookingId}</div>`;
            ids += `<div style="display:flex; flex-direction:column; gap:2px;">${rIdPills}</div>`;

            // 🚀 FIX: REFERRED BY - COMPACT & CLICK TO COPY
            let refName = item.drName || item.referredBy || item.refBy;
            if (refName && refName.trim() !== "" && refName !== "-" && refName.toLowerCase() !== "na") {
              let safeRefName = refName.replace(/'/g, "\\'");
              ids += `<div class="copyable" title="Click to copy" onclick="copyTxt('${safeRefName}'); event.stopPropagation();" style="margin-top: 4px; padding: 2px 4px; background: #fef2f2; border-left: 2px solid #ef4444; border-radius: 0 3px 3px 0; display: inline-block; cursor: pointer; width: fit-content;">
                              <div style="font-size: 8px; color: #b91c1c; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2px; line-height: 1;">Ref By:</div>
                              <div style="font-size: 10px; font-weight: 700; color: #7f1d1d; margin-top: 1px; line-height: 1.1;">${refName}</div>
                          </div>`;
            }

            let safeName = item.name ? item.name.replace(/'/g, "\\'") : "";
            let rawTrfLink = item.trfLink ? item.trfLink : '';
            let eyeColor = item.trfLink ? "#ec4899" : "#64748b";
            let eyeBg = item.trfLink ? "#fdf2f8" : "#f1f5f9";

            let trfViewBtn = `<button class="btn-apple" style="background:${eyeBg}; color:${eyeColor}; border: 1px solid ${item.trfLink ? '#fbcfe8' : '#e2e8f0'}; padding:2px 6px; font-size:9px; margin-top:2px;" onclick="openFloatingTrf('${rawTrfLink}', '${rid}', '${item.city}'); event.stopPropagation()">👁️ TRF</button><br>`;

            // 🌟 COMPACT DETAILS
            let details = `<div style="font-weight:800; font-size:12px; margin-bottom:2px;" class="copyable p-name" onclick="copyTxt('${safeName}'); event.stopPropagation();">${item.name}</div>${trfViewBtn}<div class="badges" style="margin-top:2px; display:flex; flex-wrap:wrap; gap:2px;">`;
            if (item.age) details += `<span class="pill" style="padding:2px 5px; font-size:9px;">👤 ${item.age}/${item.gender || '?'}</span>`;
            if (item.fbs) details += `<span class="pill" style="padding:2px 5px; font-size:9px;">🩸 ${item.fbs}</span>`;
            if (item.isApi) details += `<span class="pill" style="padding:2px 5px; font-size:9px; background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; font-weight: 700;">💜 API Bkg</span>`;
            if (item.barcode && item.barcode !== 'Not given' && item.barcode !== '-' && item.barcode.toLowerCase() !== 'na') details += `<span class="pill copyable" style="padding:2px 5px; font-size:9px;" onclick="copyTxt('${item.barcode}'); event.stopPropagation();">🏷️ ${item.barcode}</span>`;

            let isPPMC = (item.type || "").toLowerCase().includes("ppmc");
            let typeColor = isPPMC ? 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;' : 'background: rgba(100,116,139,0.1); color: var(--text-main);';
            if (item.type && item.type !== '-') details += `<span class="pill" style="padding:2px 5px; font-size:9px; ${typeColor}">🏢 ${item.type}</span>`;

            if (item.isDuplicate) details += `<span class="pill pill-dup" style="padding:2px 5px; font-size:9px;">⚠️ Dup</span>`;
            if (item.caseType === 'Add-on') details += `<span class="pill" style="padding:2px 5px; font-size:9px; background: rgba(236, 72, 153, 0.1); color: #ec4899; border-color: rgba(236, 72, 153, 0.2);">➕ Add-on</span>`;
            if (item.caseType === 'Missing') details += `<span class="pill" style="padding:2px 5px; font-size:9px; background: rgba(249, 115, 22, 0.1); color: #f97316; border-color: rgba(249, 115, 22, 0.2);">❓ Missing</span>`;

            let logsText = item.auditLogs || "";
            if (logsText.includes("[AI-AUTO]")) {
              let filledMatch = logsText.match(/\[AI-AUTO\] Filled: (.*?)\./);
              let filledWhat = filledMatch ? filledMatch[1] : "data";
              details += `<span class="pill" style="padding:2px 5px; font-size:9px; background: linear-gradient(135deg, #faf5ff, #f3e8ff); color: #9333ea; border: 1px solid #d8b4fe; font-weight: bold; cursor: help;" title="AI ne khud bhara: ${filledWhat}">✨ AI Filled</span>`;
            }
            if (logsText.includes("[AI-DOUBT]")) {
              let doubtMatch = logsText.match(/\[AI-DOUBT\] Unreadable: (.*?)\./);
              let doubtWhat = doubtMatch ? doubtMatch[1] : "Kuch samajh nahi aaya";
              details += `<span class="pill" style="padding:2px 5px; font-size:9px; background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; font-weight: bold; cursor: help;" title="TRF theek se nahi padha gaya. Doubt in: ${doubtWhat}">⚠️ AI Doubt</span>`;
            }

            details += `</div>`;

            let actionHtml = '', stLow = (item.status || '').toLowerCase(), sColor = stLow.includes('share') ? 'var(--success)' : (stLow.includes('high') ? 'var(--danger)' : (stLow.includes('process') ? 'var(--warning)' : 'var(--text-main)'));

            if (currentTab === 'create') {
              let apiBtn = !isPPMC ? `<button class="btn-apple" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border-color: rgba(139, 92, 246, 0.3); font-size: 9px; padding: 4px 6px; margin-left: 4px;" onclick="handleInstantBookingPaste('${rid}', {value:'API Bkg'}, '${item.city}', '${item.bookingId}', '${safeName}', '${reqIdsStr}'); event.stopPropagation()" title="Mark as API">⚡ API</button>` : '';
              actionHtml = `<div style="font-size:9px; font-weight:700; color:var(--text-sub); margin-bottom:2px;">Paste ID & Enter:</div>
                  <div style="display:flex; align-items:stretch;">
                      <input type="text" class="new-booking-input" placeholder="Booking ID..." style="flex:1; padding:2px 4px; font-size:10px;" onchange="handleInstantBookingPaste('${rid}', this, '${item.city}', '${item.bookingId}', '${safeName}', '${reqIdsStr}')" onfocus="pauseSync()" onblur="resumeSync()" onclick="event.stopPropagation()">
                      ${apiBtn}
                  </div>`;
            }
            else if (currentTab === 'incomplete') actionHtml = `<div style="display:flex; flex-direction:column; gap:4px; max-width:240px;" onclick="event.stopPropagation()"><div style="display:flex; gap:2px; flex-wrap:wrap;"><input type="text" id="inc-col-${rid}" value="${(item.colTime && item.colTime !== '-') ? item.colTime : ''}" placeholder="Col Time" style="width:115px; padding:2px 4px; font-size:10px;" onfocus="pauseSync()" onblur="resumeSync()" ${item.colTime && item.colTime !== '-' ? 'disabled class="clean-input"' : 'class="missing-input"'}><input type="text" id="inc-age-${rid}" value="${item.age || ''}" placeholder="Age" style="width:45px; padding:2px 4px; font-size:10px;" onfocus="pauseSync()" onblur="resumeSync()" ${item.age ? 'disabled class="clean-input"' : 'class="missing-input"'}><select id="inc-gender-${rid}" style="width:65px; padding:2px 4px; font-size:10px;" onfocus="pauseSync()" onblur="resumeSync()" ${item.gender ? 'disabled class="clean-input"' : 'class="missing-select"'}><option value="">Sex</option><option ${item.gender === 'Male' ? 'selected' : ''}>Male</option><option ${item.gender === 'Female' ? 'selected' : ''}>Female</option></select><select id="inc-fbs-${rid}" style="width:85px; padding:2px 4px; font-size:10px; color:#d97706;" onfocus="pauseSync()" onblur="resumeSync()" ${item.fbs ? 'disabled class="clean-input"' : 'class="missing-select"'}><option value="">FBS/RBS</option><option value="FBS" ${item.fbs === 'FBS' ? 'selected' : ''}>FBS</option><option value="RBS" ${item.fbs === 'RBS' ? 'selected' : ''}>RBS</option><option value="Only Urine" ${item.fbs === 'Only Urine' ? 'selected' : ''}>Only Urine</option><option value="N/A" ${item.fbs === 'N/A' ? 'selected' : ''}>N/A</option></select></div><div style="display:flex; gap:2px;"><input type="text" id="inc-bid-${rid}" value="${!isNeedsCreation ? item.bookingId : ''}" placeholder="Booking ID" style="width:100%; padding:2px 4px; font-size:10px;" onfocus="pauseSync()" onblur="resumeSync()" ${!isNeedsCreation ? 'disabled class="clean-input"' : 'class="missing-input"'}></div><button class="btn-apple btn-primary" style="padding: 4px; font-size: 10px; justify-content: center; width: 100%; font-weight:700;" onclick="updateIncompleteRow('${rid}', '${item.city}', '${item.bookingId}', '${safeName}', '${reqIdsStr}', event)">💾 Smart Save</button></div>`;
            else actionHtml = `<select class="status-select" id="status-${rid}" style="color:${sColor}; border-color:${sColor}; padding: 2px 6px; font-size:11px;" onchange="autoSaveRow('${rid}', this, '${item.city}', '${item.bookingId}', '${safeName}', '${reqIdsStr}')" onfocus="pauseSync()" onblur="resumeSync()" onclick="event.stopPropagation()"><option value="Pending" ${stLow.includes('pending') || stLow === '' ? 'selected' : ''}>Pending</option><option value="Under processing" ${stLow.includes('process') ? 'selected' : ''}>Under processing</option><option value="High TAT" ${stLow.includes('high') ? 'selected' : ''}>High TAT</option><option value="N/A" ${stLow === 'n/a' || stLow === 'na' ? 'selected' : ''}>N/A</option><option value="Shared" ${stLow.includes('share') ? 'selected' : ''}>Shared</option></select>`;

            // 🔴 NAYA DYNAMIC TAT LOGIC (Sirf 2 options: Col ya Creat)
            let timerHtml = '';
            if (isNeedsCreation) {
              timerHtml = `<div class="tat-timer" style="background: rgba(128,128,128,0.1); color: var(--text-sub); padding: 2px 6px; font-size:9px;">⏳ Pending Creation</div>`;
            } else if (currentTab === 'incomplete') {
              timerHtml = `<div class="tat-timer" style="background: rgba(245, 158, 11, 0.1); color: var(--warning); padding: 2px 6px; font-size:9px;">⏳ Awaiting Details</div>`;
            } else {
              let tatInfo = getDynamicTat(item);
              timerHtml = `<div style="font-size: 9px; font-weight: 700; color: ${tatInfo.color}; display: flex; align-items: center; margin-top: 3px; background: ${tatInfo.color}15; padding: 2px 6px; border-radius: 4px; border: 1px solid ${tatInfo.color}40; width: max-content;">
                                  ⏰ ${tatInfo.text} ${tatInfo.badge}
                              </div>`;
            }

            let rowClass = isNeedsCreation ? 'compact-row row-highlight' : 'compact-row';
            let expClass = (currentlyExpandedRow === rid) ? 'expanded' : '';

            let phleboInfo = '';
            if (item.phleboName) phleboInfo = `<div>💉 Phlebo: <b style="color:var(--text-main);">${item.phleboName}</b> ${item.phleboPhone ? `<span style="font-size:10px; color:var(--text-sub);">(${item.phleboPhone})</span>` : ''}</div>`;
            let locInfo = item.loc ? `<div style="font-size:9px; font-weight:600; color:var(--text-sub); margin-top:1px;">📍 ${item.loc}</div>` : '';

            let mixedStyle = item.isMixed ? 'background: rgba(126, 34, 206, 0.08) !important; border-left: 4px solid #7e22ce !important;' : '';

            // 🌟 COMPACT TD PADDING
            let tdStyle = 'padding: 6px 8px; vertical-align: top; border-bottom: 1px solid var(--border-light);';

            const row = `
              <tr class="${rowClass} ${expClass}" id="${rid}" style="animation-delay: ${index * 0.02}s; ${mixedStyle}; cursor:pointer;" onclick="toggleRow('${rid}', event)">
                  <td style="${tdStyle} white-space:nowrap;"><div style="font-weight:700; color:var(--primary-dark); font-size:12px; margin-bottom:2px;">${item.city}</div><div style="font-size:10px; color:var(--text-sub); font-weight:600;">📅 ${item.date}</div><div style="font-size:9px; font-weight:600; color:var(--text-sub); margin-top:1px;">🕒 ${item.colTime || '-'}</div>${locInfo}</td>
                  <td style="${tdStyle}">${ids}</td>
                  <td style="${tdStyle}">${details}</td>
                  <td style="${tdStyle}">${actionHtml}<br>${timerHtml}</td>
                  <td style="${tdStyle} text-align: right; vertical-align: middle;"><span class="expand-icon" id="icon-${rid}">▼</span></td>
              </tr>
              <tr class="details-row" style="display:${expClass ? 'table-row' : 'none'};" id="details-${rid}">
                  <td colspan="5" style="padding:0;">
                      <div class="details-content allow-text-select" onmousedown="event.stopPropagation();" onclick="event.stopPropagation();">
                          
                          <div class="details-col allow-text-select">
                              <span class="details-title" style="color: var(--primary);">📦 Package Details</span>
                              <div style="margin-bottom:8px; display: flex; flex-wrap: wrap; gap: 6px;">
                                  ${item.tests ? item.tests.map(t => `<div class="allow-text-select" style="display:inline-block; background: var(--input-bg); padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-main); border: 1px solid var(--border-light); cursor: text;">${t}</div>`).join('') : '<span style="font-size:11px; color:var(--text-sub);">No tests assigned</span>'}
                              </div>
                              
                              <div class="compact-info-grid">
                                  <div class="compact-info-item" style="grid-column: span 2; background: rgba(79, 70, 229, 0.05); border-color: rgba(79, 70, 229, 0.15);">
                                      <span class="compact-info-label" style="color: var(--primary);">💉 Phlebotomist</span>
                                      <span class="compact-info-val allow-text-select" style="font-size: 13px; font-weight: 700; cursor: text;">${item.phleboName || 'Unassigned'} ${item.phleboPhone ? `<span style="font-size: 11px; font-weight: 500; color: var(--text-sub);">(${item.phleboPhone})</span>` : ''}</span>
                                  </div>
                                  <div class="compact-info-item">
                                      <span class="compact-info-label">🩸 Col. Time</span>
                                      <span class="compact-info-val">${item.colTime || '-'}</span>
                                  </div>
                                  <div class="compact-info-item">
                                      <span class="compact-info-label">📥 Sub. Time</span>
                                      <span class="compact-info-val">${item.subTime || '-'}</span>
                                  </div>
                                  <div class="compact-info-item" style="grid-column: span 2;">
                                      <span class="compact-info-label">⚡ Bkg Creation</span>
                                      <span class="compact-info-val" style="color:var(--primary); font-size: 12px;">${item.latestSubTime || '-'}</span>
                                  </div>
                              </div>
                          </div>

                          <div class="details-col allow-text-select">
                              <span class="details-title" style="color:#a855f7;">🤖 AI Assistant</span>
                              <div style="display: flex; gap: 8px; margin-top: 8px;">
                                  <button type="button" class="btn-apple btn-ai-sparkle premium-btn-wide" onclick="pauseSync(); categorizeTestsAI('${rid}');">🪄 Breakdown Tests</button>
                              </div>
                              <div style="display: flex; gap: 6px; margin-top: 8px;">
                                  <input type="text" id="ai-search-${rid}" class="clean-input" style="padding: 10px 12px; font-size: 12px; flex: 1; border-color: #a855f7; border-style: dashed;" placeholder="Search test names..." onfocus="pauseSync()" onblur="resumeSync()" onkeypress="if(event.key === 'Enter') searchAltTestName('${rid}')">
                                  <button type="button" class="btn-apple btn-primary" style="padding: 10px 14px; background: #a855f7; border-radius: 8px; box-shadow: 0 4px 10px rgba(168,85,247,0.3);" onclick="searchAltTestName('${rid}')">🔍</button>
                              </div>
                              
                              <div id="ai-result-box-${rid}" class="allow-text-select" style="margin-top: 12px; background: var(--input-bg); border: 1px solid #a855f7; padding: 16px; border-radius: 10px; display: none; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px; white-space: pre-wrap; line-height: 1.6; position: relative; box-shadow: inset 0 2px 8px rgba(168,85,247,0.1);">
                                  <div style="position: absolute; top: 8px; right: 8px;">
                                      <button type="button" onclick="document.getElementById('ai-result-box-${rid}').style.display='none';" style="background: rgba(239, 68, 68, 0.1); border: none; cursor: pointer; color: var(--danger); font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; transition: 0.2s;">✕ Close</button>
                                  </div>
                                  <div id="ai-result-content-${rid}" class="allow-text-select" style="padding-top: 10px; cursor: text;"></div>
                              </div>
                          </div>

                          <div class="details-col allow-text-select">
                              <span class="details-title" style="color: var(--success);">💬 Comms & Logs</span>

                              <div style="margin-bottom: 12px;">
                                  <span class="details-title" style="color: var(--primary); font-size: 11px; margin-bottom: 4px; display: block;">📝 Quick Remarks</span>
                                  <textarea id="note-${rid}" class="clean-input" style="width: 100%; min-height: 60px; padding: 10px; font-size: 12px; border-radius: 8px; border: 1px dashed var(--primary); background: rgba(0,122,255,0.02); resize: vertical;" placeholder="Type remarks here... (Autosaves on change)" onfocus="pauseSync()" onblur="resumeSync()" onchange="autoSaveRow('${rid}', this, '${item.city}', '${item.bookingId}', '${safeName}', '${reqIdsStr}')">${item.remarks || ''}</textarea>
                              </div>

                              <button class="btn-apple premium-btn-wide" style="background: var(--input-bg); border: 1px solid var(--border-light); color: var(--text-main); margin-bottom: 8px;" onclick="openEditModal('${rid}');">
                                  ✏️ Edit Full Record
                              </button>

                              <button class="btn-apple premium-btn-wide" style="background: rgba(0, 122, 255, 0.05); color: var(--primary); border: 1px solid rgba(0, 122, 255, 0.2);" onclick="openCommentModal('${rid}', '${item.bookingId || item.refId}', '${safeName.replace(/'/g, "\\'")}');">
                                  💬 View / Add Comments
                              </button>
                              <div style="margin-top: 16px; font-size: 11px; color: var(--text-sub); text-align: center; font-style: italic; line-height: 1.5;">
                                  Activity logs and external communications are stored here. Select text freely from anywhere in this window.
                              </div>
                          </div>
                      </div>
                  </td>
              </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
          });

          if (VISIBLE_COUNT < data.length) {
            tbody.insertAdjacentHTML('beforeend', `<tr><td colspan="5" style="text-align:center; padding:15px;"><button class="btn-apple" onclick="showNext10(); event.stopPropagation();">Load More (${data.length - VISIBLE_COUNT} remaining)</button></td></tr>`);
          }

          // 🚀 NAYA FIX: List refresh hone ke baad Locks ko wapas paint karo
          if (typeof window.updateLiveLocksUI === 'function') {
            window.updateLiveLocksUI();
          }
        }

        /* 🟢 SMART TOGGLE ROW 🟢 */
        function toggleRow(rid, event) {
          if (event) {
            let t = event.target.tagName;
            if (t === 'INPUT' || t === 'SELECT' || t === 'BUTTON' || event.target.classList.contains('copyable')) return;
          }

          let detailsRow = document.getElementById('details-' + rid);
          let mainRow = document.getElementById(rid);
          let icon = document.getElementById('icon-' + rid);

          if (currentlyExpandedRow === rid) {
            detailsRow.style.display = 'none';
            mainRow.classList.remove('expanded');
            if (icon) icon.innerText = '▼';
            currentlyExpandedRow = null;
            if (typeof releaseLockFirebase === 'function') releaseLockFirebase(rid);
          } else {
            if (currentlyExpandedRow) {
              let oldDetails = document.getElementById('details-' + currentlyExpandedRow);
              let oldMain = document.getElementById(currentlyExpandedRow);
              let oldIcon = document.getElementById('icon-' + currentlyExpandedRow);
              if (oldDetails) oldDetails.style.display = 'none';
              if (oldMain) oldMain.classList.remove('expanded');
              if (oldIcon) oldIcon.innerText = '▼';
              if (typeof releaseLockFirebase === 'function') releaseLockFirebase(currentlyExpandedRow);
            }

            detailsRow.style.display = 'table-row';
            mainRow.classList.add('expanded');
            if (icon) icon.innerText = '▲';
            currentlyExpandedRow = rid;
            if (typeof acquireLockFirebase === 'function') acquireLockFirebase(rid);
          }
        }

        function updateTimers() { document.querySelectorAll('.dynamic-timer').forEach(el => { const ds = el.dataset; const status = (ds.status || '').toLowerCase(); let baseStr = tatBaseIdx === 'col' ? ds.col : (tatBaseIdx === 'sub' ? ds.sub : ds.creat); if (!baseStr || baseStr === '-' || baseStr === '--' || baseStr === 'N/A') { if (tatBaseIdx === 'creat') baseStr = ds.sub; if (!baseStr || baseStr === '-' || baseStr === 'N/A') baseStr = ds.col; } const baseTime = parseAnyDateTime(ds.date, baseStr); if (!baseTime) { el.innerHTML = '⏳ Awaiting Time Data'; el.className = 'tat-timer timer-neutral'; return; } if (status.includes('share')) { const shareTime = parseAnyDateTime(ds.date, ds.share); if (shareTime) { let diff = shareTime - baseTime; if (diff < 0) diff += 86400000; const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000); el.innerHTML = `✅ Shared in ${h}h ${m}m`; el.className = 'tat-timer timer-done'; } else { el.innerHTML = '✅ Shared (No Time)'; el.className = 'tat-timer timer-done'; } } else { const targetTime = baseTime.getTime() + 21600000; const now = new Date().getTime(); const left = targetTime - now; if (left > 0) { const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000); el.innerHTML = `⏱️ ${h}h ${m}m left`; el.className = left < 3600000 ? 'tat-timer timer-warn' : 'tat-timer timer-safe'; } else { const late = Math.abs(left), h = Math.floor(late / 3600000), m = Math.floor((late % 3600000) / 60000); el.innerHTML = `🚨 Late by ${h}h ${m}m`; el.className = 'tat-timer timer-danger'; } } }); }

        /* 🟢 INSTANT AUTO SAVE & OPTIMISTIC UI (100% FAST) 🟢 */
        function autoSaveRow(rid, changedEl, city, bId, patientName, reqIdsStr) {
          let newStatus = document.getElementById('status-' + rid) ? document.getElementById('status-' + rid).value : "N/A";
          let newRemarks = document.getElementById('note-' + rid) ? document.getElementById('note-' + rid).value : "";
          let userName = window.currentUser ? window.currentUser.name : "Unknown User";

          // 1. Dropdown ka color turant Green/Yellow karo
          if (changedEl && changedEl.tagName === "SELECT" && changedEl.classList.contains("status-select")) {
            const sColor = newStatus.toLowerCase().includes('share') ? 'var(--success)' : (newStatus.toLowerCase().includes('high') ? 'var(--danger)' : (newStatus.toLowerCase().includes('process') ? 'var(--warning)' : 'var(--text-main)'));
            changedEl.style.color = sColor; changedEl.style.borderColor = sColor;
          }

          // 2. Firebase Ping - Dusre users ki screen par animation bhejo
          if (changedEl && changedEl.classList.contains('status-select')) {
            if (typeof window.fireGlobalSyncPing === 'function') {
              window.fireGlobalSyncPing('STATUS_UPDATE', rid, newStatus);
            }
          }

          // 3. KHUD KI SCREEN SE TURANT GAYAB KARO (0.2 sec magic)
          let stLow = newStatus.toLowerCase();
          if (currentTab !== 'shared' && currentTab !== 'log' && stLow.includes('share')) {
            let row = document.getElementById(rid);
            let detailsRow = document.getElementById('details-' + rid);

            // Turant slide-out animation do
            if (row) {
              row.style.transition = "all 0.3s ease-out";
              row.style.opacity = "0";
              row.style.transform = "translateX(50px)";

              // 0.3 second baad screen se hamesha ke liye delete kar do
              setTimeout(() => {
                if (row) row.remove();
                if (detailsRow) detailsRow.remove();
              }, 300);
            }

            // Background Data array se bhi hata do taaki tab switch karne par wapas na aaye
            if (typeof globalData !== 'undefined' && globalData[currentTab]) {
              let idx = globalData[currentTab].findIndex(i => i.rid === rid);
              if (idx > -1) {
                let item = globalData[currentTab].splice(idx, 1)[0];
                item.status = newStatus;
                if (globalData.shared) globalData.shared.unshift(item);
              }
            }
            showToast("Moved to Shared!");
            engageWriteLock(3); // 🚀 Block polling for 3s while backend writes (Firebase bypasses this)
          } else {
            if (changedEl && changedEl.tagName !== "INPUT") changedEl.style.opacity = '0.5';
          }

          // 4. Background mein chup-chap Google Sheet me save karo
          google.script.run.withSuccessHandler(res => {
            _writeLockUntil = 0; // 🚀 Release lock — backend confirmed
            if (changedEl) changedEl.style.opacity = '1';
            // Agar record Shared nahi hua hai, tabhi refresh karo
            if (!stLow.includes('share')) {
              fetchData(true);
            }
          }).withFailureHandler(err => {
            _writeLockUntil = 0; // 🚀 Release lock on error too
            alert("Error: " + err);
            if (changedEl) changedEl.style.opacity = '1';
          }).updateRecord(city, bId, patientName, newStatus, newRemarks, "", reqIdsStr, "", "", "", "", userName);
        }

        function updateIncompleteRow(rid, city, oldBid, name, reqIdsStr, event) {
          if (event) event.stopPropagation();
          let nBid = $('inc-bid-' + rid) ? $('inc-bid-' + rid).value.trim() : "";
          let na = $('inc-age-' + rid) ? $('inc-age-' + rid).value : "";
          let ng = $('inc-gender-' + rid) ? $('inc-gender-' + rid).value : "";
          let nfbs = $('inc-fbs-' + rid) ? $('inc-fbs-' + rid).value : "";
          let ncol = $('inc-col-' + rid) ? $('inc-col-' + rid).value : "";

          let hasPatientDetails = (na !== "" && ng !== "" && nfbs !== "" && ncol !== "");
          let hasBookingId = (nBid !== "");

          // Validations: Requires either Booking ID OR Patient details to proceed
          if (!hasPatientDetails && !hasBookingId) {
            showToast("Please fill Booking ID OR all Patient Details!");
            return;
          }

          let userName = window.currentUser ? window.currentUser.name : "Unknown User";

          // Optimistic UI update
          let idx = globalData.incomplete.findIndex(i => i.rid === rid);
          if (idx > -1) {
            let item = globalData.incomplete.splice(idx, 1)[0];
            item.bookingId = nBid; item.age = na; item.gender = ng; item.fbs = nfbs; item.colTime = ncol;

            if (hasBookingId) {
              globalData.pending.unshift(item); // ID found -> Send to Pending
              showToast("ID Found! Moved to Pending.");
            } else {
              globalData.create.unshift(item); // No ID but details full -> Send to 'To Create'
              showToast("Details Saved! Moved to To Create.");
            }
          }

          currentlyExpandedRow = null;
          updateUI();
          engageWriteLock(3); // 🚀 Block polling for 3s while backend writes (Firebase bypasses this)

          google.script.run.withSuccessHandler(() => {
            _writeLockUntil = 0; // 🚀 Release lock — backend confirmed
            fetchData(true);
          }).withFailureHandler((e) => {
            _writeLockUntil = 0; // 🚀 Release lock on error too
            alert("Error: " + e);
            fetchData(true);
          }).updateRecord(city, oldBid, name, "", $('note-' + rid) ? $('note-' + rid).value : "", nBid, reqIdsStr, na, ng, nfbs, ncol, userName);
        }

        function handleInstantBookingPaste(rid, el, city, oldBid, name, reqIdsStr) {
          let nb = el.value.trim();
          if (!nb) return;
          let userName = window.currentUser ? window.currentUser.name : "Unknown User";

          // Optimistic UI update
          let idx = globalData.create.findIndex(i => i.rid === rid);
          if (idx > -1) {
            let item = globalData.create.splice(idx, 1)[0];
            item.bookingId = nb;
            globalData.pending.unshift(item);
          }

          currentlyExpandedRow = null;
          updateUI();
          showToast("ID Added! Moved to Pending.");
          engageWriteLock(3); // 🚀 Block polling for 3s while backend writes (Firebase bypasses this)

          google.script.run.withSuccessHandler(() => {
            _writeLockUntil = 0; // 🚀 Release lock — backend confirmed
            fetchData(true);
          }).withFailureHandler(e => {
            _writeLockUntil = 0; // 🚀 Release lock on error too
            alert(e);
            fetchData(true);
          }).updateRecord(city, oldBid, name, "", $('note-' + rid) ? $('note-' + rid).value : "", nb, reqIdsStr, "", "", "", "", userName);
        }

        function categorizeTestsAI(rid) {
          const box = document.getElementById('ai-result-box-' + rid);
          const content = document.getElementById('ai-result-content-' + rid);
          const item = globalData[currentTab].find(i => i.rid === rid);
          if (!item || !item.tests || item.tests.length === 0) { showToast("No tests to categorize."); return; }

          box.style.display = 'block';
          content.innerHTML = `Categorizing ${item.tests.length} tests... ⏳`;

          // 🔴 ULTIMATE STRICT PROMPT FOR GROQ
          const prompt = `You are a strict Medical Lab Director. Categorize the input tests into exactly 4 MUTUALLY EXCLUSIVE groups. 
  CRITICAL RULE: A test can ONLY belong to ONE category. NEVER repeat a test in multiple categories.

  INPUT DATA:
  ${item.tests.join(' | ')}

  CATEGORY RULES:
  1. LFT: Liver tests ONLY (ALT, AST, ALP, Bilirubin, GGT, Albumin, Globulin, Total Protein). STRICT: NEVER put KFT or Kidney Function Test here!
  2. KFT: Kidney tests ONLY (BUN, Urea, Creatinine, Uric Acid, Electrolytes, "Kidney Function Test", "KFT").
  3. Urine: Any test explicitly containing "Urine", "CUE", "Cotinine", or "Nicotine".
  4. Others: Everything else (RBS, FBS, HbA1c, Lipid, CBC, Haemogram, HbsAg, HIV, ESR, Iron, etc.).

  INSTRUCTION: 
  Do not output any explanations. Output EXACTLY 4 lines in this exact format using short names:

  LFT (count): [Test1|Test2]
  KFT (count): [Test1|Test2]
  Urine (count): [Test1|Test2]
  Others (count): [Test1|Test2]`;

          google.script.run
            .withSuccessHandler(res => {
              // 🔴 NAYA JADOO: AI ke "Enter" (\n) ko HTML ke "<br>" me badal diya taaki 4 alag lines aayen
              let formattedRes = res ? res.replace(/\n/g, '<br>') : "No result from AI.";

              content.innerHTML = `<b style="color:#a855f7; font-size:13px; display:block; margin-bottom:8px;">📊 Test Breakdown:</b><div style="line-height: 1.6; font-size: 11.5px; font-weight: 500;">${formattedRes}</div>`;
            })
            .withFailureHandler(err => {
              content.innerHTML = `<span style="color:var(--danger)">Error fetching categories: ${err.message}</span>`;
            })
            .callGeminiAPI(prompt, 0.0); // ✅ FIX: Isey wapas callGeminiAPI kar diya hai kyunki backend function ka naam yahi hai
        }

        function searchAltTestName(rid) {
          const input = $('ai-search-' + rid);
          const q = input.value.trim();
          if (!q) return;

          const box = $('ai-result-box-' + rid);
          const content = $('ai-result-content-' + rid);

          box.style.display = 'block';
          content.innerHTML = `Searching alternative names for "${q}"... ⏳`;

          const prompt = `What are the common medical alternative names or abbreviations for the lab test: "${q}"? Give a very short, direct answer in 1-2 lines.`;

          google.script.run.withSuccessHandler(res => {
            content.innerHTML = `<b style="color:#a855f7; font-size:14px; display:block; margin-bottom:8px;">🔍 Search Result for "${q}":</b><div style="line-height: 1.8; color: var(--text-main); font-weight: 500;">${res}</div>`;
            input.value = "";
          }).withFailureHandler(err => {
            content.innerHTML = `<span style="color:var(--danger)">Error searching.</span>`;
          }).callGrokAPI(prompt, 0.1); // 🔴 Yahan bhi callGrokAPI laga diya hai
        }

        /* 🟢 GMAIL STYLE E-MAIL GENERATOR LOGIC 🟢 */
        const emailConfig = {
          cc: "appointments@redcliffelabs.com, jayraj@redcliffelabs.com, sandeep.rawat@redcliffelabs.com, dropoff@redcliffelabs.com",
          to: {
            "Delhi NCR": "srnoida@redcliffelabs.com, bhagwan.singh@redcliffelabs.com, diveak.rustogi@redcliffelabs.com, abhishekrajput485@gmail.com, abhishek.negi@redcliffelabs.com, laboperations.faridabad@redcliffelabs.com, laboperations.gurgaon@redcliffelabs.com",
            "Mumbai": "laboperations.mumbai@redcliffelabs.com, bhupendra.singh@redcliffelabs.com",
            "Lucknow": "laboperations.lucknow@redcliffelabs.com, raghvendra.shukla@redcliffelabs.com, bushra.sarwar@redcliffelabs.com",
            "Chandigarh": "laboperation.chandigarh@redcliffelabs.com, anita.bhatti@redcliffelabs.com",
            "Jaipur": "laboperations.jaipur@redcliffelabs.com, deepak.deepak@redcliffelabs.com",
            "Chennai": "dhivakar.r@redcliffelabs.com, laboperations.chennai@redcliffelabs.com",
            "Mohali": "laboperation.chandigarh@redcliffelabs.com, anita.bhatti@redcliffelabs.com",
            "Kolkata": "laboperations.kolkata@redcliffelabs.com, sandip.kundu@redcliffelabs.com",
            "Pune": "laboperations.pune@redcliffelabs.com, laboperations.punepcmc@redcliffelabs.com, sumit.tiwari@redcliffelabs.com"
          }
        };
        let cityEmailGroups = {}; let currentActiveCity = null;

        function openEmailGenerator() { $('emailGenPage').classList.add('active'); renderEmailGenerator(); }

        function renderEmailGenerator(preserveSelection = false) {
          cityEmailGroups = {};

          let allData = [
            ...(globalData.pending || []),
            ...(globalData.log || []),
            ...(globalData.create || [])
          ];

          let uniqueMap = new Map();
          allData.forEach(item => {
            if (item && item.bookingId && item.bookingId !== "--" && item.bookingId !== "") {
              uniqueMap.set(item.bookingId, item);
            }
          });

          let mergedData = Array.from(uniqueMap.values());

          // 🌟 NAYA DATE FILTER (BULLETPROOF DATE PARSING)
          let today = new Date();
          today.setHours(0, 0, 0, 0);

          mergedData.forEach(item => {
            let bId = String(item.bookingId).trim();
            let mStatus = item.mailStatus ? String(item.mailStatus).trim().toLowerCase() : "";

            let isToday = false;
            if (item.date) {
              // 🚀 FIX: Time ko pehle hatao taaki date parsing fail na ho
              let dStr = String(item.date).trim().split(" ")[0];
              let itemDate = new Date(0); // Default

              let parts = dStr.split(/[-/]/);
              if (parts.length === 3) {
                let p1 = parseInt(parts[0], 10);
                let p2 = parseInt(parts[1], 10);
                let p3 = parseInt(parts[2], 10);

                if (p3 > 1000) {
                  // DD/MM/YYYY ya MM/DD/YYYY
                  if (p2 > 12) itemDate = new Date(p3, p1 - 1, p2);
                  else itemDate = new Date(p3, p2 - 1, p1);
                } else if (p1 > 1000) {
                  // YYYY-MM-DD
                  itemDate = new Date(p1, p2 - 1, p3);
                }
              } else {
                let d = new Date(dStr);
                if (!isNaN(d.getTime())) itemDate = d;
              }

              itemDate.setHours(0, 0, 0, 0);

              // Compare with Today
              if (itemDate.getTime() === today.getTime()) {
                isToday = true;
              }
            }

            if (mStatus !== "sent" && isToday) {
              if (!cityEmailGroups[item.city]) cityEmailGroups[item.city] = [];
              cityEmailGroups[item.city].push(item);
            }
          });

          const tabsContainer = document.getElementById('email-tabs-container');
          if (!tabsContainer) return;
          tabsContainer.innerHTML = '';
          let hasData = false;

          for (let city in cityEmailGroups) {
            hasData = true;
            const count = cityEmailGroups[city].length;
            const div = document.createElement('div');
            div.className = `city-tab ${currentActiveCity === city ? 'active' : ''}`;
            div.onclick = (e) => selectEmailCity(city, e);
            div.innerHTML = `<span class="city-tab-title">${city}</span> <span class="badge badge-pend">${count}</span>`;
            tabsContainer.appendChild(div);
          }

          if (!hasData) {
            tabsContainer.innerHTML = `<div style="padding: 20px; color: var(--text-sub); text-align: center; font-size: 12px;">No pending emails for today.</div>`;
            document.getElementById('email-compose-area').style.display = 'none';
            document.getElementById('email-empty-state').style.display = 'flex';
            document.getElementById('email-empty-state').innerHTML = `<div style="font-size: 50px;">🎉</div><div>All drafts generated for today!</div>`;
          } else if (!preserveSelection || !cityEmailGroups[currentActiveCity]) {
            selectEmailCity(Object.keys(cityEmailGroups)[0]);
          }
        }

        function getFormattedDateForSubject() { const d = new Date(), months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], date = d.getDate(); let nth = "th"; if (date === 1 || date === 21 || date === 31) nth = "st"; else if (date === 2 || date === 22) nth = "nd"; else if (date === 3 || date === 23) nth = "rd"; return date + nth + " " + months[d.getMonth()]; }

        function selectEmailCity(city, event) {
          currentActiveCity = city;
          document.querySelectorAll('.city-tab').forEach(el => el.classList.remove('active'));
          if (event && event.currentTarget) event.currentTarget.classList.add('active');
          else if (document.querySelector('.city-tab')) document.querySelector('.city-tab').classList.add('active');

          $('email-empty-state').style.display = 'none';

          // 🚀 THE CSS NUKE: Purane saare design locks todne ke liye
          if (!document.getElementById('css-nuke')) {
            let style = document.createElement('style');
            style.id = 'css-nuke';
            style.innerHTML = `
                  /* Main right side area ko poora failana */
                  #email-compose-area { flex: 1 !important; width: 100% !important; max-width: 100% !important; padding: 20px !important; box-sizing: border-box !important; overflow-y: auto !important; height: calc(100vh - 100px) !important; }
                  /* Dark header aur white box ke wrapper ko 100% width dena */
                  #email-compose-area > div, #email-compose-area > form { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
                  /* Saare Text boxes (To, Cc, Subject) ko lamba karna */
                  #email-compose-area input { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
              `;
            document.head.appendChild(style);
          }

          let composeArea = document.getElementById('email-compose-area');
          if (composeArea) composeArea.style.display = 'block';

          const toEmails = emailConfig.to[city] || "update_email@redcliffelabs.com";
          const sender = $('sender-name').value || "Kuldeep Singh Bisht";
          const dateStr = getFormattedDateForSubject();

          $('em-to').value = toEmails;
          $('em-cc').value = emailConfig.cc;
          $('em-sub').value = `Medibuddy Sample Drop Off || ${dateStr} || ${city}`;

          let chkDiv = document.getElementById('bkg-selector');
          if (!chkDiv) {
            chkDiv = document.createElement('div');
            chkDiv.id = 'bkg-selector';
            chkDiv.style.cssText = "margin-top:10px; margin-bottom:10px; padding:10px; background:#f0fdf4; border-radius:6px; border:1px dashed #22c55e; width: 100% !important; box-sizing: border-box !important;";
            let emBody = document.getElementById('em-body');
            emBody.parentNode.insertBefore(chkDiv, emBody);
          }

          let checkboxesHtml = `<div style="font-size:12px; font-weight:bold; margin-bottom:8px; color:#166534;">✅ Tick/Untick Booking IDs to manage the table below:</div><div style="display:flex; flex-wrap:wrap; gap:8px;">`;
          cityEmailGroups[city].forEach((item) => {
            checkboxesHtml += `<label style="font-size:12px; cursor:pointer; background:#fff; border:1px solid #ccc; padding:4px 8px; border-radius:4px; display:flex; align-items:center; gap:4px;">
                  <input type="checkbox" checked value="${item.bookingId}" class="mail-bkg-cb" onchange="buildEmailTable()"> <b>${item.bookingId}</b>
              </label>`;
          });
          checkboxesHtml += `</div>`;
          chkDiv.innerHTML = checkboxesHtml;

          window.tempCityItems = cityEmailGroups[city];
          window.tempSender = sender;

          buildEmailTable();
        }

        window.buildEmailTable = function () {
          let selectedIds = Array.from(document.querySelectorAll('.mail-bkg-cb:checked')).map(cb => cb.value);

          let tableHtml = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 600px; max-width: 100%; text-align: center; vertical-align: middle; margin-top: 10px; margin-bottom: 15px; border: 1px solid black; font-size:13px;">
          <tr style="background-color: yellow; font-weight: bold;">
              <th style="border: 1px solid black; padding:6px;">Red Cliffe booking ID</th>
              <th style="border: 1px solid black; padding:6px;">Name</th>
              <th style="border: 1px solid black; padding:6px;">Age</th>
              <th style="border: 1px solid black; padding:6px;">Gender</th>
          </tr>`;

          window.tempCityItems.forEach(item => {
            if (selectedIds.includes(item.bookingId)) {
              let printAge = item.age ? item.age : '';
              tableHtml += `<tr>
                      <td style="border: 1px solid black; font-weight: bold; color: #007AFF; padding:6px;">${item.bookingId}</td>
                      <td style="border: 1px solid black; padding:6px;">${item.name}</td>
                      <td style="border: 1px solid black; padding:6px;">${printAge}</td>
                      <td style="border: 1px solid black; padding:6px;">${item.gender || ''}</td>
                  </tr>`;
            }
          });
          tableHtml += `</table>`;

          let emBody = document.getElementById('em-body');

          emBody.innerHTML = `
          <div style="font-family: Arial, sans-serif; font-size: 13px; color: #333; text-align: left;">
              <p style="margin:0 0 5px 0;">Hi Team,</p>
              <p style="margin:0 0 5px 0;">Kindly find the Booking ids mentioned below.</p>
              <p style="margin:0 0 10px 0;">Kindly update the FBS/RBS status and age as per the TRF.</p>
          </div>
          ${tableHtml}
          <div style="font-family: Arial, sans-serif; font-size: 13px; color: #333; text-align: left;">
              <p style="margin:0;">Regards,<br><b>${window.tempSender}</b><br>Strategic Alliances (B2B Operations)<br>Redcliffelabs</p>
          </div>`;

          // Text area ko bhi 100% chauda aur thoda lamba kar diya
          emBody.style.width = "100%";
          emBody.style.maxWidth = "100%";
          emBody.style.height = "280px";
          emBody.style.overflowY = "auto";
          emBody.style.border = "1px solid #ccc";
          emBody.style.padding = "15px";
          emBody.style.backgroundColor = "#fff";
          emBody.style.boxSizing = "border-box";
          emBody.style.marginBottom = "20px";
        };

        function optimizeDraftWithBishtJi() { const bodyHtml = $('em-body').innerHTML; showLoader('ai'); let instruction = "Rewrite the intro and outro to sound highly professional and urgent. Keep the HTML table untouched and center aligned."; google.script.run.withSuccessHandler(res => { $('em-body').innerHTML = res; hideLoader(); showToast("Text Optimized by Bisht Ji ✨"); }).withFailureHandler(err => { hideLoader(); alert("Bisht Ji Optimizer error: " + err); }).optimizeEmailWithBishtJi(bodyHtml, instruction); }

        function generateFinalDraft() {
          if (!currentActiveCity || !cityEmailGroups[currentActiveCity]) return;

          const to = $('em-to').value, cc = $('em-cc').value, sub = $('em-sub').value, bodyHtml = $('em-body').innerHTML;

          const bIdsArray = Array.from(document.querySelectorAll('.mail-bkg-cb:checked')).map(cb => cb.value);
          if (bIdsArray.length === 0) { showToast("⚠️ No Booking IDs selected!"); return; }

          showLoader('email');
          google.script.run.withSuccessHandler(res => {
            hideLoader();
            $('successPopupText').innerText = res;
            $('successPopup').classList.add('show');

            let allLists = [globalData.pending, globalData.log, globalData.create];
            allLists.forEach(list => {
              if (list) {
                list.forEach(item => {
                  if (item.city === currentActiveCity && bIdsArray.includes(item.bookingId)) {
                    item.mailStatus = "Sent";
                  }
                });
              }
            });

            renderEmailGenerator();
            fetchData(true);
          }).withFailureHandler(err => {
            hideLoader();
            alert("Error: " + err);
          }).createCityEmailDraft(currentActiveCity, sub, bodyHtml, to, cc, bIdsArray);
        }

        function markAlreadyEmailed() {
          if (!currentActiveCity || !cityEmailGroups[currentActiveCity]) return;

          const bIdsArray = Array.from(document.querySelectorAll('.mail-bkg-cb:checked')).map(cb => cb.value);
          if (bIdsArray.length === 0) { showToast("⚠️ No Booking IDs selected!"); return; }

          if (!confirm(`Kya aap waqai in ${bIdsArray.length} bookings ko list se hatana chahte hain? (Draft generate nahi hoga)`)) return;

          showLoader('email');
          google.script.run.withSuccessHandler(res => {
            hideLoader();
            showToast("✅ " + res);

            let allLists = [globalData.pending, globalData.log, globalData.create];
            allLists.forEach(list => {
              if (list) {
                list.forEach(item => {
                  if (item.city === currentActiveCity && bIdsArray.includes(item.bookingId)) {
                    item.mailStatus = "Sent";
                  }
                });
              }
            });

            renderEmailGenerator();
          }).withFailureHandler(err => {
            hideLoader();
            alert("Error: " + err);
          }).markMailsAsSentDB(bIdsArray);
        }
        /* 🟢 AI CHAT (BISHT JI) 🟢 */
        function toggleAiPanel() { $('aiPanel').classList.toggle('active'); } let isVoiceOutputEnabled = true, recognition = null; if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) { const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition; recognition = new SpeechRec(); recognition.lang = 'hi-IN'; recognition.onstart = () => $('aiMicBtn').classList.add('recording'); recognition.onresult = (e) => { $('aiInput').value = e.results[0][0].transcript; sendToBishtJi(); }; recognition.onend = () => $('aiMicBtn').classList.remove('recording'); }
        function toggleDictation() { if (recognition) { if ($('aiMicBtn').classList.contains('recording')) recognition.stop(); else recognition.start(); } } function toggleVoiceOutput() { isVoiceOutputEnabled = !isVoiceOutputEnabled; $('aiSpeakerToggle').innerText = isVoiceOutputEnabled ? "🔊" : "🔇"; window.speechSynthesis.cancel(); } function speakText(text) { if (!isVoiceOutputEnabled || !('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); let u = new SpeechSynthesisUtterance(text.replace(/[*#]/g, '')); u.lang = 'en-IN'; window.speechSynthesis.speak(u); }
        let aiCooldownActive = false; function sendToBishtJi() { const input = $('aiInput'); const msg = input.value.trim(); if (!msg || aiCooldownActive) return; input.value = ''; $('aiBody').innerHTML += `<div class="chat-bubble chat-user">${msg}</div>`; const typingId = 'typing-' + Date.now(); $('aiBody').innerHTML += `<div class="chat-bubble chat-ai" id="${typingId}">Bisht Ji analyzing data... ⏳</div>`; $('aiBody').scrollTop = $('aiBody').scrollHeight; lockAiControls(true); let rawData = getFilteredData(globalData.log), uniqueRecordsMap = new Map(); rawData.forEach(i => { let uniqueKey = i.bookingId && i.bookingId !== "--" && i.bookingId !== "" ? i.bookingId : `${i.name}_${i.city}`; if (!uniqueRecordsMap.has(uniqueKey)) uniqueRecordsMap.set(uniqueKey, { Loc: i.city, Date: i.date, ID: i.bookingId, Age: i.age, Stat: i.status, ColT: i.colTime, SubT: i.subTime, CreT: i.latestSubTime, ShrT: i.shareTime }); }); let compressedData = Array.from(uniqueRecordsMap.values()); let payload = JSON.stringify({ context: { dates: `${$('date-start').value} to ${$('date-end').value}`, cityFilter: $('city-filter').value }, uniqueData: compressedData }); google.script.run.withSuccessHandler(res => { const bubble = $(typingId); bubble.innerHTML = res; speakText(res); startAiCooldown(5, "Wait: "); $('aiBody').scrollTop = $('aiBody').scrollHeight; }).withFailureHandler(err => { $(typingId).innerHTML = "Error analyzing data."; lockAiControls(false); }).askBishtJiAdvanced(msg, payload); }
        function lockAiControls(l) { aiCooldownActive = l; $('aiInput').disabled = l; $('aiMicBtn').style.opacity = l ? '0.5' : '1'; document.querySelector('.ai-send').style.opacity = l ? '0.5' : '1'; } function startAiCooldown(sec, prefix) { let r = sec; const int = setInterval(() => { $('aiInput').placeholder = prefix + r + "s"; r--; if (r < 0) { clearInterval(int); $('aiInput').placeholder = "Ask Bisht Ji..."; lockAiControls(false); } }, 1000); }

        /* 🟢 AUDIT REPORT LOGIC 🟢 */
        let globalAuditData = [];

        function fetchAuditData() {
          showLoader('fetch');
          const s = $('audit-date-start').value;
          const e = $('audit-date-end').value;
          google.script.run.withSuccessHandler(res => {
            globalAuditData = res.reports;
            let cSel = $('audit-filter-city');
            let currVal = cSel.value;
            cSel.innerHTML = '<option value="ALL">All Cities</option>' + res.cities.map(c => `<option value="${c}">${c}</option>`).join('');
            cSel.value = res.cities.includes(currVal) ? currVal : "ALL";
            filterAndRenderAudit();
            hideLoader();
          }).withFailureHandler(err => { hideLoader(); alert("Audit Error: " + err); }).getAuditAnalytics(s, e);
        }

        function filterAndRenderAudit() {
          const city = $('audit-filter-city').value;
          const reason = $('audit-filter-reason').value;

          let filtered = globalAuditData;
          if (city !== "ALL") filtered = filtered.filter(r => r.city === city);
          if (reason !== "ALL") filtered = filtered.filter(r => r.reason === reason);

          let tbody = $('audit-body'); tbody.innerHTML = '';
          let onTime = 0, late = 0;

          filtered.forEach(r => {
            if (r.reason === 'Late') late++; else onTime++;
            let bg = r.reason === 'Late' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)';
            tbody.innerHTML += `<tr style="background:${bg}; border-bottom:1px solid var(--border-light);">
                  <td style="padding:10px;"><div style="font-weight:700;">${r.city}</div><div style="font-size:11px; color:var(--text-sub);">${r.bId} | ${r.name}</div></td>
                  <td style="padding:10px; font-size:11px; line-height:1.6;"><div>Sub: <b>${r.subTime || '-'}</b></div><div>Creat: <b>${r.latestSubTime || '-'}</b></div><div>Share: <b style="color:var(--primary);">${r.shareTime || '-'}</b></div></td>
                  <td style="padding:10px;"><div class="badge" style="background:${r.reasonColor}; color:white;">${r.reason}</div><div style="font-size:11px; margin-top:4px; font-weight:700;">TAT: ${r.tat}</div></td>
                  <td style="padding:10px; font-size:11px; color:var(--text-sub);">${r.remarks || '-'}</td>
              </tr>`;
          });

          if (filtered.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No audit records found.</td></tr>';

          $('aud-total').innerText = filtered.length;
          $('aud-ontime').innerText = onTime;
          $('aud-late').innerText = late;
          $('aud-pending').innerText = "0";
        }

        function getAiAuditInsights() {
          $('audit-ai-box').style.display = 'block';
          $('audit-ai-text').innerText = 'Bisht Ji is analyzing audit data... ⏳';
          google.script.run.withSuccessHandler(res => { $('audit-ai-text').innerText = res; }).withFailureHandler(err => { $('audit-ai-text').innerText = "Error getting insights."; }).getAiAuditSummary($('audit-date-start').value, $('audit-date-end').value);
        }

        function downloadAuditCSV() {
          showLoader('fetch');
          const s = $('audit-date-start').value, e = $('audit-date-end').value, c = $('audit-filter-city').value, r = $('audit-filter-reason').value;
          google.script.run.withSuccessHandler(csv => {
            hideLoader(); const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Audit_${s}.csv`; a.click();
          }).withFailureHandler(err => { hideLoader(); alert(err); }).downloadAuditCsv(s, e, c, 'ALL', r, '');
        }
        // =========================================================
        // 🟢 ZERO-DELAY FIREBASE REALTIME SYNC (NO QUOTA LIMIT) 🟢
        // =========================================================
        function canAutoSync() {
          if (document.visibilityState !== 'visible') return false;
          if (isTyping) return false;
          if (Date.now() < _writeLockUntil) return false; // 🚀 WRITE-LOCK: Block stale fetches after optimistic writes
          if (currentlyExpandedRow) return false; // LOCK RE-ENABLED: Do not auto sync if working in a card
          if (document.querySelector('.modal-overlay.active')) return false; // Fixed spelling typo here
          if (document.querySelector('.full-page-view.active')) return false;
          if (!window.currentUser) return false;
          return true;
        }

        // 1. FIREBASE MAGIC: Direct Millisecond Sync (Bina Google ke)
        setTimeout(() => {
          if (!window.firebaseDB) return;
          const syncRef = window.firebaseRef(window.firebaseDB, 'global_sync/latest_action');

          window.firebaseOnValue(syncRef, (snapshot) => {
            const action = snapshot.val();

            if (!action || !window.currentUser) return;

            // 🚀 NAYA: DATA_CHANGED from backend — SABHI USERS ko turant fresh data dena hai
            if (action.type === "DATA_CHANGED" && action.user === "SYSTEM") {
              if (Date.now() - action.timestamp < 15000) {
                console.log("⚡ Backend DATA_CHANGED detected! Force-fetching for KPI sync...");
                _writeLockUntil = 0; // Write lock hatao — backend ne confirm kiya hai
                fetchData(true);
              }
              return;
            }

            // Agar main khud kar raha hu, to ignore karo
            if (action.user === window.currentUser.name) return;

            // Sirf turant wale (pichle 10 sec) actions ko allow karo
            if (Date.now() - action.timestamp < 10000) {

              // 🟢 1. Agar kisi ne Dropdown se Status change kiya hai
              if (action.type === "STATUS_UPDATE") {
                let idx = globalData.pending.findIndex(i => i.rid === action.rid);
                if (idx > -1) {
                  let item = globalData.pending[idx];
                  item.status = action.status;

                  // Agar dusre ne 'Shared' kiya hai to pending se hata kar shared me daal do!
                  if (action.status.toLowerCase() === 'shared') {
                    globalData.pending.splice(idx, 1);
                    globalData.shared.unshift(item);
                    updateUI(); // ⚡ TURANT SCREEN UPDATE (0 Delay)
                    if (typeof showToast === 'function') showToast(`⚡ ${action.user} marked ${item.name} as Shared!`);
                  } else {
                    updateUI();
                  }
                }
              }

              // 🚀 2. NAYA: Agar kisi ne Incomplete Tab se "Smart Save" kiya hai!
              if (action.type === "SMART_SAVE") {
                let idx = globalData.incomplete.findIndex(i => i.rid === action.rid);
                if (idx > -1) {
                  let item = globalData.incomplete.splice(idx, 1)[0]; // Incomplete se hatao

                  // Naya data item mein daalo
                  item.bookingId = action.status.bId;
                  item.age = action.status.age;
                  item.gender = action.status.gender;
                  item.fbs = action.status.fbs;
                  item.colTime = action.status.colTime;
                  item.status = "Pending";

                  let targetTab = action.status.bId ? 'pending' : 'create';
                  if (globalData[targetTab]) globalData[targetTab].unshift(item); // Naye tab mein daalo

                  updateUI(); // ⚡ TURANT SCREEN UPDATE
                  if (typeof showToast === 'function') showToast(`⚡ ${action.user} updated a Missing TRF!`);
                }
              }
            }
          });
        }, 3000);

        // 2. Apni taraf se Pura Data Bhejna
        window.fireGlobalSyncPing = function (actionType, rowId, newValue) {
          if (!window.firebaseDB) return;
          const syncRef = window.firebaseRef(window.firebaseDB, 'global_sync/latest_action');
          window.firebaseSet(syncRef, {
            type: actionType,
            rid: rowId,
            status: newValue,
            user: window.currentUser.name,
            timestamp: Date.now()
          });
        };

        // 3. Refresh data every 2.5 seconds background check
        setInterval(() => {
          if (canAutoSync()) fetchData(true);
        }, 2500); // 2.5 seconds

        document.addEventListener('visibilitychange', () => {
          if (canAutoSync()) fetchData(true);
        });
      </script>
      <div id="smartExportModal" class="modal-overlay">
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">✨ Smart Excel Export</h2>
              <div style="font-size: 12px; color: var(--text-sub); margin-top: 4px;">Tick the columns.
                Data exports based on Dashboard filters.</div>
            </div>
            <button class="close-btn"
              onclick="document.getElementById('smartExportModal').classList.remove('active'); setTimeout(() => document.getElementById('smartExportModal').style.display='none', 200);">✕</button>
          </div>

          <div id="export-checkboxes"
            style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0 10px 0; max-height: 250px; overflow-y: auto; padding: 15px; border: 1px solid var(--border-light); border-radius: 8px; background: #f9fafb;">
          </div>

          <div style="margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
            <div style="padding: 10px; background: #fff3cd; border: 1px solid #ffe69c; border-radius: 6px;">
              <label
                style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: bold; color: #664d03; cursor: pointer;">
                <input type="checkbox" id="include-missing-cb" style="width: 16px; height: 16px;">
                Include Missing Booking IDs / 'To Create' / Incomplete Cases
              </label>
            </div>

            <div style="padding: 10px; background: #f8d7da; border: 1px solid #f5c2c7; border-radius: 6px;">
              <label
                style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: bold; color: #842029; cursor: pointer;">
                <input type="checkbox" id="include-cancelled-cb" style="width: 16px; height: 16px;">
                Include 'Not Collected' / 'Cancelled' / 'Rejected' Cases
              </label>
            </div>
          </div>

          <div
            style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-light);">
            <div style="display: flex; gap: 10px;">
              <button class="btn-apple"
                style="padding: 6px 12px; font-size: 12px; background: white; color: black; border: 1px solid #ccc;"
                onclick="selectAllExport(true)">Tick All</button>
              <button class="btn-apple"
                style="padding: 6px 12px; font-size: 12px; background: white; color: black; border: 1px solid #ccc;"
                onclick="selectAllExport(false)">Untick All</button>
            </div>
            <button class="btn-apple btn-primary" style="background: #10b981;" onclick="executeSmartExport()">📊
              Download Excel</button>
          </div>
        </div>
      </div>

      <script>
