const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const pages = ['dashboard', 'ordens', 'produtos', 'vendas', 'faturamento'];

// Extract the header (before the first page)
const matchHeroStart = html.indexOf('<!-- ==================== DASHBOARD ==================== -->');
const headerPart = html.substring(0, matchHeroStart);

// Extract footer (after the last page, starting from </main>)
const matchFooterStart = html.indexOf('</main>');
const footerPart = html.substring(matchFooterStart);

function rewriteSidebar(header, activePage) {
    let newHeader = header;
    for (const p of pages) {
        newHeader = newHeader.replace(`data-page="${p}" onclick="navigate('${p}')"`, `data-page="${p}" href="${p}.html"`);
    }
    
    // Update active class
    // Remove active from all nav-items
    newHeader = newHeader.replace(/class="nav-item active"/g, 'class="nav-item"');
    
    // Add active to the target nav-item
    const activeStr = `class="nav-item" data-page="${activePage}" href="${activePage}.html"`;
    const newActiveStr = `class="nav-item active" data-page="${activePage}" href="${activePage}.html"`;
    newHeader = newHeader.replace(activeStr, newActiveStr);
    
    return newHeader;
}

const pageContents = {};
for (const p of pages) {
    const startTag = `<!-- ==================== ${p.toUpperCase()} ==================== -->`;
    const startIdx = html.indexOf(startTag);
    
    // find next <!-- === to limit or </main>
    const nextTagIdx = html.indexOf('<!-- ==================== ', startIdx + startTag.length);
    const endMainIdx = html.indexOf('</main>', startIdx);
    
    const endIdx = (nextTagIdx !== -1 && nextTagIdx < endMainIdx) ? nextTagIdx : endMainIdx;
    
    let content = html.substring(startIdx, endIdx);
    
    // remove the 'hidden' class from the page div
    content = content.replace(/class="page hidden"/g, 'class="page"');
    
    pageContents[p] = content;
}

// Write out the new files
for (const p of pages) {
    const pageHtml = rewriteSidebar(headerPart, p) + pageContents[p] + footerPart;
    fs.writeFileSync(`${p}.html`, pageHtml, 'utf8');
}

console.log("Split completed via Node.");
