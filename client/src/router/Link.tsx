import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MainNavTab } from '../types';
import { useRouter } from './RouterContext';
import { NavigationOptions } from './types';

interface LinkProps extends Omit<TouchableOpacityProps, 'onPress'> {
  to: MainNavTab | string;
  options?: NavigationOptions;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Link: React.FC<LinkProps> = ({
  to,
  options,
  style,
  children,
  ...rest
}) => {
  const { navigate } = useRouter();

  const handlePress = () => {
    navigate(to, options);
  };

  return (
    <TouchableOpacity
      {...rest}
      style={[
        style,
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
      ]}
      onPress={handlePress}
      activeOpacity={rest.activeOpacity ?? 0.75}
      accessibilityRole="link"
    >
      {children}
    </TouchableOpacity>
  );
};
