const avatarPalette = ['#6366f1', '#f97316', '#22d3ee', '#facc15', '#34d399'];

export function generateAvatarColor(seed: string | undefined): string {
  const normalized = (seed ?? '').trim();
  if (normalized.length === 0) {
    return avatarPalette[0];
  }

  const index = normalized
    .split('')
    .map((char) => char.charCodeAt(0))
    .reduce((acc, code) => acc + code, 0);

  return avatarPalette[index % avatarPalette.length];
}

export function getAvatarPalette(): string[] {
  return [...avatarPalette];
}
