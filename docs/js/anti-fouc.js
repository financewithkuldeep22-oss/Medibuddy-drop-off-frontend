  
    (function () {
      try {
        // 1. Dark Mode — apply class immediately
        if (localStorage.getItem('hg_darkMode') === 'true') {
          document.documentElement.classList.add('dark-mode');
        }
        // 2. Theme style preset
        var savedStyle = localStorage.getItem('hyperGlassThemeStyle');
        if (savedStyle) {
          document.documentElement.classList.add('style-' + savedStyle);
        } else {
          document.documentElement.classList.add('style-glassmorphism');
        }
        // 3. Custom accent colors
        var p = localStorage.getItem('hg_primary');
        var d = localStorage.getItem('hg_danger');
        if (p) document.documentElement.style.setProperty('--primary', p);
        if (d) document.documentElement.style.setProperty('--danger', d);
      } catch (e) { /* localStorage may be blocked in some iframe contexts */ }
    })();
  
