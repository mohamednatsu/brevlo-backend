const { generatePDF } = require('../utils/pdfGenerator');

exports.generateSummaryPDF = async (req, res) => {
       try {
              const { summary, language = 'en' } = req.body;

              if (!summary) {
                     return res.status(400).json({
                            success: false,
                            error: 'Summary content is required'
                     });
              }

              const pdfBuffer = await generatePDF(summary, language);

              // Set response headers for PDF download
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `attachment; filename=summary_${Date.now()}.pdf`);

              // Send the PDF buffer
              res.send(pdfBuffer);
       } catch (error) {
              console.error('Error generating PDF:', error);
              res.status(500).json({
                     success: false,
                     error: 'Failed to generate PDF',
                     details: error.message
              });
       }
};