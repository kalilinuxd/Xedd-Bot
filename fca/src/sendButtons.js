"use strict";

var utils = require("../utils");

const SHUFFLE_SEED = 42;

function generateShufflePattern(length) {
  const pattern = Array.from({ length }, (_, i) => i);
  let seed = SHUFFLE_SEED;
  for (let i = length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
  }
  return pattern;
}

function generateReversePattern(shufflePattern) {
  const reversePattern = new Array(shufflePattern.length);
  for (let i = 0; i < shufflePattern.length; i++) {
    reversePattern[shufflePattern[i]] = i;
  }
  return reversePattern;
}

function unrearrange(rearrangedId) {
  try {
    if (!rearrangedId || typeof rearrangedId !== "string") return null;
    const pattern = generateShufflePattern(rearrangedId.length);
    const reversePattern = generateReversePattern(pattern);
    const original = new Array(rearrangedId.length);
    for (let i = 0; i < rearrangedId.length; i++) {
      original[reversePattern[i]] = rearrangedId[i];
    }
    return original.join("");
  } catch (err) {
    return null;
  }
}

module.exports = function (defaultFuncs, api, ctx) {
  return function sendButtons(call_to_actions, text, threadID, messageID, callback) {
    if (!ctx.mqttClient) throw new Error("Not connected to MQTT");

    ctx.wsReqNumber ??= 0;
    ctx.wsTaskNumber ??= 0;
    ctx.wsReqNumber += 1;
    ctx.wsTaskNumber += 1;

    const cta_id = unrearrange(call_to_actions);
    if (!cta_id) throw new Error("Invalid call_to_actions ID");

    const taskPayload = {
      thread_id: threadID,
      otid: utils.generateOfflineThreadingID(),
      source: 65544,
      send_type: 5,
      sync_group: 1,
      forwarded_msg_id: cta_id,
      strip_forwarded_msg_caption: 1,
      skip_url_preview_gen: 0,
      text: text || "",
      initiating_source: 1,
    };

    if (messageID != null) {
      taskPayload.reply_metadata = {
        reply_source_id: messageID,
        reply_source_type: 1,
        reply_type: 0,
      };
    }

    const content = {
      app_id: "2220391788200892",
      payload: JSON.stringify({
        tasks: [{
          failure_count: null,
          label: "46",
          payload: JSON.stringify(taskPayload),
          queue_name: `${threadID}`,
          task_id: ctx.wsTaskNumber,
        }],
        epoch_id: utils.generateOfflineThreadingID(),
        version_id: "7214102258676893",
      }),
      request_id: ctx.wsReqNumber,
      type: 3,
    };

    ctx.mqttClient.publish("/ls_req", JSON.stringify(content), { qos: 1, retain: false });
  };
};
