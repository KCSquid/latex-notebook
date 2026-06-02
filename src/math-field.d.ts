import type {} from "react";

interface MathfieldElement extends HTMLElement {
  value: string;
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<MathfieldElement> & {
          value?: string;
        },
        MathfieldElement
      >;
    }
  }
}

// interface MathfieldElement extends HTMLElement {
//   value: string;
// }

// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       "math-field": React.DetailedHTMLProps<
//         React.HTMLAttributes<MathfieldElement>,
//         MathfieldElement
//       > & {
//         onInput?: (e: React.FormEvent<MathfieldElement>) => void;
//         onFocus?: (e: React.FocusEvent<MathfieldElement>) => void;
//         onBlur?: (e: React.FocusEvent<MathfieldElement>) => void;
//       };
//     }
//   }
// }
