var express = require('express');
var router = express.Router();
const zendeskEnv = require('../bin/zendesk-env')
const canChatbotizeZendesk = require('../bin/can-chatbotize-zendesk');


function resolveStep(step){
    if(step) return step

    if(!zendeskEnv.subdomain) return 'subdomain'
    if(!zendeskEnv.clientId) return 'clientId'
    if(!zendeskEnv.oauthAccessToken) return 'zendeskOauth'

    return null
}

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log('received ', req.query, 'zendeskEnv', zendeskEnv)
    const value = req.query.value
    const step = resolveStep(req.query.step)
    const nextStep = {}

    if(step === 'subdomain' && !zendeskEnv.subdomain && !value){
        nextStep.subdomain = true
    }
    else if(step === 'subdomain'){
        zendeskEnv.subdomain = value
        nextStep.clientId = true
    }
    else if(step === 'clientId'){
        zendeskEnv.clientId = value
        nextStep.zendeskOauth = true
    }
    else if(step === 'zendeskOauth' && !req.query.step){
        nextStep.oauthAccessToken = true
    }

    // canChatbotizeZendesk();


    console.log('response: ', zendeskEnv, nextStep)
    res.render('index', {
        title: 'Can chatbotize Zendesk?',
        zendeskEnv,
        nextStep
    });
});

module.exports = router;
