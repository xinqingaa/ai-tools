export const editorialStyle = {
  width: 1600,
  height: 960,
  frame: {
    x: 54,
    y: 46,
    w: 1492,
    h: 868,
    contentX: 96,
    contentTop: 220,
    contentBottom: 885,
  },
  colors: {
    page: '#f3f7fb',
    ink: '#152234',
    title: '#101827',
    body: '#516277',
    faint: '#73849a',
    white: '#ffffff',
    line: '#c8d7e8',
    blue: '#3d7cff',
    sky: '#20a8d8',
    teal: '#19b6a3',
    green: '#58b978',
    amber: '#f0a23a',
    coral: '#ee6d66',
    violet: '#7b6cff',
    slate: '#334155',
  },
  fonts: {
    title: 48,
    subtitle: 24,
    label: 23,
    body: 18,
    small: 16,
    mono: 13,
  },
};

export function palette(style = editorialStyle) {
  return [
    style.colors.blue,
    style.colors.sky,
    style.colors.teal,
    style.colors.green,
    style.colors.amber,
    style.colors.violet,
    style.colors.coral,
  ];
}
