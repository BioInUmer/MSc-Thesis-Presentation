const slides = document.querySelectorAll('.slide');
const progressBar = document.getElementById('progress-bar');
const banner = document.getElementById('section-banner');
const banNum = document.getElementById('ban-num');
const banSep = document.getElementById('ban-sep');
const banLabel = document.getElementById('ban-label');

let current = 0;
let flyTimeout = null;

// ── Progress bar ─────────────────────────────────────
function updateProgress() {
    const pct = ((current + 1) / slides.length) * 100;
    if (progressBar) progressBar.style.width = pct + '%';
}

// ── Section banner ────────────────────────────────────
function findCurrentSection(idx) {
    for (let i = idx; i >= 0; i--) {
        if (slides[i].classList.contains('layout-section')) return slides[i];
    }
    return null;
}

function setBannerState(cls) {
    banner.classList.remove('banner-hidden', 'banner-visible', 'banner-flying', 'banner-exit');
    banner.classList.add(cls);
}

function updateBanner(fromDivider) {
    const isOnDivider = slides[current].classList.contains('layout-section');
    const isTitle = slides[current].classList.contains('layout-title');

    if (isOnDivider || isTitle) {
        // On a section divider — exit the banner if it was visible
        if (!banner.classList.contains('banner-hidden')) {
            setBannerState('banner-exit');
            if (flyTimeout) clearTimeout(flyTimeout);
            flyTimeout = setTimeout(() => setBannerState('banner-hidden'), 320);
        }
        return;
    }

    // Content slide — find which section we're in
    const sectionSlide = findCurrentSection(current);
    if (!sectionSlide) { setBannerState('banner-hidden'); return; }

    const num = sectionSlide.dataset.sectionNum;
    const label = sectionSlide.dataset.sectionLabel;

    // Update content
    banNum.textContent = num;
    banLabel.textContent = label;
    banSep.style.display = 'inline';

    if (flyTimeout) clearTimeout(flyTimeout);

    if (fromDivider) {
        // Fly-in animation from the center (where the section divider content was)
        setBannerState('banner-flying');
        flyTimeout = setTimeout(() => {
            setBannerState('banner-visible');
        }, 460);
    } else {
        // Already in a section — just show it instantly
        setBannerState('banner-visible');
    }
}

// ── Navigation ────────────────────────────────────────
function goTo(n) {
    if (n === current) return;

    const wasOnDivider = slides[current].classList.contains('layout-section')
        || slides[current].classList.contains('layout-title');

    const exitedSlide = slides[current];
    exitedSlide.classList.remove('active');
    exitedSlide.classList.add('exit');
    setTimeout(() => exitedSlide.classList.remove('exit'), 500);

    current = n;
    slides[current].classList.add('active');

    // Keep URL in sync
    history.replaceState(null, null, `#${current + 1}`);

    updateProgress();
    updateBanner(wasOnDivider);
}

function navigate(dir) {
    const next = current + dir;
    if (next >= 0 && next < slides.length) goTo(next);
}

let numBuffer = '';
let numTimeout = null;

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        navigate(1);
        return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        navigate(-1);
        return;
    }

    // Number navigation (e.g. typing "2" "8" jumps to slide 28)
    if (/[0-9]/.test(e.key)) {
        numBuffer += e.key;
        if (numTimeout) clearTimeout(numTimeout);
        numTimeout = setTimeout(() => {
            const target = parseInt(numBuffer, 10) - 1;
            numBuffer = '';
            if (!isNaN(target) && target >= 0 && target < slides.length) {
                goTo(target);
            }
        }, 500);
    }
});

// Handle URL changes
window.addEventListener('hashchange', () => {
    const hashNum = parseInt(window.location.hash.replace('#', ''), 10) - 1;
    if (!isNaN(hashNum) && hashNum >= 0 && hashNum < slides.length && hashNum !== current) {
        goTo(hashNum);
    }
});

// ── Init ──────────────────────────────────────────────
const initialHash = parseInt(window.location.hash.replace('#', ''), 10) - 1;
if (!isNaN(initialHash) && initialHash >= 0 && initialHash < slides.length) {
    slides[0].classList.remove('active');
    current = initialHash;
    slides[current].classList.add('active');
} else {
    // Set initial URL hash to 1 if none exists
    history.replaceState(null, null, '#1');
}

updateProgress();
updateBanner(false);
