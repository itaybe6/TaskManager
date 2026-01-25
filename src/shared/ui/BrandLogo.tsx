import React from 'react';
import { Image, ImageStyle } from 'react-native';

const logoSource = require('../../../assets/images/astro logo-11.png');

export function BrandLogo(props: { width?: number; height?: number; style?: ImageStyle }) {
  const width = props.width ?? 44;
  const height = props.height ?? 18;
  return (
    <Image
      source={logoSource}
      resizeMode="contain"
      style={[{ width, height }, props.style]}
      accessibilityLabel="ASTRO"
    />
  );
}

