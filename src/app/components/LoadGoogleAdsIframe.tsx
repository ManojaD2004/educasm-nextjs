import React from 'react'

function LoadGoogleAdsIframe() {
  return (
    <noscript>
      <iframe
        src="https://www.googletagmanager.com/ns.html?id=GTM-KGSTMP74"
        height="0"
        width="0"
        className="hidden invisible"
        style={{ display: "none", visibility: "hidden" }}
      ></iframe>
    </noscript>
  );
}

export default LoadGoogleAdsIframe