class SessionService {
       async getSession(sessionId) {
         try {
           // Implement your actual session retrieval logic here
           // For now, just a mock implementation
           return {
             id: sessionId,
             userId: 1,
             expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
             isValid: true,
           };
         } catch (err) {
           throw err;
         }
       }
     }
     
     module.exports = new SessionService();