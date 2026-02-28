const fs = require("fs");
let f = fs.readFileSync("/var/www/storyteller/public/pricing.html", "utf8");

// The nav links might have z-index issues with the floating shapes behind them
// Fix 1: Make sure nav has proper z-index
if (!f.includes('.nav { position: relative;')) {
  f = f.replace(
    '.nav {',
    '.nav { position: relative; z-index: 10;'
  );
}

// Fix 2: Make sure all shapes don't block clicks
if (!f.includes('.shape { pointer-events')) {
  f = f.replace(
    '.shape {',
    '.shape { pointer-events: none;'
  );
}

// Fix 3: Make hero section not block the nav
if (!f.includes('.hero { position: relative;')) {
  f = f.replace(
    '.hero {',
    '.hero { position: relative;'
  );
}
if (!f.includes('.hero::before { pointer-events')) {
  f = f.replace(
    ".hero::before {",
    ".hero::before { pointer-events: none;"
  );
}

fs.writeFileSync("/var/www/storyteller/public/pricing.html", f);
console.log("✅ Nav buttons fixed - z-index and pointer events!");
