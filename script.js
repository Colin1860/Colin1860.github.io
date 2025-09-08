// script.js — CV renderer with plain text contacts
(async function () {
    const log = (...args) => console.debug('[cv-render]', ...args);

    // year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // load cv.md
    let md;
    try {
        const res = await fetch('cv.md', { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch cv.md ' + res.status);
        md = await res.text();
    } catch (err) {
        console.error('Could not load cv.md:', err);
        const content = document.getElementById('content');
        if (content) content.innerHTML = '<section class="card card--wide"><h2>Error</h2><p>Could not load <code>cv.md</code>. Check network / file path.</p></section>';
        return;
    }

    // load marked (try ESM, fallback UMD)
    let markedLib;
    try {
        const mod = await import('https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js');
        markedLib = mod.marked || mod.default || mod;
        log('loaded marked via ESM');
    } catch (e1) {
        if (window.marked) {
            markedLib = window.marked;
        } else {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
            markedLib = window.marked;
        }
    }

    let html = '';
    try {
        html = markedLib.parse(md, { mangle: false, headerIds: true });
    } catch (errParse) {
        console.error('marked.parse failed', errParse);
        html = '<p><em>Failed to parse markdown.</em></p>';
    }

    // temp container
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // --- Metadata: name, contacts, tagline ---
    // 1) name
    let name = '';
    const firstH1 = tmp.querySelector('h1');
    if (firstH1) {
        name = firstH1.textContent.trim();
        const nameEl = document.getElementById('name');
        if (nameEl) nameEl.textContent = name;
        document.title = `${name} — CV`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', `Curriculum vitae of ${name}`);
        const printName = document.getElementById('print-name');
        if (printName) printName.textContent = name;
        firstH1.remove();
    }

    // 2) top UL for contacts
    const firstElementChild = Array.from(tmp.childNodes).find(n => n.nodeType === 1);
    let topUL = null;
    if (firstElementChild && firstElementChild.tagName === 'UL') {
        topUL = firstElementChild;
    }

    if (topUL) {
        const items = Array.from(topUL.querySelectorAll('li')).map(li => li.textContent.trim());
        const email = items.find(x => x.includes('@'));
        const website = items.find(x => /^https?:\/\//i.test(x));
        const loc = items.find(x => /location:/i.test(x) || /based/i.test(x));

        if (email) {
            const span = document.getElementById('email');
            if (span) span.textContent = email;
        }
        if (loc) {
            const span = document.getElementById('location');
            if (span) span.textContent = loc.replace(/^[Ll]ocation:\s*/, '').trim();
        }

        // avatar: if img present
        const avatarImg = tmp.querySelector('img');
        if (avatarImg) {
            const avatarEl = document.getElementById('avatar');
            if (avatarEl) {
                avatarEl.src = avatarImg.getAttribute('src');
                avatarEl.alt = avatarImg.getAttribute('alt') || 'Profile photo';
            }
            avatarImg.remove();
        }

        topUL.remove();
    }

    // 3) tagline (blockquote or first paragraph before H2)
    const firstH2 = tmp.querySelector('h2');
    let tagline = '';
    const children = Array.from(tmp.children);
    for (const el of children) {
        if (firstH2 && el === firstH2) break;
        if (el.tagName === 'BLOCKQUOTE') { tagline = el.textContent.trim(); el.remove(); break; }
        if (el.tagName === 'P' && !tagline) { tagline = el.textContent.trim(); el.remove(); break; }
    }
    if (tagline) {
        const tagEl = document.getElementById('tagline');
        if (tagEl) tagEl.textContent = tagline;
    }

    // --- Build cards from tmp (skip empty nodes) ---
    const content = document.getElementById('content');
    const toc = document.querySelector('.toc');
    content.innerHTML = ''; // clear

    if (!tmp.querySelector('h2')) {
        const s = document.createElement('section');
        s.className = 'card card--wide';
        s.innerHTML = tmp.innerHTML;
        content.appendChild(s);
    } else {
        while (tmp.firstChild) {
            // skip whitespace-only text nodes
            if (tmp.firstChild.nodeType === 3 && !tmp.firstChild.textContent.trim()) {
                tmp.removeChild(tmp.firstChild);
                continue;
            }

            if (tmp.firstChild.tagName === 'H2') {
                const h2 = tmp.firstChild;
                const slugBase = h2.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                let slug = slugBase || ('section-' + Math.random().toString(36).slice(2, 8));
                h2.id = slug;

                const section = document.createElement('section');
                section.className = 'card' + (/(projects|summary|experience)/i.test(h2.textContent) ? ' card--wide' : '');
                section.appendChild(h2);

                // move siblings until next H2
                while (tmp.firstChild && tmp.firstChild.tagName !== 'H2') {
                    if (tmp.firstChild.nodeType === 3 && !tmp.firstChild.textContent.trim()) {
                        tmp.removeChild(tmp.firstChild);
                        continue;
                    }
                    section.appendChild(tmp.firstChild);
                }
                if (section.children.length > 1) {
                    content.appendChild(section);
                }

                if (toc) {
                    const link = document.createElement('a');
                    link.href = '#' + slug;
                    link.textContent = h2.textContent;
                    toc.appendChild(link);
                }
            } else {
                if (tmp.firstChild.nodeType === 1 && tmp.firstChild.textContent.trim() !== '') {
                    const s = document.createElement('section');
                    s.className = 'card card--wide';
                    s.appendChild(tmp.firstChild);
                    content.appendChild(s);
                } else {
                    tmp.removeChild(tmp.firstChild);
                }
            }
        }
    }

    // --- Enhance Skills (badge grid) ---
    document.querySelectorAll('section.card').forEach(section => {
        const h2 = section.querySelector('h2');
        if (!h2) return;
        if (/^skills$/i.test(h2.textContent.trim())) {
            const groups = Array.from(section.querySelectorAll('h3'));
            groups.forEach(group => {
                const ul = group.nextElementSibling;
                if (ul && ul.tagName === 'UL') {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'skills-grid';
                    Array.from(ul.querySelectorAll('li')).forEach(li => {
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

    // PDF button
    const pdfBtn = document.getElementById('download-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', () => window.print());

    // sync print contacts
    const printContacts = document.getElementById('print-contacts');
    const contactsEl = document.querySelector('.contacts');
    if (printContacts && contactsEl) printContacts.textContent = contactsEl.innerText.trim();

    log('render complete');
})();
