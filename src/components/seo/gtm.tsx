import Script from "next/script";

import { GA_ID, GTM_ID } from "@/lib/site";

/**
 * Google Tag Manager (and optional GA4) bootstrap.
 *
 * Rendered once in the root layout. When no container id is configured the
 * component renders nothing, so local development and un-configured deploys
 * stay free of third-party requests. The <noscript> fallback sits at the top
 * of <body> so tags still fire when JavaScript is disabled.
 */
export function GoogleTagManager() {
  if (!GTM_ID && !GA_ID) return null;

  return (
    <>
      {GTM_ID ? (
        <script
          id="gtm-script"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      ) : null}

      {GA_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/** The matching <noscript> iframe. Render at the top of <body>. */
export function GoogleTagManagerNoScript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}