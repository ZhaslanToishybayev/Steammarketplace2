const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && file !== 'node_modules') {
      scanDir(fullPath);
    } else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Исправляем распространённые ошибки путей
      const original = content;
      content = content.replace(
        /from '..\/..\/common\//g,
        "from '../../../common/"
      );
      content = content.replace(
        /from '..\/common\//g,
        "from '../../common/"
      );
      // Для двойных кавычек
      content = content.replace(
        /from "..\/..\/common\//g,
        'from "../../../common/'
      );
      content = content.replace(
        /from "..\/common\//g,
        'from "../../common/'
      );
      if (original !== content) {
        console.log('Fixed:', fullPath);
        fs.writeFileSync(fullPath, content);
      }
    }
  });
}

scanDir(path.join(__dirname, 'src'));
console.log('✅ Импорты исправлены!');