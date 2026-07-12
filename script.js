// ── Inline SVGs for iOS Safari compatibility ──────────
// Fetches all <img src="*.svg"> and replaces them with inline <svg> elements.
// This is the most reliable way to display SVGs on iOS Safari.
function inlineSVGs() {
    const svgImgs = document.querySelectorAll('img[src$=".svg"]');
    svgImgs.forEach(img => {
        const src = img.getAttribute('src');
        fetch(src)
            .then(r => r.text())
            .then(svgText => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, 'image/svg+xml');
                const svgEl = doc.documentElement;

                // Transfer sizing from the <img>
                svgEl.setAttribute('width', '100%');
                svgEl.setAttribute('height', '100%');
                svgEl.style.cssText = img.style.cssText || 'width:100%;height:100%;display:block;';

                // Transfer id and class if present
                if (img.id) svgEl.id = img.id;
                if (img.className) svgEl.classList.add(...img.className.split(' ').filter(Boolean));

                img.parentNode.replaceChild(svgEl, img);
            })
            .catch(() => {
                // Silently ignore — <img> fallback stays in place
            });
    });
}

document.addEventListener('DOMContentLoaded', inlineSVGs);

function initExternalLinks() {
    document.querySelectorAll('.deck a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    });
}

const slides = document.querySelectorAll('.slide');
const progressBar = document.getElementById('progress-bar');
const slideCounter = document.getElementById('slide-counter');
const banner = document.getElementById('section-banner');
const banNum = document.getElementById('ban-num');
const banSep = document.getElementById('ban-sep');
const banLabel = document.getElementById('ban-label');

let current = 0;
let revealStep = 0;
let flyTimeout = null;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Progress bar ─────────────────────────────────────
function updateProgress() {
    const hiddenSlidesOffset = 1; // Change this to 3 if you want it to start at slide 3

    // 1. Subtract the offset from the total slides
    const totalContentSlides = Math.max(1, slides.length - hiddenSlidesOffset);

    // 2. Subtract the offset from the current slide for the progress calculation
    //    We use Math.max(0, ...) to prevent negative progress on the hidden slides
    const pct = (Math.max(0, current - (hiddenSlidesOffset - 1)) / totalContentSlides) * 100;
    if (progressBar) progressBar.style.width = pct + '%';

    // 3. Hide the progress bar container on the hidden slides
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
        progressContainer.style.opacity = current < hiddenSlidesOffset ? '0' : '1';
    }

    // 4. Hide the slide counter on the hidden slides
    if (slideCounter) {
        slideCounter.style.transition = 'opacity 0.4s ease';
        slideCounter.style.opacity = current < hiddenSlidesOffset ? '0' : '1';
    }

    // 5. Shift the displayed counter number
    updateSlideCounter(Math.max(0, current - (hiddenSlidesOffset - 1)), totalContentSlides);
}

// ── Number-flow counter system ───────────────────────
let counterDigitSlots = [];   // references to .counter-digit elements for the "current" number
let counterInitialized = false;
let lastDirection = 1;        // 1 = forward, -1 = backward

function buildCounterDOM(total) {
    if (!slideCounter) return;
    slideCounter.innerHTML = '';

    const totalStr = String(total);
    const currentStr = String(current).padStart(totalStr.length, '0');

    // Build digit slots for the current slide number
    counterDigitSlots = [];
    for (let i = 0; i < currentStr.length; i++) {
        const slot = createDigitSlot(parseInt(currentStr[i], 10));
        counterDigitSlots.push(slot);
        slideCounter.appendChild(slot);
    }

    counterInitialized = true;
}

function createDigitSlot(initialDigit) {
    const slot = document.createElement('span');
    slot.className = 'counter-digit';

    const inner = document.createElement('span');
    inner.className = 'counter-digit-inner';

    // Create strip of digits 0–9
    for (let d = 0; d <= 9; d++) {
        const digitEl = document.createElement('span');
        digitEl.textContent = d;
        inner.appendChild(digitEl);
    }

    slot.appendChild(inner);

    // Set initial position without animation
    inner.style.transition = 'none';
    inner.style.transform = `translateY(-${initialDigit * 1.2}em)`;
    // Force reflow then restore transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            inner.style.transition = '';
        });
    });

    return slot;
}


function updateSlideCounter(target, total) {
    if (!slideCounter) return;

    if (!counterInitialized) {
        buildCounterDOM(total);
        return;
    }

    const totalStr = String(total);
    const targetStr = String(target).padStart(totalStr.length, '0');

    // If digit count changed (e.g. 9 → 10), rebuild the DOM
    if (targetStr.length !== counterDigitSlots.length) {
        // Rebuild with smooth transition for new slots
        const oldSlots = [...counterDigitSlots];
        const newSlotCount = targetStr.length;

        // Remove old digit slots
        oldSlots.forEach(s => s.remove());

        // Rebuild digit slots
        counterDigitSlots = [];

        for (let i = 0; i < newSlotCount; i++) {
            const digit = parseInt(targetStr[i], 10);
            const slot = createDigitSlot(digit);
            counterDigitSlots.push(slot);
            slideCounter.appendChild(slot);
        }
        return;
    }

    // Animate each digit independently with staggered timing
    const dir = lastDirection;
    for (let i = 0; i < targetStr.length; i++) {
        const newDigit = parseInt(targetStr[i], 10);
        const slot = counterDigitSlots[i];
        const inner = slot.querySelector('.counter-digit-inner');
        if (!inner) continue;

        // Get current digit from transform
        const currentTransform = inner.style.transform;
        const currentMatch = currentTransform.match(/translateY\(-?([\d.]+)em\)/);
        const currentPos = currentMatch ? parseFloat(currentMatch[1]) : 0;
        const currentDigit = Math.round(currentPos / 1.2);

        if (currentDigit === newDigit) continue;

        // Stagger: rightmost digit animates first (feels more natural)
        const stagger = (targetStr.length - 1 - i) * 30;

        inner.style.transitionDelay = `${stagger}ms`;
        inner.style.transform = `translateY(-${newDigit * 1.2}em)`;
    }
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
    // Separator is hidden via CSS

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

// ── Sequential reveal steps (pipe analogy slides) ─────
function getMaxRevealSteps(slide) {
    const steps = [...slide.querySelectorAll('[data-step]')].map(el => parseInt(el.dataset.step, 10));
    return steps.length ? Math.max(...steps) : 0;
}

function applyRevealSteps(slide, step, instant = false) {
    slide.querySelectorAll('.reveal-step').forEach(el => {
        const s = parseInt(el.dataset.step, 10);
        const show = s <= step;
        el.classList.toggle('revealed', show);
        if (instant) {
            el.classList.toggle('no-anim', show);
        }
    });

    if (instant) {
        requestAnimationFrame(() => {
            slide.querySelectorAll('.reveal-step.no-anim').forEach(el => el.classList.remove('no-anim'));
        });
    }
}

function resetRevealSteps(slide) {
    slide.querySelectorAll('.reveal-step').forEach(el => {
        el.classList.remove('revealed', 'no-anim');
    });
}

function prepareSlideEntry(slide, direction) {
    const maxSteps = getMaxRevealSteps(slide);
    resetRevealSteps(slide);

    if (maxSteps === 0) {
        revealStep = 0;
        return;
    }

    revealStep = direction < 0 ? maxSteps : 1;
    applyRevealSteps(slide, revealStep, true);
}

function finalizeSlideExit(slide, delay = 0) {
    if (delay) {
        setTimeout(() => resetRevealSteps(slide), delay);
        return;
    }
    resetRevealSteps(slide);
}

function isPipePairSlide(slide) {
    return slide.classList.contains('layout-pipe-pair');
}

const PIPE_CROSSFADE_MS = prefersReducedMotion ? 0 : 380;

function usesCrossfadeTransition(exited, entering) {
    return isPipePairSlide(exited) || isPipePairSlide(entering);
}

function preloadSlideImages(slide) {
    if (!slide) return;
    slide.querySelectorAll('img[src]').forEach(img => {
        const src = img.getAttribute('src');
        if (!src) return;
        const probe = new Image();
        probe.decoding = 'async';
        probe.src = src;
    });
}

function preloadAdjacentPipeImages(idx) {
    if (!isPipePairSlide(slides[idx])) return;
    preloadSlideImages(slides[idx + 1]);
    preloadSlideImages(slides[idx - 1]);
}

function preloadNearbyPipeImages(idx) {
    preloadAdjacentPipeImages(idx);

    for (let offset = 1; offset <= 2; offset++) {
        const target = slides[idx + offset];
        if (target && isPipePairSlide(target) && !isPipePairSlide(slides[idx])) {
            preloadSlideImages(target);
        }
    }
}

function preloadNearbyImages(idx) {
    preloadNearbyPipeImages(idx);
    preloadSlideImages(slides[idx + 1]);
    preloadSlideImages(slides[idx - 1]);
}

function runCrossfadeTransition(exitedSlide, enteringSlide) {
    exitedSlide.classList.remove('active');
    exitedSlide.classList.add('exit-crossfade');

    enteringSlide.classList.add('enter-crossfade', 'active');

    // Force reflow so both slides register their start opacities before crossfading.
    void enteringSlide.offsetHeight;

    exitedSlide.classList.add('crossfade-fading');
    enteringSlide.classList.remove('enter-crossfade');

    setTimeout(() => {
        exitedSlide.classList.remove('exit-crossfade', 'crossfade-fading');
        resetRevealSteps(exitedSlide);
    }, PIPE_CROSSFADE_MS + 40);
}

// ── Navigation ────────────────────────────────────────
function goTo(n, direction) {
    if (n === current) return;

    const wasOnDivider = slides[current].classList.contains('layout-section')
        || slides[current].classList.contains('layout-title');

    const exitedSlide = slides[current];
    const enteringSlide = slides[n];
    const crossfade = usesCrossfadeTransition(exitedSlide, enteringSlide);

    current = n;

    prepareSlideEntry(enteringSlide, direction || 1);

    if (crossfade) {
        runCrossfadeTransition(exitedSlide, enteringSlide);
    } else {
        exitedSlide.classList.remove('active');
        finalizeSlideExit(exitedSlide);
        exitedSlide.classList.add('exit');
        setTimeout(() => exitedSlide.classList.remove('exit', 'exit-crossfade'), 500);

        enteringSlide.classList.add('active');
    }

    preloadNearbyImages(current);

    // Keep URL in sync
    history.replaceState(null, null, `#${current}`);

    // Track direction for counter animation
    lastDirection = direction || 1;

    updateProgress();
    updateBanner(wasOnDivider);
}

function navigate(dir) {
    const slide = slides[current];
    const maxSteps = getMaxRevealSteps(slide);

    if (dir > 0 && revealStep < maxSteps) {
        revealStep++;
        applyRevealSteps(slide, revealStep);
        return;
    }

    if (dir < 0 && revealStep > 1) {
        revealStep--;
        applyRevealSteps(slide, revealStep);
        return;
    }

    const next = current + dir;
    if (next >= 0 && next < slides.length) goTo(next, dir);
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
            const target = parseInt(numBuffer, 10);
            numBuffer = '';
            if (!isNaN(target) && target >= 0 && target < slides.length) {
                goTo(target, 0);
            }
        }, 500);
    }
});

// Handle URL changes
window.addEventListener('hashchange', () => {
    const hashNum = parseInt(window.location.hash.replace('#', ''), 10);
    if (!isNaN(hashNum) && hashNum >= 0 && hashNum < slides.length && hashNum !== current) {
        goTo(hashNum, 0);
    }
});

// ── Touch swipe navigation ────────────────────────────
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50;
const SWIPE_ANGLE = 30; // degrees from horizontal

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchmove', e => {
    // Prevent default scrolling while inside the deck
    if (e.target.closest('.deck')) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, { passive: true });

document.addEventListener('touchcancel', () => {
    touchStartX = touchStartY = touchEndX = touchEndY = 0;
});

function handleSwipe() {
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Ignore if movement is too small
    if (Math.abs(diffX) < SWIPE_THRESHOLD) return;

    // Only trigger if swipe is mostly horizontal (angle < 30° from horizontal)
    const angle = Math.abs(Math.atan2(diffY, Math.abs(diffX))) * (180 / Math.PI);
    if (angle > SWIPE_ANGLE) return;

    navigate(diffX > 0 ? 1 : -1);
}

// ── Edge tap / click navigation ───────────────────────
const EDGE_MARGIN = 0.04; // 4% of screen width

// Track last touch time so the synthetic click that follows touchend is ignored
let lastTouchTime = 0;

document.addEventListener('touchend', e => {
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const w = window.innerWidth;
    const diffX = Math.abs(touchStartX - touchEndX);

    // Only trigger if it was a tap (little movement), not a swipe
    if (diffX > SWIPE_THRESHOLD) return;

    // Ignore taps on interactive elements
    const target = e.target;
    if (target.closest('a, button, object, input, textarea, select')) return;

    if (x < w * EDGE_MARGIN) {
        lastTouchTime = Date.now();
        navigate(-1);
    } else if (x > w * (1 - EDGE_MARGIN)) {
        lastTouchTime = Date.now();
        navigate(1);
    }
}, { passive: true });

document.addEventListener('click', e => {
    // Suppress the synthetic click that browsers fire after touchend
    if (Date.now() - lastTouchTime < 500) return;

    // Only handle clicks on the deck / slide background, not on content
    const target = e.target;
    if (target.closest('a, button, object, input, textarea, select')) return;
    if (!target.closest('.deck')) return;

    const x = e.clientX;
    const w = window.innerWidth;

    if (x < w * EDGE_MARGIN) {
        navigate(-1);
    } else if (x > w * (1 - EDGE_MARGIN)) {
        navigate(1);
    }
});

// ── Init ──────────────────────────────────────────────
const initialHash = parseInt(window.location.hash.replace('#', ''), 10);
if (!isNaN(initialHash) && initialHash >= 0 && initialHash < slides.length) {
    slides[0].classList.remove('active');
    current = initialHash;
    prepareSlideEntry(slides[current], 1);
    slides[current].classList.add('active');
} else {
    history.replaceState(null, null, '#0');
    prepareSlideEntry(slides[current], 1);
}

updateProgress();
updateBanner(false);
preloadNearbyImages(current);
initExternalLinks();


