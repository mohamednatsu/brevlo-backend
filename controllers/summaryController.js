const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { summarizeText } = require('../services/summaryService');
const { generatePDF } = require('../utils/pdfGenerator');

// Summary Controller
exports.summarize = async (req, res) => {
       try {
              const { text, returnPdf = false, language = 'en', summaryType = 'default' } = req.body;
              const userId = req.user.id;

              if (!text) {
                     return res.status(400).json({ error: 'Text is required' });
              }

              // Perform everything in a long-running transaction
              const result = await prisma.$transaction(async (tx) => {
                     // Get user profile with remaining requests
                     const profile = await tx.profile.findUnique({
                            where: { userId },
                            select: { remainingRequests: true, isPro: true }
                     });

                     if (!profile) {
                            throw new Error('User profile not found');
                     }

                     // Check if user has requests left (for free users)
                     if (!profile.isPro && profile.remainingRequests <= 0) {
                            throw new Error('You have no remaining requests left');
                     }

                     // Generate summary using AI service
                     const summary = await summarizeText(text, language);

                     // Create summary record
                     await tx.summary.create({
                            data: {
                                   userId,
                                   
                                   inputText: text,
                                   summaryText: summary.summary,
                                   summaryType: summaryType
                            }
                     });

                     // Decrement remaining requests for free users
                     let remainingRequests = profile.remainingRequests;
                     if (!profile.isPro) {
                            await tx.profile.update({
                                   where: { userId },
                                   data: { remainingRequests: { decrement: 1 } }
                            });
                            // remainingRequests -= 1;
                     }

                     return {
                            summary,
                            remainingRequests,
                            isPro: profile.isPro
                     };
              }, {
                     maxWait: 20000, // Maximum time to wait for the transaction
                     timeout: 30000  // Maximum time the transaction can run
              });

              if (returnPdf) {
                     const pdfBuffer = await generatePDF(result.summary, language);
                     res.setHeader('Content-Type', 'application/pdf');
                     res.setHeader('Content-Disposition', `attachment; filename=summary_${Date.now()}.pdf`);
                     return res.send(pdfBuffer);
              }

              res.json({
                     success: true,
                     summary: result.summary,
                     remainingRequests: result.remainingRequests,
                     isPro: result.isPro
              });

       } catch (error) {
              console.error('Error in summary controller:', error);
              const status = error.message.includes('remaining requests') ? 403 : 500;
              res.status(status).json({
                     error: error.message.includes('remaining requests')
                            ? error.message
                            : 'Failed to summarize text',
                     details: status === 500 ? error.message : undefined
              });
       }
};
// Get User Summaries
exports.getUserSummaries = async (req, res) => {
       try {
              const userId = req.params.id;
              const summaries = await prisma.summary.findMany({
                     where: { userId },
                     orderBy: { createdAt: 'desc' },
                     select: {
                            id: true,
                            inputText: true,
                            summaryText: true,
                            summaryType: true,
                            createdAt: true
                     }
              });

              res.json({
                     success: true,
                     summaries
              });
       } catch (error) {
              res.status(500).json({
                     success: false,
                     error: error.message
              });

              console.log(error)
       }
};

// Create Subscription
exports.createSubscription = async (req, res) => {
       try {
              const userId = req.user.id;
              const { planId, paymentMethod } = req.body;

              // Get subscription plan
              const plan = await prisma.subscriptionPlan.findUnique({
                     where: { id: planId }
              });

              if (!plan || !plan.isActive) {
                     return res.status(400).json({
                            success: false,
                            error: 'Invalid subscription plan'
                     });
              }

              // Calculate subscription dates
              const startsAt = new Date();
              const endsAt = new Date();
              endsAt.setDate(endsAt.getDate() + plan.durationDays);

              // Create subscription in transaction
              const subscription = await prisma.$transaction(async (tx) => {
                     // Create new subscription
                     const newSubscription = await tx.subscription.create({
                            data: {
                                   userId,
                                   planId,
                                   startsAt,
                                   endsAt,
                                   status: 'active',
                                   paymentMethod
                            }
                     });

                     // Record payment
                     await tx.payment.create({
                            data: {
                                   subscriptionId: newSubscription.id,
                                   amount: plan.price,
                                   status: 'completed',
                                   paymentGateway: 'stripe',
                                   currency: 'USD'
                            }
                     });

                     // Update user profile to Pro
                     await tx.profile.update({
                            where: { userId },
                            data: {
                                   isPro: true,
                                   remainingRequests: {
                                          increment: plan.requestsPerMonth
                                   }
                            }
                     });

                     return newSubscription;
              });

              res.json({
                     success: true,
                     subscription
              });

       } catch (error) {
              console.error('Subscription error:', error);
              res.status(500).json({
                     success: false,
                     error: error.message
              });
       }
};

// Decrease Requests (standalone endpoint)
exports.decreaseRequests = async (req, res) => {
       try {
              const { userId } = req.body;

              if (!userId) {
                     return res.status(400).json({ error: "User ID is required" });
              }

              const result = await prisma.$transaction(async (tx) => {
                     // Get current remaining requests
                     const profile = await tx.profile.findUnique({
                            where: { userId },
                            select: { remainingRequests: true, isPro: true }
                     });

                     if (!profile) {
                            throw new Error("User profile not found");
                     }

                     // Don't decrease for Pro users
                     if (profile.isPro) {
                            return {
                                   remainingRequests: profile.remainingRequests,
                                   isPro: true
                            };
                     }

                     // Check if user has requests left
                     if (profile.remainingRequests <= 0) {
                            throw new Error("No remaining requests left");
                     }

                     // Decrease remaining requests
                     const updatedProfile = await tx.profile.update({
                            where: { userId },
                            data: { remainingRequests: { decrement: 1 } },
                            select: { remainingRequests: true }
                     });

                     return {
                            remainingRequests: updatedProfile.remainingRequests,
                            isPro: false
                     };
              });

              res.json({
                     success: true,
                     message: "Remaining requests decreased by 1",
                     remainingRequests: result.remainingRequests,
                     isPro: result.isPro
              });

       } catch (error) {
              console.error("Error in decreaseRequests:", error);
              const status = error.message.includes('remaining requests') ? 403 : 500;
              res.status(status).json({
                     success: false,
                     error: error.message,
                     details: status === 500 ? error.message : undefined
              });
       }
};

// Save Summary (standalone endpoint)
exports.saveSummary = async (req, res) => {
       try {
              const { userId, inputText, summaryText, summaryType } = req.body;

              const summary = await prisma.summary.create({
                     data: {
                            userId,
                            inputText,
                            summaryText,
                            summaryType
                     }
              });

              res.json({
                     success: true,
                     summaryId: summary.id
              });

       } catch (error) {
              console.error('Save summary error:', error);
              res.status(500).json({
                     success: false,
                     error: error.message
              });
       }
};