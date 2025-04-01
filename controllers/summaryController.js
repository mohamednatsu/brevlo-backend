const { summarizeText } = require('../services/summaryService');
const { generatePDF } = require('../utils/pdfGenerator');

exports.summarize = async (req, res) => {
       try {
              const { text, returnPdf = false, language = 'en' } = req.body;

              if (!text) {
                     return res.status(400).json({ error: 'Text is required' });
              }

              const summary = await summarizeText(text, language);

              if (returnPdf) {
                     const pdfBuffer = await generatePDF(summary, language);
                     res.setHeader('Content-Type', 'application/pdf');
                     res.setHeader('Content-Disposition', `attachment; filename=summary_${Date.now()}.pdf`);
                     return res.send(pdfBuffer);
              }

              res.json({
                     success: true,
                     summary
              });
       } catch (error) {
              console.error('Error in summary controller:', error);
              res.status(500).json({
                     error: 'Failed to summarize text',
                     details: error.message
              });
       }
};


exports.decreaseRequests = async (req, res) => {
       try {
              const { user_id } = req.body;  // Get user_id from request

              if (!user_id) {
                     return res.status(400).json({ error: "User ID is required" });
              }

              // Fetch user's remaining requests from profiles table
              const { data: profileData, error: profileError } = await supabase
                     .from("profiles")
                     .select("remaining_requests")
                     .eq("id", user_id)
                     .single();

              if (profileError) {
                     return res.status(500).json({ error: "Error fetching user profile", details: profileError.message });
              }

              let remainingRequests = profileData?.remaining_requests ?? 0;

              if (remainingRequests > 0) {
                     // Decrease remaining requests by 1
                     const { error: updateError } = await supabase
                            .from("profiles")
                            .update({ remaining_requests: remainingRequests - 1 })
                            .eq("id", user_id);

                     if (updateError) {
                            return res.status(500).json({ error: "Error updating remaining requests", details: updateError.message });
                     }

                     return res.json({ message: "Remaining requests decreased by 1", remaining_requests: remainingRequests - 1 });
              } else {
                     return res.status(403).json({ error: "No remaining requests left" });
              }
       } catch (err) {
              console.error("Unexpected error in decreaseRemainingRequests:", err);
              return res.status(500).json({ error: "Internal server error" });
       }
}


exports.saveSummary = async (req, res) => {
       try {
              const { user_id, input_text, summary_text, summary_type } = req.body;

              const { error } = await supabase.from('summaries').insert([{
                     user_id,
                     input_text,
                     summary_text,
                     summary_type,
                     created_at: new Date().toISOString()
              }]);

              if (error) throw error;

              res.json({ success: true });

       } catch (error) {
              console.error('Save summary error:', error);
              res.status(500).json({
                     success: false,
                     error: error.message
              });
       }
}