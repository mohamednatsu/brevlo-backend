const pdf = require('html-pdf');
const path = require('path');

async function generatePDF(summary, language = 'en', notes = []) {
    return new Promise((resolve, reject) => {
        try {
            const isArabic = language === 'ar';
            const content = parseSummaryToHTML(summary, isArabic);
            const notesHtml = generateNotesHTML(notes, isArabic);

            const htmlTemplate = `
            <!DOCTYPE html>
            <html dir="${isArabic ? 'rtl' : 'ltr'}">
            <head>
                <meta charset="UTF-8">
                <title>${isArabic ? 'ملخص المحاضرة' : 'Lecture Summary'}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Roboto:wght@300;400;500;700&display=swap');
                    
                    body {
                        font-family: ${isArabic ? "'Amiri', serif" : "'Roboto', sans-serif"};
                        line-height: 1.8;
                        color: #333;
                        padding: 1.5cm;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    
                    h1 {
                        color: #2c3e50;
                        border-bottom: 2px solid #e84545;
                        padding-bottom: 10px;
                        margin-bottom: 30px;
                        font-size: 28px;
                    }
                    
                    h2 {
                        color: #e84545;
                        margin-top: 30px;
                        margin-bottom: 15px;
                        font-size: 22px;
                    }
                    
                    h3 {
                        color: #3498db;
                        margin-top: 25px;
                        margin-bottom: 12px;
                        font-size: 18px;
                    }
                    
                    p, li {
                        font-size: 14px;
                        margin-bottom: 10px;
                    }
                    
                    ul, ol {
                        padding-${isArabic ? 'right' : 'left'}: 30px;
                        margin-bottom: 20px;
                    }
                    
                    .section {
                        margin-bottom: 30px;
                    }
                    
                    .question-block {
                        background: #f8f9fa;
                        border-left: 4px solid #e84545;
                        padding: 15px;
                        margin: 25px 0;
                        border-radius: 0 4px 4px 0;
                    }
                    
                    .options {
                        margin: 10px 0;
                        padding-${isArabic ? 'right' : 'left'}: 20px;
                    }
                    
                    .correct-answer {
                        font-weight: bold;
                        color: #27ae60;
                    }
                    
                    .notes-section {
                        margin-top: 40px;
                        page-break-before: always;
                    }
                    
                    .note-item {
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #f5f5f5;
                        border-radius: 4px;
                    }
                    
                    .note-date {
                        font-size: 12px;
                        color: #7f8c8d;
                        margin-top: 5px;
                    }
                    
                    .footer {
                        text-align: center;
                        margin-top: 50px;
                        color: #7f8c8d;
                        font-size: 12px;
                        border-top: 1px solid #eee;
                        padding-top: 15px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                        font-size: 14px;
                    }
                    
                    th, td {
                        padding: 12px;
                        border: 1px solid #ddd;
                        text-align: ${isArabic ? 'right' : 'left'};
                    }
                    
                    th {
                        background-color: #f2f2f2;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${isArabic ? 'ملخص المحاضرة' : 'Lecture Summary'}</h1>
                </div>
                
                ${content}
                
                ${notes.length > 0 ? `
                <div class="notes-section">
                    <h2>${isArabic ? 'الملاحظات' : 'Notes'}</h2>
                    ${notesHtml}
                </div>
                ` : ''}
                
                <div class="footer">
                    ${isArabic ? 'تم الإنشاء بواسطة Brevlo' : 'Generated by Brevlo'} | ${new Date().toLocaleDateString()}
                </div>
            </body>
            </html>
            `;

            const options = {
                format: 'A4',
                orientation: 'portrait',
                border: {
                    top: '15mm',
                    right: '15mm',
                    bottom: '15mm',
                    left: '15mm'
                },
                timeout: 60000,
                type: 'pdf',
                quality: '100',
                renderDelay: 1000,
                phantomPath: require('phantomjs-prebuilt').path,
            };

            pdf.create(htmlTemplate, options).toBuffer((err, buffer) => {
                if (err) reject(err);
                else resolve(buffer);
            });

        } catch (error) {
            reject(error);
        }
    });
}

function parseSummaryToHTML(summary, isArabic) {
    if (!summary) return '<p>' + (isArabic ? 'لا يوجد محتوى' : 'No content available') + '</p>';
    
    // Split by sections
    const sections = summary.split(/\n\s*\n/);
    let html = '';
    
    sections.forEach(section => {
        if (!section.trim()) return;
        
        if (section.startsWith(isArabic ? 'العنوان:' : 'Title:')) {
            const title = section.replace(isArabic ? 'العنوان:' : 'Title:', '').trim();
            html += `<h2>${title}</h2>`;
        } 
        else if (section.startsWith(isArabic ? 'المقدمة:' : 'Introduction:')) {
            const content = section.replace(isArabic ? 'المقدمة:' : 'Introduction:', '').trim();
            html += `<div class="section"><h3>${isArabic ? 'المقدمة' : 'Introduction'}</h3><p>${content.replace(/\n/g, '<br>')}</p></div>`;
        }
        else if (section.startsWith(isArabic ? 'النقاط الرئيسية:' : 'Key Points:')) {
            const points = section.replace(isArabic ? 'النقاط الرئيسية:' : 'Key Points:', '').trim();
            html += `<div class="section"><h3>${isArabic ? 'النقاط الرئيسية' : 'Key Points'}</h3><ul>${points.split('\n-').filter(p => p.trim()).map(p => `<li>${p.trim()}</li>`).join('')}</ul></div>`;
        }
        else if (section.includes(isArabic ? 'أسئلة الاختيار من متعدد' : 'Multiple-Choice Questions')) {
            const questions = section.split(/\n\d+\./).filter(q => q.trim());
            html += `<div class="section"><h3>${isArabic ? 'أسئلة الاختيار من متعدد' : 'Multiple-Choice Questions'}</h3>`;
            
            questions.forEach((q, i) => {
                if (!q.trim()) return;
                
                const parts = q.split(isArabic ? 'الإجابة الصحيحة:' : 'Correct Answer:');
                const questionPart = parts[0];
                const answerPart = parts[1] || '';
                
                const options = questionPart.split('\n').filter(line => line.trim() && /^[a-d]\)/.test(line.trim()) || /^[أ-د]\)/.test(line.trim()));
                const questionText = questionPart.split('\n')[0];
                
                html += `
                <div class="question-block">
                    <p><strong>${i+1}. ${questionText.trim()}</strong></p>
                    <div class="options">
                        ${options.map(opt => `<p>${opt.trim()}</p>`).join('')}
                    </div>
                    <p class="correct-answer">${answerPart.trim()}</p>
                </div>`;
            });
            
            html += `</div>`;
        }
        else {
            html += `<p>${section.replace(/\n/g, '<br>')}</p>`;
        }
    });
    
    return html;
}

function generateNotesHTML(notes, isArabic) {
    if (!notes.length) return '';
    
    return notes.map(note => `
        <div class="note-item">
            <p>${note.content}</p>
            <p class="note-date">${new Date(note.createdAt).toLocaleString()}</p>
        </div>
    `).join('');
}

module.exports = { generatePDF };