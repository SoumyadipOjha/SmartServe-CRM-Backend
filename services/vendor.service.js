const axios = require('axios');
const CommunicationLog = require('../models/communication-log.model');
const Campaign = require('../models/campaign.model');


const vendorService = {
    sendMessage: async function(communicationId, recipient, message) {
        try {
            console.log(`Sending message to ${recipient}: ${message}`);
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const isSuccess = Math.random() < 0.9;
            
            const status = isSuccess ? 'sent' : 'failed';
            const failureReason = isSuccess ? null : 'Delivery failed to recipient';
            
            try {
                // Find and update the communication log
                const commLog = await CommunicationLog.findById(communicationId);
                
                if (commLog) {
                    commLog.status = status;
                    if (failureReason) {
                        commLog.failureReason = failureReason;
                    }
                    await commLog.save();
                    console.log(`Communication log ${communicationId} updated with status: ${status}`);
                    
                    // Update the campaign stats too
                    const campaign = await Campaign.findById(commLog.campaign);
                    if (campaign) {
                        if (status === 'sent') {
                            campaign.deliveryStats.sent += 1;
                        } else if (status === 'failed') {
                            campaign.deliveryStats.failed += 1;
                        }
                        await campaign.save();
                        console.log(`Campaign ${campaign._id} stats updated: sent=${campaign.deliveryStats.sent}, failed=${campaign.deliveryStats.failed}`);
                    } else {
                        console.error(`Campaign not found for communication log ${communicationId}`);
                    }
                } else {
                    console.error(`Communication log ${communicationId} not found`);
                }
                
                return { success: isSuccess, receiptProcessed: true };
            } catch (dbError) {
                console.error('Error updating records:', dbError);
                return { success: false, receiptProcessed: false, error: dbError.message };
            }
        } catch (error) {
            console.error('Error in vendor service:', error);
            return { success: false, error: error.message };
        }
    }
};

module.exports = vendorService;