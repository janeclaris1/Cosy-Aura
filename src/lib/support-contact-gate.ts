/** Classify messages sent while the support contact form is still required. */

export type ContactGateIntent =
  | "decline"
  | "privacy"
  | "why"
  | "spam"
  | "already_gave"
  | "alternative"
  | "generic";

export function classifyContactGateIntent(raw: string): ContactGateIntent {
  const text = raw.trim().toLowerCase();
  if (!text) return "generic";

  // Short refusals (“No”, “Nope”, “I’ll pass”) — need a clear required-to-continue reply.
  if (
    /^(no|nope|nah|non|nein|não|nao|nyet)([.!?]*)?$/i.test(text) ||
    /^(no|non) (thanks|thank you|thx)([.!?]*)?$/i.test(text) ||
    /^(not really|i'?ll pass|pass|no way|absolutely not)([.!?]*)?$/i.test(text) ||
    /\b(i )?(don'?t|do not|won'?t) (want to )?(fill|share|give|provide)\b/i.test(
      text
    )
  ) {
    return "decline";
  }

  if (
    /\b(already (gave|shared|sent)|i (gave|shared|sent) (you )?(my )?(email|whatsapp|number|details)|just (filled|submitted))\b/i.test(
      text
    )
  ) {
    return "already_gave";
  }

  if (
    /\b(don'?t (like|want)|do not (like|want)|won'?t share|refuse|prefer not|rather not|not sharing|keep (my )?privacy|private|anonymous|without (my )?details|skip (the )?form|why (do )?i (have to|need to)|uncomfortable)\b/i.test(
      text
    ) ||
    /\b(privacy|données|privacidad|privacidade|datenschutz)\b/i.test(text)
  ) {
    return "privacy";
  }

  if (
    /\b(why (do you |are you )?(need|ask|want|collect)|what (for|do you (do|use))|purpose|nécessaire|pourquoi)\b/i.test(
      text
    )
  ) {
    return "why";
  }

  if (
    /\b(spam|scam|sell (my )?data|marketing|newsletter|safe|secure|trust|phishing)\b/i.test(
      text
    )
  ) {
    return "spam";
  }

  if (
    /\b(whatsapp|call (me|you)|phone (you|me)|email (you|me)|contact (page|form)|\/contact)\b/i.test(
      text
    )
  ) {
    return "alternative";
  }

  return "generic";
}

export function contactGateReplyKey(intent: ContactGateIntent): string {
  switch (intent) {
    case "decline":
      return "support.contactDecline";
    case "privacy":
      return "support.contactPrivacy";
    case "why":
      return "support.contactWhy";
    case "spam":
      return "support.contactSpam";
    case "already_gave":
      return "support.contactAlready";
    case "alternative":
      return "support.contactAlternative";
    default:
      return "support.contactRequired";
  }
}
