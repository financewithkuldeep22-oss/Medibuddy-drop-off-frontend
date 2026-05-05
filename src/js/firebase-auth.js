      
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
        import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
        import { getDatabase, ref, set, onValue, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";

        window.firebaseRef = ref;
        window.firebaseSet = set;
        window.firebaseOnValue = onValue;
        window.firebaseRemove = remove;
        window.firebaseOnDisconnect = onDisconnect;

        const firebaseConfig = {
          apiKey: "AIzaSyCn9xu7X_mPSEup983RVh2TIZd5gr1g7UQ",
          authDomain: "redcliffelabsxmedibuddy.firebaseapp.com",
          projectId: "redcliffelabsxmedibuddy",
          storageBucket: "redcliffelabsxmedibuddy.firebasestorage.app",
          messagingSenderId: "394770690215",
          appId: "1:394770690215:web:9e3afcfcc422fb0b64eb82",
          measurementId: "G-ERXLB7YDRF"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        const database = getDatabase(app);
        window.firebaseDB = database;

        // 🚀 PRO-MAX: Firebase User Preferences Engine
        window.saveUserPreferences = function () {
          if (!window.currentUser || !window.firebaseDB) return;
          const prefRef = window.firebaseRef(window.firebaseDB, 'users/' + window.currentUser.name.replace(/[^a-zA-Z0-9]/g, '') + '/preferences');
          const prefs = {
            theme: localStorage.getItem('saved_premium_theme') || 'theme-green',
            style: localStorage.getItem('hyperGlassThemeStyle') || 'glassmorphism',
            darkMode: localStorage.getItem('hg_darkMode') === 'true',
            cursor: localStorage.getItem('hg_cursorPreset') || 'liquid-drop',
            timestamp: Date.now()
          };
          window.firebaseSet(prefRef, prefs).catch(e => console.error("Pref save error:", e));
        };

        window.loadUserPreferences = function () {
          if (!window.currentUser || !window.firebaseDB) {
            bootFastApp();
            showWelcomeTourModal();
            return;
          }
          const prefRef = window.firebaseRef(window.firebaseDB, 'users/' + window.currentUser.name.replace(/[^a-zA-Z0-9]/g, '') + '/preferences');
          window.firebaseOnValue(prefRef, (snapshot) => {
            const prefs = snapshot.val();
            if (prefs) {
              if (prefs.theme) { localStorage.setItem('saved_premium_theme', prefs.theme); window.setUiTheme(prefs.theme, true); }
              if (prefs.style) { localStorage.setItem('hyperGlassThemeStyle', prefs.style); window.setThemeStyle(prefs.style); }
              if (prefs.darkMode !== undefined) {
                localStorage.setItem('hg_darkMode', prefs.darkMode);
                if (prefs.darkMode) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
                let themeBtn = document.getElementById('theme-btn');
                if (themeBtn) themeBtn.innerHTML = '⚙️';
              }
              if (prefs.cursor) { localStorage.setItem('hg_cursorPreset', prefs.cursor); window.setCursorPreset(prefs.cursor); }
            }
            bootFastApp();
            showWelcomeTourModal();
          }, { onlyOnce: true });
        };

        window.handleEmailLogin = function () {
          const email = document.getElementById('login-email').value.trim(); const pass = document.getElementById('login-password').value;
          if (!email || !pass) { showToast("Enter email and password!"); return; }
          document.getElementById('email-login-btn').innerText = "Authenticating...";

          signInWithEmailAndPassword(auth, email, pass).then((userCredential) => {
            // 🚀 FIX: Agar Sheet mein galti se logout ho gaya tha, toh manully UI hide karo aur data load karo
            if (window.ENV_IS_SHEET) {
              let user = userCredential.user;
              let dName = user.displayName || user.email.split('@')[0];
              window.currentUser = { name: dName, email: user.email };
              document.getElementById('login-overlay').classList.add('hidden');
              document.getElementById('sender-name').value = window.currentUser.name;
              document.getElementById('user-display-name').innerText = window.currentUser.name;
              document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(window.currentUser.name)}&background=007AFF&color=fff`;

              document.getElementById('email-login-btn').innerHTML = "Login with Email <span style='margin-left:6px; font-size: 16px;'>→</span>";
              bootFastApp();
              showWelcomeTourModal();
            }
          }).catch((error) => {
            alert("Login Failed: " + error.message);
            document.getElementById('email-login-btn').innerHTML = "Login with Email <span style='margin-left:6px; font-size: 16px;'>→</span>";
          });
        };

        window.handleGoogleLogin = function () {
          // 🚀 FIX: Google Sheet ke andar popups block hote hain, toh user ko guide kar do
          if (window.ENV_IS_SHEET) {
            alert("⚠️ Google Security Notice\n\nGoogle Sign-In popup is blocked inside Google Sheets.\n\nIf you accidentally logged out, please either use 'Login with Email' OR close this popup and click 'Open Live Dashboard' again to auto-login!");
            return;
          }

          let btnText = document.getElementById('login-btn-text');
          btnText.innerText = "Authenticating...";

          signInWithPopup(auth, provider).then((result) => {
            btnText.innerText = "Sign in with Google";
          }).catch((error) => {
            btnText.innerText = "Sign in with Google";
            if (error.code !== 'auth/popup-closed-by-user') {
              alert("❌ Google Login Failed!\n\nReason: " + error.message);
            }
          });

          // Failsafe for Normal Web App
          setTimeout(() => {
            if (btnText.innerText === "Authenticating...") {
              btnText.innerText = "Sign in with Google";
              alert("⚠️ Google Popup Blocked!\n\nPlease check if your browser is blocking popups for this site.");
            }
          }, 10000);
        };

        window.handleForgotPassword = function () {
          const email = document.getElementById('login-email').value.trim();
          if (!email) {
            showToast("Enter your email address first to reset password!");
            document.getElementById('login-email').focus();
            return;
          }
          document.getElementById('forgot-password-text').innerText = "Sending Link...";
          sendPasswordResetEmail(auth, email)
            .then(() => {
              showToast("Password reset link sent to your email!");
              document.getElementById('forgot-password-text').innerText = "Forgot Password?";
            })
            .catch((error) => {
              alert("Error: " + error.message);
              document.getElementById('forgot-password-text').innerText = "Forgot Password?";
            });
        };

        window.handleLogout = function (event) {
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }

          // 1. UI aur memory instantly clear karo
          window.currentUser = null;
          document.getElementById('login-overlay').classList.remove('hidden');
          document.getElementById('main-list').innerHTML = '';
          document.getElementById('login-btn-text').innerText = "Sign in with Google";
          document.getElementById('email-login-btn').innerHTML = "Login with Email <span style='margin-left:6px; font-size: 16px;'>→</span>";
          document.getElementById('login-email').value = "";
          document.getElementById('login-password').value = "";
        };

        // 🚀 BOOT ACCELERATOR ENGINE
        function bootFastApp() {
          fetchData(false); // Always fetch fresh data on app start
          if (typeof google !== 'undefined' && google.script && window.currentUser && window.currentUser.email) {
            google.script.run
              .withSuccessHandler(function (ud) {
                if (ud && typeof window.applyGranularPermissions === 'function') window.applyGranularPermissions(ud);
              })
              .getUserData(window.currentUser.email);
          }
        }

        /* ═══════════════════════════════════════════════════
           🎯 BISHT JI TOUR ENGINE — HYPER-GLASS 2.0 JS
           ═══════════════════════════════════════════════════ */

        class DashboardTourEngine {
            constructor(steps, options = {}) {
                this.steps = steps;
                this.options = {
                    typewriterSpeed: 28,
                    apiEndpoint: 'https://api.redcliffe.com/bisht-ji-ai',
                    ...options
                };
                this.currentIndex = 0;
                this.isRunning = false;
                this.deepDiveActive = false;
                
                this.overlayEl = null;
                this.spotlightEl = null;
                this.tooltipEl = null;
                
                this._boundHandleKeydown = this.handleKeydown.bind(this);
                
                this.init();
            }

            init() {
                // 1. Create Overlay wrapper
                this.overlayEl = document.getElementById('tour-overlay');
                if (!this.overlayEl) {
                    this.overlayEl = document.createElement('div');
                    this.overlayEl.id = 'tour-overlay';
                    document.body.appendChild(this.overlayEl);
                }
                
                // 2. Build DOM
                this._buildDOM();
                
                // 3. Listeners
                this._attachDelegatedListeners();
            }

            _buildDOM() {
                this.overlayEl.innerHTML = `
                    <div class="tour-spotlight-box"></div>
                    <div class="tour-tooltip-panel">
                        <div class="tour-step-progress">
                            <div class="tour-step-progress-inner" style="width: 0%"></div>
                        </div>
                        <div class="tour-tp-body">
                            <div class="tour-tp-header">
                                <div class="tour-avatar-ring">👨‍💼</div>
                                <div class="tour-tp-meta">
                                    <div class="tour-tp-step-label">Step 1 of ${this.steps.length}</div>
                                    <div class="tour-tp-title">Bisht Ji Assistant</div>
                                </div>
                            </div>
                            <div class="tour-dialogue-text" data-full-text=""></div>
                            
                            <div class="tour-ai-chat-zone">
                                <div class="tour-ai-inner">
                                    <textarea class="tour-ai-input" placeholder="Ask Bisht Ji about this..."></textarea>
                                    <div class="tour-ai-send-row">
                                        <button class="tour-ai-send-btn" data-tour-action="sendToAI">Ask AI</button>
                                    </div>
                                    <div class="tour-ai-response-box"></div>
                                </div>
                            </div>

                            <button class="tour-ai-toggle" data-tour-action="toggleAI">
                                ✨ Ask Bisht Ji (AI)
                            </button>

                            <div class="tour-nav-bar">
                                <button class="tour-btn tour-btn--skip" data-tour-action="skip">Skip</button>
                                <div style="display: flex; gap: 8px;">
                                    <button class="tour-btn tour-btn--prev" data-tour-action="prev">Back</button>
                                    <button class="tour-btn tour-btn--deepdive" data-tour-action="deepdive">Explore Deep Dive</button>
                                    <button class="tour-btn tour-btn--next" data-tour-action="next">Next</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                this.spotlightEl = this.overlayEl.querySelector('.tour-spotlight-box');
                this.tooltipEl = this.overlayEl.querySelector('.tour-tooltip-panel');
            }

            start(startIndex = 0) {
                this.isRunning = true;
                this.overlayEl.classList.add('tour-running');
                this.currentIndex = startIndex;
                
                this._renderStep(this.currentIndex);
                
                document.addEventListener('keydown', this._boundHandleKeydown);
            }

            async _renderStep(index) {
                const step = this.steps[index];
                if (!step) return;

                // Reset states
                this.deepDiveActive = false;
                this.spotlightEl.classList.remove('tour-deepdive-active');
                this.overlayEl.querySelector('.tour-ai-chat-zone').classList.remove('tour-ai-open');
                this.overlayEl.querySelector('.tour-ai-response-box').innerText = '';
                
                await this._scrollAndSpotlight(step.target);
                this._updateTooltipContent(step);
                
                // Deep Dive visibility
                const ddBtn = this.overlayEl.querySelector('.tour-btn--deepdive');
                ddBtn.style.display = step.hasDeepDive ? 'block' : 'none';
            }

            async _scrollAndSpotlight(selector) {
                const element = selector === 'body' ? document.body : document.querySelector(selector);
                
                if (element) {
                    if (selector !== 'body') {
                        // Use scrollIntoView with 'center' to minimize coordinate shifts
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Wait longer for scroll to fully settle
                        await new Promise(r => setTimeout(r, 800));
                    }
                    this._calculateAndApplySpotlight(element);
                } else {
                    // Center fallback
                    this._calculateAndApplySpotlight(null);
                }
            }

            _calculateAndApplySpotlight(element) {
                if (!element || element === document.body) {
                    this.spotlightEl.style.width = '0';
                    this.spotlightEl.style.height = '0';
                    this.spotlightEl.style.top = '50%';
                    this.spotlightEl.style.left = '50%';
                    this._positionTooltip(null);
                    return;
                }

                // IMPORTANT: Use viewport-relative rect directly. 
                // Since #tour-overlay is fixed at inset: 0, 
                // rect.top/left ARE the correct local coordinates.
                const rect = element.getBoundingClientRect();
                const pad = 8;
                
                this.spotlightEl.style.top = (rect.top - pad) + 'px';
                this.spotlightEl.style.left = (rect.left - pad) + 'px';
                this.spotlightEl.style.width = (rect.width + pad * 2) + 'px';
                this.spotlightEl.style.height = (rect.height + pad * 2) + 'px';
                
                this._positionTooltip(rect);
            }

            _positionTooltip(rect) {
                const tooltipWidth = 340;
                const tooltipHeight = this.tooltipEl.offsetHeight || 280;
                
                let top, left;

                if (!rect) {
                    top = (window.innerHeight - tooltipHeight) / 2;
                    left = (window.innerWidth - tooltipWidth) / 2;
                } else {
                    if (rect.bottom > window.innerHeight * 0.6) {
                        top = rect.top - tooltipHeight - 30;
                    } else {
                        top = rect.bottom + 30;
                    }
                    left = rect.left;
                }

                // Clamping
                left = Math.min(Math.max(left, 16), window.innerWidth - tooltipWidth - 16);
                top = Math.min(Math.max(top, 16), window.innerHeight - tooltipHeight - 16);

                this.tooltipEl.style.top = `${top}px`;
                this.tooltipEl.style.left = `${left}px`;
                this.tooltipEl.classList.add('tour-tp-visible');
            }

            _updateTooltipContent(step) {
                const meta = this.overlayEl.querySelector('.tour-tp-meta');
                meta.querySelector('.tour-tp-step-label').innerText = `Step ${this.currentIndex + 1} of ${this.steps.length}`;
                meta.querySelector('.tour-tp-title').innerHTML = `${step.icon ? `<span class="tour-tp-icon-badge">${step.icon}</span>` : ''}${step.title || 'Bisht Ji Assistant'}`;
                
                const dialogue = this.overlayEl.querySelector('.tour-dialogue-text');
                dialogue.setAttribute('data-full-text', step.dialogue);
                this._typewriterReveal();

                // Progress
                const prog = ((this.currentIndex + 1) / this.steps.length) * 100;
                this.overlayEl.querySelector('.tour-step-progress-inner').style.setProperty('width', `${prog}%`);
            }

            _typewriterReveal() {
                const el = this.overlayEl.querySelector('.tour-dialogue-text');
                const fullText = el.getAttribute('data-full-text') || '';
                // Use textContent so spaces are NEVER treated as HTML
                // white-space: pre-wrap in CSS will render them correctly
                el.textContent = '';
                el.classList.add('typing');
                
                if (this.typewriterInterval) clearInterval(this.typewriterInterval);
                
                let i = 0;
                this.typewriterInterval = setInterval(() => {
                    if (i < fullText.length) {
                        el.textContent += fullText.charAt(i);
                        i++;
                    } else {
                        clearInterval(this.typewriterInterval);
                        el.classList.remove('typing');
                    }
                }, this.options.typewriterSpeed);
            }

            async next() {
                const step = this.steps[this.currentIndex];
                if (step.cleanupAction) await step.cleanupAction();

                if (this.currentIndex < this.steps.length - 1) {
                    this.currentIndex++;
                    this._renderStep(this.currentIndex);
                } else {
                    this.finish();
                }
            }

            async prev() {
                if (this.currentIndex > 0) {
                    const step = this.steps[this.currentIndex];
                    if (step.cleanupAction) await step.cleanupAction();
                    this.currentIndex--;
                    this._renderStep(this.currentIndex);
                }
            }

            async skip() {
                const step = this.steps[this.currentIndex];
                if (step && step.cleanupAction) await step.cleanupAction();
                this.destroy();
            }

            async handleDeepDive() {
                const step = this.steps[this.currentIndex];
                if (!step.hasDeepDive) return;

                if (step.preAction) {
                    await step.preAction();
                    // CRITICAL: Wait 800ms for modal animations (fade/scale) to 100% finish
                    await new Promise(r => setTimeout(r, 800));
                }

                this.deepDiveActive = true;
                this.spotlightEl.classList.add('tour-deepdive-active');
                await this._scrollAndSpotlight(step.deepDiveTarget || step.target);
            }

            _attachDelegatedListeners() {
                this.overlayEl.addEventListener('click', (e) => {
                    const target = e.target.closest('[data-tour-action]');
                    if (!target) return;

                    const action = target.getAttribute('data-tour-action');
                    if (action === 'next') this.next();
                    if (action === 'prev') this.prev();
                    if (action === 'skip') this.skip();
                    if (action === 'deepdive') this.handleDeepDive();
                    if (action === 'toggleAI') {
                        this.overlayEl.querySelector('.tour-ai-chat-zone').classList.toggle('tour-ai-open');
                    }
                    if (action === 'sendToAI') {
                        const input = this.overlayEl.querySelector('.tour-ai-input');
                        this._sendToAI(input.value);
                    }
                });
            }

            async _sendToAI(userMessage) {
                const responseBox = this.overlayEl.querySelector('.tour-ai-response-box');
                responseBox.innerText = 'Bisht Ji is thinking...';
                
                // Simulate typing response
                setTimeout(() => {
                    const responses = [
                        "Bhaiya, yeh feature dashboard ka sabse powerful part hai!",
                        "Iska use karke aap daily audit reports instantly generate kar sakte hain.",
                        "Redcliffe workflow mein yeh step TAT maintain karne ke liye critical hai.",
                        "Agar koi doubt ho toh mujhse poochein, main Bisht Ji hoon!"
                    ];
                    const msg = responses[Math.floor(Math.random() * responses.length)];
                    responseBox.innerText = '';
                    let i = 0;
                    const int = setInterval(() => {
                        if (i < msg.length) { responseBox.innerText += msg.charAt(i); i++; }
                        else clearInterval(int);
                    }, 25);
                }, 1000);
            }

            handleKeydown(e) {
                if (!this.isRunning) return;
                if (e.key === 'Escape') this.skip();
                if (e.key === 'ArrowRight') this.next();
                if (e.key === 'ArrowLeft') this.prev();
            }

            finish() {
                this.tooltipEl.style.transform = 'scale(0.9) translateY(-20px)';
                this.tooltipEl.style.opacity = '0';
                setTimeout(() => {
                    this.destroy();
                    window.dispatchEvent(new CustomEvent('bishtJiTourComplete'));
                }, 600);
            }

            destroy() {
                this.isRunning = false;
                this.overlayEl.classList.remove('tour-running');
                document.removeEventListener('keydown', this._boundHandleKeydown);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        // ==========================================
        // 🗺️ TOUR CONFIGURATION (STEPS)
        // ==========================================
        const tourSteps = [
            {
                step: 1,
                target: 'body',
                icon: '🚀',
                title: 'Welcome bhaiya!',
                dialogue: "Namaskar! Welcome to the completely automated system tour. Yeh tour aapko har feature detail mein dikhayega.",
                hasDeepDive: false
            },
            {
                step: 2,
                target: '.live-indicator',
                icon: '⚡',
                title: 'Force Reload',
                dialogue: "Agar data refresh karna ho toh yeh button dbayen. Yeh real-time sync ensure karta hai.",
                hasDeepDive: false
            },
            {
                step: 3,
                target: '#card-pending',
                icon: '🔴',
                title: 'Pending KPIs',
                dialogue: "High priority logs requiring immediate action to prevent TAT breaches. Inhe clear rakhna zaroori hai.",
                hasDeepDive: false
            },
            {
                step: 4,
                target: '.summary-box',
                icon: '📊',
                title: 'City Summary',
                dialogue: "Regional breakdown dekhte hain. Isme aap city-wise analysis kar sakte hain.",
                hasDeepDive: true,
                deepDiveTarget: '#city-summary-picker',
                preAction: async () => { document.querySelector(".summary-header span[onclick*='cityFullPage']").click(); },
                cleanupAction: async () => { document.querySelector("button[onclick*='closeFullPage(\\'cityFullPage\\')']").click(); }
            },
            {
                step: 5,
                target: '#pending-select-container',
                icon: '🔍',
                title: 'Status Filters',
                dialogue: "Master ledger ko specific statuses se filter karein. Multi-select filters yahan available hain.",
                hasDeepDive: false
            },
            {
                step: 6,
                target: "button[onclick*='dropzoneModal']",
                icon: '📥',
                title: 'PDF Dropzone',
                dialogue: "Smart PDF Dropzone automatically reads PDF data via OCR. Let's look inside.",
                hasDeepDive: true,
                deepDiveTarget: '#pdf-drop-area',
                preAction: async () => { document.querySelector("button[onclick*='dropzoneModal']").click(); },
                cleanupAction: async () => { document.querySelector("button[onclick*='closeModal(\\'dropzoneModal\\')']").click(); }
            },
            {
                step: 7,
                target: "button[onclick*='bulkTrfModal']",
                icon: '📸',
                title: 'Bulk TRF Scanner',
                dialogue: "Ek sath 50 TRF scan karne ki power. Scan workflow ko automate karein.",
                hasDeepDive: true,
                deepDiveTarget: '#trf-drop-area',
                preAction: async () => { document.querySelector("button[onclick*='bulkTrfModal']").click(); },
                cleanupAction: async () => { document.querySelector("button[onclick*='closeFullPage(\\'bulkTrfModal\\')']").click(); }
            },
            {
                step: 8,
                target: "button[onclick*='waModal']",
                icon: '💬',
                title: 'WhatsApp Tool',
                dialogue: "Runners se direct communication ke liye. Area-wise exports yahan ready rehte hain.",
                hasDeepDive: true,
                deepDiveTarget: '#wa-export-container',
                preAction: async () => { document.querySelector("button[onclick*='waModal']").click(); },
                cleanupAction: async () => { document.querySelector("button[onclick*='closeModal(\\'waModal\\')']").click(); }
            },
            {
                step: 9,
                target: "button[onclick*='openEmailGenerator']",
                icon: '📧',
                title: 'Email Generator',
                dialogue: "Escalation management ke liye perfect. AI professional professional emails likh deta hai.",
                hasDeepDive: true,
                deepDiveTarget: '#em-body',
                preAction: async () => { document.querySelector("button[onclick*='openEmailGenerator']").click(); },
                cleanupAction: async () => { document.querySelector("button[onclick*='closeFullPage(\\'emailGenPage\\')']").click(); }
            },
            {
                step: 10,
                target: "button[onclick*='openSmartExportModal']",
                icon: '📤',
                title: 'QA Export Module',
                dialogue: "Management reporting ke liye CSV exports. Required columns tick karein aur export karein.",
                hasDeepDive: true,
                deepDiveTarget: '#export-checkboxes',
                preAction: async () => { document.querySelector("button[onclick*='openSmartExportModal']").click(); },
                cleanupAction: async () => { 
                    const sem = document.getElementById('smartExportModal');
                    if (sem) { sem.style.display = 'none'; sem.classList.remove('active'); }
                }
            },
            {
                step: 11,
                target: "button[onclick*='auditFullPage']",
                icon: '🚨',
                title: 'Daily Audit Panel',
                dialogue: "Shift close karne se pehle zaroori. Zero TAT breaches confirm karein.",
                hasDeepDive: true,
                deepDiveTarget: '#aud-pending',
                preAction: async () => { document.querySelector("button[onclick*='auditFullPage']").click(); },
                cleanupAction: async () => { document.querySelector("button[onclick*='closeFullPage(\\'auditFullPage\\')']").click(); }
            },
            {
                step: 12,
                target: '.table-container',
                icon: '📋',
                title: 'Core Ledger',
                dialogue: "Yeh hai aapka main data table. Record approval aur verification yahan hoti hai.",
                hasDeepDive: false
            },
            {
                step: 13,
                target: '.ai-fab',
                icon: '👨‍💼',
                title: 'Bisht Ji Assistant',
                dialogue: "Main Bisht Ji hoon, kabhi bhi click karke meri madad le sakte hain. Have a great day!",
                hasDeepDive: false
            }
        ];

        // Global instance
        let tourEngineInstance;

        window.startPremiumTour = function() {
            if (!tourEngineInstance) tourEngineInstance = new DashboardTourEngine(tourSteps);
            tourEngineInstance.start();
        };

        window.startBishtJiTour = function () {
            const modal = document.getElementById('bishtJiTourModal');
            if (modal) modal.classList.remove('active');
            window.startPremiumTour();
        };

        window.closeBishtJiTour = function () {
            const modal = document.getElementById('bishtJiTourModal');
            if (modal) modal.classList.remove('active');
        };

        window.showWelcomeTourModal = function() {
            const modal = document.getElementById('bishtJiTourModal');
            if (modal) {
                modal.classList.remove('active');
                void modal.offsetWidth;
                modal.classList.add('active');
            }
        };



        // Command listener for text input - bind on DOMContentLoaded
        document.addEventListener('DOMContentLoaded', function () {
          setTimeout(function () {
            var aiInput = document.getElementById('aiInput');
            if (aiInput) {
              aiInput.addEventListener('input', function (e) {
                var text = e.target.value.trim().toLowerCase();
                if (text === 'bisht ji ki start dashboard tour' || text === 'start dashboard tour' || text === 'start tour') {
                  e.target.value = '';
                  addChatBubble('User', 'Start Dashboard Tour');
                  setTimeout(function () {
                    addChatBubble('Bisht Ji', '🎯 Sure bhaiya! Dashboard tour start kar raha hoon...');
                    setTimeout(function () {
                      window.startPremiumTour();
                    }, 800);
                  }, 500);
                }
              });
            }
          }, 1000);
        });

        // Add chat bubble helper
        function addChatBubble(sender, message) {
          var aiBody = document.getElementById('aiBody');
          if (!aiBody) return;

          var bubbleClass = sender === 'User' ? 'chat-user' : 'chat-ai';
          var bubble = document.createElement('div');
          bubble.className = 'chat-bubble ' + bubbleClass;
          bubble.textContent = message;
          aiBody.appendChild(bubble);
          aiBody.scrollTop = aiBody.scrollHeight;
        }

        // Toggle AI Panel
        window.toggleAiPanel = function () {
          var panel = document.getElementById('aiPanel');
          if (panel) {
            panel.classList.toggle('active');
          }
        };

        // 🚀 THE MAGIC: AUTO-LOGIN FOR SHEET USERS
        if (window.ENV_IS_SHEET && window.ENV_USER_EMAIL) {
          let email = window.ENV_USER_EMAIL;
          let rawName = email.split('@')[0];
          let cleanName = rawName.replace(/\./g, ' ').replace(/\b\w/g, char => char.toUpperCase());
          window.currentUser = { name: cleanName, email: email };

          document.getElementById('login-overlay').classList.add('hidden');
          document.getElementById('sender-name').value = window.currentUser.name;
          document.getElementById('user-display-name').innerText = window.currentUser.name;
          document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(window.currentUser.name)}&background=007AFF&color=fff`;

          bootFastApp(); // ⚡ FAST BOOT
        }
        // Agar direct Web App url se khola hai toh wahi purana Firebase wala kaam chalega
        else {
          onAuthStateChanged(auth, (user) => {
            if (user) {
              let dName = user.displayName || user.email.split('@')[0];
              window.currentUser = { name: dName, email: user.email };
              document.getElementById('login-overlay').classList.add('hidden');
              document.getElementById('sender-name').value = window.currentUser.name;
              document.getElementById('user-display-name').innerText = window.currentUser.name;
              document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(window.currentUser.name)}&background=007AFF&color=fff`;

              bootFastApp(); // ⚡ FAST BOOT
              // ☁️ Load user's saved preferences from Firebase (cross-device sync)
              // Delayed slightly so GSAP cursor IIFE and theme engine are initialized
              setTimeout(function () {
                if (typeof window.loadUserPreferences === 'function') {
                  window.loadUserPreferences();
                }
              }, 800);
            } else { document.getElementById('login-overlay').classList.remove('hidden'); }
          });
        }
      </script>

      <script>
