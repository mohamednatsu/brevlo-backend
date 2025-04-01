const axios = require("axios");
const { GROQ_API_KEY } = require("../config");
const { generatePDF } = require("../utils/pdfGenerator.js");

async function summarizeText(text, language = 'en') {
       try {
              const isArabic = language.toLowerCase() === 'ar';

              const prompt = `
        Create a professional lecture summary in ${language} following this structure and format and make sure the main headings in bold using html tag bold instead of **:

        ${isArabic ? `
        العنوان: [عنوان واضح يعبر عن الموضوع]

        المقدمة:  
        وصف موجز للموضوع وأهميته

        النقاط الرئيسية:  
        - ملخص النقاط الأساسية
        - تسلسل منطقي بين الأفكار
        - أمثلة توضيحية عند الحاجة

        الخاتمة:  
        أهم الأفكار والاستنتاجات
        التطبيقات العملية

        أسئلة الاختيار من متعدد:
        1. سؤال واضح ومباشر
          أ) خيار
          ب) خيار
          ج) خيار
          د) خيار
        الإجابة الصحيحة: [الحرف]
        شرح: [شرح موجز]

        التطبيقات العملية:  
        مثالين واقعيين لتطبيق هذه المعرفة
        ` : `
        Title: [Concise descriptive title]

        Introduction:  
        Brief overview of topic and significance

        Key Points:  
        - Core ideas summarized clearly
        - Logical flow between concepts
        - Examples where helpful

        Conclusion:  
        Main takeaways
        Important implications

        Multiple-Choice Questions:
        1. Clear question stem
          a) Option
          b) Option
          c) Option
          d) Option
        Correct Answer: [letter]
        Explanation: [brief rationale]

        Practical Applications:  
        Two real-world use cases
        `}

        Lecture Content:  
        ${text}
        `;

              const response = await axios.post(
                     "https://api.groq.com/openai/v1/chat/completions",
                     {
                            model: "llama-3.3-70b-versatile",
                            messages: [
                                   {
                                          role: "system",
                                          content: isArabic ?
                                                 "أنت مساعد أكاديمي محترف يقدم ملخصات دقيقة ومنظمة" :
                                                 "You are a professional academic assistant creating structured summaries"
                                   },
                                   { role: "user", content: prompt },
                            ],
                            max_tokens: 1500,
                            temperature: 0.3
                     },
                     {
                            headers: {
                                   Authorization: `Bearer ${GROQ_API_KEY}`,
                                   "Content-Type": "application/json"
                            }
                     }
              );

              const summary = response.data.choices[0].message.content;
              const pdfBuffer = await generatePDF(summary, isArabic ? 'ar' : 'en');

              return {
                     success: true,
                     language: language,
                     summary,
              };
       } catch (error) {
              console.error("Error summarizing text:", error.response?.data || error.message);
              return {
                     success: false,
                     error: error.response?.data || error.message
              };
       }
}

module.exports = { summarizeText };