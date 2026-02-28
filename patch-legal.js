const fs = require("fs");

// ==========================================
// FOOTER HTML (shared across pages)
// ==========================================
const footerCSS = `
    .site-footer { background:#1A1A2E; padding:40px 24px 20px; margin-top:60px; position:relative; z-index:1; }
    .footer-inner { max-width:800px; margin:0 auto; text-align:center; }
    .footer-links { display:flex; justify-content:center; gap:20px; flex-wrap:wrap; margin-bottom:16px; }
    .footer-links a { color:#8395A7; font-size:13px; font-weight:600; text-decoration:none; transition:0.3s; }
    .footer-links a:hover { color:#FF6B6B; }
    .footer-copy { color:#8395A7; font-size:13px; margin-bottom:16px; font-weight:500; }
    .footer-legal { max-width:700px; margin:0 auto; padding-top:16px; border-top:1px solid rgba(255,255,255,0.06); }
    .footer-legal p { color:#5A6577; font-size:11px; line-height:1.7; margin-bottom:10px; }
`;

const footerHTML = `
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-links">
        <a href="/pricing.html">Pricing</a>
        <a href="https://winarzapps.com/privacy-policy/" target="_blank">Privacy Policy</a>
        <a href="https://winarzapps.com/terms-of-service/" target="_blank">Terms & Conditions</a>
        <a href="https://winarzapps.com/earning-disclaimer" target="_blank">Earnings Disclaimer</a>
      </div>
      <p class="footer-copy">2026 Mosh Bari - Copyright&copy; 2025. All Rights Reserved.</p>
      <div class="footer-legal">
        <p>This site is not a part of the Facebook website or Facebook Inc. Additionally, This site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of FACEBOOK, Inc.</p>
        <p>*Earnings and income representations made by Mosh Bari, Mosh Bari's agency, and Mosh Bari's agency and their advertisers/sponsors (collectively, "Mosh Bari's agency") are aspirational statements only of your earnings potential. These results are not typical and results will vary. The results on this page are OUR results and from years of testing. We can in NO way guarantee you will get similar results.</p>
      </div>
    </div>
  </footer>
`;

// ==========================================
// PATCH index.html
// ==========================================
let idx = fs.readFileSync("/var/www/storyteller/public/index.html", "utf8");

// Add footer CSS before </style>
if (!idx.includes('.site-footer')) {
  idx = idx.replace('</style>', footerCSS + '\n  </style>');
}

// Add footer HTML before the toast div
if (!idx.includes('site-footer')) {
  idx = idx.replace('<div class="toast" id="toast"></div>', footerHTML + '\n  <div class="toast" id="toast"></div>');
}

fs.writeFileSync("/var/www/storyteller/public/index.html", idx);
console.log("✅ index.html — footer added");

// ==========================================
// PATCH pricing.html
// ==========================================
let pr = fs.readFileSync("/var/www/storyteller/public/pricing.html", "utf8");

// Add footer CSS before </style>
if (!pr.includes('.site-footer')) {
  pr = pr.replace('</style>', footerCSS + '\n  </style>');
}

// Replace the existing simple footer with the full legal footer
if (pr.includes('class="footer"')) {
  pr = pr.replace(/<footer class="footer">[\s\S]*?<\/footer>/, footerHTML.trim());
} else if (!pr.includes('site-footer')) {
  // Add before </body> if no footer exists
  pr = pr.replace('</body>', footerHTML + '\n</body>');
}

fs.writeFileSync("/var/www/storyteller/public/pricing.html", pr);
console.log("✅ pricing.html — footer added");

console.log("✅ All done! Legal footers added to both pages.");
