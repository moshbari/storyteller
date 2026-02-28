const fs = require("fs");
let f = fs.readFileSync("/var/www/storyteller/public/index.html", "utf8");

// ============================================
// 1. ADD LANDING PAGE CSS
// ============================================
const landingCSS = `
    /* ===== LANDING PAGE SECTIONS ===== */
    .landing-sections { position:relative; z-index:1; }

    .lp-section { padding:80px 20px; max-width:960px; margin:0 auto; }
    .lp-section-alt { background:rgba(255,255,255,0.5); backdrop-filter:blur(10px); border-top:1px solid rgba(0,0,0,0.04); border-bottom:1px solid rgba(0,0,0,0.04); }
    .lp-title { font-size:clamp(28px,5vw,40px); text-align:center; margin-bottom:8px; line-height:1.2; }
    .lp-title .grad { background:linear-gradient(135deg,var(--coral),var(--sunset),var(--purple)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .lp-subtitle { text-align:center; color:var(--muted); font-size:17px; font-weight:500; max-width:550px; margin:0 auto 48px; line-height:1.7; }

    /* HOW IT WORKS */
    .steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
    .step-card { background:white; border-radius:24px; padding:32px 24px; text-align:center; box-shadow:0 8px 30px rgba(0,0,0,0.05); transition:0.4s; position:relative; }
    .step-card:hover { transform:translateY(-6px); box-shadow:0 16px 50px rgba(0,0,0,0.1); }
    .step-num { position:absolute; top:-14px; left:50%; transform:translateX(-50%); width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,var(--coral),var(--sunset)); color:white; font-family:'Baloo 2',cursive; font-size:16px; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px var(--glow); }
    .step-icon { font-size:48px; margin-bottom:16px; display:block; }
    .step-card h3 { font-size:20px; margin-bottom:8px; }
    .step-card p { font-size:14px; color:var(--muted); line-height:1.7; font-weight:500; }

    /* GALLERY */
    .gallery-scroll { display:flex; gap:20px; overflow-x:auto; padding:0 20px 20px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
    .gallery-scroll::-webkit-scrollbar { display:none; }
    .gallery-card { min-width:260px; background:white; border-radius:20px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.06); scroll-snap-align:start; transition:0.4s; flex-shrink:0; }
    .gallery-card:hover { transform:translateY(-4px); box-shadow:0 12px 40px rgba(0,0,0,0.1); }
    .gallery-img { height:200px; background:linear-gradient(135deg,#FFF5F5,#F0F4FF); display:flex; align-items:center; justify-content:center; font-size:80px; overflow:hidden; }
    .gallery-info { padding:16px; }
    .gallery-info h4 { font-size:15px; margin-bottom:4px; }
    .gallery-info p { font-size:12px; color:var(--muted); font-weight:600; }
    .gallery-style { display:inline-block; padding:3px 10px; border-radius:8px; font-size:10px; font-weight:800; text-transform:uppercase; background:rgba(255,107,107,0.1); color:var(--coral); margin-top:6px; }

    /* FEATURES */
    .features-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; }
    .feat-card { display:flex; gap:18px; padding:24px; background:white; border-radius:20px; box-shadow:0 4px 20px rgba(0,0,0,0.04); transition:0.3s; }
    .feat-card:hover { transform:translateY(-3px); box-shadow:0 8px 30px rgba(0,0,0,0.08); }
    .feat-icon { width:56px; height:56px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:28px; flex-shrink:0; }
    .feat-card:nth-child(1) .feat-icon { background:rgba(255,107,107,0.1); }
    .feat-card:nth-child(2) .feat-icon { background:rgba(86,204,242,0.1); }
    .feat-card:nth-child(3) .feat-icon { background:rgba(255,217,61,0.1); }
    .feat-card:nth-child(4) .feat-icon { background:rgba(187,107,217,0.1); }
    .feat-card:nth-child(5) .feat-icon { background:rgba(107,203,119,0.1); }
    .feat-card:nth-child(6) .feat-icon { background:rgba(47,128,237,0.1); }
    .feat-text h4 { font-size:16px; margin-bottom:4px; }
    .feat-text p { font-size:13px; color:var(--muted); line-height:1.6; font-weight:500; }

    /* TESTIMONIALS */
    .testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
    .testi-card { background:white; border-radius:20px; padding:28px; box-shadow:0 4px 20px rgba(0,0,0,0.04); transition:0.3s; }
    .testi-card:hover { transform:translateY(-3px); box-shadow:0 8px 30px rgba(0,0,0,0.08); }
    .testi-stars { color:var(--gold); font-size:16px; margin-bottom:12px; letter-spacing:2px; }
    .testi-text { font-size:14px; color:var(--text); line-height:1.7; font-weight:500; margin-bottom:16px; font-style:italic; }
    .testi-author { display:flex; align-items:center; gap:12px; }
    .testi-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:white; }
    .testi-name { font-weight:800; font-size:14px; }
    .testi-role { font-size:12px; color:var(--muted); font-weight:500; }

    /* FAQ */
    .faq-list { max-width:700px; margin:0 auto; }
    .faq-item { background:white; border-radius:16px; margin-bottom:12px; box-shadow:0 2px 12px rgba(0,0,0,0.03); overflow:hidden; }
    .faq-q { padding:20px 24px; font-weight:700; font-size:15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:0.3s; }
    .faq-q:hover { color:var(--coral); }
    .faq-arrow { font-size:18px; transition:transform 0.3s; color:var(--muted); }
    .faq-item.open .faq-arrow { transform:rotate(180deg); }
    .faq-a { padding:0 24px; max-height:0; overflow:hidden; transition:max-height 0.3s ease, padding 0.3s ease; }
    .faq-item.open .faq-a { max-height:200px; padding:0 24px 20px; }
    .faq-a p { font-size:14px; color:var(--muted); line-height:1.7; font-weight:500; }

    /* FINAL CTA */
    .cta-section { text-align:center; padding:80px 20px; position:relative; }
    .cta-box { max-width:600px; margin:0 auto; background:linear-gradient(135deg,#1A1A2E,#2D2B55); border-radius:32px; padding:50px 40px; position:relative; overflow:hidden; }
    .cta-box::before { content:''; position:absolute; top:-50%; right:-50%; width:200%; height:200%; background:radial-gradient(circle at 70% 30%, rgba(255,107,107,0.15), transparent 60%); }
    .cta-box h2 { font-size:clamp(24px,4vw,36px); color:white; margin-bottom:10px; position:relative; z-index:1; }
    .cta-box p { color:rgba(255,255,255,0.6); font-size:16px; margin-bottom:28px; position:relative; z-index:1; font-weight:500; }
    .cta-btn { padding:18px 48px; font-size:19px; border:none; border-radius:60px; background:linear-gradient(135deg,var(--coral),var(--sunset)); color:white; cursor:pointer; font-family:'Baloo 2',cursive; box-shadow:0 8px 30px rgba(255,107,107,0.4); transition:0.4s; position:relative; z-index:1; }
    .cta-btn:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(255,107,107,0.5); }

    @media(max-width:768px) {
      .steps-grid { grid-template-columns:1fr; max-width:360px; margin:0 auto; }
      .features-grid { grid-template-columns:1fr; }
      .testi-grid { grid-template-columns:1fr; max-width:400px; margin:0 auto; }
    }
`;

// ============================================
// 2. LANDING PAGE HTML SECTIONS
// ============================================
const landingHTML = `
    <!-- ===== LANDING PAGE (shown when NOT logged in) ===== -->
    <div class="landing-sections" id="landingSections">

      <!-- HOW IT WORKS -->
      <div class="lp-section-alt">
        <div class="lp-section">
          <h2 class="lp-title">How It <span class="grad">Works</span></h2>
          <p class="lp-subtitle">Three simple steps to create a personalized children's book your kids will love.</p>
          <div class="steps-grid">
            <div class="step-card"><span class="step-num">1</span><span class="step-icon">💡</span><h3>Pick a Story Idea</h3><p>Choose from 100+ creative prompts or write your own topic. Pick an art style and mood.</p></div>
            <div class="step-card"><span class="step-num">2</span><span class="step-icon">🤖</span><h3>AI Creates Your Book</h3><p>Our AI agents write the story, illustrate every page, and assemble a complete book in under 2 minutes.</p></div>
            <div class="step-card"><span class="step-num">3</span><span class="step-icon">📥</span><h3>Download & Share</h3><p>Get your book as PDF, images, Amazon KDP format, or a shareable flipbook link. Print it or read on screen!</p></div>
          </div>
        </div>
      </div>

      <!-- SAMPLE BOOKS GALLERY -->
      <div class="lp-section">
        <h2 class="lp-title">Books Created by <span class="grad">StoryTeller</span></h2>
        <p class="lp-subtitle">Real books generated by our AI — each one unique, illustrated, and ready in under 2 minutes.</p>
        <div class="gallery-scroll">
          <div class="gallery-card"><div class="gallery-img">🐉</div><div class="gallery-info"><h4>The Friendly Dragon</h4><p>A dragon who is afraid of fire learns to be brave</p><span class="gallery-style">Cartoon</span></div></div>
          <div class="gallery-card"><div class="gallery-img">🚀</div><div class="gallery-info"><h4>Space Bunny Adventure</h4><p>A bunny builds a rocket ship from carrots</p><span class="gallery-style">Pixar 3D</span></div></div>
          <div class="gallery-card"><div class="gallery-img">🌈</div><div class="gallery-info"><h4>The Rainbow Thief</h4><p>A sneaky cloud steals all the colors</p><span class="gallery-style">Watercolor</span></div></div>
          <div class="gallery-card"><div class="gallery-img">🦁</div><div class="gallery-info"><h4>Leo the Brave Lion</h4><p>A shy lion cub discovers his mighty roar</p><span class="gallery-style">Storybook</span></div></div>
          <div class="gallery-card"><div class="gallery-img">🧙</div><div class="gallery-info"><h4>The Tiny Wizard</h4><p>The smallest wizard casts the biggest spell</p><span class="gallery-style">Anime</span></div></div>
          <div class="gallery-card"><div class="gallery-img">🦋</div><div class="gallery-info"><h4>The Butterfly Who Could Not Fly</h4><p>A wingless butterfly discovers she can soar</p><span class="gallery-style">Watercolor</span></div></div>
        </div>
      </div>

      <!-- FEATURES -->
      <div class="lp-section-alt">
        <div class="lp-section">
          <h2 class="lp-title">Everything You <span class="grad">Need</span></h2>
          <p class="lp-subtitle">Powerful AI tools to create, customize, and publish professional children's books.</p>
          <div class="features-grid">
            <div class="feat-card"><div class="feat-icon">🎨</div><div class="feat-text"><h4>5 Art Styles</h4><p>Cartoon, Watercolor, Storybook, Anime, and Pixar 3D. Each creates a completely different look.</p></div></div>
            <div class="feat-card"><div class="feat-icon">⚡</div><div class="feat-text"><h4>Under 2 Minutes</h4><p>Full story written, every page illustrated, and book assembled — all in about 90 seconds.</p></div></div>
            <div class="feat-card"><div class="feat-icon">📕</div><div class="feat-text"><h4>Amazon KDP Ready</h4><p>Download in the exact format Amazon requires. Upload and start selling your book immediately.</p></div></div>
            <div class="feat-card"><div class="feat-icon">📱</div><div class="feat-text"><h4>Shareable Flipbook</h4><p>Get a link to an interactive flipbook you can share with family, friends, or on social media.</p></div></div>
            <div class="feat-card"><div class="feat-icon">🎭</div><div class="feat-text"><h4>Character Consistency</h4><p>Characters look the same on every page. No more random-looking people from page to page.</p></div></div>
            <div class="feat-card"><div class="feat-icon">💰</div><div class="feat-text"><h4>One-Time Pricing</h4><p>No subscriptions. Pay once, create anytime. Your credits never expire.</p></div></div>
          </div>
        </div>
      </div>

      <!-- TESTIMONIALS -->
      <div class="lp-section">
        <h2 class="lp-title">Loved by <span class="grad">Parents & Creators</span></h2>
        <p class="lp-subtitle">See what people are saying about StoryTeller.</p>
        <div class="testi-grid">
          <div class="testi-card">
            <div class="testi-stars">★★★★★</div>
            <p class="testi-text">"My daughter's face when she saw a book with her name in it — priceless. We've made 8 books so far and she asks for a new one every week!"</p>
            <div class="testi-author"><div class="testi-avatar" style="background:var(--coral)">S</div><div><div class="testi-name">Sarah M.</div><div class="testi-role">Mom of 2</div></div></div>
          </div>
          <div class="testi-card">
            <div class="testi-stars">★★★★★</div>
            <p class="testi-text">"I sell custom children's books on Etsy. StoryTeller lets me create a new book in 2 minutes instead of 2 weeks. Total game changer for my business."</p>
            <div class="testi-author"><div class="testi-avatar" style="background:var(--ocean)">J</div><div><div class="testi-name">James K.</div><div class="testi-role">Etsy Seller</div></div></div>
          </div>
          <div class="testi-card">
            <div class="testi-stars">★★★★★</div>
            <p class="testi-text">"I use it in my kindergarten class. Each kid gets a book about something they love. The illustrations are beautiful and the kids go crazy for them."</p>
            <div class="testi-author"><div class="testi-avatar" style="background:var(--mint)">L</div><div><div class="testi-name">Linda T.</div><div class="testi-role">Kindergarten Teacher</div></div></div>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="lp-section-alt">
        <div class="lp-section">
          <h2 class="lp-title">Frequently Asked <span class="grad">Questions</span></h2>
          <p class="lp-subtitle">Got questions? We've got answers.</p>
          <div class="faq-list">
            <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">How long does it take to create a book?<span class="faq-arrow">▼</span></div><div class="faq-a"><p>About 60-90 seconds for a 5-page book and under 2 minutes for a 12-page book. Our AI writes the story and creates all illustrations simultaneously.</p></div></div>
            <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Can I sell the books I create?<span class="faq-arrow">▼</span></div><div class="faq-a"><p>Yes! You own full commercial rights to every book you create. Many of our users sell on Amazon KDP, Etsy, and other platforms.</p></div></div>
            <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Do my credits expire?<span class="faq-arrow">▼</span></div><div class="faq-a"><p>Never. Once you buy credits, they're yours forever. Use them whenever you want — no monthly limits or subscriptions.</p></div></div>
            <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">What art styles are available?<span class="faq-arrow">▼</span></div><div class="faq-a"><p>We offer 5 styles: Cartoon (colorful and fun), Watercolor (soft and artistic), Storybook (classic illustration), Anime (Japanese-style), and Pixar 3D (modern CGI look).</p></div></div>
            <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Can I customize the characters?<span class="faq-arrow">▼</span></div><div class="faq-a"><p>Our AI automatically creates detailed, consistent characters based on your story. Each character looks the same across every page of the book.</p></div></div>
            <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)">Is there a free trial?<span class="faq-arrow">▼</span></div><div class="faq-a"><p>Yes! Every new account gets 3 free books. No credit card required. Create your first book in the next 2 minutes!</p></div></div>
          </div>
        </div>
      </div>

      <!-- FINAL CTA -->
      <div class="cta-section">
        <div class="cta-box">
          <h2>Ready to Create Your First Book? 📚</h2>
          <p>Join thousands of parents and creators. Start free — no credit card needed.</p>
          <button class="cta-btn" onclick="openModal('signup')">Start Creating — It's Free! ✨</button>
        </div>
      </div>
    </div>
`;

// ============================================
// 3. FAQ TOGGLE FUNCTION
// ============================================
const faqScript = `
    function toggleFaq(el){el.parentElement.classList.toggle('open');}
    // Show/hide landing sections based on login
    function updateLanding(){const ls=document.getElementById('landingSections');if(ls){ls.style.display=(token&&user)?'none':'block';}}
`;

// ============================================
// APPLY PATCHES
// ============================================

// Add CSS before </style> (only if not already added)
if (!f.includes('.lp-section')) {
  f = f.replace('</style>', landingCSS + '\n  </style>');
}

// Add landing HTML after hero section closing </section>
if (!f.includes('landingSections')) {
  f = f.replace(
    '</section>\n    <section class="section" id="dashSection">',
    '</section>\n' + landingHTML + '\n    <section class="section" id="dashSection">'
  );
}

// Add FAQ script before the closing </script>
if (!f.includes('toggleFaq')) {
  // Find last </script> and add before it
  const lastScript = f.lastIndexOf('</script>');
  f = f.slice(0, lastScript) + faqScript + '\n  </script>' + f.slice(lastScript + '</script>'.length);
}

// Patch showDash to hide landing sections
if (!f.includes('updateLanding')) {
  // Already added the function above, now call it in showDash and goHome
  f = f.replace(
    "function showDash(){showSection('dashSection');",
    "function showDash(){showSection('dashSection');updateLanding();"
  );
  f = f.replace(
    "function goHome(){if(token){showSection('dashSection');}else{showSection('heroSection');}}",
    "function goHome(){if(token){showSection('dashSection');updateLanding();}else{showSection('heroSection');updateLanding();}}"
  );
}

fs.writeFileSync("/var/www/storyteller/public/index.html", f);
console.log("✅ Landing page polished! Added: How It Works, Gallery, Features, Testimonials, FAQ, Final CTA");
