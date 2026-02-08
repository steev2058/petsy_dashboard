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
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              input:focus,
              input:focus-visible,
              textarea:focus,
              textarea:focus-visible {
                outline: none !important;
                box-shadow: none !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
