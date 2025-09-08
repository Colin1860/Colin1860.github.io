(async function () {
    document.getElementById('year').textContent = new Date().getFullYear();
    const res = await fetch('cv.md');
    const md = await res.text();
    const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js');
    const html = marked.parse(md);

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const content = document.getElementById('content');
    const toc = document.querySelector('.toc');

    const h2s = [...tmp.querySelectorAll('h2')];
    h2s.forEach(h2 => {
        const section = document.createElement('section');
        section.className = 'card';
        section.appendChild(h2);
        let el = h2.nextSibling;
        while (el && !(el.tagName && el.tagName.toLowerCase() === 'h2')) {
            let next = el.nextSibling; section.appendChild(el); el = next;
        }
        content.appendChild(section);

        const id = h2.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        h2.id = id;
        const link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = h2.textContent;
        toc.appendChild(link);
    });

    // Enhance Skills section
    document.querySelectorAll('section').forEach(section => {
        if (/^skills$/i.test(section.querySelector('h2')?.textContent || '')) {
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

    // PDF download button → triggers print dialog
    const pdfBtn = document.getElementById('download-pdf');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Copy name + contacts into print header
    const printName = document.getElementById('print-name');
    const printContacts = document.getElementById('print-contacts');
    const nameEl = document.getElementById('name');
    const contactsEl = document.querySelector('.contacts');

    if (printName && nameEl) {
        printName.textContent = nameEl.textContent;
    }
    if (printContacts && contactsEl) {
        printContacts.textContent = contactsEl.innerText;
    }
})();
