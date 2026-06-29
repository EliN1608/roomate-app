import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  
  const whyUsRef = useRef(null);
  const featuresRef = useRef(null);
  const howItWorksRef = useRef(null);
  const reviewsRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleScroll = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      alert('נא להזין כתובת אימייל');
      return;
    }
    alert(`תודה! הכתובת ${email} נרשמה בהצלחה.`);
    setEmail('');
  };

  const marqueeText = "חלוקת חשבונות ✦ רוטציית מטלות ✦ קניות משותפות ✦ חוקי בית ✦ בקשות תחזוקה ✦ הודעות ✦ סנכרון בזמן אמת ✦ לא עוד שיחות מביכות ✦";

  const problemCards = [
    {
      number: '01',
      quote: '"מי חייב למה? אף אחד לא יודע."',
      text: 'כל חודש מסתיים בגיליון אקסל, ויכוח בקבוצת הוואטסאפ ומישהו שעדיין לא החזיר. לנהל עלויות משותפות לא צריך להיות עבודה נוספת.'
    },
    {
      number: '02',
      quote: '"עשיתי את הכלים בפעם האחרונה."',
      text: 'מטלות מצטברות כשלא ברור של מי התור. מתחילים פתקים פסיביים-אגרסיביים. מישהו תמיד עושה יותר מחלקו.'
    },
    {
      number: '03',
      quote: '"מישהו קנה נייר טואלט?"',
      text: 'קניות משותפות = רכישות כפולות, חוסרים ושלושה אנשים שמוסיפים פסטה לרשימה שאף אחד אף פעם לא בודק. כאוס מוחלט.'
    }
  ];

  const featureCards = [
    {
      icon: '💰',
      title: 'חלוקת חשבונות',
      text: 'הוסיפו כל הוצאה, חלקו שווה או בהתאמה אישית. כולם יודעים מה חייבים בזמן אמת. סגרו חשבון בהקשה אחת.',
      highlighted: false
    },
    {
      icon: '🔄',
      title: 'רוטציית מטלות',
      text: 'משייכת מטלות אוטומטית בסיבוב הוגן. סמנו שנעשה, שלחו תזכורות, לא עוד תירוצים.',
      highlighted: true // Dark Card Highlight
    },
    {
      icon: '🛒',
      title: 'קניות משותפות',
      text: 'רשימה חיה שכולם יכולים לערוך. פריטים נסמנים בזמן אמת. לא עוד קניות כפולות של שמן זית.',
      highlighted: false
    },
    {
      icon: '📋',
      title: 'חוקי הבית',
      text: 'קבעו שעות שקט, מדיניות אורחים, כללי מטבח — הכל בכתב, מוסכם על כולם מראש.',
      highlighted: false
    },
    {
      icon: '🔧',
      title: 'בקשות תחזוקה',
      text: 'רשמו בעיות, שייכו אותן, עקבו אחרי הסטטוס. בעל הבית מקבל סיכום מסודר — ללא כאוס בקבוצה.',
      highlighted: false
    },
    {
      icon: '📢',
      title: 'הודעות',
      text: 'רוצים להגיד משהו לדירה? פרסמו הודעה. כולם רואים. לא עוד פתקים דביקים.',
      highlighted: false
    }
  ];

  const reviewCards = [
    {
      stars: '★★★★★',
      text: 'לפני RooMate היה לי גיליון Google עם 14 טאבים וקבוצת וואטסאפ עם 300+ הודעות שלא נקראו. עכשיו אנחנו פשוט גרים כאן. זה פשוט מדהים כמה זה קל.',
      avatar: 'JK',
      avatarClassName: 'avatar-lime',
      name: 'Jamie K.',
      location: 'גר עם 3 שותפים בתל אביב',
      highlighted: false
    },
    {
      stars: '★★★★★',
      text: 'גלגל המטלות לבד שווה את הכל. השותף שלי היה \'שוכח\' כל שבוע. עכשיו האפליקציה שולחת לו תזכורת והוא לא יכול להעמיד פנים שלא ראה.',
      avatar: 'MA',
      avatarClassName: 'avatar-dark',
      name: 'Mia A.',
      location: 'סטודנטית לתואר שני, חיפה',
      highlighted: true // Highlight middle card
    },
    {
      stars: '★★★★★',
      text: 'בעצם היה לנו ישיבת דירה כדי להחליט מה יהיו חוקי הבית הראשונים שלנו. השיחה הפרודוקטיבית הראשונה שהיתה לנו מזה חודשים. האפליקציה עוד לא יצאה — הקונספט כבר תיקן אותנו.',
      avatar: 'SR',
      avatarClassName: 'avatar-lime',
      name: 'Sam R.',
      location: 'צעיר עצמאי, ירושלים',
      highlighted: false
    }
  ];

  return (
    <div className="landing-rebuild-fullpage" id="landing-page">
      
      {/* SECTION 1 — NAVBAR (sticky) */}
      <nav className="nav-sticky-black">
        <div className="nav-sticky-inner">
          {/* Right side: Logo */}
          <div className="nav-sticky-logo">
            <span className="logo-white-part">Roo</span>
            <span className="logo-lime-part">Mate</span>
          </div>

          {/* Center: Nav links (Desktop) */}
          <div className="nav-sticky-links">
            <button type="button" className="nav-sticky-link" onClick={() => handleScroll(whyUsRef)}>למה אנחנו</button>
            <button type="button" className="nav-sticky-link" onClick={() => handleScroll(featuresRef)}>פיצ'רים</button>
            <button type="button" className="nav-sticky-link" onClick={() => handleScroll(howItWorksRef)}>איך זה עובד</button>
            <button type="button" className="nav-sticky-link" onClick={() => handleScroll(reviewsRef)}>ביקורות</button>
          </div>

          {/* Left side: Button */}
          <div className="nav-sticky-action">
            <Link to="/onboarding" className="nav-sticky-btn">
              התחילו בחינם
            </Link>
          </div>

          {/* Hamburger Menu Toggle (Mobile) */}
          <button 
            type="button" 
            className={`nav-sticky-hamburger ${isMenuOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label="תפריט"
          >
            ☰
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isMenuOpen && (
          <div className="nav-sticky-mobile-dropdown">
            <button type="button" className="mobile-dropdown-link" onClick={() => handleScroll(whyUsRef)}>למה אנחנו</button>
            <button type="button" className="mobile-dropdown-link" onClick={() => handleScroll(featuresRef)}>פיצ'רים</button>
            <button type="button" className="mobile-dropdown-link" onClick={() => handleScroll(howItWorksRef)}>איך זה עובד</button>
            <button type="button" className="mobile-dropdown-link" onClick={() => handleScroll(reviewsRef)}>ביקורות</button>
            <Link to="/onboarding" className="mobile-dropdown-cta-btn" onClick={() => setIsMenuOpen(false)}>
              התחילו בחינם
            </Link>
          </div>
        )}
      </nav>

      {/* SECTION 2 — HERO */}
      <section className="section-hero">
        <div className="hero-grid-container">
          {/* Right Column: Hero Text Content */}
          <div className="hero-text-side">
            <div className="hero-badge-pill">
              לדירה המשותפת, סוף סוף
            </div>
            
            <h1 className="hero-main-title">
              <span className="hero-line-1">לחיות ביחד</span>
              <span className="hero-line-2">בלי הדרמה.</span>
            </h1>

            <p className="hero-main-subtitle">
              חלקו חשבונות, נהלו מטלות, נהלו קניות ועקבו אחרי תחזוקה — במקום אחד שכל הדירה באמת משתמשת בו.
            </p>

            <div className="hero-main-actions">
              <Link to="/onboarding" className="hero-btn-primary">
                התחילו בחינם ←
              </Link>
              <button type="button" className="hero-btn-secondary" onClick={() => handleScroll(howItWorksRef)}>
                ראו איך זה עובד ↓
              </button>
            </div>

            {/* Social Proof */}
            <div className="hero-social-proof-container">
              <div className="social-proof-avatars">
                <span className="proof-avatar avatar-jk">JK</span>
                <span className="proof-avatar avatar-ma">MA</span>
                <span className="proof-avatar avatar-sr">SR</span>
                <span className="proof-avatar avatar-tl">TL</span>
              </div>
              <span className="social-proof-desc">
                סומכים עליהם 12,000+ משקי בית ברחבי העולם
              </span>
            </div>
          </div>

          {/* Left Column: App Preview Card */}
          <div className="hero-preview-side">
            <div className="preview-black-card-wrapper">
              <div className="preview-cards-columns">
                {/* Mini Card 1: Expenses */}
                <div className="preview-dark-mini-card">
                  <h4 className="preview-mini-title">הוצאות משותפות</h4>
                  <div className="preview-mini-rows">
                    <div className="preview-mini-row">
                      <span className="row-item-desc">🛒 קניות סופר · מרקוס</span>
                      <span className="row-item-val">-₪105</span>
                    </div>
                    <div className="preview-mini-row">
                      <span className="row-item-desc">⚡ חשמל · את/ה</span>
                      <span className="row-item-val">+₪200</span>
                    </div>
                    <div className="preview-mini-row">
                      <span className="row-item-desc">📡 WiFi · שרה</span>
                      <span className="row-item-val">-₪55</span>
                    </div>
                  </div>
                  <div className="preview-lime-pill-badge">
                    ✓ מגיע לך ₪38.50
                  </div>
                </div>

                {/* Mini Card 2: Chores */}
                <div className="preview-dark-mini-card">
                  <h4 className="preview-mini-title">מטלות השבוע</h4>
                  <div className="preview-mini-rows">
                    <div className="preview-chore-row checked">
                      <span className="chore-check-circle">✓</span>
                      <span className="chore-name-text">לשאוב סלון</span>
                      <span className="chore-roommate">מרקוס</span>
                    </div>
                    <div className="preview-chore-row checked">
                      <span className="chore-check-circle">✓</span>
                      <span className="chore-name-text">לזרוק אשפה</span>
                      <span className="chore-roommate">את/ה</span>
                    </div>
                    <div className="preview-chore-row">
                      <span className="chore-check-circle empty"></span>
                      <span className="chore-name-text">לנקות אמבטיה</span>
                      <span className="chore-roommate">שרה</span>
                    </div>
                    <div className="preview-chore-row">
                      <span className="chore-check-circle empty"></span>
                      <span className="chore-name-text">כלים</span>
                      <span className="chore-roommate">תום</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Notification Pill */}
              <div className="preview-bottom-notification">
                <span className="notification-bell-icon">🔔</span>
                <span className="notification-desc-text">
                  מרקוס שילם את חלקו מחשבון החשמל · עכשיו · דרך RooMate
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — TICKER */}
      <section className="section-ticker-marquee">
        <div className="marquee-outer-container">
          <div className="marquee-inner-scroll">
            <span>{marqueeText}</span>
            <span>{marqueeText}</span>
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHY (Problems) */}
      <section className="section-why-us" ref={whyUsRef}>
        <div className="why-us-grid">
          {/* Left Column: Stacked problem cards */}
          <div className="why-problems-stack">
            {problemCards.map((card, idx) => (
              <div key={idx} className="problem-panel-card">
                <div className="problem-number">{card.number}</div>
                <div className="problem-quote">{card.quote}</div>
                <p className="problem-text-content">{card.text}</p>
              </div>
            ))}
          </div>

          {/* Right Column: Large Statement */}
          <div className="why-statement-side">
            <span className="why-statement-tag">למה אנחנו</span>
            <h2 className="why-statement-title">
              <span className="why-line-1">החיים המשותפים</span>
              <span className="why-line-2">נהדרים — הבירוקרטיה הורגת את הויב.</span>
            </h2>
            <p className="why-statement-subtitle">
              RooMate מטפל בכל כאב הראש הלוגיסטי כדי שתוכלו ליהנות מהחיים ביחד.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5 — FEATURES */}
      <section className="section-features-grid" ref={featuresRef}>
        <div className="features-section-header">
          <span className="features-tag-label">פיצ'רים</span>
          <h2 className="features-section-title">
            <span className="features-line-1">כל מה שהדירה</span>
            <span className="features-line-2">שלכם צריכה.</span>
          </h2>
          <p className="features-section-subtitle">
            שישה כלים, אפליקציה אחת. נבנתה לאנשים שגרים ביחד ורוצים להישאר כך.
          </p>
        </div>

        <div className="features-cards-grid">
          {featureCards.map((feat, idx) => (
            <div key={idx} className={`feature-grid-card ${feat.highlighted ? 'dark-highlight' : ''}`}>
              <div className="feature-card-icon-wrapper">
                {feat.icon}
              </div>
              <h3 className="feature-card-title">{feat.title}</h3>
              <p className="feature-card-description">{feat.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 6 — HOW IT WORKS */}
      <section className="section-how-works" ref={howItWorksRef}>
        <span className="how-tag-label">איך זה עובד</span>
        <h2 className="how-section-title">
          <span className="how-line-1">מוכנים ורצים תוך</span>
          <span className="how-line-2">שלושה שלבים.</span>
        </h2>
        <p className="how-section-subtitle">
          בלי מדריכים. בלי שיחות onboarding. פשוט צרו, הזמינו, וחיו טוב יותר.
        </p>

        <div className="how-steps-grid">
          {/* Step 1 */}
          <div className="how-step-item">
            <div className="how-step-circle-wrapper">
              <div className="how-step-circle lime-theme">1</div>
            </div>
            <h3 className="how-step-title">צרו את הבית שלכם</h3>
            <p className="how-step-text">
              הירשמו וצרו מרחב משותף. תנו לו שם, אזור זמן ואווירה. לוקח 30 שניות.
            </p>
          </div>

          {/* Step 2 */}
          <div className="how-step-item">
            <div className="how-step-circle-wrapper">
              <div className="how-step-circle dark-theme">2</div>
            </div>
            <h3 className="how-step-title">הזמינו את השותפים שלכם</h3>
            <p className="how-step-text">
              שתפו קישור או אימייל. השותפים מצטרפים, מגדירים פרופיל ומחוברים. ללא הורדת אפליקציה.
            </p>
          </div>

          {/* Step 3 */}
          <div className="how-step-item">
            <div className="how-step-circle-wrapper">
              <div className="how-step-circle lime-theme">3</div>
            </div>
            <h3 className="how-step-title">נהלו את הבית ביחד</h3>
            <p className="how-step-text">
              הוסיפו הוצאות, שייכו מטלות, עדכנו רשימות. כולם על אותו עמוד — ברצינות, סוף סוף.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 7 — REVIEWS */}
      <section className="section-testimonials" ref={reviewsRef}>
        <div className="testimonials-header">
          <span className="testimonials-tag-label">מה אנשים אומרים</span>
          <h2 className="testimonials-section-title">
            <span className="testimonials-line-1">שותפים אמיתיים,</span>
            <span className="testimonials-line-2">שקט אמיתי.</span>
          </h2>
        </div>

        <div className="testimonials-cards-grid">
          {reviewCards.map((rev, idx) => (
            <div key={idx} className={`testimonial-card-panel ${rev.highlighted ? 'dark-highlight-card' : ''}`}>
              <div className="testimonial-stars">{rev.stars}</div>
              <div className="testimonial-quote-icon">“</div>
              <p className="testimonial-quote-text">{rev.text}</p>
              
              <div className="testimonial-author-row">
                <span 
                  className={`author-avatar-circle ${rev.avatarClassName} ${rev.highlighted ? 'highlighted-border' : ''}`}
                >
                  {rev.avatar}
                </span>
                <div className="author-info-meta">
                  <span className="author-name">{rev.name}</span>
                  <span className="author-location">{rev.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section className="section-final-cta-card">
        <div className="final-cta-white-container">
          <h2 className="final-cta-title">
            <span className="final-title-1">הדירה שלכם, הכללים שלכם.</span>
            <span className="final-title-2">סוף סוף מנוהלים.</span>
          </h2>
          <p className="final-cta-subtitle">
            הצטרפו לאלפי משקי בית שהפסיקו להתווכח והתחילו לגור. חינם לנצח עד 6 שותפים.
          </p>

          {/* Form */}
          <form onSubmit={handleNewsletterSubmit} className="final-cta-newsletter-form">
            <input 
              type="email" 
              className="newsletter-email-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="newsletter-submit-btn">
              התחילו בחינם ←
            </button>
          </form>

          <p className="newsletter-social-guarantee">ללא כרטיס אשראי · חינם עד 6 אנשים</p>

          {/* Checklist */}
          <div className="newsletter-checks-row">
            <span className="check-item-detail">✓ הוצאות ללא הגבלה</span>
            <span className="check-item-detail">✓ כל 6 הפיצ\'רים</span>
            <span className="check-item-detail">✓ עובד בכל מכשיר</span>
            <span className="check-item-detail">✓ ביטול בכל עת</span>
          </div>
        </div>
      </section>

      {/* SECTION 9 — FOOTER */}
      <footer className="footer-landing-rebuild">
        <div className="footer-rebuild-inner">
          {/* Right Logo branding */}
          <div className="footer-rebuild-right">
            <div className="footer-brand-logo">
              <span className="logo-dark-part">Roo</span>
              <span className="logo-lime-part">Mate</span>
            </div>
            <p className="footer-joke-copy">
              © 2026 RooMate. נבנה עם אהבה (ופסקורד נטפליקס משותף).
            </p>
          </div>

          {/* Left links */}
          <div className="footer-rebuild-left">
            <a href="#privacy" className="footer-nav-link-item">פרטיות</a>
            <a href="#terms" className="footer-nav-link-item">תנאים</a>
            <a href="#blog" className="footer-nav-link-item">בלוג</a>
            <a href="#contact" className="footer-nav-link-item">צור קשר</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
