module.exports = {
   // If you want to debug regression tests, you will need the following.
   zapHostName: "192.168.56.20",
   zapPort: "8080",
   // Required from Zap 2.4.1. This key is set in Zap Options -> API _Api Key.
   zapApiKey: process.env.ZAP_API_KEY || "",
   zapApiFeedbackSpeed: 5000 // Milliseconds.
};
