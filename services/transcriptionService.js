const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { ASSEMBLYAI_API_KEY } = require("../config");

async function transcribeAudio(audioFilePath) {
       let fileStream;
       try {
              // Validate file path
              if (!fs.existsSync(audioFilePath)) {
                     throw new Error(`File not found: ${audioFilePath}`);
              }

              const stats = fs.statSync(audioFilePath);
              if (stats.isDirectory()) {
                     throw new Error(`Path is a directory, not a file: ${audioFilePath}`);
              }

              // Store the directory path for cleanup
              const fileDir = path.dirname(audioFilePath);
              const fileName = path.basename(audioFilePath);

              // Get all files in the directory that might be related (for cleanup)
              const allFiles = fs.readdirSync(fileDir);

              // Upload file to AssemblyAI
              fileStream = fs.createReadStream(audioFilePath);
              const uploadResponse = await axios.post(
                     "https://api.assemblyai.com/v2/upload",
                     fileStream,
                     {
                            headers: {
                                   Authorization: ASSEMBLYAI_API_KEY,
                                   "Content-Type": "application/octet-stream"
                            }
                     }
              );

              // Close the file stream immediately after upload
              fileStream.close();
              fileStream = null;

              const audioURL = uploadResponse.data.upload_url;

              // Start transcription
              const transcriptResponse = await axios.post(
                     "https://api.assemblyai.com/v2/transcript",
                     { audio_url: audioURL },
                     {
                            headers: {
                                   Authorization: ASSEMBLYAI_API_KEY,
                                   "Content-Type": "application/json"
                            }
                     }
              );

              const transcriptID = transcriptResponse.data.id;
              console.log(`Transcription started. ID: ${transcriptID}`);

              // Poll for transcription completion
              let status = "queued";
              let transcriptText = "";

              while (status === "queued" || status === "processing") {
                     await new Promise((resolve) => setTimeout(resolve, 5000));

                     const transcriptCheck = await axios.get(
                            `https://api.assemblyai.com/v2/transcript/${transcriptID}`,
                            { headers: { Authorization: ASSEMBLYAI_API_KEY } }
                     );

                     status = transcriptCheck.data.status;

                     if (status === "completed") {
                            transcriptText = transcriptCheck.data.text;

                            // Delete all audio files in the directory (including the second one)
                            try {
                                   allFiles.forEach(file => {
                                          if (file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.ogg') ||
                                                 file.endsWith('.m4a') || file.endsWith('.aac')) {
                                                 const filePath = path.join(fileDir, file);
                                                 fs.unlinkSync(filePath);
                                                 console.log(`Successfully deleted audio file: ${filePath}`);
                                          }
                                   });

                                   // Optional: Clean up empty directory
                                   const remainingFiles = fs.readdirSync(fileDir);
                                   if (remainingFiles.length === 0) {
                                          fs.rmdirSync(fileDir);
                                          console.log(`Removed empty directory: ${fileDir}`);
                                   }
                            } catch (cleanupError) {
                                   console.error(`Error cleaning up audio files: ${cleanupError.message}`);
                                   // Continue even if cleanup fails - the transcription was successful
                            }

                            return transcriptText;
                     } else if (status === "failed") {
                            throw new Error("Transcription failed");
                     }
              }
       } catch (error) {
              console.error("Error transcribing audio:", error.response?.data || error.message);

              // Ensure file stream is closed if an error occurs
              if (fileStream) {
                     fileStream.close();
              }

              // Attempt to delete the file even if transcription failed
              try {
                     if (fs.existsSync(audioFilePath)) {
                            fs.unlinkSync(audioFilePath);
                            console.log(`Deleted audio file after failed transcription: ${audioFilePath}`);
                     }
              } catch (cleanupError) {
                     console.error(`Error cleaning up after failed transcription: ${cleanupError.message}`);
              }

              throw error;
       }
}
module.exports = { transcribeAudio };