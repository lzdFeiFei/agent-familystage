"use client";

export function LoginButton() {
  return (
    <a
      href="/api/auth/login"
      className="btn-primary inline-flex h-13 w-full items-center justify-center rounded-xl px-5 text-base font-semibold"
    >
      使用 SecondMe 登录
    </a>
  );
}
