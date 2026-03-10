const fs = require('fs');
const path = 'd:/Ontap/data/su.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const correctTitles = {
    12: 'Văn minh Văn Lang - Âu Lạc',
    13: 'Văn minh Chăm-pa',
    14: 'Văn minh Phù Nam',
    15: 'Văn minh Đại Việt',
    16: 'Các dân tộc trên đất nước Việt Nam',
    17: 'Khối đại đoàn kết dân tộc Việt Nam'
};

let updated = 0;
data.lessons.forEach(lesson => {
    if (correctTitles[lesson.bai]) {
        let currentSuffix = '';
        if (lesson.title.includes('(Trắc nghiệm)')) currentSuffix = '(Trắc nghiệm)';
        else if (lesson.title.includes('(Đúng/Sai)')) currentSuffix = '(Đúng/Sai)';
        else if (lesson.title.includes('(Tự luận)')) currentSuffix = '(Tự luận)';
        else currentSuffix = lesson.type === 'multiple' ? '(Trắc nghiệm)' : '(Đúng/Sai)';
        
        lesson.title = `Bài ${lesson.bai}: ${correctTitles[lesson.bai]} ${currentSuffix}`;
        updated++;
    }
});

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Updated ' + updated + ' lessons.');
