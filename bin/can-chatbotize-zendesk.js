const env = require('./zendesk-env')
const axios = require('axios')
const Websocket = require('ws')

const REQUEST_ID = {
    MESSAGE_SUBSCRIPTION: 111,
    UPDATE_AGENT_STATUS: 222,
    SEND_MESSAGE: 333
}

const startAgentQuery = `mutation {
  startAgentSession(access_token: "${env.oauthAccessToken}") {
    websocket_url
    session_id
    client_id
  }
}`;


const startAgentRequest = axios({
    method: 'post',
    url: 'https://chat-api.zopim.com/graphql/request',
    headers: {
        'Content-Type': 'application/json'
    },
    data: {query: startAgentQuery}
})

function subscribeToMessages(websocket) {
    const messageSubscriptionQuery = {
        payload: {
            query: `subscription {
                          message {
                            node {
                              id
                              content
                              channel {
                                id
                              }
                              from {
                                __typename
                                display_name
                              }
                            }
                          }
                        }`
        },
        type: 'request',
        id: REQUEST_ID.MESSAGE_SUBSCRIPTION
    };

    websocket.send(JSON.stringify(messageSubscriptionQuery));
}

function makeAgentOnline(websocket) {
    const query = {
        payload: {
            query: `mutation {
                              updateAgentStatus(status: ONLINE) {
                                node {
                                  id
                                }
                              }
                            }`
        },
        type: 'request',
        id: REQUEST_ID.UPDATE_AGENT_STATUS
    };

    websocket.send(JSON.stringify(query));
}

async function openWebsocket(url) {
    const websocket = new Websocket(url);

    return new Promise(resolve => {
        websocket.on('open', () => {
            console.log('Websocket is open.');
            resolve(websocket)
        })
    })
}

function getMessageSubscriptionId(data) {
    if(data.id === REQUEST_ID.MESSAGE_SUBSCRIPTION) {
        console.log('Listen to successful message subscription request');
        console.log(data);
        return data.payload.data.subscription_id;
    }

    return null
}

function sendStructuredMessage(websocket) {
    const sendQuickRepliesQuery = {
        payload: {
            query: `mutation {
                      sendQuickReplies(
                        channel_id: "${chatMessage.channel.id}",
                        msg: "If you see buttons under this text, your Zendesk is fully compatible! 🎉👏🏼",
                        quick_replies: [
                          {
                            action: {
                              value: "My favorite is chocolate"
                            },
                            text: "Chocolate"
                          },
                          {
                            action: {
                              value: "My favorite is vanilla"
                            },
                            text: "Vanilla"
                          },
                          {
                            action: {
                              value: "My favorite is cookies and cream"
                            },
                            text: "Cookies and cream"
                          },
                          {
                            action: {
                              value: "My favorite is coconut"
                            },
                            text: "Coconut"
                          },
                          {
                            action: {
                              value: "My favorite is salted caramel"
                            },
                            text: "Salted caramel"
                          }
                        ],
                        fallback: {
                          msg: "We have the following options. Which one is your favorite?"
                          options: [
                            "Chocolate",
                            "Vanilla",
                            "Cookies and cream",
                            "Coconut",
                            "Salted caramel"
                          ]
                        }
                      ) {
                        success
                      }
                    }`
        },
        type: 'request',
        id: REQUEST_ID.SEND_MESSAGE
    };

    websocket.send(JSON.stringify(sendQuickRepliesQuery));
}

async function canChatbotizeZendesk() {
    const response = await startAgentRequest

    const websocketUrl = response.data.data.startAgentSession.websocket_url
    console.log(`Agent Session has started. The websocket URL is ${websocketUrl}`)

    const websocket = await openWebsocket(websocketUrl)
    subscribeToMessages(websocket)
    makeAgentOnline(websocket)

    websocket.on('message', function(message) {

    })

    websocket.on('open', () => {

        websocket.on('message', function(message) {
            const data = JSON.parse(message);
            console.log('Receive a new message:', data);

            if(data.id === REQUEST_ID.SEND_MESSAGE) {
                console.log('Do not handle echo message');
                return;
            }

            // Listen to successful message subscription request
            // const messageSubscriptionId = getMessageSubscriptionId(data);

            if(data.sig === 'DATA') {
                console.log('Reply with a quick replies message.')
                const chatMessage = data.payload.data.message.node;
                const sender = chatMessage.from;

                console.log(`[message] Received: '${chatMessage.content}' from: '${sender.display_name}'`);

                sendStructuredMessage(websocket)
            }
        })
    })

}


module.exports = canChatbotizeZendesk
