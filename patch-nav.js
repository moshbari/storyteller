const fs = require("fs");
let f = fs.readFileSync("/var/www/storyteller/public/pricing.html", "utf8");

// Replace the static nav with a dynamic one that checks login
f = f.replace(
  `<div class="nav-links">
      <a href="/" class="nav-link ghost">Home</a>
      <a href="/" class="nav-link primary">Start Creating</a>
    </div>`,
  `<div class="nav-links" id="navLinks">
      <a href="/" class="nav-link ghost">Home</a>
      <a href="/" class="nav-link primary">Start Creating</a>
    </div>`
);

// Add script before closing </body> to update nav based on login
f = f.replace(
  `loadPricing();`,
  `loadPricing();

    // Check login and update nav + CTA buttons
    const token = localStorage.getItem('st_token');
    const user = JSON.parse(localStorage.getItem('st_user') || 'null');
    if (token && user) {
      document.getElementById('navLinks').innerHTML =
        '<a href="/" class="nav-link ghost">Home</a>' +
        '<span style="font-size:14px;font-weight:700;color:var(--text);">' + (user.name || '') + '</span>' +
        '<a href="/" class="nav-link primary">Go to Dashboard</a>';
    }`
);

fs.writeFileSync("/var/www/storyteller/public/pricing.html", f);
console.log("✅ Pricing nav buttons patched!");
