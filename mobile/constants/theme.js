// GreenLease Design System Tokens
// Based on the Material3-inspired green & white theme

export const colors = {
    primary: '#0d631b',
    onPrimary: '#ffffff',
    primaryContainer: '#2e7d32',
    onPrimaryContainer: '#cbffc2',
    inversePrimary: '#88d982',
    secondary: '#2a6b2c',
    onSecondary: '#ffffff',
    secondaryContainer: '#acf4a4',
    onSecondaryContainer: '#307231',
    tertiary: '#4d5950',
    onTertiary: '#ffffff',
    tertiaryContainer: '#657167',
    onTertiaryContainer: '#e8f5e9',
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    background: '#fbf9f8',
    onBackground: '#1b1c1c',
    surface: '#fbf9f8',
    onSurface: '#1b1c1c',
    surfaceVariant: '#e4e2e1',
    onSurfaceVariant: '#40493d',
    outline: '#707a6c',
    outlineVariant: '#bfcaba',
    inverseSurface: '#303030',
    inverseOnSurface: '#f2f0f0',
    surfaceTint: '#1b6d24',
    surfaceDim: '#dcd9d9',
    surfaceBright: '#fbf9f8',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f5f3f3',
    surfaceContainer: '#f0eded',
    surfaceContainerHigh: '#eae8e7',
    surfaceContainerHighest: '#e4e2e1',
    primaryFixed: '#a3f69c',
    primaryFixedDim: '#88d982',

    // Semantic
    success: '#2e7d32',
    warning: '#f57c00',
    info: '#0288d1',
    pending: '#657167',
};

export const typography = {
    h1: { fontFamily: 'Inter_700Bold', fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
    h2: { fontFamily: 'Inter_600SemiBold', fontSize: 24, lineHeight: 32, letterSpacing: -0.24 },
    h3: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 28 },
    bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 18, lineHeight: 28 },
    bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
    bodySm: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
    labelMd: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
    button: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 24 },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    gutter: 16,
    margin: 20,
};

export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
};

export const shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    modal: {
        shadowColor: '#2e7d32',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.10,
        shadowRadius: 24,
        elevation: 8,
    },
    button: {
        shadowColor: '#2e7d32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.20,
        shadowRadius: 12,
        elevation: 6,
    },
};
