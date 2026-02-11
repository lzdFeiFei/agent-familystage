const BLOCKED_WORDS = [
  "去死",
  "自杀",
  "身份证",
  "银行卡",
  "手机号",
  "住址",
  "爆你隐私",
];

export function checkSafety(text: string) {
  const lower = text.toLowerCase();
  const matched = BLOCKED_WORDS.filter((word) => lower.includes(word.toLowerCase()));
  return {
    blocked: matched.length > 0,
    matched,
  };
}

export function maskSensitiveContent(text: string) {
  return text
    .replace(/\b1[3-9]\d{9}\b/g, "1**********")
    .replace(/\b\d{15,18}[\dXx]?\b/g, "**************")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "***@***");
}
