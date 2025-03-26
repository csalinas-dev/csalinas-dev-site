"use client";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

export const ReCaptchaProvider = ({ children }) => (
  <GoogleReCaptchaProvider
    reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
    scriptProps={{
      async: true,
      defer: true,
      appendTo: "head",
    }}
  >
    {children}
  </GoogleReCaptchaProvider>
);
