export type AlertChannel = "sms" | "whatsapp";

export interface DeliveryResult {
  ok: boolean;
  providerMsgId?: string;
  error?: string;
}

/**
 * Provider adapter — swap implementations without touching callers.
 *
 * Real wiring: set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
 * (and a WhatsApp sender number) in env, then replace the stub bodies with
 * `twilioClient.messages.create({...})`. The signature stays the same.
 */
export interface ChannelAdapter {
  channel: AlertChannel;
  send(to: string, body: string): Promise<DeliveryResult>;
}

const smsAdapter: ChannelAdapter = {
  channel: "sms",
  async send(to, body) {
    if (!process.env.TWILIO_FROM) {
      // No credentials configured — callers still get a typed result.
      return { ok: false, error: "SMS provider not configured" };
    }
    // Example: await twilioClient.messages.create({ to, from: process.env.TWILIO_FROM, body });
    return { ok: true, providerMsgId: `stub-sms-${Date.now()}` };
  },
};

const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",
  async send(to, body) {
    if (!process.env.WHATSAPP_FROM) {
      return { ok: false, error: "WhatsApp provider not configured" };
    }
    return { ok: true, providerMsgId: `stub-wa-${Date.now()}` };
  },
};

export function adapterFor(channel: AlertChannel): ChannelAdapter {
  return channel === "sms" ? smsAdapter : whatsappAdapter;
}

/** Format a short alert message for an outbound SMS / WhatsApp. */
export function formatAlertMessage(input: {
  level: string;
  zoneName: string;
  title: string;
}): string {
  const lvl = input.level.toUpperCase();
  return `[${lvl}] Madras Flood Alert — ${input.zoneName}: ${input.title}. Take precaution. Do not reply.`;
}