import { useWindowDimensions } from 'react-native';

export interface ResponsiveState {
  width: number;
  height: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  showSidebarSplit: boolean;
  showTopNavTabs: boolean;
  showBottomBar: boolean;
  isTableView: boolean;
}

export function useResponsive(): ResponsiveState {
  const { width, height } = useWindowDimensions();

  const isPortrait = height >= width;
  const isLandscape = !isPortrait;

  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  // Device categories:
  // - Phone: short side < 550px regardless of orientation
  // - Tablet: short side between 550px and 900px, long side <= 1366px
  // - Desktop: wide screen with desktop proportions
  const isPhone = shortSide < 550;
  const isTablet = shortSide >= 550 && longSide <= 1366;
  const isDesktop = width >= 1100 && !isTablet;

  // Split layout (Sidebar on left, Main on right):
  // Requires at least 960px width so neither sidebar nor content feels cramped.
  const showSidebarSplit = width >= 960;

  // Navigation placement:
  // Tablets (both portrait & landscape) and Desktops have plenty of width for top tabs.
  // Phones (both portrait & landscape) use thumb-friendly bottom bar.
  const showTopNavTabs = width >= 720 && !isPhone;
  const showBottomBar = !showTopNavTabs;

  // Vocabulary presentation:
  // 5 full table columns require at least 920px width.
  // On narrower screens (mobile portrait/landscape and tablet portrait), card layout is used.
  const isTableView = width >= 920;

  return {
    width,
    height,
    isPortrait,
    isLandscape,
    isPhone,
    isTablet,
    isDesktop,
    showSidebarSplit,
    showTopNavTabs,
    showBottomBar,
    isTableView,
  };
}
