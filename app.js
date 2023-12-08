const { App } = require("@slack/bolt");

// TODO: make it so that only IA can use buttons

const app = new App({
  token: "",
  signingSecret: "",
});

const iAMembers = ["IA_USER_ID"]; // List of IA Members

var threadTsToScheduledMsgID = new Map(); // Maps threads to future scheduled msgs

var threadTsToHours = new Map();
var threadTStoMinutes = new Map();

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();

app.message(".queue", async ({ message, client }) => {
  const result = await client.chat.scheduledMessages.list({
    channel: message.channel,
  });
  await client.chat.postMessage({
    channel: message.channel,
    text: `${JSON.stringify(result.scheduled_messages)}`,
  });
});

app.message(".dequeue", async ({ message, client }) => {
  const result = await client.chat.scheduledMessages.list({
    channel: message.channel,
  });
  for (msg of result.scheduled_messages) {
    await client.chat.deleteScheduledMessage({
      channel: message.channel,
      scheduled_message_id: msg.id,
    });
    console.log(`Deleted ${msg.id}`);
    threadTsToScheduledMsgID = new Map();
  }
});

app.event("message", async ({ message, client }) => {
  // msg is inside a thread
  if (message.thread_ts) {
    // Check if previous schd msg exists and delete it
    for (schd_ts of threadTsToScheduledMsgID.keys()) {
      console.log(`* ${schd_ts}`);
      if (schd_ts === message.thread_ts) {
        console.log(`Deleted ${threadTsToScheduledMsgID.get(schd_ts)}`);
        await client.chat.deleteScheduledMessage({
          channel: message.channel,
          scheduled_message_id: threadTsToScheduledMsgID.get(schd_ts),
        });
        threadTsToScheduledMsgID.delete(schd_ts);
      }
    }
    // Dev replies to inquiry
    if (!iAMembers.includes(message.text)) {
      createReminder(
        client,
        message,
        `FUTURE!!! from ${message.text}`,
        // getSeconds(message.thread_ts)
        60
      );
    }
  }
  // msg outside a thread
  else {
    // Debug
    if (message.text === ".queue" || message.text === ".dequeue") {
      return;
    }
    // Ignore msg from IA if not inside a thread
    if (iAMembers.includes(message.text)) {
      await client.chat.postMessage({
        channel: message.channel,
        text: "This is IA",
      });
    } else {
      // Create new scheduled msg
      createReminder(
        client,
        message,
        `FUTURE!!! from ${message.text}`,
        // getSeconds(message.ts)
        60 // TODO: Change back to getSeconds() after development
      );
    }
  }
});

async function createReminder(client, message, text, seconds) {
  var t = new Date();
  t.setSeconds(t.getSeconds() + seconds);
  await client.chat.scheduleMessage({
    channel: message.channel,
    thread_ts: `${message.thread_ts ? message.thread_ts : message.ts}`,
    text: text,
    post_at: Math.floor(t.getTime() / 1000),
    
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": "Hi IA! This is a reminder | PLACEHOLDER",
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": "Change time | PLACEHOLDER",
          "emoji": true
        }
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "static_select",
            "placeholder": {
              "type": "plain_text",
              "text": "Hours",
              "emoji": true
            },
            "options": [
              {
                "text": {
                  "type": "plain_text",
                  "text": "0",
                  "emoji": true
                },
                "value": "value-0"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "1",
                  "emoji": true
                },
                "value": "value-1"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "2",
                  "emoji": true
                },
                "value": "value-2"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "3",
                  "emoji": true
                },
                "value": "value-3"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "4",
                  "emoji": true
                },
                "value": "value-4"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "5",
                  "emoji": true
                },
                "value": "value-5"
              }
            ],
            "action_id": "select_hours"
          },
          {
            "type": "static_select",
            "placeholder": {
              "type": "plain_text",
              "text": "Minutes",
              "emoji": true
            },
            "options": [
              {
                "text": {
                  "type": "plain_text",
                  "text": "00",
                  "emoji": true
                },
                "value": "value-0"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "15",
                  "emoji": true
                },
                "value": "value-15"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "30",
                  "emoji": true
                },
                "value": "value-30"
              },
              {
                "text": {
                  "type": "plain_text",
                  "text": "45",
                  "emoji": true
                },
                "value": "value-45"
              }
            ],
            "action_id": "select_min"
          }
        ]
      }
    ]
    
  });
  const result = await client.chat.scheduledMessages.list({
    channel: message.channel,
    oldest: Math.floor(t.getTime() / 1000),
    latest: Math.floor(t.getTime() / 1000),
  });
  console.log(`Created ${result.scheduled_messages[0].id}`);
  console.log('=======')
  console.log(result)
  // Add new scheduled msg to dictionary
  threadTsToScheduledMsgID.set(
    `${message.thread_ts ? message.thread_ts : message.ts}`,
    result.scheduled_messages[0].id
  );
}


app.action('select_hours', async ({ ack }) => {
  console.log("Hi :)")
  await ack();
})

app.action('select_min', async ({ ack }) => {
  console.log("Hi :)")
  await ack();
})

app.action("button-action", async ({ ack }) => {
  console.log("Hi :)")
  await ack();
})

function getSeconds(thread_ts) {

  var hours = 0;
  if (thread_ts in threadTsToHours) {
    hours = threadTsToHours[thread_ts]
  }

  var minutes = 30;
  if (thread_ts in threadTStoMinutes) {
    minutes = threadTStoMinutes[thread_ts]
  }

  return hours * 60 * 60 + minutes * 60

}