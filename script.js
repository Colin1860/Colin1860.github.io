// script.js — updated to populate {{ NAME }} / {{ TAGLINE }} placeholders
(async function () {
    // year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // load markdown
    const res = await fetch('cv.md', { cache: 'no-store' });
    const md = await res.text();

    // marked -> HTML
    const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js');
    const html = marked.parse(md, { mangle: false, headerIds: true });

    // temp DOM
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // --- 1) Name & title (from first H1) ---
    const firstH1 = tmp.querySelector('h1');
    let name = '';
    if (firstH1) {
        name = firstH1.textContent.trim();

        // header name
        const nameEl = document.getElementById('name');
        if (nameEl) nameEl.textContent = name;

        // document title
        document.title = `${name} — CV`;

        // meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', `Curriculum vitae of ${name}`);

        // replace simple {{ NAME }} in the footer if present
        const footerSmall = document.querySelector('.site-footer small');
        if (footerSmall && /\{\{\s*NAME\s*\}\}/.test(footerSmall.innerHTML)) {
            footerSmall.innerHTML = footerSmall.innerHTML.replace(/\{\{\s*NAME\s*\}\}/g, name);
        }

        // print header name (if present)
        const printName = document.getElementById('print-name');
        if (printName) printName.textContent = name;

        // remove the H1 from tmp to avoid duplication in main content
        firstH1.remove();
    }

    // --- 2) Tagline (prefer blockquote, else first top <p> before first H2) ---
    let taglineText = '';
    const bq = tmp.querySelector('blockquote');
    if (bq) {
        taglineText = bq.textContent.trim();
        bq.remove();
    } else {
        // find a top-level paragraph (before first H2)
        const firstH2 = tmp.querySelector('h2');
        let el = tmp.firstElementChild;
        while (el && el !== firstH2) {
            if (el.tagName && el.tagName.toLowerCase() === 'p') {
                taglineText = el.textContent.trim();
                el.remove();
                break;
            }
            el = el.nextElementSibling;
        }
    }
    if (taglineText) {
        const taglineEl = document.getElementById('tagline');
        if (taglineEl) taglineEl.textContent = taglineText;
    }

    // --- 3) Top UL contact block + avatar (optional) ---
    const info = tmp.querySelector('ul');
    if (info && info.previousElementSibling === null) {
        const items = [...info.querySelectorAll('li')].map(li => li.textContent.trim());
        const email = items.find(x => x.includes('@'));
        const website = items.find(x => /^https?:\/\//i.test(x));
        const location = items.find(x => /location:/i.test(x) || /based/i.test(x));

        // avatar if present
        const avatarImg = tmp.querySelector('img');
        if (avatarImg) {
            const avatarEl = document.getElementById('avatar');
            if (avatarEl) {
                avatarEl.src = avatarImg.getAttribute('src');
                avatarEl.alt = avatarImg.getAttribute('alt') || 'Profile photo';
            }
            avatarImg.remove();
        }

        if (email) {
            const a = document.getElementById('email');
            if (a) { a.href = 'mailto:' + email; a.textContent = email; }
        }
        if (website) {
            const w = document.getElementById('website');
            if (w) {
                try {
                    w.href = website;
                    w.textContent = new URL(website).host;
                } catch (e) {
                    w.href = website;
                    w.textContent = website;
                }
            }
        }
        if (location) {
            const l = document.getElementById('location');
            if (l) {
                l.href = '#';
                l.textContent = location.replace(/^[Ll]ocation:\s*/, '').trim();
            }
        }

        // remove the UL after consuming it
        info.remove();
    }

    // --- 4) Build card sections from H2s ---
    const content = document.getElementById('content');
    const toc = document.querySelector('.toc');
    const h2s = [...tmp.querySelectorAll('h2')];

    if (h2s.length === 0) {
        // if no H2s, just append everything in a single wide card
        const s = document.createElement('section');
        s.className = 'card card--wide';
        s.append(...tmp.childNodes);
        if (content) content.appendChild(s);
    } else {
        h2s.forEach((h2) => {
            const section = document.createElement('section');
            const slug = h2.id || h2.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            h2.id = slug;
            section.className = 'card' + (/(projects|portfolio|featured)/i.test(h2.textContent) ? ' card--wide' : '');
            section.appendChild(h2);

            // move siblings until next H2
            let el = h2.nextSibling;
            while (el && !(el.tagName && el.tagName.toLowerCase() === 'h2')) {
                const next = el.nextSibling;
                section.appendChild(el);
                el = next;
            }
            if (content) content.appendChild(section);

            // TOC pill
            if (toc) {
                const link = document.createElement('a');
                link.href = '#' + slug;
                link.textContent = h2.textContent;
                toc.appendChild(link);
            }
        });
    }

    // --- 5) Enhance Skills section into grouped badge grids ---
    document.querySelectorAll('section').forEach(section => {
        const heading = section.querySelector('h2')?.textContent || '';
        if (/^skills$/i.test(heading.trim())) {
            const groups = [...section.querySelectorAll('h3')];
            groups.forEach(group => {
                const ul = group.nextElementSibling;
                if (ul && ul.tagName === 'UL') {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'skills-grid';
                    [...ul.querySelectorAll('li')].forEach(li => {
                        const badge = document.createElement('span');
                        badge.className = 'skill-badge';
                        badge.textContent = li.textContent.trim();
                        wrapper.appendChild(badge);
                    });
                    const skillGroup = document.createElement('div');
                    skillGroup.className = 'skill-group';
                    skillGroup.appendChild(group);
                    skillGroup.appendChild(wrapper);
                    ul.replaceWith(skillGroup);
                }
            });
        }
    });

    // --- 6) PDF download button (floating) ---
    const pdfBtn = document.getElementById('download-pdf');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => window.print());
    }

    // --- 7) Sync print header contacts (if not filled earlier) ---
    const printName = document.getElementById('print-name');
    const printContacts = document.getElementById('print-contacts');
    const contactsEl = document.querySelector('.contacts');

    if (printName && !printName.textContent && name) printName.textContent = name;
    if (printContacts && contactsEl) printContacts.textContent = contactsEl.innerText.trim();

})();
