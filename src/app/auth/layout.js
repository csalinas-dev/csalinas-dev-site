import { ReCaptchaProvider } from "@/providers";

export default function AuthLayout({ children }) {
  return <ReCaptchaProvider>{children}</ReCaptchaProvider>;
}
