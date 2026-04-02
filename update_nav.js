const fs = require('fs');
const dir = './public/prototipo';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const insertString = `        <a class="nav-item" data-page="fatura_da_loja" href="fatura_da_loja.html">
          <span class="nav-icon">🧾</span>
          <span class="nav-text">Fatura da Loja</span>
        </a>`;

for (let file of files) {
  let content = fs.readFileSync(`${dir}/${file}`, 'utf8');
  if (content.includes('fatura_da_loja.html')) continue;
  
  const searchRegex = /(<span class="nav-text">Faturamento<\/span>\s*<\/a>)/;
  if (searchRegex.test(content)) {
    content = content.replace(searchRegex, `$1\n${insertString}`);
    fs.writeFileSync(`${dir}/${file}`, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
