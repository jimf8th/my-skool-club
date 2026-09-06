// Makes Inter the default font for every plain RN <Text>/<TextInput>, so the
// app-wide typeface is Inter even for screens that don't set fontFamily
// explicitly. Imported once, as a side effect, before the app renders.
import { Text, TextInput } from 'react-native';

const DEFAULT_FONT_STYLE = { fontFamily: 'Inter_400Regular' };

function applyDefaultFont(Component) {
  const existingDefaultProps = Component.defaultProps || {};
  Component.defaultProps = {
    ...existingDefaultProps,
    style: [DEFAULT_FONT_STYLE, existingDefaultProps.style],
  };
}

applyDefaultFont(Text);
applyDefaultFont(TextInput);
