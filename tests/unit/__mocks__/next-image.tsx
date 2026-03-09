/**
 * Mock for next/image — renders a plain <img> so template components work in jsdom.
 */
import React from "react";

interface ImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

export default function Image({ src, alt, fill: _fill, ...rest }: ImageProps) {
  return <img src={src} alt={alt} {...rest} />;
}
