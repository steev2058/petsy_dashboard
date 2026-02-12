import { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              input,
              textarea {
                -webkit-appearance: none !important;
                appearance: none !important;
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
                -webkit-box-shadow: none !important;
                background-clip: padding-box;
              }

              input:focus,
              input:focus-visible,
              textarea:focus,
              textarea:focus-visible {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
                -webkit-box-shadow: none !important;
              }

              input::-webkit-contacts-auto-fill-button,
              input::-webkit-credentials-auto-fill-button {
                visibility: hidden;
                display: none !important;
                pointer-events: none;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
