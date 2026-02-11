export const ROLE_OPTIONS = [
  { key: "da-yi", label: "大姨" },
  { key: "er-yi", label: "二姨" },
  { key: "san-jiu", label: "三舅" },
  { key: "si-gu", label: "四姑" },
  { key: "wu-shen", label: "五婶" },
  { key: "liu-shu", label: "六叔" },
  { key: "qi-da-ye", label: "七大爷" },
] as const;

export type RoleKey = (typeof ROLE_OPTIONS)[number]["key"];

export const ROLE_MAP = new Map<string, string>(
  ROLE_OPTIONS.map((item) => [item.key, item.label]),
);

export function getRoleLabel(roleKey: string) {
  return ROLE_MAP.get(roleKey) || "亲戚";
}

export const SCENARIO_OPTIONS = [
  { key: "marriage", label: "催婚突击" },
  { key: "salary", label: "年终奖盘问" },
  { key: "housing", label: "买房进度追问" },
  { key: "career", label: "工作稳定性拷问" },
] as const;
